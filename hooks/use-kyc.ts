"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { listenToKycRecord, type KycRecord } from "@/lib/firebase-kyc"

interface UseKycResult {
  // null when the signed-in user hasn't submitted anything yet
  record: KycRecord | null
  loading: boolean
  error: string | null
}

// The signed-in user's identity verification record, kept live
export function useKyc(): UseKycResult {
  const { user, isLoading: authLoading } = useAuth()
  const [result, setResult] = useState<{ uid: string; record: KycRecord | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    setError(null)
    const unsubscribe = listenToKycRecord(
      user.uid,
      (record) => setResult({ uid: user.uid, record }),
      (err) => setError(err.message || "Couldn't load your verification status")
    )
    return unsubscribe
  }, [user])

  // Only trust a result that belongs to the signed-in user
  const loaded = !!user && result?.uid === user.uid
  return {
    record: loaded ? result.record : null,
    loading: authLoading || (!!user && !loaded && !error),
    error,
  }
}
