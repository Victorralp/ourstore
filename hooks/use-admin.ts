"use client"

import { useEffect, useState } from "react"
import { getIdTokenResult } from "firebase/auth"
import { useAuth } from "@/components/auth-provider"

interface UseAdminResult {
  isAdmin: boolean
  loading: boolean
}

export function useAdmin(): UseAdminResult {
  const { user, profile, isLoading: authLoading } = useAuth()
  // Result of the custom-claims check, tagged with the uid it was run for
  const [claims, setClaims] = useState<{ uid: string; admin: boolean } | null>(null)

  useEffect(() => {
    if (!user) return

    let active = true

    getIdTokenResult(user, /* forceRefresh */ true)
      .then((tokenResult) => {
        if (active) setClaims({ uid: user.uid, admin: !!tokenResult.claims?.admin })
      })
      .catch((err) => {
        console.error("Failed to read ID token claims", err)
        if (active) setClaims({ uid: user.uid, admin: false })
      })

    return () => {
      active = false
    }
  }, [user])

  // Admin if either the custom claim or the Firestore profile role says so.
  // Both are derived during render so callers never see a stale "not admin, done loading" state.
  const roleAdmin = profile?.role === "admin"
  const claimsChecked = claims?.uid === user?.uid
  const claimsAdmin = claimsChecked && !!claims?.admin

  return {
    isAdmin: !!user && (roleAdmin || claimsAdmin),
    loading: authLoading || (!!user && !roleAdmin && !claimsChecked),
  }
}
