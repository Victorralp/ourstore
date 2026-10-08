"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, RotateCcw, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react"
import ProductGrid from "@/components/product-grid"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { getProducts } from "@/lib/firebase-products"
import { MAIN_CATEGORIES, bucketProductToMainCategory, normalizeCategoryId, type MainCategoryId } from "@/lib/categories"
import { unitPrice } from "@/lib/checkout-pricing"
import { isOutOfStock } from "@/lib/product-stock"
import type { Product } from "@/types"

const PAGE_SIZE = 24
const GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"

const PRICE_RANGES = [
  { id: "all", name: "Any price" },
  { id: "under-10k", name: "Under ₦10,000", min: 0, max: 10_000 },
  { id: "10k-25k", name: "₦10,000 – ₦25,000", min: 10_000, max: 25_000 },
  { id: "25k-50k", name: "₦25,000 – ₦50,000", min: 25_000, max: 50_000 },
  { id: "50k-100k", name: "₦50,000 – ₦100,000", min: 50_000, max: 100_000 },
  { id: "over-100k", name: "Over ₦100,000", min: 100_000, max: Infinity },
] as const

const SORT_OPTIONS = [
  { id: "popular", name: "Most popular" },
  { id: "newest", name: "Newest" },
  { id: "price-asc", name: "Price: low to high" },
  { id: "price-desc", name: "Price: high to low" },
] as const

type SortId = (typeof SORT_OPTIONS)[number]["id"]

// What a product sells for after its discount
const finalPrice = (product: any) =>
  unitPrice({ price: Number(product.price) || 0, discount: typeof product.discount === "number" ? product.discount : undefined })

