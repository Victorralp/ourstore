import { BadgeCheck, MessageCircle, ShieldCheck, Truck } from "lucide-react"

const ITEMS = [
  { icon: ShieldCheck, title: "Secure payment", text: "Card, bank transfer or USSD via Paystack" },
  { icon: BadgeCheck, title: "Verified sellers", text: "Every store is reviewed before it sells" },
  { icon: Truck, title: "Fast delivery", text: "Across Lagos and nationwide" },
  { icon: MessageCircle, title: "Help on WhatsApp", text: "Talk to a real person" },
]

export default function TrustStrip() {
  return (
    <section aria-label="Why shop with us" className="container mx-auto px-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-gray-200 ring-1 ring-gray-200 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3 bg-white p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
