import { createHash } from "crypto"
import { NextResponse } from "next/server"
import type { DocumentReference } from "firebase-admin/firestore"
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin"
import { getRequestUser } from "@/lib/api-auth.server"
import { initializeTransaction, isPaystackConfigured, toKobo } from "@/lib/paystack.server"
import { computeTotals, getShippingOption, INTERNATIONAL_OPTION_ID, roundNaira, unitPrice, type DeliveryType } from "@/lib/checkout-pricing"

export const runtime = "nodejs"

// Starts a Paystack payment for the signed-in customer's cart. The order and its
// total are built here from stored product prices, never from prices sent by the
// browser, and the order stays unpaid until Paystack confirms the payment.

const MAX_ITEMS = 50
const MAX_QUANTITY = 99
// Firestore document ids as this app creates them; also rules out "/" paths
const PRODUCT_ID = /^[A-Za-z0-9_-]{1,128}$/
// The browser's id for one checkout attempt (a UUID)
const ATTEMPT_ID = /^[A-Za-z0-9-]{8,64}$/

const text = (value: unknown, maxLength = 200) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : ""

const readAddress = (value: any) => ({
  firstName: text(value?.firstName),
  lastName: text(value?.lastName),
  address1: text(value?.address, 300),
  city: text(value?.city),
  state: text(value?.state),
  postalCode: text(value?.postalCode, 20),
  country: text(value?.country) || "Nigeria",
  phone: text(value?.phone, 30),
})

const errorResponse = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status })

// Where Paystack sends customers back to. Prefer the configured public URL; behind
// a reverse proxy, request.url is the internal address, so use the forwarded host.
const callbackUrl = (request: Request) => {
  if (process.env.PAYSTACK_CALLBACK_URL) return process.env.PAYSTACK_CALLBACK_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")
  if (siteUrl) return `${siteUrl}/checkout/verify`
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim()
  const proto = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim()
    || new URL(request.url).protocol.replace(":", "")
  return host ? `${proto}://${host}/checkout/verify` : new URL("/checkout/verify", request.url).toString()
}

// Firestore's ALREADY_EXISTS, from create() on an order id that's taken
const isAlreadyExists = (error: any) => error?.code === 6 || /ALREADY_EXISTS/.test(String(error?.message))

// A retry of a checkout attempt that already has an order
async function resumeAttempt(orderRef: DocumentReference, total: number) {
  const order = (await orderRef.get()).data()
  if (order?.paymentStatus === "pending" && typeof order.authorizationUrl === "string") {
    return NextResponse.json({ orderId: orderRef.id, authorizationUrl: order.authorizationUrl, total })
  }
  if (order?.paymentStatus === "pending") {
    // The first request is still starting the payment
    return errorResponse("Your payment is already being set up. Please wait a moment and try again.", 409)
  }
  if (order?.paymentStatus === "paid") {
    return errorResponse("This order has already been paid.", 409, { code: "already_paid", orderId: orderRef.id })
  }
  return errorResponse("This checkout has expired. Please try again.", 409)
}

