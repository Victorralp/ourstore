"use client"

import { useState, useEffect } from "react"
import { useVendor } from "@/hooks/use-vendor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { 
  Store, 
  Plus, 
  Settings, 
  Eye, 
  BarChart3,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Crown,
  Sparkles,
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  ExternalLink
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import Image from "next/image"

export default function VendorStoresPage() {
  const { activeStore, allStores, switchStore, canCreateMoreStores, vendorOwner, refreshStores } = useVendor()
  const [switchingStore, setSwitchingStore] = useState<string | null>(null)

  const handleStoreSwitch = async (storeId: string) => {
    if (storeId === activeStore?.id) return
    setSwitchingStore(storeId)
    try {
      await switchStore(storeId)
    } catch (error) {
      console.error("Failed to switch store:", error)
    } finally {
      setSwitchingStore(null)
    }
  }

  const onRequestDeleteStore = (store: any) => {
    if (!confirm(`Are you sure you want to permanently delete the store "${store.shopName}"? This cannot be undone.`)) {
      return
    }
    handleDeleteStore(store)
  }

  const handleDeleteStore = async (store: any) => {
    if (!vendorOwner || !store?.id) return
    setDeletingStoreId(store.id)
    const optimisticId = store.id
    try {
      const { deleteVendorStore } = await import("@/lib/firebase-vendors")
      await deleteVendorStore(vendorOwner.uid, store.id)
      toast.success(`Deleted store: ${store.shopName}`)
      // Optimistically remove from UI by refreshing stores
      if (refreshStores) {
        await refreshStores()
      }
    } catch (error: any) {
      console.error("Failed to delete store:", error)
      toast.error(error?.message || "Failed to delete store")
    } finally {
      setDeletingStoreId(null)
    }
  }

  const [storeStats, setStoreStats] = useState<Record<string, any>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null)

  // Fetch stats for all stores when component loads
  useEffect(() => {
    if (allStores.length > 0) {
      allStores.forEach(store => {
        if (!storeStats[store.id] && !loadingStats[store.id]) {
          fetchStoreStats(store.id)
        }
      })
    }
  }, [allStores])

  const fetchStoreStats = async (storeId: string) => {
    if (storeStats[storeId] || loadingStats[storeId]) return

    setLoadingStats(prev => ({ ...prev, [storeId]: true }))

    try {
      // Fetch products for this store
      const { getVendorProducts, getStoreOrders } = await import("@/lib/firebase-vendors")
      
      const products = await getVendorProducts(storeId)
      
      // Fetch orders for this store, and its sales from them
      const { orders, sales: revenue } = await getStoreOrders(storeId)
      
      // Mock views for now (you can implement analytics later)
      const views = Math.floor(Math.random() * 1000) + 100
      
      const stats = {
        products: products.length,
        orders: orders.length,
        revenue: revenue,
        views: views
      }
      
      // Cache the stats
      setStoreStats(prev => ({ ...prev, [storeId]: stats }))
    } catch (error) {
      console.error("Failed to fetch store stats:", error)
      setStoreStats(prev => ({ ...prev, [storeId]: {
        products: 0,
        orders: 0,
        revenue: 0,
        views: 0
      }}))
    } finally {
      setLoadingStats(prev => ({ ...prev, [storeId]: false }))
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 text-gray-900">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-8 lg:mb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Store className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-black">My Store Empire</h1>
                  <p className="text-gray-600 text-lg">
                    Manage your {allStores.length} store{allStores.length !== 1 ? 's' : ''} • {3 - allStores.length} slot{3 - allStores.length !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 max-w-md">
                <div className="text-center">
                  <div className="text-2xl font-bold">{allStores.length}</div>
                  <div className="text-sm text-blue-100">Active Stores</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {allStores.filter(s => s.approved).length}
                  </div>
                  <div className="text-sm text-blue-100">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {allStores.filter(s => !s.approved).length}
                  </div>
                  <div className="text-sm text-blue-100">Pending</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {canCreateMoreStores && (
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
                >
                  <Link href="/vendor/register">
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Store
                  </Link>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border border-gray-200 shadow-lg bg-white text-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Stores</p>
                  <p className="text-3xl font-bold">{allStores.length}</p>
                  <p className="text-blue-100 text-xs">of 3 maximum</p>
                </div>
                <Store className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-lg bg-white text-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Live Stores</p>
                  <p className="text-3xl font-bold">
                    {allStores.filter(s => s.isActive && s.approved).length}
                  </p>
                  <p className="text-green-100 text-xs">actively selling</p>
                </div>
                <Power className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-lg bg-white text-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Pending Review</p>
                  <p className="text-3xl font-bold">
                    {allStores.filter(s => !s.approved).length}
                  </p>
                  <p className="text-amber-100 text-xs">awaiting approval</p>
                </div>
                <Users className="h-8 w-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-gray-200 shadow-lg bg-white text-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Available Slots</p>
                  <p className="text-3xl font-bold">{3 - allStores.length}</p>
                  <p className="text-purple-100 text-xs">stores remaining</p>
                </div>
                <Plus className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stores Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-black flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-600" />
              Your Store Portfolio
            </h2>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </div>
          </div>
        
          {allStores.length === 0 ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-16 text-center">
                <div className="mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <Store className="h-12 w-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-yellow-800" />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                  Ready to Build Your Empire?
                </h3>
                <p className="text-xl text-gray-700 mb-8 max-w-md mx-auto">
                  Create your first store and start your journey to becoming a successful online merchant
                </p>
                
                <div className="space-y-4">
                  <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                    <Link href="/vendor/register">
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Store
                    </Link>
                  </Button>
                  
                  <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Free to start
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Easy setup
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      No limits
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {allStores.map((store) => {
              const isActive = store.id === activeStore?.id
              const isSwitching = switchingStore === store.id
              
              return (
                <Card key={store.id} className={`group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg overflow-hidden ${isActive ? 'ring-2 ring-blue-500 shadow-blue-100' : ''}`}>
                  {/* Store Header with Gradient */}
                  <div className={`p-6 ${isActive ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'bg-gray-50'} text-gray-900 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-transparent"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {store.logoUrl ? (
                            <div className="relative">
                              <Image
                                src={store.logoUrl}
                                alt={store.shopName}
                                width={64}
                                height={64}
                                className="rounded-xl object-cover border-2 border-gray-200 shadow-lg"
                              />
                              {isActive && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <Crown className="h-3 w-3 text-yellow-800" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`w-16 h-16 ${isActive ? 'bg-gray-200' : 'bg-gray-100'} rounded-xl flex items-center justify-center border-2 border-gray-200`}>
                              <Store className="h-8 w-8 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-xl text-black">{store.shopName}</h3>
                              {isActive && (
                                <Badge className="bg-yellow-400 text-yellow-900 text-xs font-semibold">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={store.approved ? "secondary" : "outline"} className={store.approved ? "bg-green-400 text-green-900" : "bg-orange-400 text-orange-900"}>
                                {store.approved ? "✓ Approved" : "⏳ Pending"}
                              </Badge>
                              <Badge variant="outline" className={store.isActive ? "bg-emerald-400 text-emerald-900" : "bg-red-400 text-red-900"}>
                                {store.isActive ? "🟢 Live" : "🔴 Offline"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {!isActive && (
                              <DropdownMenuItem 
                                onClick={() => handleStoreSwitch(store.id)}
                                disabled={isSwitching}
                                className="font-medium"
                              >
                                <Power className="h-4 w-4 mr-2" />
                                {isSwitching ? "Switching..." : "Switch to Store"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={`/vendor/${store.id}`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Storefront
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href="/vendor/dashboard/settings">
                                <Settings className="h-4 w-4 mr-2" />
                                Store Settings
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href="/vendor/dashboard/analytics">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics Dashboard
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-700"
                              onClick={() => onRequestDeleteStore(store)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {store.bio}
                      </p>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    {/* Store Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-black">
                          {loadingStats[store.id] ? "..." : (storeStats[store.id]?.products ?? 0)}
                        </p>
                        <p className="text-xs text-black">Products</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <ShoppingCart className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-black">
                          {loadingStats[store.id] ? "..." : (storeStats[store.id]?.orders ?? 0)}
                        </p>
                        <p className="text-xs text-black">Orders</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-black">
                          ₦{loadingStats[store.id] ? "..." : (storeStats[store.id]?.revenue ?? 0)}
                        </p>
                        <p className="text-xs text-black">Revenue</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <TrendingUp className="h-6 w-6 text-orange-600" />
                        </div>
                        <p className="text-2xl font-bold text-black">
                          {loadingStats[store.id] ? "..." : (storeStats[store.id]?.views ?? 0)}
                        </p>
                        <p className="text-xs text-black">Views</p>
                      </div>
                    </div>
                    
                    {/* Store Info */}
                    <div className="flex items-center gap-4 mb-6 p-4 bg-gray-100 rounded-xl">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(store.createdAt.toDate()).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="h-4 w-4" />
                        <span>Nigeria</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Star className="h-4 w-4" />
                        <span>4.8 rating</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {!isActive ? (
                        <Button 
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          onClick={() => handleStoreSwitch(store.id)}
                          disabled={isSwitching}
                        >
                          {isSwitching ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Switching...
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Switch to This Store
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg" asChild>
                          <Link href="/vendor/dashboard">
                            <Crown className="h-4 w-4 mr-2" />
                            Manage Active Store
                          </Link>
                        </Button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="border-gray-300 hover:bg-gray-50" asChild>
                          <Link href={`/vendor/${store.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Store
                          </Link>
                        </Button>
                        <Button variant="outline" className="border-gray-300 hover:bg-gray-50" asChild>
                          <Link href="/vendor/dashboard/analytics">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          )}

          {/* Create New Store CTA */}
          {canCreateMoreStores && allStores.length > 0 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 border-dashed border-2 border-blue-300">
              <CardContent className="p-12 text-center">
                <div className="mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                      <Plus className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-yellow-800" />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Expand Your Empire
                </h3>
                <p className="text-lg text-gray-700 mb-6 max-w-md mx-auto">
                  You can create up to <span className="font-bold text-blue-600">{3 - allStores.length} more store{3 - allStores.length !== 1 ? 's' : ''}</span> to reach new markets and grow your business
                </p>
                
                <div className="space-y-4">
                  <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg">
                    <Link href="/vendor/register">
                      <Plus className="h-5 w-5 mr-2" />
                      Create Store #{allStores.length + 1}
                    </Link>
                  </Button>
                  
                  <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      New markets
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      More revenue
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Brand diversity
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Store Limit Reached */}
          {!canCreateMoreStores && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
              <CardContent className="p-12 text-center">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-amber-800 mb-4">
                  🎉 Maximum Stores Reached!
                </h3>
                <p className="text-lg text-amber-700 mb-6 max-w-md mx-auto">
                  Congratulations! You've reached the <span className="font-bold">maximum limit of 3 stores</span> per account. You're now a true merchant empire!
                </p>
                
                <div className="bg-white/60 rounded-xl p-6 mb-6">
                  <p className="text-sm text-amber-800 mb-4">
                    <strong>Want to create a new store?</strong> You'll need to deactivate an existing one first.
                  </p>
                  <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Store Settings
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-6 text-sm text-amber-600">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Elite Status
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Max Potential
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Empire Builder
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}