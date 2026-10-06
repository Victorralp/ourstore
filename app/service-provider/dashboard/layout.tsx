"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Home,
  Wrench,
  Calendar,
  BarChart3,
  MessageSquare,
  Settings,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Store
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

const navigation: Array<{
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & React.RefAttributes<SVGSVGElement>>;
  badge?: string;
}> = [
  { name: "Dashboard", href: "/service-provider/dashboard", icon: Home },
  { name: "My Services", href: "/service-provider/dashboard/services", icon: Wrench },
  { name: "Bookings", href: "/service-provider/dashboard/bookings", icon: Calendar },
  { name: "Analytics", href: "/service-provider/dashboard/analytics", icon: BarChart3 },
  { name: "Reviews", href: "/service-provider/dashboard/reviews", icon: MessageSquare },
  { name: "Settings", href: "/service-provider/dashboard/settings", icon: Settings },
]

export default function ServiceProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isActive = (path: string) => {
    if (path === "/service-provider/dashboard") {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const handleLogout = async () => {
    try {
      await logout()
      // Redirect to home page after logout
      window.location.href = "/"
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  Service Provider Portal
                </h2>
                <p className="text-xs text-gray-600">
                  Manage your services
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active 
                        ? "bg-blue-100 text-blue-800 border border-blue-200" 
                        : "text-gray-900 hover:bg-gray-100"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.name}
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
                  {user?.displayName || user?.email || "Service Provider"}
                </p>
                <p className="text-xs text-gray-600">
                  Professional Account
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Service Provider Portal
                    </h2>
                    <p className="text-xs text-gray-600">
                      Manage your services
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
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${active 
                          ? "bg-blue-100 text-blue-800 border border-blue-200" 
                          : "text-gray-900 hover:bg-gray-100"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {item.name}
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
                    {user?.displayName || user?.email || "Service Provider"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Professional Account
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                  setSidebarOpen(false)
                  handleLogout()
                }}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
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