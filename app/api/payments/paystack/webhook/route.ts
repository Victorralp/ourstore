import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin"
import { isPaystackConfigured, isValidWebhookSignature, verifyTransaction } from "@/lib/paystack.server"
import { markOrderPaid, PaymentMismatchError } from "@/lib/order-payments.server"

export const runtime = "nodejs"

// Paystack calls this when a payment succeeds, so orders are marked paid even if
// the customer closes the tab before returning to the store. Set its URL in the
// Paystack dashboard: https://<your-domain>/api/payments/paystack/webhook
export async function POST(request: Request) {
  if (!isPaystackConfigured() || !isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  if (!isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  if (event?.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ received: true })
  }

  try {
    // Re-check with Paystack rather than relying on the event body alone
    const transaction = await verifyTransaction(event.data.reference)
    await markOrderPaid(transaction)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    if (error instanceof PaymentMismatchError) {
      // Retrying won't help; log it for follow-up and acknowledge
      console.error("Paystack webhook payment didn't match its order:", error.message)
      return NextResponse.json({ received: true })
    }
    // Transient failure: a non-2xx makes Paystack retry later
    console.error("Paystack webhook failed:", error)
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 })
  }
}
