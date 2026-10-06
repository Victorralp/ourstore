"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAdmin } from "@/hooks/use-admin"
import { useCountry } from "@/components/country-provider"
import { useCurrency } from "@/components/currency-provider"
import { Package, ShoppingBag, Home, Settings, BarChart3, LogOut, Upload, CloudUpload, Users, Wrench, ShieldCheck } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin()
  const router = useRouter()
  const pathname = usePathname()
  const { availableCountries, setSelectedCountry } = useCountry()
  const { setCurrency } = useCurrency()

  useEffect(() => {
    // Force admin panel to use GBP
    const ukCountry = availableCountries.find(country => country.id === "uk")
    if (ukCountry) {
      setSelectedCountry(ukCountry)
      setCurrency("GBP", "£", 1)
      // Store in localStorage to persist
      localStorage.setItem("selectedCountry", JSON.stringify(ukCountry))
      localStorage.setItem(
        "selectedCurrency",
        JSON.stringify({
          currency: "GBP",
          symbol: "£",
          exchangeRate: 1,
        })
      )
    }
  }, [availableCountries, setSelectedCountry, setCurrency])

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/login")
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Router will redirect
  }

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') {
      return true
    }
    if (path !== '/admin' && pathname?.startsWith(path)) {
      return true
    }
    return false
  }

  return (
    <div className="admin-layout min-h-screen flex">
      {/* Sidebar Navigation */}
      <div className="relative w-64 bg-gray-100 text-gray-800 border-r border-gray-200 min-h-screen p-4 hidden md:block">
        <div className="mb-8">
          <h2 className="text-xl font-bold">RUACH E-STORE</h2>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </div>
        
        <nav className="space-y-1">
          <Link 
            href="/admin" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin') && pathname === '/admin' 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            href="/admin/products" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/products') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Products</span>
          </Link>
          
          <Link 
            href="/admin/orders" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/orders') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Orders</span>
          </Link>

          <Link 
            href="/admin/products/cloudinary-migration" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/products/cloudinary-migration') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CloudUpload className="h-5 w-5" />
            <span>Cloudinary Migration</span>
          </Link>
          
          <Link 
            href="/admin/products/import" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/products/import') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Import Products</span>
          </Link>

          <Link 
            href="/admin/vendors" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/vendors') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Vendors</span>
          </Link>

          <Link 
            href="/admin/service-providers" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/service-providers') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Wrench className="h-5 w-5" />
            <span>Service Providers</span>
          </Link>

          <Link 
            href="/admin/kyc" 
            className={`flex items-center gap-3 px-3 py-2 rounded-md ${
              isActive('/admin/kyc') 
                ? 'bg-green-600 text-white font-medium' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Identity Verification</span>
          </Link>
        </nav>
        
        <div className="absolute bottom-8 inset-x-0 px-4">
          <div className="space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Back to Site</span>
            </Link>

            <button
              onClick={() => {
                router.push('/login')
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors w-full md:w-auto"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-2 md:hidden z-50">
        <div className="flex justify-around">
          <Link 
            href="/admin" 
            className={`flex flex-col items-center p-2 ${
              isActive('/admin') && pathname === '/admin' ? 'text-white font-medium' : 'text-gray-400'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link 
            href="/admin/products" 
            className={`flex flex-col items-center p-2 ${
              isActive('/admin/products') ? 'text-white font-medium' : 'text-gray-400'
            }`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-xs mt-1">Products</span>
          </Link>
          
          <Link 
            href="/admin/orders" 
            className={`flex flex-col items-center p-2 ${
              isActive('/admin/orders') ? 'text-white font-medium' : 'text-gray-400'
            }`}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs mt-1">Orders</span>
          </Link>
          
          <Link 
            href="/" 
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-xs mt-1">Exit</span>
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </div>
    </div>
  )
} 