import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = "View all",
}: {
  title: string
  subtitle?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500 sm:text-base">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}
