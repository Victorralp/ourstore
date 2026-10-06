"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Truck,
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useAdmin } from "@/hooks/use-admin"
import { fulfilmentBlockedReason } from "@/lib/order-fulfilment"
import { useCurrency } from "@/components/currency-provider"
import { getOrdersBefore, listenToAllOrders, updateOrder, type Order } from "@/lib/firebase-orders"
import { useToast } from "@/hooks/use-toast"
import { RequireAdmin } from "@/components/require-admin"

// Orders shown per page
const PAGE_SIZE = 20
// Newest orders kept live by the real-time listener
const LIVE_WINDOW = 100
// How many older orders to fetch each time the admin pages past what's loaded
const FETCH_STEP = 100

// Combine order lists, keeping the first copy of each order
const mergeOrders = (first: Order[], second: Order[]) => {
  const seen = new Set<string>()
  return [...first, ...second].filter((order) => {
    if (seen.has(order.id)) return false
    seen.add(order.id)
    return true
  })
}

export default function AdminOrdersPage() {
  const { isAdmin, loading: adminLoading } = useAdmin()
  const { formatPrice } = useCurrency()
  const { toast } = useToast()
  
  // Newest orders, kept up to date by the real-time listener
  const [liveOrders, setLiveOrders] = useState<Order[]>([])
  // Older orders, each batch fetched once as the admin pages back through history
  const [olderOrders, setOlderOrders] = useState<Order[]>([])
  const previousLiveOrders = useRef<Order[]>([])
  const [liveWindowFull, setLiveWindowFull] = useState(false)
  const [olderExhausted, setOlderExhausted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest")
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  // Page the admin asked for that is waiting on older orders to load
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Live data wins over an older fetched copy of the same order
  const orders = mergeOrders(liveOrders, olderOrders)
  // A full live window means there may be older orders still to fetch
  const hasMore = liveWindowFull && !olderExhausted

  useEffect(() => {
    if (adminLoading) return

    if (!isAdmin) {
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const showError = (err: any) => {
      console.error("Error loading orders:", err)
      setError(err?.message || "Failed to load orders")
      setLoading(false)

      toast({
        title: "Error loading orders",
        description: err?.message || "There was a problem loading orders",
        variant: "destructive",
      })
    }

    try {
      unsubscribe = listenToAllOrders((updatedOrders) => {
        if (cancelled) return
        // Orders pushed out of the live window by newer ones still exist, so keep
        // them with the older orders instead of letting them vanish from the list
        const liveIds = new Set(updatedOrders.map((order) => order.id))
        const pushedOut = previousLiveOrders.current.filter((order) => !liveIds.has(order.id))
        previousLiveOrders.current = updatedOrders
        if (pushedOut.length > 0) {
          setOlderOrders((current) => mergeOrders(pushedOut, current))
        }

        setLiveOrders(updatedOrders)
        setLiveWindowFull(updatedOrders.length >= LIVE_WINDOW)
        setError(null)
        setLoading(false)
      }, LIVE_WINDOW, (err) => {
        if (!cancelled) showError(err)
      })
    } catch (err: any) {
      showError(err)
    }

    // Clean up listener on unmount
    return () => {
      cancelled = true
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [isAdmin, adminLoading, retryKey, toast])

  // Start from the first page whenever the filters or sort change
  useEffect(() => {
    setPage(0)
    setPendingPage(null)
  }, [searchTerm, statusFilter, sortOrder])

  const retryLoading = () => {
    setError(null)
    setLoading(orders.length === 0)
    setRetryKey((key) => key + 1)
  }

  const loadOlderOrders = async () => {
    if (loadingMore || !hasMore || orders.length === 0) return

    // Continue from the oldest order loaded so far
    const oldest = Math.min(...orders.map((order) => new Date(order.createdAt || 0).getTime()))

    setLoadingMore(true)
    try {
      const batch = await getOrdersBefore(new Date(oldest), FETCH_STEP)
      setOlderOrders((current) => mergeOrders(current, batch))
      if (batch.length < FETCH_STEP) {
        setOlderExhausted(true)
      }
    } catch (err: any) {
      toast({
        title: "Couldn't load older orders",
        description: err?.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
    }
  }

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      // Apply status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false
      }
      
      // Apply search filter (search by ID, user ID or product names)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const idMatch = order.id?.toLowerCase().includes(searchLower)
        const userIdMatch = order.userId?.toLowerCase().includes(searchLower)
        const productMatch = order.items.some(item => 
          item.name.toLowerCase().includes(searchLower)
        )
        return idMatch || userIdMatch || productMatch
      }
      
      return true
    })
    .sort((a, b) => {
      // Sort by date (newest/oldest)
      if (sortOrder === "newest") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      } else if (sortOrder === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      } 
      // Sort by total (highest/lowest)
      else if (sortOrder === "highest") {
        return b.total - a.total
      } else {
        return a.total - b.total
      }
    })

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const pageStart = page * PAGE_SIZE
  const pageOrders = filteredOrders.slice(pageStart, pageStart + PAGE_SIZE)
  const onLastLoadedPage = page >= pageCount - 1

  const goToPage = (nextPage: number) => {
    if (nextPage > page && nextPage >= pageCount) {
      // That page isn't loaded yet: fetch older orders and move once they arrive
      setPendingPage(nextPage)
      loadOlderOrders()
      return
    }

    // Start fetching older orders once the admin reaches the last loaded page
    if (nextPage > page && nextPage === pageCount - 1 && hasMore) {
      loadOlderOrders()
    }
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Once older orders have loaded, go to the requested page if it now has orders;
  // otherwise stay put, since any new matches landed on the current page
  useEffect(() => {
    if (pendingPage === null || loadingMore) return
    if (pendingPage < pageCount) {
      setPage(pendingPage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
    setPendingPage(null)
  }, [pendingPage, loadingMore, pageCount])

  // Keep the page in range if the list shrinks, e.g. an order stops matching the filter
  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(pageCount - 1)
    }
  }, [page, pageCount])

  // Function to get status badge color
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

  // Function to get payment status badge color
  const getPaymentStatusBadgeVariant = (status: string = 'pending') => {
    switch (status) {
      case 'paid':
        return "bg-green-100 text-green-800";
      case 'refunded':
        return "bg-purple-100 text-purple-800";
      case 'failed':
        return "bg-red-100 text-red-800";
      case 'abandoned':
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  // Function to format date
  const formatDate = (timestamp: Date | string | number | null) => {
    if (!timestamp) return "Unknown date";
    
    return new Date(timestamp).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to update order status
  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    // Only paid orders that don't need a refund can be fulfilled; cancelling is always allowed
    const order = orders.find((o) => o.id === orderId)
    const blocked = order ? fulfilmentBlockedReason(order, newStatus) : null
    if (blocked) {
      toast({ title: "Can't update this order", description: blocked, variant: "destructive" });
      return;
    }

    setUpdating(orderId);
    try {
      const updates = {
        status: newStatus,
        // Add tracking number for shipped status
        ...(newStatus === 'shipped' ? {
          trackingNumber: `TRK-${Date.now().toString().slice(-8)}`,
          trackingUrl: "https://tracking.example.com"
        } : {})
      }
      await updateOrder(orderId, updates);
      // Older orders aren't covered by the live listener, so update them locally
      setOlderOrders((current) => current.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ));
      
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
      setUpdating(null);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-purple-600" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <RequireAdmin>
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Orders</h1>
            <p className="text-muted-foreground">View and manage all customer orders</p>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders by ID, user ID or product..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <div className="w-[180px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[180px]">
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger>
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="highest">Highest Amount</SelectItem>
                      <SelectItem value="lowest">Lowest Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && !loading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={retryLoading}>
              Retry
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading orders...</span>
          </div>
        ) : error && orders.length === 0 ? null : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Orders Found</h2>
            <p className="text-muted-foreground mb-8">
              {orders.length === 0
                ? "There are no orders in the system."
                : hasMore
                  ? `No orders match your current filters among the ${orders.length} most recent orders.`
                  : "No orders match your current filters."}
            </p>
            {orders.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}>
                  Clear Filters
                </Button>
                {hasMore && (
                  <Button variant="outline" disabled={loadingMore} onClick={loadOlderOrders}>
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Search older orders
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {hasMore && (
              <p className="text-sm text-muted-foreground">
                Search, filters and sorting cover the {orders.length} most recent orders. Go past the last page to load older ones.
              </p>
            )}
            {pageOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        Order #{order.id.slice(-6)}
                      </CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                        <p className="text-sm text-muted-foreground hidden sm:block">•</p>
                        <p className="text-sm text-muted-foreground">
                          User ID: {order.userId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={getStatusBadgeVariant(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      {order.paymentStatus && (
                        <Badge variant="secondary" className={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </Badge>
                      )}
                      {order.needsRefund && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Refund needed
                        </Badge>
                      )}
                      <span className="font-medium">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Order Items */}
                    <div className="space-y-3">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={`${order.id}-${item.productId}`} className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                            {item.image && !imageError[item.productId] ? (
                              <Image 
                                src={item.image} 
                                alt={item.name}
                                fill
                                className="object-cover"
                                onError={() => {
                                  // Handle error with a state variable instead
                                  setImageError(prev => ({ ...prev, [item.productId]: true }));
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-sm text-muted-foreground">
                          + {order.items.length - 2} more items
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Order Summary & Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Shipping to:</span>{" "}
                          <span>
                            {order.shippingAddress.firstName} {order.shippingAddress.lastName}, {order.shippingAddress.city}
                          </span>
                        </div>
                        {order.trackingNumber && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Tracking:</span>{" "}
                            <span>{order.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Status Update Buttons */}
                        {order.status !== 'processing' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updating === order.id || !!fulfilmentBlockedReason(order, 'processing')} 
                            onClick={() => handleStatusUpdate(order.id, 'processing')}
                          >
                            {updating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Mark Processing
                          </Button>
                        )}
                        {order.status !== 'shipped' && order.status !== 'cancelled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updating === order.id || !!fulfilmentBlockedReason(order, 'shipped')} 
                            onClick={() => handleStatusUpdate(order.id, 'shipped')}
                          >
                            {updating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Mark Shipped
                          </Button>
                        )}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updating === order.id || !!fulfilmentBlockedReason(order, 'delivered')} 
                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                          >
                            {updating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Mark Delivered
                          </Button>
                        )}
                        {order.status !== 'cancelled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={updating === order.id} 
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                          >
                            {updating === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Cancel
                          </Button>
                        )}
                        <Button asChild>
                          <Link href={`/profile/orders/${order.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {pageStart + 1}–{pageStart + pageOrders.length} of {filteredOrders.length}{hasMore ? "+" : ""} orders
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm px-2">
                  Page {page + 1}{hasMore ? "" : ` of ${pageCount}`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(onLastLoadedPage && !hasMore) || loadingMore}
                  onClick={() => goToPage(page + 1)}
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAdmin>
  )
} 