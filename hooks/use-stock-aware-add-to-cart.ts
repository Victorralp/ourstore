"use client"

import { useCart, type CartItem } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { isOutOfStock, unitsLeftToAdd } from "@/lib/product-stock"

// Adds a product to the cart without going over its stock, counting what's
// already in the cart. Tells the shopper when nothing more can be added.
export function useStockAwareAddToCart() {
  const { addToCart, getCartItem } = useCart()
  const { toast } = useToast()

  return (product: { id: string; name: string; inStock?: boolean; stockQuantity?: number }, item: CartItem) => {
    if (isOutOfStock(product)) {
      toast({ title: "Out of stock", description: `${product.name} is sold out.` })
      return false
    }
    const left = unitsLeftToAdd(product, getCartItem(product.id)?.quantity ?? 0)
    if (left < 1) {
      toast({ title: "No more in stock", description: `All available units of ${product.name} are already in your cart.` })
      return false
    }
    addToCart({ ...item, quantity: Math.min(item.quantity, left) })
    return true
  }
}
