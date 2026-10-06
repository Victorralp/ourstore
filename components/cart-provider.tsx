"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/hooks/use-toast"
import { Product } from "@/types"

interface CartItem {
  options: any
  productId: string
  name: string
  price: number
  image: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  removePurchasedItems: (purchased: Array<{ productId: string; quantity: number }>) => void
  getTotalItems: () => number
  getTotalPrice: () => number
  isInCart: (productId: string) => boolean
  getCartItem: (productId: string) => CartItem | undefined
  isClient: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorage<CartItem[]>("cart-items", [])
  const [isClient, setIsClient] = useState(false)
  const { toast } = useToast()

  // Mark when component is mounted on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Higher priority client detection to help with hydration
  useEffect(() => {
    // This runs immediately during hydration
    if (typeof window !== 'undefined') {
      setIsClient(true)
    }
  }, [])

  // Sync cart across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart-items' && e.newValue) {
        try {
          const newItems = JSON.parse(e.newValue);
          setItems(newItems);
        } catch (error) {
          console.error('Failed to parse cart items from storage', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setItems]);

  const addToCart = (item: CartItem) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.productId === item.productId)

      if (existingItem) {
        return prevItems.map((i) => 
          i.productId === item.productId 
            ? { ...i, quantity: i.quantity + item.quantity } 
            : i
        )
      } else {
        return [...prevItems, item]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setItems((prevItems) => {
      return prevItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      )
    })
  }

  const clearCart = () => {
    setItems([])
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart",
    })
  }

  // After an order is paid: take out what was bought, keeping anything added or
  // increased since (e.g. in another tab while paying)
  const removePurchasedItems = (purchased: Array<{ productId: string; quantity: number }>) => {
    setItems((prevItems) =>
      prevItems.flatMap((item) => {
        const bought = purchased.find((p) => p.productId === item.productId)
        if (!bought) return [item]
        const left = item.quantity - bought.quantity
        return left > 0 ? [{ ...item, quantity: left }] : []
      }),
    )
  }

  const getTotalItems = () => {
    // During SSR or initial hydration, return 0
    if (!isClient) return 0
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    // During SSR or initial hydration, return 0
    if (!isClient) return 0
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const isInCart = (productId: string) => {
    // During SSR or initial hydration, return false
    if (!isClient) return false
    return items.some((item) => item.productId === productId)
  }

  const getCartItem = (productId: string) => {
    // During SSR or initial hydration, return undefined
    if (!isClient) return undefined
    return items.find((item) => item.productId === productId)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        removePurchasedItems,
        getTotalItems,
        getTotalPrice,
        isInCart,
        getCartItem,
        isClient
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
