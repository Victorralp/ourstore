// Why an order can't be moved to a fulfilment status (processing, shipped,
// delivered), or null if it can. Cancelling is always allowed.
export function fulfilmentBlockedReason(
  order: { paymentMethod?: string; paymentStatus?: string; needsRefund?: boolean },
  newStatus: string,
) {
  if (newStatus === "cancelled") return null
  if (order.needsRefund) return "This order needs a refund, so it can't be processed or shipped."
  if (order.paymentMethod === "paystack" && order.paymentStatus !== "paid") {
    return "This order hasn't been paid, so it can't be processed or shipped."
  }
  return null
}
