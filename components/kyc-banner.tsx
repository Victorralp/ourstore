"use client"

import Link from "next/link"
import { ShieldAlert, ShieldCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useKyc } from "@/hooks/use-kyc"

// Reminds vendors and service providers to verify their identity.
// Nobody is blocked: unverified sellers keep selling, but can't receive payouts.
export function KycBanner() {
  const { record, loading, error } = useKyc()

  if (loading || error || record?.status === "approved") return null

  if (record?.status === "pending") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
        <Clock className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Identity verification under review</p>
          <p className="text-sm">We&apos;ll update your status once an admin has checked your details.</p>
        </div>
      </div>
    )
  }

  const rejected = record?.status === "rejected"
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex items-start gap-3">
        {rejected ? <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" /> : <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />}
        <div>
          <p className="font-medium">
            {rejected ? "Your identity verification needs attention" : "Verify your identity to receive payouts"}
          </p>
          <p className="text-sm">
            {rejected
              ? record?.rejectionReason || "Please check your details and submit them again."
              : "You can keep selling, but payouts are only sent to verified sellers."}
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href="/verification">{rejected ? "Update details" : "Verify now"}</Link>
      </Button>
    </div>
  )
}
