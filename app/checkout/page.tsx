"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Truck, Shield, Lock, ArrowLeft } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useSafeCurrency } from "@/hooks/use-safe-currency"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { NIGERIA_STATES } from "@/lib/nigeria-states"
import { clearCheckoutAttemptId, getCheckoutAttemptId } from "@/lib/checkout-attempt"
import { lagosShippingOptions, otherShippingOptions, computeTotals, getShippingOption, roundNaira, INTERNATIONAL_OPTION_ID, type DeliveryType } from "@/lib/checkout-pricing"
import Link from "next/link"
import ClientOnly from "@/components/client-only"

// TEMPORARILY DISABLED: import StripeCheckout from "@/components/stripe-checkout"

// NGN currency formatter and Nigeria states list for this page
const formatNaira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(amount)




const emptyShippingInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "Lagos",
  postalCode: "",
  country: "Nigeria",
}

const emptyBillingInfo = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  state: "Lagos",
  postalCode: "",
  country: "Nigeria",
}


export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  // We will override formatting to NGN on this page
  const formatPrice = (amount: number) => formatNaira(amount)
  const { user, profile, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shippingInfo, setShippingInfo] = useState(emptyShippingInfo)
  const [billingInfo, setBillingInfo] = useState(emptyBillingInfo)

  // Prefill shipping info after mount (avoids an SSR/CSR mismatch): the default saved
  // address first, then the account's name, email and phone. Only empty fields are
  // filled, so nothing the customer typed is overwritten.
  const prefilledFor = useRef<string | null>(null)
  const profileAppliedFor = useRef<string | null>(null)
  // Set once the customer picks a state themselves, so prefill never overrides it
  const stateChosenByCustomer = useRef(false)
  const markStateChosen = () => {
    stateChosenByCustomer.current = true
  }
  const [prefilledFromAddress, setPrefilledFromAddress] = useState(false)
  useEffect(() => {
    // A different account, or signing out, must never inherit the previous customer's details
    if (prefilledFor.current && prefilledFor.current !== user?.uid) {
      setShippingInfo(emptyShippingInfo)
      setBillingInfo(emptyBillingInfo)
      setPrefilledFromAddress(false)
      prefilledFor.current = null
      profileAppliedFor.current = null
      stateChosenByCustomer.current = false
    }

    // Wait for the profile to load so the default address isn't missed
    if (!user || authLoading) return

    // Fill once per account, and once more if the profile only arrives later
    // (e.g. after auth's loading timeout)
    const userProfile = profile?.uid === user.uid ? profile : null
    const profileAlreadyApplied = !userProfile || profileAppliedFor.current === user.uid
    if (prefilledFor.current === user.uid && profileAlreadyApplied) return
    prefilledFor.current = user.uid
    if (userProfile) {
      profileAppliedFor.current = user.uid
    }

    const defaultAddress = userProfile?.savedAddresses?.find((address) => address.isDefault)
    const [firstName = "", ...otherNames] = (defaultAddress?.name || user.displayName || "").split(" ")
    // Checkout ships within Nigeria, so only a Nigerian address's state can be used
    const savedState = defaultAddress?.country === "Nigeria" && defaultAddress.state
      && NIGERIA_STATES.includes(defaultAddress.state)
      ? defaultAddress.state
      : null

    setShippingInfo((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || otherNames.join(" "),
      email: prev.email || user.email || "",
      phone: prev.phone || userProfile?.phone || "",
      address: prev.address || defaultAddress?.address || "",
      city: prev.city || defaultAddress?.city || "",
      postalCode: prev.postalCode || defaultAddress?.postalCode || "",
      // The state always has a value, so only fill it if the customer hasn't picked one
      state: savedState && !stateChosenByCustomer.current ? savedState : prev.state,
    }))
    if (defaultAddress) {
      setPrefilledFromAddress(true)
    }
  }, [user, profile, authLoading])
  const [deliveryType, setDeliveryType] = useState('lagos');
  const [lagosShippingOptionId, setLagosShippingOptionId] = useState(lagosShippingOptions[0].id);
  const [otherShippingOptionId, setOtherShippingOptionId] = useState(otherShippingOptions[0].id);
  const [sameAsShipping, setSameAsShipping] = useState(true)

  // Same rules as the payment API, which recomputes the real amount from stored prices
  const shippingOption = getShippingOption(
    deliveryType as DeliveryType,
    deliveryType === "lagos" ? lagosShippingOptionId : otherShippingOptionId
  )
  const { subtotal, shipping: shippingCost, tax, total } = computeTotals(
    items.map((item) => roundNaira(item.price * item.quantity)),
    shippingOption?.price ?? 0
  )

  // A new total from the server, after prices changed, that the customer must accept
  const [confirmTotal, setConfirmTotal] = useState<number | null>(null)
  useEffect(() => {
    setConfirmTotal(null)
  }, [total])

  // International delivery needs the customer's own country; every other option
  // ships within Nigeria
  const isInternational = shippingOption?.id === INTERNATIONAL_OPTION_ID
  useEffect(() => {
    setShippingInfo((prev) => {
      if (isInternational) {
        return prev.country === "Nigeria" ? { ...prev, country: "", state: "" } : prev
      }
      return prev.country === "Nigeria"
        ? prev
        : { ...prev, country: "Nigeria", state: NIGERIA_STATES.includes(prev.state) ? prev.state : "Lagos" }
    })
  }, [isInternational])

  // Identifies this checkout attempt, so a retry after a lost response, a double
  // click, a reload or the same checkout in another tab gets the same order and
  // Paystack payment instead of a second one. The server derives the order from
  // this id and the cart, so a changed cart is still a new order. A new id is used
  // after the server turns an attempt down, or once it's paid.

  const handleShippingChange = (field: string, value: string) => {
    setShippingInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleBillingChange = (field: string, value: string) => {
    setBillingInfo((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return (
          shippingInfo.firstName &&
          shippingInfo.lastName &&
          shippingInfo.email &&
          shippingInfo.phone &&
          shippingInfo.address &&
          shippingInfo.city &&
          shippingInfo.postalCode &&
          (!isInternational || (shippingInfo.country.trim() && shippingInfo.country.trim().toLowerCase() !== "nigeria"))
        )
      case 2:
        if (sameAsShipping) return true
        return (
          billingInfo.firstName &&
          billingInfo.lastName &&
          billingInfo.address &&
          billingInfo.city &&
          billingInfo.postalCode
        )
      case 3:
        // Payment details are entered on Paystack's page, not here
        return true
      default:
        return false
    }
  }

  const handlePlaceOrder = async (expectedTotal: number) => {
    setIsProcessing(true)

    try {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to place an order.",
          variant: "destructive",
        })
        setIsProcessing(false)
        router.push("/login?redirect=/checkout")
        return
      }

      // The server builds the order from stored prices, so only ids, quantities
      // and delivery details are sent
      const attemptId = getCheckoutAttemptId()
      const token = await user.getIdToken()
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map(item => ({ productId: item.productId, quantity: item.quantity })),
          shipping: shippingInfo,
          billing: sameAsShipping ? null : billingInfo,
          deliveryType,
          shippingOptionId: deliveryType === "lagos" ? lagosShippingOptionId : otherShippingOptionId,
          // The total the customer agreed to; the server won't charge anything else
          expectedTotal,
          attemptId,
        }),
      })
      const result = await response.json().catch(() => null)
      // Turned down (or nothing created): the next try is a new attempt. Not while
      // the first request is still starting the payment, so a retry can resume it.
      if (!response.ok && result?.code !== "in_progress") clearCheckoutAttemptId()

      // Prices changed: show the new total and let the customer decide
      if (response.status === 409 && result?.code === "total_changed" && typeof result.total === "number") {
        setConfirmTotal(result.total)
        setIsProcessing(false)
        return
      }
      // A retry of an attempt that was already paid
      if (response.status === 409 && result?.code === "already_paid" && typeof result.orderId === "string") {
        router.push(`/order-confirmation?orderId=${encodeURIComponent(result.orderId)}`)
        return
      }
      if (!response.ok || !result?.authorizationUrl) {
        throw new Error(result?.error || "We couldn't start the payment. Please try again.")
      }

      // Pay on Paystack's page; it sends the customer back to /checkout/verify.
      // The cart is only cleared once the payment is confirmed.
      window.location.assign(result.authorizationUrl)
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({
        title: "Order failed",
        description: error.message || "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <ClientOnly>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/cart">Cart</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Checkout</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Checkout</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure checkout</span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              {[
                { number: 1, title: "Shipping" },
                { number: 2, title: "Billing" },
                { number: 3, title: "Payment" },
                { number: 4, title: "Review" },
              ].map((stepItem) => (
                <div key={stepItem.number} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepItem.number ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stepItem.number}
                  </div>
                  <span className="ml-2 text-sm font-medium">{stepItem.title}</span>
                  {stepItem.number < 4 && <div className="w-16 h-px bg-muted ml-4" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Shipping Information */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Information
                    </CardTitle>
                    {prefilledFromAddress && (
                      <p className="text-sm text-muted-foreground">
                        Filled in from your default saved address. You can change anything below, or{" "}
                        <Link href="/profile" className="underline">manage your addresses</Link>.
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={shippingInfo.firstName}
                          onChange={(e) => handleShippingChange("firstName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={shippingInfo.lastName}
                          onChange={(e) => handleShippingChange("lastName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={shippingInfo.email}
                          onChange={(e) => handleShippingChange("email", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={shippingInfo.phone}
                          onChange={(e) => handleShippingChange("phone", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={shippingInfo.address}
                        onChange={(e) => handleShippingChange("address", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={shippingInfo.city}
                          onChange={(e) => handleShippingChange("city", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={shippingInfo.postalCode}
                          onChange={(e) => handleShippingChange("postalCode", e.target.value)}
                          required
                        />
                      </div>
                      {isInternational ? (
                        <>
                          <div>
                            <Label htmlFor="country">Country *</Label>
                            <Input
                              id="country"
                              value={shippingInfo.country}
                              onChange={(e) => handleShippingChange("country", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="region">State / Region</Label>
                            <Input
                              id="region"
                              value={shippingInfo.state}
                              onChange={(e) => handleShippingChange("state", e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select
                          value={shippingInfo.state}
                          onValueChange={(value) => {
                            stateChosenByCustomer.current = true
                            handleShippingChange("state", value)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>
                          <SelectContent>
                            {NIGERIA_STATES.map((state) => (
                              <SelectItem
                                key={state}
                                value={state}
                                // Re-picking the current state fires no onValueChange, so also
                                // record the choice on the events Radix selects an item with: mouse
                                // pointerup, a touch/pen click (a scroll ending here has no click),
                                // and Enter. Space is left out because during type-ahead it searches
                                // rather than selects.
                                onPointerUp={(event) => {
                                  if (event.pointerType === "mouse") markStateChosen()
                                }}
                                onClick={markStateChosen}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") markStateChosen()
                                }}
                              >
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      )}
                    </div>
                    {isInternational && (
                      <p className="text-sm text-muted-foreground mt-2">
                        International delivery: enter your full address abroad, including the country.
                      </p>
                    )}

                    {/* Shipping Method */}
                    <div className="mt-6">
                      <Label className="text-base font-semibold">Shipping Method</Label>
                      <RadioGroup value={deliveryType} onValueChange={setDeliveryType} className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2 border p-3 rounded-lg">
                          <RadioGroupItem value="lagos" id="lagos" />
                          <Label htmlFor="lagos" className="flex-1 cursor-pointer">
                            Lagos Delivery
                          </Label>
                        </div>
                        {deliveryType === 'lagos' && (
                          <div className="pl-8 py-2">
                            <Select value={lagosShippingOptionId} onValueChange={setLagosShippingOptionId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a Lagos shipping option" />
                              </SelectTrigger>
                              <SelectContent>
                                {lagosShippingOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name} {option.description && `(${option.description})`} - {formatPrice(option.price)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 border p-3 rounded-lg">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other" className="flex-1 cursor-pointer">
                            Other Delivery
                          </Label>
                        </div>
                        {deliveryType === 'other' && (
                          <div className="pl-8 py-2 space-y-2">
                            <RadioGroup value={otherShippingOptionId} onValueChange={setOtherShippingOptionId} className="mt-3 space-y-2">
                              {otherShippingOptions.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2 border p-3 rounded-lg">
                                  <RadioGroupItem value={option.id} id={option.id} />
                                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                                    <div className="flex justify-between">
                                      <div>
                                        <div className="font-medium">{option.name}</div>
                                        {option.description && <div className="text-sm text-muted-foreground">{option.description}</div>}
                                      </div>
                                      <div className="font-medium">{formatPrice(option.price)}</div>
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Billing Information */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sameAsShipping"
                        checked={sameAsShipping}
                        onCheckedChange={(checked) => setSameAsShipping(checked as boolean)}
                      />
                      <Label htmlFor="sameAsShipping">Same as shipping address</Label>
                    </div>

                    {!sameAsShipping && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="billingFirstName">First Name *</Label>
                            <Input
                              id="billingFirstName"
                              value={billingInfo.firstName}
                              onChange={(e) => handleBillingChange("firstName", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingLastName">Last Name *</Label>
                            <Input
                              id="billingLastName"
                              value={billingInfo.lastName}
                              onChange={(e) => handleBillingChange("lastName", e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="billingAddress">Address *</Label>
                          <Input
                            id="billingAddress"
                            value={billingInfo.address}
                            onChange={(e) => handleBillingChange("address", e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="billingCity">City *</Label>
                            <Input
                              id="billingCity"
                              value={billingInfo.city}
                              onChange={(e) => handleBillingChange("city", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingPostalCode">Postal Code *</Label>
                            <Input
                              id="billingPostalCode"
                              value={billingInfo.postalCode}
                              onChange={(e) => handleBillingChange("postalCode", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingCountry">Country *</Label>
                            <Select
                              value={billingInfo.country}
                              onValueChange={(value) => handleBillingChange("country", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UK">United Kingdom</SelectItem>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment Information */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Lock className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Pay securely with Paystack</p>
                        <p className="text-sm text-muted-foreground">
                          After you place your order, you&apos;ll be taken to Paystack to pay by card, bank transfer
                          or USSD. Your card details are entered on Paystack, never on this site.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4: Review Order */}
              {step === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {confirmTotal !== null && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                        <p className="font-medium">Prices have changed since you added these items</p>
                        <p className="text-sm">
                          Your new total is {formatPrice(confirmTotal)} (was {formatPrice(total)}). You&apos;ll only
                          be charged the new total if you choose to continue.
                        </p>
                      </div>
                    )}

                    {/* Order Items */}
                    <div>
                      <h3 className="font-semibold mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div key={item.productId} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="relative w-12 h-12 rounded overflow-hidden">
                              <Image
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Qty: {item.quantity} × {formatPrice(item.price)}
                              </div>
                            </div>
                            <div className="font-medium">{formatPrice(item.price * item.quantity)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <h3 className="font-semibold mb-2">Shipping Address</h3>
                      <div className="p-3 bg-muted rounded-lg">
                        <div>
                          {shippingInfo.firstName} {shippingInfo.lastName}
                        </div>
                        <div>{shippingInfo.address}</div>
                        <div>
                          {shippingInfo.city}, {shippingInfo.postalCode}
                        </div>
                        <div>{shippingInfo.country}</div>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <h3 className="font-semibold mb-2">Payment Method</h3>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Paystack (card, bank transfer or USSD)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => (step > 1 ? setStep(step - 1) : router.push("/cart"))}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {step > 1 ? "Previous" : "Back to Cart"}
                </Button>

                {step < 4 ? (
                  <Button onClick={() => setStep(step + 1)} disabled={!validateStep(step)}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={() => handlePlaceOrder(confirmTotal ?? total)} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                    {isProcessing
                      ? "Processing..."
                      : confirmTotal !== null
                        ? `Pay New Total - ${formatPrice(confirmTotal)}`
                        : `Place Order - ${formatPrice(total)}`}
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{formatPrice(shippingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (VAT)</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                    <Shield className="h-4 w-4" />
                    <span>Secure payment protected by SSL</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  )
}