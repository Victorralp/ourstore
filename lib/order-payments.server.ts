import { adminDb } from "./firebase-admin"
import { toKobo, type PaystackTransaction } from "./paystack.server"

// A payment that can never succeed for its order (wrong amount, wrong order...).
// Distinct from transient errors, which are worth retrying.
export class PaymentMismatchError extends Error {}

// Apply a successful, verified Paystack transaction to its order: mark the order
// paid and take its items out of stock, in one transaction. Safe to call more
// than once, e.g. from both the return page and the webhook.
//
// Stock is checked at checkout but not reserved, so two customers can pay for
// the last unit. The later payment is still recorded as paid (the money was
// taken), but stock isn't touched and the order is flagged for a refund.
export async function markOrderPaid(transaction: PaystackTransaction) {
  const orderId = transaction.metadata?.orderId
  if (!orderId) throw new PaymentMismatchError("This payment isn't linked to an order")
  if (transaction.status !== "success") throw new PaymentMismatchError("This payment hasn't succeeded")

  const db = adminDb()
  const orderRef = db.collection("orders").doc(orderId)

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) throw new PaymentMismatchError("Order not found")
    const order = orderSnap.data()!

    if (order.paymentReference !== transaction.reference) {
      throw new PaymentMismatchError("This payment belongs to a different checkout")
    }
    if (order.paymentStatus === "paid") return { orderId, alreadyPaid: true, needsRefund: !!order.needsRefund }

    // `amount` includes any Paystack fee passed on to the customer, so compare
    // what we asked Paystack to charge
    const charged = transaction.requested_amount ?? transaction.amount
    if (transaction.currency !== "NGN" || charged !== toKobo(order.total)) {
      throw new PaymentMismatchError("The amount paid doesn't match the order total")
    }

    // Firestore transactions need every read before the first write
    const items: Array<{ productId: string; quantity: number }> = order.items ?? []
    const productSnaps = items.length > 0
      ? await tx.getAll(...items.map((item) => db.collection("products").doc(item.productId)))
      : []

    const shortages = productSnaps.flatMap((snap, index) => {
      const stock = snap.data()?.stockQuantity
      const { productId, quantity } = items[index]
      const sellable = snap.exists && snap.data()?.inStock !== false
      if (sellable && (typeof stock !== "number" || stock >= quantity)) return []
      return [{ productId, requested: quantity, available: sellable && typeof stock === "number" ? stock : 0 }]
    })

    // An order an admin cancelled can't be fulfilled either
    const cancelledByAdmin = order.status === "cancelled" && order.paymentStatus !== "abandoned"
    const needsRefund = shortages.length > 0 || cancelledByAdmin

    // Only take stock when the whole order can be fulfilled
    if (!needsRefund) {
      productSnaps.forEach((snap, index) => {
        const stock = snap.data()?.stockQuantity
        if (typeof stock !== "number") return
        const newStock = stock - items[index].quantity
        tx.update(snap.ref, { stockQuantity: newStock, inStock: newStock > 0 })
      })
    }

    tx.update(orderRef, {
      paymentStatus: "paid",
      // A superseded checkout that was paid after all becomes a live order again
      ...(order.paymentStatus === "abandoned" ? { status: "pending" } : {}),
      ...(needsRefund ? { needsRefund: true } : {}),
      ...(shortages.length > 0 ? { stockShortage: shortages } : {}),
      paymentChannel: transaction.channel ?? null,
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : new Date(),
      updatedAt: new Date(),
    })
    return { orderId, alreadyPaid: false, needsRefund }
  })
}

// Record a payment Paystack reports as failed, unless the order was already paid
export async function markOrderPaymentFailed(orderId: string, reference: string) {
  const db = adminDb()
  const orderRef = db.collection("orders").doc(orderId)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef)
    const order = snap.data()
    if (!order || order.paymentReference !== reference || order.paymentStatus === "paid") return
    tx.update(orderRef, { paymentStatus: "failed", updatedAt: new Date() })
  })
}
