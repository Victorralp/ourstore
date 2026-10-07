import Link from "next/link"
import {
  Gamepad2,
  LayoutGrid,
  Laptop,
  Refrigerator,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Tv,
  type LucideIcon,
} from "lucide-react"
import { MAIN_CATEGORIES, type MainCategoryId } from "@/lib/categories"
import SectionHeading from "@/components/home/section-heading"

const ICONS: Record<Exclude<MainCategoryId, "all">, { icon: LucideIcon; tint: string }> = {
  "phones-tablets": { icon: Smartphone, tint: "bg-sky-50 text-sky-700" },
  fashion: { icon: Shirt, tint: "bg-rose-50 text-rose-700" },
  electronics: { icon: Tv, tint: "bg-violet-50 text-violet-700" },
  appliances: { icon: Refrigerator, tint: "bg-cyan-50 text-cyan-700" },
  "home-office": { icon: Sofa, tint: "bg-amber-50 text-amber-700" },
  computing: { icon: Laptop, tint: "bg-indigo-50 text-indigo-700" },
  "health-beauty": { icon: Sparkles, tint: "bg-pink-50 text-pink-700" },
  supermarket: { icon: ShoppingBasket, tint: "bg-green-50 text-green-700" },
  gaming: { icon: Gamepad2, tint: "bg-orange-50 text-orange-700" },
  others: { icon: LayoutGrid, tint: "bg-gray-100 text-gray-700" },
}

// Same order as the icons above
const ORDER = Object.keys(ICONS) as Array<keyof typeof ICONS>

export default function CategoryGrid() {
  const categories = ORDER
    .map((id) => MAIN_CATEGORIES.find((category) => category.id === id))
    .filter((category): category is NonNullable<typeof category> => !!category)

  return (
    <section className="container mx-auto px-4">
      <SectionHeading title="Shop by category" href="/shop" linkLabel="All products" />
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {categories.map((category) => {
          const { icon: Icon, tint } = ICONS[category.id as keyof typeof ICONS]
          return (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-3 text-center ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-green-200 sm:gap-3 sm:p-5"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint} sm:h-14 sm:w-14 sm:rounded-2xl`}>
                <Icon className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden />
              </span>
              <span className="text-[11px] font-medium leading-tight text-gray-800 group-hover:text-green-700 sm:text-sm">
                {category.name}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
