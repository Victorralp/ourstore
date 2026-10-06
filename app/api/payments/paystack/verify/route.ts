import { NextResponse } from "next/server"
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin"
import { getRequestUser } from "@/lib/api-auth.server"
import { isPaystackConfigured, verifyTransaction } from "@/lib/paystack.server"
import { markOrderPaid, markOrderPaymentFailed, PaymentMismatchError } from "@/lib/order-payments.server"

export const runtime = "nodejs"

// Called by the checkout return page after Paystack redirects back. Asks Paystack
// for the payment's real status rather than trusting the redirect.
export async function GET(request: Request) {
  if (!isPaystackConfigured() || !isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Online payments aren't set up yet." }, { status: 503 })
  }

  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 })

  const reference = new URL(request.url).searchParams.get("reference")?.trim()
  if (!reference) return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })

  try {
    const transaction = await verifyTransaction(reference)
    const orderId = transaction.metadata?.orderId
    if (!orderId) return NextResponse.json({ error: "Payment not found." }, { status: 404 })

    // Only the customer who placed the order can check it
    const order = (await adminDb().collection("orders").doc(orderId).get()).data()
    if (!order || order.userId !== user.uid) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 })
    }

    if (transaction.status === "success") {
      const { needsRefund } = await markOrderPaid(transaction)
      // What was bought, so the browser removes just these from the cart
      const items = Array.isArray(order.items)
        ? order.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity }))
        : []
      return NextResponse.json({ status: "paid", orderId, needsRefund, items })
    }
    if (transaction.status === "failed") {
      await markOrderPaymentFailed(orderId, reference)
      return NextResponse.json({ status: "failed", orderId })
    }
    // abandoned, ongoing, pending...
    return NextResponse.json({ status: "pending", orderId })
  } catch (error: any) {
    if (error instanceof PaymentMismatchError) {
      console.error("Paystack payment didn't match its order:", error.message)
      return NextResponse.json({ status: "failed", error: error.message }, { status: 409 })
    }
    console.error("Paystack verify failed:", error)
    return NextResponse.json({ error: "We couldn't check your payment. Please try again." }, { status: 502 })
  }
}