export async function POST(request: Request) {
  if (!isPaystackConfigured() || !isFirebaseAdminConfigured()) {
    return errorResponse("Online payments aren't set up yet. Please try again later.", 503)
  }

  try {
    const user = await getRequestUser(request)
    if (!user) return errorResponse("Please sign in to place an order.", 401)

    const body = await request.json().catch(() => null)
    if (!body) return errorResponse("Invalid request")

    // Cart: productId + quantity only; prices come from the database
    const requested: Array<{ productId: string; quantity: number }> = Array.isArray(body.items)
      ? body.items.map((item: any) => ({ productId: text(item?.productId), quantity: Number(item?.quantity) }))
      : []
    if (requested.length === 0 || requested.length > MAX_ITEMS) return errorResponse("Your cart is empty or too large.")
    if (new Set(requested.map((item) => item.productId)).size !== requested.length) return errorResponse("Invalid cart.")
    if (requested.some((item) => !PRODUCT_ID.test(item.productId))) {
      return errorResponse("An item in your cart is no longer available. Please remove it and try again.", 409)
    }
    if (requested.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY)) {
      return errorResponse("Invalid quantity in cart.")
    }

    const shippingAddress = readAddress(body.shipping)
    const email = text(body.shipping?.email)
    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address1 || !shippingAddress.city
      || !shippingAddress.postalCode || !shippingAddress.phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Please complete your shipping details.")
    }
    const billingAddress = body.billing ? { ...readAddress(body.billing), phone: shippingAddress.phone } : shippingAddress

    const deliveryType = body.deliveryType as DeliveryType
    const shippingOption = deliveryType === "lagos" || deliveryType === "other"
      ? getShippingOption(deliveryType, text(body.shippingOptionId))
      : undefined
    if (!shippingOption) return errorResponse("Please choose a delivery option.")

    // Only international delivery goes abroad, and it needs the customer's country
    if (shippingOption.id === INTERNATIONAL_OPTION_ID) {
      if (!text(body.shipping?.country) || shippingAddress.country.toLowerCase() === "nigeria") {
        return errorResponse("Please enter the country to deliver to.")
      }
    } else {
      shippingAddress.country = "Nigeria"
    }

    const attemptId = text(body.attemptId, 64)
    if (!ATTEMPT_ID.test(attemptId)) return errorResponse("Invalid request")

    const db = adminDb()
    const productSnaps = await db.getAll(...requested.map((item) => db.collection("products").doc(item.productId)))

    // Products from vendor stores can only be sold once the store is approved
    const vendorIds = [...new Set(productSnaps
      .map((snap) => snap.data()?.vendorId)
      .filter((id): id is string => typeof id === "string" && PRODUCT_ID.test(id)))]
    const vendorSnaps = vendorIds.length > 0
      ? await db.getAll(...vendorIds.map((id) => db.collection("vendors").doc(id)))
      : []
    const approvedVendors = new Set(vendorSnaps
      .filter((snap) => snap.data()?.approved === true && snap.data()?.isActive !== false)
      .map((snap) => snap.id))

    const items = []
    for (const [index, snap] of productSnaps.entries()) {
      const product = snap.data()
      const { quantity } = requested[index]
      const name = typeof product?.name === "string" && product.name.trim() ? product.name.trim() : "This item"

      if (!snap.exists || !product || typeof product.price !== "number" || !(product.price > 0)) {
        return errorResponse("An item in your cart is no longer available. Please remove it and try again.", 409)
      }
      const soldByVendor = typeof product.vendorId === "string" && product.vendorId !== ""
      if (soldByVendor && !approvedVendors.has(product.vendorId)) {
        return errorResponse(`${name} isn't available to buy right now. Please remove it and try again.`, 409)
      }
      const stock = typeof product.stockQuantity === "number" ? product.stockQuantity : null
      if (product.inStock === false || (stock !== null && stock < quantity)) {
        return errorResponse(`Sorry, there isn't enough stock of ${name}.`, 409)
      }

      const price = unitPrice({ price: product.price, discount: typeof product.discount === "number" ? product.discount : undefined })
      const image = product.cloudinaryImages?.[0]?.url || product.images?.[0]
      items.push({
        productId: snap.id,
        name,
        image: typeof image === "string" ? image : "",
        price,
        quantity,
        total: roundNaira(price * quantity),
        ...(typeof product.vendorId === "string" ? { vendorId: product.vendorId } : {}),
      })
    }

    const totals = computeTotals(items.map((item) => item.total), shippingOption.price)

    // Never charge a total the customer hasn't seen: if prices changed since the
    // cart was filled, send back the new total for them to confirm first
    const expectedTotal = Number(body.expectedTotal)
    if (!Number.isFinite(expectedTotal) || toKobo(expectedTotal) !== toKobo(totals.total)) {
      return errorResponse("Prices have changed since you added these items.", 409, { code: "total_changed", total: totals.total })
    }

    // One order per checkout attempt: the id comes from the attempt and everything
    // being bought, so a retry of the same attempt (say, after its response was
    // lost) finds the order it already created instead of making a second one
    // that could be paid as well.
    const orderId = createHash("sha256")
      .update(JSON.stringify([user.uid, attemptId, requested, shippingAddress, billingAddress, email, shippingOption.id, totals.total]))
      .digest("hex")
      .slice(0, 28)
    const orderRef = db.collection("orders").doc(orderId)
    // Paystack allows letters, digits, "-", "." and "="
    const reference = `${orderRef.id}-${Date.now()}`
    const now = new Date()
    const deliveryDays = deliveryType === "lagos" ? 2 : 5
    // The stores selling in this order, for vendor order lists and sales figures
    const orderVendorIds = [...new Set(items.flatMap((item) => item.vendorId ? [item.vendorId] : []))]

    try {
      await orderRef.create({
        userId: user.uid,
        orderNumber: `AYO-${Date.now()}-${orderRef.id.slice(0, 6).toUpperCase()}`,
        items,
        vendorIds: orderVendorIds,
        ...totals,
        currency: "NGN",
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: "paystack",
        paymentReference: reference,
        deliveryType,
        shippingOptionId: shippingOption.id,
        shippingMethod: shippingOption.name,
        shippingAddress,
        billingAddress,
        customerEmail: email,
        estimatedDelivery: new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      })
    } catch (error: any) {
      if (!isAlreadyExists(error)) throw error
      return resumeAttempt(orderRef, totals.total)
    }

    let authorizationUrl: string
    try {
      const transaction = await initializeTransaction({
        email,
        amountKobo: toKobo(totals.total),
        reference,
        callbackUrl: callbackUrl(request),
        metadata: { orderId: orderRef.id, userId: user.uid },
      })
      authorizationUrl = transaction.authorization_url
      // Kept so a retry of this attempt can send the customer to the same payment
      await orderRef.update({ authorizationUrl, updatedAt: new Date() })
    } catch (error) {
      console.error("Paystack initialize failed:", error)
      await orderRef.update({ paymentStatus: "failed", status: "cancelled", updatedAt: new Date() })
      return errorResponse("We couldn't start the payment. Please try again.", 502)
    }

    // Earlier unpaid attempts by this customer are superseded by this one, so
    // they don't linger as "pending" orders. If one is paid after all, the
    // payment confirmation turns it back into a live order.
    try {
      const earlier = await db.collection("orders")
        .where("userId", "==", user.uid)
        .where("paymentStatus", "==", "pending")
        .get()
      const batch = db.batch()
      earlier.docs
        .filter((doc) => doc.id !== orderRef.id && doc.data().paymentMethod === "paystack")
        .forEach((doc) => batch.update(doc.ref, { paymentStatus: "abandoned", status: "cancelled", updatedAt: new Date() }))
      await batch.commit()
    } catch (error) {
      // Cleanup only; never block the customer's payment over it
      console.error("Couldn't cancel earlier unpaid checkouts:", error)
    }

    return NextResponse.json({ orderId: orderRef.id, authorizationUrl, total: totals.total })
  } catch (error) {
    console.error("Paystack initialize error:", error)
    return errorResponse("Something went wrong starting your payment. Please try again.", 500)
  }
}
