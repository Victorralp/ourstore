"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { approveKyc, getKycSubmissions, maskNin, rejectKyc, type KycRecord, type KycStatus } from "@/lib/firebase-kyc"

const statusStyles: Record<KycStatus, string> = {
  pending: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

const formatDate = (date: Date | null | undefined) =>
  date ? date.toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

const fullName = (record: KycRecord) => [record.firstName, record.middleName, record.lastName].filter(Boolean).join(" ")

export default function AdminKycPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState<KycStatus>("pending")
  const [records, setRecords] = useState<KycRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<KycRecord | null>(null)
  const [showNin, setShowNin] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [acting, setActing] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await getKycSubmissions(status))
    } catch (err: any) {
      setError(err?.message || "Failed to load verification requests")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const openReview = (record: KycRecord) => {
    setSelected(record)
    setShowNin(false)
    setRejectionReason("")
  }

  const review = async (decision: "approve" | "reject") => {
    if (!selected || !user) return
    setActing(true)
    try {
      if (decision === "approve") {
        await approveKyc(selected.uid, user.uid)
      } else {
        await rejectKyc(selected.uid, user.uid, rejectionReason)
      }
      toast({
        title: decision === "approve" ? "Identity verified" : "Verification rejected",
        description: `${fullName(selected)} has been ${decision === "approve" ? "approved" : "rejected"}.`,
      })
      setSelected(null)
      await loadRecords()
    } catch (err: any) {
      toast({ title: "Couldn't save the decision", description: err?.message || "Please try again.", variant: "destructive" })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7" />
          Identity Verification
        </h1>
        <p className="text-muted-foreground">
          Check vendor and service provider details against their NIN, then approve or reject. Only verified sellers can receive payouts.
        </p>
      </div>

      <Tabs value={status} onValueChange={(value) => setStatus(value as KycStatus)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadRecords}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading verification requests...</span>
        </div>
      ) : records.length === 0 && !error ? (
        <div className="text-center py-16 text-muted-foreground">No {status} verification requests.</div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.uid}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fullName(record)}</span>
                    <Badge variant="secondary" className={statusStyles[record.status]}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {record.email || "No email"} · NIN <span className="font-mono">{maskNin(record.nin)}</span> · Submitted {formatDate(record.submittedAt)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openReview(record)}>
                  {record.status === "pending" ? "Review" : "View"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && !acting && setSelected(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{fullName(selected)}</DialogTitle>
                <DialogDescription>
                  Check these details against the NIN record before approving.
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-3 gap-2 text-sm">
                <dt className="text-muted-foreground">First name</dt>
                <dd className="col-span-2">{selected.firstName}</dd>
                <dt className="text-muted-foreground">Middle name</dt>
                <dd className="col-span-2">{selected.middleName || "—"}</dd>
                <dt className="text-muted-foreground">Last name</dt>
                <dd className="col-span-2">{selected.lastName}</dd>
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd className="col-span-2">{selected.dateOfBirth}</dd>
                <dt className="text-muted-foreground">NIN</dt>
                <dd className="col-span-2 flex items-center gap-2">
                  <span className="font-mono">{showNin ? selected.nin : maskNin(selected.nin)}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNin((shown) => !shown)}>
                    {showNin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showNin ? "Hide NIN" : "Show NIN"}</span>
                  </Button>
                </dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="col-span-2">{selected.email || "—"}</dd>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="col-span-2">{formatDate(selected.submittedAt)}</dd>
                {selected.status !== "pending" && (
                  <>
                    <dt className="text-muted-foreground">Reviewed</dt>
                    <dd className="col-span-2">{formatDate(selected.reviewedAt)}</dd>
                  </>
                )}
                {selected.status === "rejected" && (
                  <>
                    <dt className="text-muted-foreground">Reason</dt>
                    <dd className="col-span-2">{selected.rejectionReason || "—"}</dd>
                  </>
                )}
              </dl>

              {selected.status !== "approved" && (
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Reason for rejection (shown to the applicant)</Label>
                  <Textarea
                    id="rejectionReason"
                    rows={3}
                    placeholder="e.g. The name doesn't match the NIN record"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelected(null)} disabled={acting}>
                  Close
                </Button>
                {selected.status !== "approved" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => review("reject")}
                      disabled={acting || !rejectionReason.trim()}
                    >
                      Reject
                    </Button>
                    <Button onClick={() => review("approve")} disabled={acting}>
                      {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
