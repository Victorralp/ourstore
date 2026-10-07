import Link from "next/link"
import { ArrowRight, Wrench } from "lucide-react"
import { serviceCategories } from "@/lib/categories"

// Points shoppers to the services marketplace (plumbers, cleaners, caterers...)
export default function ServicesBand() {
  const featured = serviceCategories.filter((category) => category.value !== "other").slice(0, 8)

  return (
    <section className="container mx-auto px-4">
      <div className="grid gap-8 rounded-3xl bg-green-50 p-6 ring-1 ring-green-100 sm:p-10 lg:grid-cols-5 lg:items-center">
        <div className="lg:col-span-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white">
            <Wrench className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">Need a hand? Book a service.</h2>
          <p className="mt-2 text-gray-600">
            Find service providers for repairs, events, beauty and more, and book them on RUACH.
          </p>
          <Link
            href="/services/marketplace"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Browse services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-3">
          {featured.map((category) => (
            <Link
              key={category.value}
              href="/services/marketplace"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-green-100 transition-colors hover:bg-green-600 hover:text-white hover:ring-green-600"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
