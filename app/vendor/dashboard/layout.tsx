"use client"

import { useEffect, useState } from "react"
import { useVendor } from "@/hooks/use-vendor"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Home, 
  Menu, 
  X,
  Store,
  Settings,
  LogOut,
  Bell,
  User,
  Calendar,
  Wrench,
  Users,
  Star
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { KycBanner } from "@/components/kyc-banner"
import { StoreSwitcher } from "@/components/store-switcher"

export default function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  const { vendor, activeStore, allStores, isVendor, loading } = useVendor()
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Only people who have applied for a store can use the vendor dashboard
    if (!loading && !isVendor) {
      router.push("/vendor/register")
    }
  }, [isVendor, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-green-500 border-l-green-600 border-r-green-600 border-b-green-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Redirecting to registration
  if (!isVendor) return null

  const isActive = (path: string) => {
    if (path === "/vendor/dashboard") {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const navigationItems = [
    {
      href: "/vendor/dashboard",
      label: "Dashboard",
      icon: Home,
      badge: null
    },
    {
      href: "/vendor/stores",
      label: "My Stores",
      icon: Store,
      badge: allStores.length > 1 ? allStores.length.toString() : null
    },
    {
      href: "/vendor/dashboard/products",
      label: "Products",
      icon: ShoppingBag,
      badge: null
    },
    {
      href: "/vendor/dashboard/orders",
      label: "Orders",
      icon: Package,
      badge: "3" // Mock notification badge
    },
    {
      href: "/vendor/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
      badge: null
    }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Always visible on desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Vendor Portal
                </h2>
                <p className="text-xs text-gray-600">
                  {allStores.length} store{allStores.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Store Switcher - Only show for vendors with stores */}
            <StoreSwitcher />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active 
                        ? "bg-green-100 text-green-800 border border-green-200" 
                        : "text-gray-900 hover:bg-gray-100"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName || user?.email || "Vendor"}
                </p>
                <p className="text-xs text-gray-600">
                  Vendor Account
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={activeStore ? `/vendor/${activeStore.id}` : "#"}>
                  <Store className="h-4 w-4 mr-1" />
                  View Store
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Mode Toggle - REMOVED as per user request to remove Service Provider Portal */}
            {/* 
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Switch Mode:</p>
              <Button 
                variant={isServiceProvider ? "secondary" : "default"}
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  const newMode = !isServiceProvider
                  setIsServiceProvider(newMode)
                  localStorage.setItem('serviceProviderMode', newMode.toString())
                }}
              >
                {isServiceProvider ? (
                  <><Wrench className="h-3 w-3 mr-1" /> Service Provider</>
                ) : (
                  <><Store className="h-3 w-3 mr-1" /> Product Vendor</>
                )}
              </Button>
            </div>
            */}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar - Only visible when open */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 md:hidden">
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Store className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Vendor Portal
                    </h2>
                    <p className="text-xs text-gray-600">
                      {allStores.length} store{allStores.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Store Switcher */}
              <StoreSwitcher />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${active 
                          ? "bg-green-100 text-green-800 border border-green-200" 
                          : "text-gray-900 hover:bg-gray-100"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.displayName || user?.email || "Vendor"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Vendor Account
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={activeStore ? `/vendor/${activeStore.id}` : "#"}>
                    <Store className="h-4 w-4 mr-1" />
                    View Store
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Mode Toggle - REMOVED as per user request to remove Service Provider Portal */}
              {/* 
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Switch Mode:</p>
                <Button 
                  variant={isServiceProvider ? "secondary" : "default"}
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    const newMode = !isServiceProvider
                    setIsServiceProvider(newMode)
                    localStorage.setItem('serviceProviderMode', newMode.toString())
                    setSidebarOpen(false)
                  }}
                >
                  {isServiceProvider ? (
                    <><Wrench className="h-3 w-3 mr-1" /> Service Provider</>
                  ) : (
                    <><Store className="h-3 w-3 mr-1" /> Product Vendor</>
                  )}
                </Button>
              </div>
              */}
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-gray-900">Dashboard</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Bell className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <KycBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 