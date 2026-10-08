"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Boxes, Search, Store } from "lucide-react"

const QUICK_SEARCHES = ["Phones", "Fashion", "Kitchen", "Furniture"]

export default function HomeHero() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const search = (term: string) => {
    const q = term.trim()
    router.push(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop")
  }

  return (
    <section className="bg-gradient-to-b from-green-50/70 to-white">
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main panel */}
          <div className="relative overflow-hidden rounded-3xl bg-green-800 px-6 py-10 text-white sm:px-10 md:py-14 lg:col-span-2">
            {/* Decorative shapes */}
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-green-600/40" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 right-16 h-80 w-80 rounded-full bg-emerald-400/20" />
            <div aria-hidden className="pointer-events-none absolute bottom-8 right-8 hidden h-24 w-24 rotate-12 rounded-3xl border-2 border-white/15 md:block" />

            <div className="relative max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-green-50 ring-1 ring-white/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                Shop from trusted Nigerian sellers
              </span>

              <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                Everything you need, from sellers you can trust.
              </h1>
              <p className="mt-4 text-base text-green-50/90 sm:text-lg">
                Phones, fashion, home goods and more from verified stores. Pay securely and get it delivered across Lagos and nationwide.
              </p>

              <form
                className="mt-7 flex w-full max-w-lg items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg shadow-green-950/20"
                onSubmit={(e) => {
                  e.preventDefault()
                  search(query)
                }}
                role="search"
              >
                <Search className="ml-3 h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                <label htmlFor="home-search" className="sr-only">Search products</label>
                <input
                  id="home-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What are you looking for?"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-base"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 sm:px-6"
                >
                  Search
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-green-100/80">Popular:</span>
                {QUICK_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => search(term)}
                    className="rounded-full bg-white/10 px-3 py-1 text-green-50 ring-1 ring-white/15 transition-colors hover:bg-white/20"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50"
                >
                  Start shopping <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/stores"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10"
                >
                  <Store className="h-4 w-4" /> Browse stores
                </Link>
              </div>
            </div>
          </div>

          {/* Side tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/vendor/register"
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-amber-100 p-5 text-amber-950 transition-shadow hover:shadow-lg sm:p-6"
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200" />
              <Store className="relative h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
              <div className="relative mt-3 sm:mt-6">
                <h2 className="text-xl font-bold text-amber-950">Sell on RUACH</h2>
                <p className="mt-1 text-sm text-amber-900/80">Open your store, list your products and reach new customers.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                  Become a vendor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            <Link
              href="/bulk-order"
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 text-gray-900 ring-1 ring-gray-200 transition-shadow hover:shadow-lg sm:p-6"
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green-50" />
              <Boxes className="relative h-7 w-7 text-green-700 sm:h-8 sm:w-8" aria-hidden />
              <div className="relative mt-3 sm:mt-6">
                <h2 className="text-xl font-bold">Buying in bulk?</h2>
                <p className="mt-1 text-sm text-gray-600">Get special pricing for large orders for your shop, office or event.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                  Request a quote <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
