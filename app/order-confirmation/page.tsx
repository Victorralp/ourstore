"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Mail, Truck, Calendar, ArrowRight, Loader2 } from "lucide-react"
import { useSafeCurrency } from "@/hooks/use-safe-currency"
import { getOrder, listenToOrder } from "@/lib/firebase-orders"
import { Order } from "@/types"
import { useAuth } from "@/components/auth-provider"

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const { formatPrice } = useSafeCurrency()
  const { user } = useAuth()
  const [orderDetails, setOrderDetails] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false)
        setError("No order ID provided")
        return
      }

      try {
        // First get the initial order data
        const initialOrder = await getOrder(orderId)
        
        if (!initialOrder) {
          setLoading(false)
          setError("Order not found")
          return
        }
        
        // Check if the user is authorized to view this order
        if (user?.uid !== initialOrder.userId) {
          setLoading(false)
          setError("You are not authorized to view this order")
          return
        }

        setOrderDetails(initialOrder)
        setLoading(false)
        
        // Then set up real-time listener for updates
        unsubscribe = listenToOrder(orderId, (order) => {
          if (order) {
            setOrderDetails(order)
          }
        })
      } catch (err: any) {
        console.error("Error fetching order:", err)
        setError(err.message || "Failed to load order details")
        setLoading(false)
      }
    }

    fetchOrder()

    // Clean up the listener when the component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [orderId, user])

  if (loading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-medium">Loading order details...</h2>
        </div>
      </div>
    )
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-4">
              {error === "Order not found" ? "Order Not Found" : "Error Loading Order"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {error || "We couldn't find the order you're looking for."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
              <Button variant="outline" asChild>
                <Link href="/profile/orders">View All Orders</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Format the estimated delivery date
  const estimatedDeliveryDate = orderDetails.estimatedDelivery 
    ? new Date(orderDetails.estimatedDelivery) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from now

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'processing':
        return "bg-blue-100 text-blue-800";
      case 'shipped':
        return "bg-purple-100 text-purple-800";
      case 'delivered':
        return "bg-green-100 text-green-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your order. We’ve received your payment and will process your order shortly.
          </p>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Details</span>
                  <Badge variant="secondary" className={getStatusBadgeVariant(orderDetails.status)}>
                    {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order Number:</span>
                    <div className="font-medium">{orderDetails.id}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Order Date:</span>
                    <div className="font-medium">
                      {new Date(orderDetails.createdAt || Date.now()).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Method:</span>
                    <div className="font-medium">
                      {orderDetails.paymentMethod} 
                      {orderDetails.paymentId && ` (ID: ${orderDetails.paymentId.slice(-6)})`}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <div className="font-medium text-lg">{formatPrice(orderDetails.total)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items Ordered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderDetails.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image && !imageError[item.productId] ? (
                          <div className="relative w-full h-full">
                            <Image 
                              src={imageError[item.productId] ? "/product_images/unknown-product.jpg" : item.image} 
                              alt={item.name}
                              fill
                              className="object-cover"
                              onError={() => setImageError(prev => ({ ...prev, [item.productId]: true }))}
                            />
                          </div>
                        ) : (
                        <span className="text-2xl">📦</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="font-medium">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Delivery Address</h4>
                  <div className="text-sm text-muted-foreground">
                    <div>{orderDetails.shippingAddress.firstName} {orderDetails.shippingAddress.lastName}</div>
                    <div>{orderDetails.shippingAddress.address1}</div>
                    <div>
                      {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.postalCode}
                    </div>
                    <div>{orderDetails.shippingAddress.country}</div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Shipping Method:</span>
                    <div className="font-medium">
                      {orderDetails.shippingMethod || (orderDetails.shipping === 4.99 ? "Standard Delivery" : "Express Delivery")}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Delivery:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {estimatedDeliveryDate.toLocaleDateString("en-GB", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                {orderDetails.trackingNumber && (
                  <div>
                    <span className="text-muted-foreground">Tracking Number:</span>
                    <div className="font-medium">{orderDetails.trackingNumber}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Receipt
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/profile/orders/${orderDetails.id}`}>
                    <Truck className="h-4 w-4 mr-2" />
                    Track Order
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Order Confirmed</div>
                      <div className="text-muted-foreground">
                        {new Date(orderDetails.createdAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      orderDetails.status === 'processing' || orderDetails.status === 'shipped' || orderDetails.status === 'delivered' 
                        ? 'bg-green-100' 
                        : 'bg-muted'
                    }`}>
                      {orderDetails.status === 'processing' || orderDetails.status === 'shipped' || orderDetails.status === 'delivered' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <span className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Processing</div>
                      <div className="text-muted-foreground">Your order is being prepared</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      orderDetails.status === 'shipped' || orderDetails.status === 'delivered' 
                        ? 'bg-green-100' 
                        : 'bg-muted'
                    }`}>
                      {orderDetails.status === 'shipped' || orderDetails.status === 'delivered' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <span className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Shipped</div>
                      <div className="text-muted-foreground">On its way to you</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      orderDetails.status === 'delivered' 
                        ? 'bg-green-100' 
                        : 'bg-muted'
                    }`}>
                      {orderDetails.status === 'delivered' ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <span className="h-3 w-3" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Delivered</div>
                      <div className="text-muted-foreground">Package received</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
