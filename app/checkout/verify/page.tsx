"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useCart } from "@/components/cart-provider"
import { clearCheckoutAttemptId } from "@/lib/checkout-attempt"

type VerifyState =
  | { kind: "checking" }
  | { kind: "paid"; orderId: string; needsRefund: boolean; items: Array<{ productId: string; quantity: number }> }
  | { kind: "failed"; message: string }
  | { kind: "pending"; orderId?: string }
  | { kind: "error"; message: string }

// Paystack sends the customer here after paying, with ?reference=... (and trxref).
// The payment's real status always comes from the server, never from the URL.
function VerifyPayment() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("trxref")
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { removePurchasedItems } = useCart()
  const [state, setState] = useState<VerifyState>({ kind: "checking" })
  const clearedCart = useRef(false)

  const verify = useCallback(async () => {
    if (!user || !reference) return
    setState({ kind: "checking" })
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json().catch(() => null)

      if (result?.status === "paid") {
        setState({
          kind: "paid",
          orderId: result.orderId,
          needsRefund: !!result.needsRefund,
          items: Array.isArray(result.items) ? result.items : [],
        })
      } else if (result?.status === "failed") {
        setState({ kind: "failed", message: result.error || "Your payment didn't go through." })
      } else if (result?.status === "pending") {
        setState({ kind: "pending", orderId: result.orderId })
      } else {
        setState({ kind: "error", message: result?.error || "We couldn't check your payment." })
      }
    } catch {
      setState({ kind: "error", message: "We couldn't check your payment. Please check your connection." })
    }
  }, [user, reference])

  useEffect(() => {
    if (!authLoading) verify()
  }, [authLoading, verify])

  // Once paid: take the order's items out of the cart and show the order (unless
  // it needs a refund, in which case the customer stays here to read why)
  useEffect(() => {
    if (state.kind !== "paid" || clearedCart.current) return
    clearedCart.current = true
    removePurchasedItems(state.items)
    // The next checkout is a new attempt
    clearCheckoutAttemptId()
    if (!state.needsRefund) {
      router.replace(`/order-confirmation?orderId=${encodeURIComponent(state.orderId)}`)
    }
  }, [state, removePurchasedItems, router])

  if (!reference) {
    return <Message icon={<XCircle className="h-10 w-10 text-red-600" />} title="No payment to check"
      text="This page is opened by Paystack after you pay." action={<Button asChild><Link href="/checkout">Back to checkout</Link></Button>} />
  }
  if (!authLoading && !user) {
    return <Message icon={<XCircle className="h-10 w-10 text-red-600" />} title="Please sign in"
      text="Sign in with the account you used at checkout to see your payment."
      action={<Button asChild><Link href={`/login?redirect=${encodeURIComponent(`/checkout/verify?reference=${reference}`)}`}>Sign in</Link></Button>} />
  }

  switch (state.kind) {
    case "checking":
      return <Message icon={<Loader2 className="h-10 w-10 animate-spin" />} title="Confirming your payment..." text="This usually takes a few seconds." />
    case "paid":
      if (state.needsRefund) {
        return <Message icon={<Clock className="h-10 w-10 text-amber-600" />} title="Payment received, but we can't fulfil this order"
          text="An item sold out before your payment completed. Your payment is safe: we'll contact you and refund it in full."
          action={<Button asChild><Link href={`/profile/orders/${encodeURIComponent(state.orderId)}`}>View order</Link></Button>} />
      }
      return <Message icon={<CheckCircle className="h-10 w-10 text-green-600" />} title="Payment confirmed" text="Taking you to your order..." />
    case "failed":
      return <Message icon={<XCircle className="h-10 w-10 text-red-600" />} title="Payment failed" text={state.message}
        action={<Button asChild><Link href="/checkout">Try again</Link></Button>} />
    case "pending":
      return <Message icon={<Clock className="h-10 w-10 text-amber-600" />} title="Payment not completed yet"
        text="If you finished paying, it can take a moment to confirm. Otherwise you can go back and try again."
        action={<div className="flex gap-2 justify-center"><Button onClick={verify}>Check again</Button><Button variant="outline" asChild><Link href="/checkout">Back to checkout</Link></Button></div>} />
    case "error":
      return <Message icon={<XCircle className="h-10 w-10 text-red-600" />} title="Something went wrong" text={state.message}
        action={<Button onClick={verify}>Try again</Button>} />
  }
}

function Message({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <div className="flex justify-center">{icon}</div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">{text}</p>
          {action}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyPayment />
    </Suspense>
  )
}
