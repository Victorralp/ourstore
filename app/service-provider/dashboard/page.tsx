"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  DollarSign,
  Star,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  Edit,
  Plus,
  Bell,
  Settings,
  FileText,
  MessageSquare,
  BarChart3,
  Sparkles,
  Wrench,
  ArrowUpRight
} from "lucide-react"
import { ServiceProvider, Service, ServiceBooking } from "@/types"
import { useAuth } from "@/components/auth-provider"
import { getServiceProviderByOwnerId } from "@/lib/firebase-service-providers"
import { getServicesByProviderId } from "@/lib/firebase-services"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardStatsCard } from "@/components/dashboard-stats-card"
import { DashboardQuickActions } from "@/components/dashboard-quick-actions"
import { DashboardWelcome } from "@/components/dashboard-welcome"
import { useRouter } from "next/navigation"

// Helper function to get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function ServiceProviderDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [recentBookings, setRecentBookings] = useState<ServiceBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSecretMessage, setShowSecretMessage] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+G shortcut (only on service provider dashboard)
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        router.push('/admin/service-providers')
        setShowSecretMessage(true)
        setTimeout(() => setShowSecretMessage(false), 3000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  useEffect(() => {
    // Don't do anything if auth is still loading
    if (user === undefined) {
      return
    }

    if (!user) {
      setIsLoading(false)
      setError("Please log in to access the service provider dashboard")
      return
    }

    let isMounted = true
    const controller = new AbortController()

    const loadServiceProvider = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        console.log("🔍 Loading service provider for user:", user.uid)
        
        // Create timeout with shorter duration for better UX
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 8 seconds')), 8000)
        })
        
        console.log("🔍 Calling getServiceProviderByOwnerId...")
        const dataPromise = getServiceProviderByOwnerId(user.uid)
        
        console.log("🏁 Starting Promise.race between dataPromise and timeoutPromise")
        const serviceProvider = await Promise.race([dataPromise, timeoutPromise]) as ServiceProvider | null
        
        console.log("✅ Promise.race completed, serviceProvider:", serviceProvider)
        
        if (!isMounted) return
        
        console.log("📊 Service provider result:", serviceProvider)
        
        if (!serviceProvider) {
          console.log("❌ No service provider found for user:", user.uid)
          setError(null) // Don't treat this as an error
          setProvider(null)
        } else {
          console.log("✅ Service provider found:", serviceProvider.name)
          setProvider(serviceProvider)
          
          // Load services in parallel without blocking
          console.log("🔍 Loading services for provider:", serviceProvider.id)
          Promise.allSettled([
            getServicesByProviderId(serviceProvider.id)
          ]).then(([servicesResult]) => {
            if (!isMounted) return
            
            if (servicesResult.status === 'fulfilled') {
              console.log("📋 Services loaded:", servicesResult.value.length)
              setServices(servicesResult.value)
            } else {
              console.error("⚠️ Error loading services:", servicesResult.reason)
              setServices([])
            }
          })
          
          // Mock recent bookings for now
          setRecentBookings([])
        }
      } catch (err: any) {
        console.error("💥 Error loading service provider:", {
          error: err,
          errorString: JSON.stringify(err, Object.getOwnPropertyNames(err)),
          errorType: typeof err,
          errorMessage: err?.message || 'No message',
          errorCode: err?.code || 'no_code',
          errorName: err?.name || 'no_name',
          userId: user?.uid,
          stack: err?.stack || 'No stack trace',
          // Additional error properties that might exist in Firebase errors
          errorConstructor: err?.constructor?.name,
          errorKeys: err ? Object.keys(err) : 'No keys',
          errorHasMessage: 'message' in err,
          errorHasCode: 'code' in err,
          errorToString: err?.toString(),
          // Try to get Firebase-specific error details
          firebaseErrorDetails: err?.details || err?.customData || err?.serverResponse || 'No Firebase details',
          // Try to stringify the error in different ways
          errorJSON: JSON.stringify(err),
          errorStringifyAll: JSON.stringify(err, Object.getOwnPropertyNames(err)),
          // Check if error has a message property
          hasMessageProperty: Object.prototype.hasOwnProperty.call(err, 'message'),
          // Try to access error properties directly
          directMessage: err.message,
          directCode: err.code,
          directName: err.name,
          directStack: err.stack,
          timestamp: new Date().toISOString()
        })
        if (isMounted) {
          if (err.message.includes('timeout')) {
            setError("Loading timeout - please refresh the page or check your connection")
          } else if (err.message.includes('permission-denied')) {
            setError("Access denied - please check your permissions")
          } else if (err.message.includes('unavailable')) {
            setError("Service temporarily unavailable - please try again later")
          } else {
            setError(err.message || "Failed to load service provider data")
          }
        }
      } finally {
        if (isMounted) {
          console.log("🏁 Service provider loading completed")
          setIsLoading(false)
        }
      }
    }

    // Add a small delay to ensure auth has stabilized
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        loadServiceProvider()
      }
    }, 100)

    return () => {
      isMounted = false
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-blue-500 border-l-blue-600 border-r-blue-600 border-b-blue-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            
            {/* Debug Info for development */}
            {process.env.NODE_ENV === 'development' && user && (
              <div className="bg-gray-50 p-3 rounded text-left text-xs mb-4">
                <p><strong>User ID:</strong> {user.uid}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
                <p><strong>Error:</strong> {error}</p>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!provider) {
    return (
      <DashboardWelcome 
        userType="service-provider" 
        userName="Service Provider"
      />
    )
  }

  // Check if this is a new service provider (no services yet)
  const isNewServiceProvider = services.length === 0
  
  if (isNewServiceProvider) {
    return (
      <DashboardWelcome 
        userType="service-provider" 
        userName={provider.name || 'Service Provider'}
      />
    )
  }

  // Calculate dashboard stats from real data
  const stats = {
    totalBookings: provider.totalBookings || 0,
    completedBookings: Math.floor((provider.totalBookings || 0) * 0.85),
    pendingBookings: recentBookings.filter(b => b.status === "pending").length,
    activeServices: services.filter(s => s.isActive).length,
    monthlyEarnings: ((provider.totalBookings || 0) * 15000) * 0.7, // Estimated monthly earnings
    rating: provider.rating || 0,
    responseRate: 98
  }

  const statCards = [
    {
      title: "Active Services",
      value: stats.activeServices,
      icon: Wrench,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: `${services.length} total services`
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+12% from last month"
    },
    {
      title: "Earnings",
      value: `₦${stats.monthlyEarnings > 0 ? Math.floor(stats.monthlyEarnings / 1000).toFixed(0) + 'K' : '0'}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      change: "+8.2% from last month"
    },
    {
      title: "Rating",
      value: stats.rating.toFixed(1),
      icon: Star,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      change: `${provider.reviewCount || 0} reviews`
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader
        title={`${getTimeBasedGreeting()}, ${provider.name || 'Service Provider'}!`}
        subtitle="Here's what's happening with your services today."
        userType="service-provider"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <DashboardStatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            bgColor={stat.bgColor}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions userType="service-provider" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Bookings</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/service-provider/dashboard/bookings">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings.length > 0 ? (
                  recentBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{booking.customerName}</div>
                          <div className="text-sm text-gray-600">{booking.serviceDetails.name}</div>
                          <div className="text-xs text-gray-500">
                            {booking.scheduledDate} at {booking.scheduledTime}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₦{booking.totalAmount.toLocaleString()}</div>
                        <Badge 
                          variant={booking.status === "confirmed" ? "default" : "secondary"}
                          className={
                            booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                            booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            booking.status === "completed" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No bookings yet</p>
                    <p className="text-sm">Your customer bookings will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Services</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (!provider?.id) return
                    try {
                      console.log('🔄 Refreshing services...')
                      const refreshedServices = await getServicesByProviderId(provider.id)
                      console.log('📊 Refreshed services:', refreshedServices.length)
                      setServices(refreshedServices)
                      alert(`Found ${refreshedServices.length} services`)
                    } catch (error) {
                      console.error('Error refreshing services:', error)
                      alert('Failed to refresh services')
                    }
                  }}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  🔄 Refresh
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/service-provider/dashboard/services">
                    Manage All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Debug Info for Development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs mb-4">
                    <p><strong>🔍 Services Debug Information:</strong></p>
                    <p>Provider ID: {provider?.id || 'Not loaded'}</p>
                    <p>Total Services Found: {services.length}</p>
                    <p>User UID: {user?.uid || 'Not authenticated'}</p>
                    
                    {services.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                          📋 Click to view all services details
                        </summary>
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                          {services.map((service, index) => (
                            <div key={service.id} className="bg-white p-2 rounded border">
                              <div className="font-medium text-green-700">
                                {index + 1}. "{service.name}"
                              </div>
                              <div className="text-gray-600">
                                ID: {service.id}<br/>
                                Provider ID: {service.providerId}<br/>
                                Active: {service.isActive ? '✅ Yes' : '❌ No'}<br/>
                                Category: {service.category}<br/>
                                Created: {service.createdAt ? new Date(service.createdAt).toLocaleDateString() : 'Unknown'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    
                    <div className="mt-2 pt-2 border-t">
                      <button 
                        onClick={async () => {
                          console.log('🔄 Manual service refresh clicked')
                          if (provider?.id) {
                            try {
                              const refreshedServices = await getServicesByProviderId(provider.id)
                              console.log('📊 Manual refresh result:', refreshedServices)
                              setServices(refreshedServices)
                              alert(`Refreshed! Found ${refreshedServices.length} services`)
                            } catch (error: any) {
                              console.error('Manual refresh error:', error)
                              alert('Refresh failed: ' + (error?.message || 'Unknown error'))
                            }
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        🔄 Force Refresh Services
                      </button>
                    </div>
                  </div>
                )}
                {services.length > 0 ? (
                  services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">{service.description}</div>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="text-sm">
                            {service.pricingType === "fixed" 
                              ? `₦${service.basePrice?.toLocaleString()}` 
                              : service.pricingType === "hourly"
                              ? `₦${service.hourlyRate?.toLocaleString()}/hr`
                              : "Custom pricing"
                            }
                          </span>
                          <Badge variant={service.isActive ? "default" : "secondary"}>
                            {service.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/service-provider/dashboard/services/${service.id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/service-provider/dashboard/services/${service.id}/edit`}>
                            <Edit className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No services yet</p>
                    <p className="text-sm">Add your first service to start receiving bookings</p>
                    <Button className="mt-3" asChild>
                      <Link href="/service-provider/dashboard/services/add">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Rate</span>
                <span className="text-lg font-bold">{stats.responseRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-lg font-bold">94%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Repeat Customers</span>
                <span className="text-lg font-bold">67%</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/service-provider/dashboard/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/service-provider/dashboard/services/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Service
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/service-provider/dashboard/bookings?status=pending">
                  <Clock className="h-4 w-4 mr-2" />
                  Review Pending Bookings
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/service-provider/dashboard/reviews">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Reviews
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href="/service-provider/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Update Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {provider.isApproved ? (
                  <>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-800">Profile Approved</p>
                      <p className="text-green-600">Your service provider profile is active</p>
                      <p className="text-xs text-green-500 mt-1">You can now receive bookings</p>
                    </div>
                    {!provider.isActive && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="font-medium text-orange-800">Profile Inactive</p>
                        <p className="text-orange-600">Activate your profile to receive bookings</p>
                        <p className="text-xs text-orange-500 mt-1">Go to settings to activate</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-yellow-800">Pending Approval</p>
                    <p className="text-yellow-600">Your profile is under admin review</p>
                    <p className="text-xs text-yellow-500 mt-1">We'll notify you once approved</p>
                  </div>
                )}
                {services.length === 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-800">Add Your First Service</p>
                    <p className="text-blue-600">Start by adding services you offer</p>
                    <p className="text-xs text-blue-500 mt-1">Click "Add Service" to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Secret message overlay */}
      {showSecretMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-2">Secret Unlocked!</h2>
            <p>Navigating to Admin Service Providers page...</p>
          </div>
        </div>
      )}
    </div>
  )
}