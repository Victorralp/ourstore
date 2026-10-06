import { NextResponse } from "next/server"
import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin"
import { getRequestUser } from "@/lib/api-auth.server"
import { initializeTransaction, isPaystackConfigured, toKobo } from "@/lib/paystack.server"
import { computeTotals, getShippingOption, roundNaira, unitPrice, type DeliveryType } from "@/lib/checkout-pricing"

export const runtime = "nodejs"

// Starts a Paystack payment for the signed-in customer's cart. The order and its
// total are built here from stored product prices, never from prices sent by the
// browser, and the order stays unpaid until Paystack confirms the payment.

const MAX_ITEMS = 50
const MAX_QUANTITY = 99

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

const badRequest = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  if (!isPaystackConfigured() || !isFirebaseAdminConfigured()) {
    return badRequest("Online payments aren't set up yet. Please try again later.", 503)
  }

  const user = await getRequestUser(request)
  if (!user) return badRequest("Please sign in to place an order.", 401)

  const body = await request.json().catch(() => null)
  if (!body) return badRequest("Invalid request")

  // Cart: productId + quantity only; prices come from the database
  const requested: Array<{ productId: string; quantity: number }> = Array.isArray(body.items)
    ? body.items.map((item: any) => ({ productId: text(item?.productId), quantity: Number(item?.quantity) }))
    : []
  if (requested.length === 0 || requested.length > MAX_ITEMS) return badRequest("Your cart is empty or too large.")
  if (new Set(requested.map((item) => item.productId)).size !== requested.length) return badRequest("Invalid cart.")
  if (requested.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY)) {
    return badRequest("Invalid quantity in cart.")
  }

  const shippingAddress = readAddress(body.shipping)
  const email = text(body.shipping?.email)
  if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address1 || !shippingAddress.city
    || !shippingAddress.postalCode || !shippingAddress.phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("Please complete your shipping details.")
  }
  const billingAddress = body.billing ? { ...readAddress(body.billing), phone: shippingAddress.phone } : shippingAddress

  const deliveryType = body.deliveryType as DeliveryType
  const shippingOption = deliveryType === "lagos" || deliveryType === "other"
    ? getShippingOption(deliveryType, text(body.shippingOptionId))
    : undefined
  if (!shippingOption) return badRequest("Please choose a delivery option.")

  const db = adminDb()
  const productSnaps = await db.getAll(...requested.map((item) => db.collection("products").doc(item.productId)))

  const items = []
  for (const [index, snap] of productSnaps.entries()) {
    const product = snap.data()
    const { quantity } = requested[index]
    if (!snap.exists || !product || typeof product.price !== "number") {
      return badRequest("An item in your cart is no longer available. Please remove it and try again.", 409)
    }
    const stock = typeof product.stockQuantity === "number" ? product.stockQuantity : null
    if (product.inStock === false || (stock !== null && stock < quantity)) {
      return badRequest(`Sorry, there isn't enough stock of ${product.name}.`, 409)
    }
    const price = unitPrice(product as { price: number; discount?: number })
    items.push({
      productId: snap.id,
      name: product.name,
      image: product.cloudinaryImages?.[0]?.url || product.images?.[0] || "",
      price,
      quantity,
      total: roundNaira(price * quantity),
      ...(product.vendorId ? { vendorId: product.vendorId } : {}),
    })
  }

  const totals = computeTotals(items.map((item) => item.total), shippingOption.price)
  const orderRef = db.collection("orders").doc()
  // Unique per attempt; Paystack allows letters, digits, "-", "." and "="
  const reference = `${orderRef.id}-${Date.now()}`
  const now = new Date()
  const deliveryDays = deliveryType === "lagos" ? 2 : 5

  await orderRef.set({
    userId: user.uid,
    orderNumber: `AYO-${Date.now()}-${orderRef.id.slice(0, 6).toUpperCase()}`,
    items,
    ...totals,
    currency: "NGN",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "paystack",
    paymentReference: reference,
    deliveryType,
    shippingOptionId: shippingOption.id,
    shippingAddress,
    billingAddress,
    customerEmail: email,
    estimatedDelivery: new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
  })

  try {
    const transaction = await initializeTransaction({
      email,
      amountKobo: toKobo(totals.total),
      reference,
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL || new URL("/checkout/verify", request.url).toString(),
      metadata: { orderId: orderRef.id, userId: user.uid },
    })
    return NextResponse.json({ orderId: orderRef.id, authorizationUrl: transaction.authorization_url, total: totals.total })
  } catch (error: any) {
    console.error("Paystack initialize failed:", error)
    await orderRef.update({ paymentStatus: "failed", updatedAt: new Date() })
    return badRequest("We couldn't start the payment. Please try again.", 502)
  }
}
