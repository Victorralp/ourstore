import crypto from "crypto"

// Server-side Paystack client. Uses the secret key, so never import this from
// client components.

const PAYSTACK_API = "https://api.paystack.co"

export const isPaystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY

const secretKey = () => {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set")
  return key
}

// Paystack amounts are in kobo
export const toKobo = (naira: number) => Math.round(naira * 100)

export interface PaystackTransaction {
  status: string // "success", "failed", "abandoned", "ongoing", "pending", ...
  reference: string
  amount: number // kobo actually paid, including any fees passed on to the customer
  requested_amount?: number // kobo we asked Paystack to charge
  currency: string
  channel?: string
  paid_at?: string | null
  metadata?: { orderId?: string; userId?: string } | null
}

const paystackRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body?.status) {
    throw new Error(body?.message || `Paystack request failed (${response.status})`)
  }
  return body.data as T
}

export const initializeTransaction = (params: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: { orderId: string; userId: string }
}) =>
  paystackRequest<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  })

export const verifyTransaction = (reference: string) =>
  paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`)

// Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the secret key
export const isValidWebhookSignature = (rawBody: string, signature: string | null) => {
  if (!signature) return false
  const expected = Buffer.from(crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex"), "hex")
  const received = Buffer.from(signature, "hex")
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}
