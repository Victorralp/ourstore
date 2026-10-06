"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getStoreOrders } from "@/lib/firebase-vendors"
import { db } from "@/lib/firebase"
import { useState, useEffect } from "react"
import { Package, ShoppingCart, DollarSign } from "lucide-react"

interface VendorStats {
  totalProducts: number
  totalOrders: number
  totalSales: number
}

export function VendorDashboardStats({ storeId }: { storeId: string }) {
  const [stats, setStats] = useState<VendorStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total products
        const productsQuery = query(
          collection(db, "products"), 
          where("vendorId", "==", storeId)
        )
        const productsSnapshot = await getDocs(productsQuery)
        const totalProducts = productsSnapshot.size

        // Fetch total orders and sales
        try {
          const { orders, sales } = await getStoreOrders(storeId)
          setStats({
            totalProducts,
            totalOrders: orders.length,
            totalSales: sales
          })
        } catch (ordersError) {
          console.error("Error fetching order stats:", ordersError)
          setStats({
            totalProducts,
            totalOrders: 0,
            totalSales: 0
          })
        }
      } catch (error) {
        console.error("Failed to fetch vendor stats:", error)
      }
    }

    if (storeId) {
      fetchStats()
    }
  }, [storeId])

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-500"
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-green-500"
    },
    {
      title: "Total Sales",
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      color: "text-purple-500"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 