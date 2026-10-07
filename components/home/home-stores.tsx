"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Store } from "lucide-react"
import SectionHeading from "@/components/home/section-heading"
import { getAllVendors, type Vendor } from "@/lib/firebase-vendors"

// A row of approved stores
export default function HomeStores() {
  const [stores, setStores] = useState<Vendor[] | null>(null)

  useEffect(() => {
    let active = true
    getAllVendors()
      .then((vendors) => {
        if (active) setStores(vendors.filter((vendor) => vendor.approved && vendor.isActive !== false).slice(0, 6))
      })
      .catch((error) => {
        console.error("Error loading stores:", error)
        if (active) setStores([])
      })
    return () => {
      active = false
    }
  }, [])

  if (stores !== null && stores.length === 0) return null

  return (
    <section className="container mx-auto px-4">
      <SectionHeading title="Featured stores" subtitle="Verified sellers on RUACH" href="/stores" linkLabel="All stores" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stores === null
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))
          : stores.map((store) => (
              <Link
                key={store.id}
                href={`/vendor/${store.id}`}
                className="group flex flex-col items-center rounded-2xl bg-white p-4 text-center ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-green-200"
              >
                <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-green-50 ring-4 ring-green-50">
                  {store.logoUrl ? (
                    <Image src={store.logoUrl} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <Store className="h-7 w-7 text-green-700" aria-hidden />
                  )}
                </span>
                <span className="mt-3 line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-green-700">
                  {store.shopName}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
                </span>
              </Link>
            ))}
      </div>
    </section>
  )
}
