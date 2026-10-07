"use client"

import { useEffect, useState } from "react"
import ProductGrid from "@/components/product-grid"
import SectionHeading from "@/components/home/section-heading"
import { getProducts } from "@/lib/firebase-products"
import { isOutOfStock } from "@/lib/product-stock"
import type { Product } from "@/types"

const GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"

// New arrivals and, when there are any, discounted products. Loaded once and
// shared by both sections.
export default function HomeProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    getProducts({}, 24)
      .then(({ products }) => {
        if (active) setProducts((products as unknown as Product[]).filter((p) => !isOutOfStock(p as any)))
      })
      .catch((error) => {
        console.error("Error loading home page products:", error)
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const newArrivals = products.slice(0, 8)
  const deals = products.filter((p) => ((p as any).discount ?? 0) > 0).slice(0, 4)

  if (failed || (!loading && products.length === 0)) return null

  return (
    <>
      <section className="container mx-auto px-4">
        <SectionHeading title="New arrivals" subtitle="Fresh from our sellers" href="/shop" />
        <ProductGrid products={newArrivals} isLoading={loading} className={GRID} />
      </section>

      {deals.length > 0 && (
        <section className="container mx-auto px-4">
          <SectionHeading title="Deals" subtitle="Discounted right now" href="/shop" />
          <ProductGrid products={deals} className={GRID} />
        </section>
      )}
    </>
  )
}
