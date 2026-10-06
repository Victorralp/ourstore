"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Truck, 
  Calendar, 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  Clock,
  Package,
  Home
} from "lucide-react"
import { useCurrency } from "@/components/currency-provider"
import { getOrder, listenToOrder, updateOrder } from "@/lib/firebase-orders"
import { Order } from "@/types"
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = typeof params.id === 'string' ? params.id : ''
  const { formatPrice } = useCurrency()
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const [orderDetails, setOrderDetails] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

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
        if (!isAdmin && user?.uid !== initialOrder.userId) {
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
  }, [orderId, user, isAdmin])

  // Function to handle order status updates (admin only)
  const handleStatusUpdate = async (newStatus: Order["status"]) => {
    if (!isAdmin || !orderDetails) return;
    
    setUpdating(true);
    try {
      await updateOrder(orderId, { 
        status: newStatus,
        // Add tracking number for shipped status
        ...(newStatus === 'shipped' ? {
          trackingNumber: `TRK-${Date.now().toString().slice(-8)}`,
          trackingUrl: "https://tracking.example.com"
        } : {})
      });
      
      toast({
        title: "Order updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

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
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">
              {error === "Order not found" ? "Order Not Found" : "Error Loading Order"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {error || "We couldn't find the order you're looking for."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/profile/orders">Back to Orders</Link>
            </Button>
              <Button variant="outline" asChild>
                <Link href="/">Return Home</Link>
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

  // Get payment status badge color
  const getPaymentStatusBadgeVariant = (status: string = 'pending') => {
    switch (status) {
      case 'paid':
        return "bg-green-100 text-green-800";
      case 'refunded':
        return "bg-purple-100 text-purple-800";
      case 'failed':
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile">My Account</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile/orders">My Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{orderId.slice(-6)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
            <h1 className="text-2xl font-bold">Order #{orderId.slice(-6)}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(orderDetails.createdAt || Date.now()).toLocaleDateString()}
            </p>
            </div>
          <div className="mt-2 md:mt-0 flex flex-col md:items-end gap-2">
            <Badge variant="secondary" className={getStatusBadgeVariant(orderDetails.status)}>
              {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
            </Badge>
            {orderDetails.paymentStatus && (
              <Badge variant="secondary" className={getPaymentStatusBadgeVariant(orderDetails.paymentStatus)}>
                Payment: {orderDetails.paymentStatus.charAt(0).toUpperCase() + orderDetails.paymentStatus.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
                        {item.options && Object.keys(item.options).length > 0 && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Options: {Object.entries(item.options).map(([key, value]) => (
                              `${key}: ${value}`
                            )).join(', ')}
                      </div>
                        )}
                      </div>
                      <div className="font-medium">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
                    <div>Phone: {orderDetails.shippingAddress.phone}</div>
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
                    <div className="font-medium flex items-center gap-2">
                      {orderDetails.trackingNumber}
                      {orderDetails.trackingUrl && (
                        <Button variant="link" className="p-0 h-auto" asChild>
                          <a href={orderDetails.trackingUrl} target="_blank" rel="noopener noreferrer">
                            Track Package
                          </a>
                        </Button>
                      )}
                    </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Billing Address</h4>
                    <div className="text-sm text-muted-foreground">
                      <div>{orderDetails.billingAddress.firstName} {orderDetails.billingAddress.lastName}</div>
                      <div>{orderDetails.billingAddress.address1}</div>
                      <div>
                        {orderDetails.billingAddress.city}, {orderDetails.billingAddress.postalCode}
                      </div>
                      <div>{orderDetails.billingAddress.country}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Payment Details</h4>
                    <div className="text-sm text-muted-foreground">
                      <div>Method: {orderDetails.paymentMethod}</div>
                      {orderDetails.paymentId && <div>Payment ID: {orderDetails.paymentId}</div>}
                      <div>Status: {orderDetails.paymentStatus || 'pending'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(orderDetails.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(orderDetails.shipping)}</span>
                </div>
                  <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(orderDetails.tax)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatPrice(orderDetails.total)}</span>
                </div>
              </CardContent>
            </Card>

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
                        <Clock className="h-3 w-3 text-muted-foreground" />
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
                        <Package className="h-3 w-3 text-muted-foreground" />
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
                        <Home className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Delivered</div>
                      <div className="text-muted-foreground">Package received</div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {isAdmin && (
                <CardFooter className="flex-col space-y-2 border-t pt-4">
                  <h4 className="text-sm font-medium w-full text-left">Admin Controls</h4>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button 
                      size="sm" 
                      disabled={updating || orderDetails.status === 'processing'} 
                      onClick={() => handleStatusUpdate('processing')}
                    >
                      Mark Processing
                    </Button>
                    <Button 
                      size="sm" 
                      disabled={updating || orderDetails.status === 'shipped'} 
                      onClick={() => handleStatusUpdate('shipped')}
                    >
                      Mark Shipped
                    </Button>
                    <Button 
                      size="sm" 
                      disabled={updating || orderDetails.status === 'delivered'} 
                      onClick={() => handleStatusUpdate('delivered')}
                    >
                      Mark Delivered
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      disabled={updating || orderDetails.status === 'cancelled'} 
                      onClick={() => handleStatusUpdate('cancelled')}
                    >
                      Cancel Order
                    </Button>
                  </div>
                  {updating && (
                    <div className="flex items-center justify-center w-full py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-xs">Updating...</span>
                    </div>
                  )}
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
              </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
              </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}