const createdTime = (product: any) => {
  const value = product.createdAt
  if (!value) return 0
  if (typeof value.toMillis === "function") return value.toMillis()
  if (typeof value.seconds === "number") return value.seconds * 1000
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function ShopContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filters live in the URL, so links (home page categories, header search,
  // the menu) and the back button work, and results can be shared
  const category = normalizeCategoryId(searchParams.get("category"))
  const search = searchParams.get("search")?.trim() ?? ""
  const priceId = PRICE_RANGES.some((r) => r.id === searchParams.get("price")) ? searchParams.get("price")! : "all"
  const sort: SortId = SORT_OPTIONS.some((o) => o.id === searchParams.get("sort")) ? (searchParams.get("sort") as SortId) : "popular"
  const inStockOnly = searchParams.get("instock") === "1"

  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => setSearchInput(search), [search])

  // The whole catalogue loads once; filtering and sorting happen here
  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    getProducts({}, 1000)
      .then(({ products }) => {
        if (active) setAllProducts(products)
      })
      .catch((error) => {
        console.error("Error loading products:", error)
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const updateParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") params.delete(key)
      else params.set(key, value)
    }
    // The menu's subcategory links aren't used for filtering; drop them once
    // the shopper changes filters
    params.delete("subcategory")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Start from the first page whenever the filters change
  useEffect(() => setVisible(PAGE_SIZE), [category, search, priceId, sort, inStockOnly])

  const withCategory = useMemo(
    () => allProducts.map((product) => ({ product, bucket: bucketProductToMainCategory(product) })),
    [allProducts],
  )

  // Everything except the category filter, so category counts reflect the other filters
  const matchesOtherFilters = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === priceId)
    const term = search.toLowerCase()
    return (product: any) => {
      if (inStockOnly && isOutOfStock(product)) return false
      if (range && "min" in range) {
        const price = finalPrice(product)
        if (price < range.min || price >= range.max) return false
      }
      if (term) {
        const haystack = `${product.name ?? ""} ${product.description ?? ""} ${product.category ?? ""}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    }
  }, [priceId, search, inStockOnly])

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<MainCategoryId, number>> = {}
    let total = 0
    for (const { product, bucket } of withCategory) {
      if (!matchesOtherFilters(product)) continue
      counts[bucket] = (counts[bucket] ?? 0) + 1
      total++
    }
    return { counts, total }
  }, [withCategory, matchesOtherFilters])

  const results = useMemo(() => {
    const list = withCategory
      .filter(({ product, bucket }) => (category === "all" || bucket === category) && matchesOtherFilters(product))
      .map(({ product }) => product)

    const byNewest = (a: any, b: any) => createdTime(b) - createdTime(a)
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => finalPrice(a) - finalPrice(b))
      case "price-desc":
        return list.sort((a, b) => finalPrice(b) - finalPrice(a))
      case "newest":
        return list.sort(byNewest)
      default:
        // Rated and reviewed products first, then newest; sold-out items last
        return list.sort(
          (a, b) =>
            Number(isOutOfStock(a)) - Number(isOutOfStock(b)) ||
            (b.rating ?? 0) - (a.rating ?? 0) ||
            (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
            byNewest(a, b),
        )
    }
  }, [withCategory, category, matchesOtherFilters, sort])

  const categoryName = MAIN_CATEGORIES.find((c) => c.id === category)?.name ?? "All products"
  const title = category === "all" ? "All products" : categoryName
  const priceName = PRICE_RANGES.find((r) => r.id === priceId)?.name

  type ActiveFilter = { key: string; label: string; clear: Record<string, null> }
  const activeFilters: ActiveFilter[] = []
  if (category !== "all") activeFilters.push({ key: "category", label: categoryName, clear: { category: null } })
  if (search) activeFilters.push({ key: "search", label: `“${search}”`, clear: { search: null } })
  if (priceId !== "all") activeFilters.push({ key: "price", label: priceName ?? "Price", clear: { price: null } })
  if (inStockOnly) activeFilters.push({ key: "instock", label: "In stock only", clear: { instock: null } })

  const clearAll = () => router.replace(pathname, { scroll: false })

  const categoryList = (
    <ul className="space-y-0.5">
      {MAIN_CATEGORIES.map((c) => {
        const count = c.id === "all" ? categoryCounts.total : categoryCounts.counts[c.id] ?? 0
        const selected = category === c.id
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => updateParams({ category: c.id })}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selected ? "bg-green-50 font-semibold text-green-800" : "text-gray-700 hover:bg-gray-50"
              }`}
              aria-current={selected ? "true" : undefined}
            >
              <span>{c.name}</span>
              {!loading && <span className={`text-xs ${selected ? "text-green-700" : "text-gray-400"}`}>{count}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const priceAndStock = (
    <>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Price</legend>
        <div className="space-y-0.5">
          {PRICE_RANGES.map((range) => (
            <label
              key={range.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="price"
                checked={priceId === range.id}
                onChange={() => updateParams({ price: range.id })}
                className="h-4 w-4 accent-green-600"
              />
              {range.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => updateParams({ instock: e.target.checked ? "1" : null })}
          className="h-4 w-4 rounded accent-green-600"
        />
        In stock only
      </label>
    </>
  )

  return (
    <div className="bg-gray-50/60 pb-16">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-500">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            {category === "all" ? (
              <span className="text-gray-900">Shop</span>
            ) : (
              <>
                <button type="button" onClick={() => updateParams({ category: null })} className="hover:text-green-700">Shop</button>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                <span className="text-gray-900">{categoryName}</span>
              </>
            )}
          </nav>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{search ? `Results for “${search}”` : title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {loading ? "Loading products..." : `${results.length} ${results.length === 1 ? "product" : "products"}`}
              </p>
            </div>
            <form
              role="search"
              className="flex w-full items-center gap-2 rounded-xl bg-gray-100 p-1 md:max-w-sm"
              onSubmit={(e) => {
                e.preventDefault()
                updateParams({ search: searchInput.trim() || null })
              }}
            >
              <SearchIcon className="ml-2 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <label htmlFor="shop-search" className="sr-only">Search products</label>
              <input
                id="shop-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Search
              </button>
            </form>
          </div>

          {/* Category chips: quick switching, mainly for small screens */}
          <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
            {MAIN_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => updateParams({ category: c.id })}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition-colors ${
                  category === c.id
                    ? "bg-green-600 text-white ring-green-600"
                    : "bg-white text-gray-700 ring-gray-200 hover:ring-green-300"
                }`}
              >
                {c.id === "all" ? "All" : c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-6">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          {/* Desktop filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
              <div>
                <h2 className="mb-2 px-3 text-sm font-semibold text-gray-900">Categories</h2>
                {categoryList}
              </div>
              <div className="border-t border-gray-100 pt-5">{priceAndStock}</div>
            </div>
          </aside>

          <section aria-label="Products">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                    {activeFilters.filter((f) => f.key !== "category" && f.key !== "search").length > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-xs text-white">
                        {activeFilters.filter((f) => f.key !== "category" && f.key !== "search").length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  {priceAndStock}
                  <SheetClose asChild>
                    <Button className="mt-6 w-full bg-green-600 hover:bg-green-700">
                      Show {results.length} {results.length === 1 ? "product" : "products"}
                    </Button>
                  </SheetClose>
                </SheetContent>
              </Sheet>

              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => updateParams(filter.clear)}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200 hover:ring-red-200"
                  aria-label={`Remove filter ${filter.label}`}
                >
                  {filter.label} <X className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button type="button" onClick={clearAll} className="px-2 text-sm font-medium text-green-700 hover:text-green-800">
                  Clear all
                </button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span className="hidden text-sm text-gray-500 sm:inline">Sort by</span>
                <Select value={sort} onValueChange={(value) => updateParams({ sort: value === "popular" ? null : value })}>
                  <SelectTrigger className="w-[170px] bg-white" aria-label="Sort products">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {failed ? (
              <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">We couldn&apos;t load products</h2>
                <p className="mt-1 text-sm text-gray-500">Check your connection and try again.</p>
                <Button onClick={() => setReloadKey((k) => k + 1)} className="mt-5 gap-2 bg-green-600 hover:bg-green-700">
                  <RotateCcw className="h-4 w-4" /> Try again
                </Button>
              </div>
            ) : loading ? (
              <ProductGrid products={[]} isLoading className={GRID} />
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">No products found</h2>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  {activeFilters.length > 0
                    ? "Nothing matches these filters. Try removing one, or search for something else."
                    : "There are no products here yet."}
                </p>
                {activeFilters.length > 0 && (
                  <Button onClick={clearAll} variant="outline" className="mt-5">Clear filters</Button>
                )}
              </div>
            ) : (
              <>
                <ProductGrid products={results.slice(0, visible) as Product[]} className={GRID} />
                <div className="mt-8 flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min(visible, results.length)} of {results.length}
                  </p>
                  {visible < results.length && (
                    <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="min-w-48 bg-white">
                      Load more
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  )
}
