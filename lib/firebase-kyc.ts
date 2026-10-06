import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, Timestamp } from "firebase/firestore"
import { db } from "./firebase"

// Identity verification (KYC) for vendors and service providers.
// One record per person, keyed by their Firebase UID, kept out of the public
// vendor and service provider documents because it holds personal data.

export type KycStatus = "pending" | "approved" | "rejected"

export interface KycRecord {
  uid: string
  email: string
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  nin: string // 11-digit National Identification Number
  status: KycStatus
  rejectionReason?: string
  submittedAt: Date | null
  reviewedAt?: Date | null
  reviewedBy?: string
}

export type KycSubmission = Pick<KycRecord, "firstName" | "middleName" | "lastName" | "dateOfBirth" | "nin">

const kycCollection = collection(db, "kyc")

export const isValidNin = (nin: string) => /^\d{11}$/.test(nin)

// Show only the last 4 digits, e.g. "•••••••1234"
export const maskNin = (nin: string) => `${"•".repeat(Math.max(nin.length - 4, 0))}${nin.slice(-4)}`

const toKycRecord = (uid: string, data: any): KycRecord => ({
  ...data,
  uid,
  submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : null,
  reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : null,
})

export const getKycRecord = async (uid: string): Promise<KycRecord | null> => {
  const snapshot = await getDoc(doc(kycCollection, uid))
  return snapshot.exists() ? toKycRecord(uid, snapshot.data()) : null
}

// Live updates for one person's record, so the status changes as soon as an admin reviews it
export const listenToKycRecord = (
  uid: string,
  callback: (record: KycRecord | null) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    doc(kycCollection, uid),
    (snapshot) => callback(snapshot.exists() ? toKycRecord(uid, snapshot.data()) : null),
    (error) => {
      console.error("Error listening to KYC record:", error)
      onError?.(error)
    }
  )

// Submit or resubmit details for review. Always goes back to "pending".
export const submitKyc = async (uid: string, email: string, submission: KycSubmission) => {
  const nin = submission.nin.trim()
  if (!isValidNin(nin)) {
    throw new Error("NIN must be exactly 11 digits")
  }

  const existing = await getKycRecord(uid)
  if (existing?.status === "approved") {
    throw new Error("Your identity is already verified")
  }

  await setDoc(doc(kycCollection, uid), {
    uid,
    email,
    firstName: submission.firstName.trim(),
    middleName: submission.middleName?.trim() || "",
    lastName: submission.lastName.trim(),
    dateOfBirth: submission.dateOfBirth,
    nin,
    status: "pending",
    rejectionReason: "",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: "",
  })
}

// Admin: submissions with a given status, newest first
export const getKycSubmissions = async (status: KycStatus): Promise<KycRecord[]> => {
  const snapshot = await getDocs(query(kycCollection, where("status", "==", status)))
  return snapshot.docs
    .map((kycDoc) => toKycRecord(kycDoc.id, kycDoc.data()))
    .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
}

export const approveKyc = async (uid: string, adminUid: string) => {
  await updateDoc(doc(kycCollection, uid), {
    status: "approved",
    rejectionReason: "",
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
  })
}

export const rejectKyc = async (uid: string, adminUid: string, reason: string) => {
  if (!reason.trim()) {
    throw new Error("Please give a reason so the applicant knows what to fix")
  }
  await updateDoc(doc(kycCollection, uid), {
    status: "rejected",
    rejectionReason: reason.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
  })
}

// Payouts must only go to verified people. Use this when payouts are built.
export const isKycApproved = (record: KycRecord | null | undefined) => record?.status === "approved"
