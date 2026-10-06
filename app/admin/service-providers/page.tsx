"use client"

import { useState, useEffect, useCallback } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import {
  getAllServiceProviders,
  getPendingServiceProviders,
  getApprovedServiceProviders,
  approveServiceProvider,
  rejectServiceProvider,
  suspendServiceProvider,
  reactivateServiceProvider,
  getServiceProviderStats
} from "@/lib/firebase-service-providers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search,
  Filter,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  MoreVertical,
  Star,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Wrench,
  MessageSquare,
  Download,
  Mail,
  Phone,
  RefreshCw,
  Loader2
} from "lucide-react"
import { ServiceProvider, Service, ServiceBooking, Complaint } from "@/types"
import { toast } from "sonner"

const mockComplaints: Complaint[] = [
  {
    id: "comp_001",
    userId: "user_003",
    userName: "John Doe",
    userEmail: "john@example.com",
    type: "service_provider",
    subject: "Service provider didn't show up",
    description: "Plumber was scheduled for 2 PM but never arrived",
    providerId: "sp_001",
    status: "open",
    priority: "high",
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now()
  }
]

export default function ServiceProviderAdminDashboard() {
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [complaints, setComplaints] = useState(mockComplaints)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalProviders: 0,
    activeProviders: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0
  })

  // Fetch service providers data
  const fetchServiceProviders = useCallback(async () => {
    try {
      setLoading(true)
      console.log("🔍 Admin: Fetching all service providers...")
      
      const [allProviders, providerStats] = await Promise.allSettled([
        getAllServiceProviders(),
        getServiceProviderStats()
      ])
      
      // Handle providers data
      if (allProviders.status === 'fulfilled') {
        console.log("📊 Admin: Service providers fetched:", {
          total: allProviders.value.length
        })
        
        console.log("📊 Admin: Provider details:", allProviders.value.map(p => ({
          id: p.id,
          name: p.name,
          ownerId: p.ownerId,
          isApproved: p.isApproved,
          isActive: p.isActive,
          createdAt: p.createdAt
        })))
        
        setProviders(allProviders.value)
      } else {
        console.error("❌ Admin: Failed to fetch providers:", allProviders.reason)
        setProviders([])
      }
      
      // Handle stats data
      if (providerStats.status === 'fulfilled') {
        console.log("📊 Admin: Stats fetched:", providerStats.value)
        setStats({
          totalProviders: providerStats.value.totalProviders,
          activeProviders: providerStats.value.activeProviders,
          pendingApprovals: providerStats.value.pendingApprovals,
          totalBookings: allProviders.status === 'fulfilled' ? allProviders.value.reduce((sum, p) => sum + (p.totalBookings || 0), 0) : 0,
          totalRevenue: allProviders.status === 'fulfilled' ? allProviders.value.reduce((sum, p) => {
            return sum + (p.totalBookings || 0) * 50000
          }, 0) : 0,
          averageRating: allProviders.status === 'fulfilled' && allProviders.value.length > 0 
            ? allProviders.value.reduce((sum, p) => sum + (p.rating || 0), 0) / allProviders.value.length
            : 0
        })
      } else {
        console.error("❌ Admin: Failed to fetch stats:", providerStats.reason)
        // Calculate stats from providers data as fallback
        const providers = allProviders.status === 'fulfilled' ? allProviders.value : []
        setStats({
          totalProviders: providers.length,
          activeProviders: providers.filter(p => p.isActive).length,
          pendingApprovals: providers.filter(p => !p.isApproved).length,
          totalBookings: providers.reduce((sum, p) => sum + (p.totalBookings || 0), 0),
          totalRevenue: providers.reduce((sum, p) => {
            return sum + (p.totalBookings || 0) * 50000
          }, 0),
          averageRating: providers.length > 0 
            ? providers.reduce((sum, p) => sum + (p.rating || 0), 0) / providers.length
            : 0
        })
      }
      
      setError(null)
    } catch (err: any) {
      console.error("💥 Admin: Failed to fetch service providers:", err)
      setError(err.message || "Failed to fetch service providers")
    } finally {
      setLoading(false)
    }
  }, [])

  // Check admin authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("Please log in to access the admin panel")
        setLoading(false)
        return
      }
      
      try {
        // Check if user has admin role in their profile
        const userQuery = query(collection(db, "users"), where("uid", "==", user.uid))
        const userDoc = await getDocs(userQuery)
        
        if (userDoc.empty) {
          // Create user profile if it doesn't exist (for development)
          console.log("No user profile found, treating as non-admin")
          setError("Admin access required. Please contact an administrator.")
          setLoading(false)
          return
        }
        
        const userData = userDoc.docs[0].data()
        console.log("User role check:", { uid: user.uid, role: userData.role })
        
        if (userData.role !== "admin") {
          setError(`Admin access required. Current role: ${userData.role || 'user'}. Please contact an administrator.`)
          setLoading(false)
          return
        }
        
        // User is admin, fetch data
        console.log("✅ Admin access confirmed")
        setError(null)
        await fetchServiceProviders()
      } catch (err: any) {
        console.error("Error checking admin access:", err)
        setError(`Database error: ${err.message}`)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [fetchServiceProviders])

  // Filter providers based on search and status
  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         provider.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "approved" && provider.isApproved) ||
                         (statusFilter === "pending" && !provider.isApproved) ||
                         (statusFilter === "active" && provider.isActive)
    
    return matchesSearch && matchesStatus
  })

  const handleApproveProvider = async (providerId: string) => {
    try {
      setActionLoading(providerId)
      await approveServiceProvider(providerId)
      toast.success("Service provider approved successfully")
      await fetchServiceProviders()
    } catch (err: any) {
      console.error("Failed to approve provider:", err)
      toast.error(err.message || "Failed to approve provider")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectProvider = async (providerId: string) => {
    if (!confirm("Are you sure you want to reject this service provider application?")) {
      return
    }
    
    try {
      setActionLoading(providerId)
      await rejectServiceProvider(providerId)
      toast.success("Service provider application rejected")
      await fetchServiceProviders()
    } catch (err: any) {
      console.error("Failed to reject provider:", err)
      toast.error(err.message || "Failed to reject provider")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspendProvider = async (providerId: string) => {
    if (!confirm("Are you sure you want to suspend this service provider?")) {
      return
    }
    
    try {
      setActionLoading(providerId)
      const provider = providers.find(p => p.id === providerId)
      
      if (provider?.isActive) {
        await suspendServiceProvider(providerId)
        toast.success("Service provider suspended")
      } else {
        await reactivateServiceProvider(providerId)
        toast.success("Service provider reactivated")
      }
      
      await fetchServiceProviders()
    } catch (err: any) {
      console.error("Failed to update provider status:", err)
      toast.error(err.message || "Failed to update provider status")
    } finally {
      setActionLoading(null)
    }
  }

  // Show loading state
  if (loading && providers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading service providers...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" asChild>
                <a href="/login">
                  Login
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.totalProviders}</div>
                <div className="text-sm text-gray-600">Total Providers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.activeProviders}</div>
                <div className="text-sm text-gray-600">Active Providers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
                <div className="text-sm text-gray-600">Pending Approvals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.totalBookings}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">₦{(stats.totalRevenue / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full w-12 h-12 bg-yellow-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Provider Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.slice(0, 5).map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-600">{provider.category}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    provider.isApproved 
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {provider.isApproved ? "Approved" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <div key={complaint.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{complaint.subject}</div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      complaint.priority === "high" ? "bg-red-100 text-red-800" :
                      complaint.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {complaint.priority}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{complaint.userName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {complaint.createdAt ? new Date(complaint.createdAt!).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const ProvidersTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
        </select>

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        
        <Button 
          variant="outline" 
          onClick={fetchServiceProviders}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Providers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProviders.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{provider.name}</div>
                        <div className="text-sm text-gray-500">{provider.contactEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {provider.category.replace("-", " ")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          provider.isApproved 
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {provider.isApproved ? "Approved" : "Pending"}
                        </span>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          provider.isActive 
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm">{provider.rating}</span>
                        <span className="text-xs text-gray-500 ml-1">({provider.reviewCount})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {provider.totalBookings}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₦{((provider.totalBookings || 0) * 50000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedProvider(provider)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!provider.isApproved && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveProvider(provider.id)}
                              disabled={actionLoading === provider.id}
                            >
                              {actionLoading === provider.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRejectProvider(provider.id)}
                              disabled={actionLoading === provider.id}
                            >
                              {actionLoading === provider.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                        {provider.isApproved && (
                          <Button 
                            size="sm" 
                            variant={provider.isActive ? "destructive" : "default"}
                            onClick={() => handleSuspendProvider(provider.id)}
                            disabled={actionLoading === provider.id}
                          >
                            {actionLoading === provider.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : provider.isActive ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const ComplaintsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Provider Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{complaint.subject}</h4>
                      <p className="text-sm text-gray-600 mt-1">{complaint.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>By: {complaint.userName}</span>
                        <span>Date: {complaint.createdAt ? new Date(complaint.createdAt!).toLocaleDateString() : 'N/A'}</span>
                        <span className="capitalize">Type: {complaint.type.replace("_", " ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        complaint.priority === "high" ? "bg-red-100 text-red-800" :
                        complaint.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {complaint.priority}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        complaint.status === "open" ? "bg-blue-100 text-blue-800" :
                        complaint.status === "resolved" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact Provider
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-3 w-3 mr-1" />
                      Contact Customer
                    </Button>
                    <Button size="sm">
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Service Provider Admin</h1>
          <p className="text-gray-600 mt-2">Manage service providers, bookings, and complaints</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "providers", label: "Service Providers" },
              { id: "complaints", label: "Complaints" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "providers" && <ProvidersTab />}
        {activeTab === "complaints" && <ComplaintsTab />}
      </div>

      {/* Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Provider Details</h3>
              <Button variant="ghost" onClick={() => setSelectedProvider(null)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1">{selectedProvider.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 capitalize">{selectedProvider.category.replace("-", " ")}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1">{selectedProvider.contactEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1">{selectedProvider.contactPhone}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1">{selectedProvider.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Areas</label>
                <p className="mt-1">{selectedProvider.serviceAreas.join(", ")}</p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {!selectedProvider.isApproved ? (
                  <>
                    <Button 
                      onClick={() => handleApproveProvider(selectedProvider.id)}
                      disabled={actionLoading === selectedProvider.id}
                    >
                      {actionLoading === selectedProvider.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Approve Provider
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => handleRejectProvider(selectedProvider.id)}
                      disabled={actionLoading === selectedProvider.id}
                    >
                      {actionLoading === selectedProvider.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject Application
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant={selectedProvider.isActive ? "destructive" : "default"}
                    onClick={() => handleSuspendProvider(selectedProvider.id)}
                    disabled={actionLoading === selectedProvider.id}
                  >
                    {actionLoading === selectedProvider.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : selectedProvider.isActive ? (
                      <XCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {selectedProvider.isActive ? "Suspend Provider" : "Reactivate Provider"}
                  </Button>
                )}
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Provider
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}