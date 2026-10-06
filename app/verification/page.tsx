"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, ShieldCheck, Clock, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/components/auth-provider"
import { useKyc } from "@/hooks/use-kyc"
import { useToast } from "@/hooks/use-toast"
import { isValidNin, maskNin, submitKyc, type KycSubmission } from "@/lib/firebase-kyc"

// Latest date of birth allowed: sellers must be at least 18
const maxDateOfBirth = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date.toISOString().slice(0, 10)
}

const emptyForm: KycSubmission = { firstName: "", middleName: "", lastName: "", dateOfBirth: "", nin: "" }

export default function VerificationPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { record, loading, error } = useKyc()
  const { toast } = useToast()
  const [form, setForm] = useState<KycSubmission>(emptyForm)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Lets a rejected applicant reopen the form, prefilled with what they sent
  const [editing, setEditing] = useState(false)

  const updateField = (field: keyof KycSubmission, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const startEditing = () => {
    if (record) {
      setForm({
        firstName: record.firstName,
        middleName: record.middleName || "",
        lastName: record.lastName,
        dateOfBirth: record.dateOfBirth,
        nin: record.nin,
      })
    }
    setConsent(false)
    setEditing(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth) {
      toast({ title: "Missing information", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    if (form.dateOfBirth > maxDateOfBirth()) {
      toast({ title: "Check your date of birth", description: "You must be at least 18 to sell on RUACH E-STORE.", variant: "destructive" })
      return
    }
    if (!isValidNin(form.nin.trim())) {
      toast({ title: "Check your NIN", description: "Your NIN should be exactly 11 digits.", variant: "destructive" })
      return
    }
    if (!consent) {
      toast({ title: "Consent needed", description: "Please confirm you agree to us verifying your identity.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await submitKyc(user.uid, user.email || "", form)
      setEditing(false)
      toast({ title: "Details submitted", description: "We'll let you know once your identity has been verified." })
    } catch (err: any) {
      toast({ title: "Couldn't submit your details", description: err?.message || "Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in</h1>
        <p className="text-muted-foreground mb-8">You need to be logged in to verify your identity.</p>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    )
  }

  const showForm = !record || editing

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Identity verification
          </CardTitle>
          <CardDescription>
            Vendors and service providers verify their identity before they can receive payouts.
            An admin checks your details against your National Identification Number (NIN).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">{error}</div>
          )}

          {record && !editing && (
            <div className="space-y-4">
              {record.status === "approved" && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                  <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">You&apos;re verified</p>
                    <p className="text-sm">Your identity has been confirmed, so you&apos;re eligible for payouts.</p>
                  </div>
                </div>
              )}
              {record.status === "pending" && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
                  <Clock className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Under review</p>
                    <p className="text-sm">An admin will check your details soon. This page updates automatically.</p>
                  </div>
                </div>
              )}
              {record.status === "rejected" && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">We couldn&apos;t verify your identity</p>
                    <p className="text-sm">{record.rejectionReason || "Please check your details and submit them again."}</p>
                  </div>
                </div>
              )}

              <dl className="grid grid-cols-3 gap-2 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="col-span-2">{[record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")}</dd>
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd className="col-span-2">{record.dateOfBirth}</dd>
                <dt className="text-muted-foreground">NIN</dt>
                <dd className="col-span-2 font-mono">{maskNin(record.nin)}</dd>
              </dl>

              {record.status === "rejected" && (
                <Button onClick={startEditing}>Update and resubmit</Button>
              )}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your name exactly as it appears on your NIN record.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <Label htmlFor="middleName">Middle name</Label>
                  <Input id="middleName" value={form.middleName} onChange={(e) => updateField("middleName", e.target.value)} autoComplete="additional-name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} autoComplete="family-name" />
                </div>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  max={maxDateOfBirth()}
                  value={form.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  autoComplete="bday"
                />
              </div>
              <div>
                <Label htmlFor="nin">National Identification Number (NIN) *</Label>
                <Input
                  id="nin"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="11 digits"
                  value={form.nin}
                  onChange={(e) => updateField("nin", e.target.value.replace(/\D/g, ""))}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
                <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                  I confirm these details are mine and accurate, and I consent to RUACH E-STORE storing them
                  and using them to verify my identity.
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {record ? "Resubmit for review" : "Submit for review"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={submitting}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
