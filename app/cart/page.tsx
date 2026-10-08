"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { formatCurrency } from "@/lib/utils"

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, getTotalPrice, getTotalItems } = useCart()
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  const subtotal = getTotalPrice()
  const shipping = subtotal >= 50 ? 0 : 4.99
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="min-h-screen py-8 pt-40">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 mx-auto text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven’t added any items to your cart yet. Start shopping to fill it up!
            </p>
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href="/shop">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 pt-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <div className="text-gray-600">
            {getTotalItems()} item{getTotalItems() !== 1 ? "s" : ""} in your cart
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <Image 
                      src={imageError[item.productId] ? "/product_images/unknown-product.jpg" : (item.image || "/product_images/unknown-product.jpg")} 
                      alt={item.name}
                      fill
                      className="object-contain"
                      onError={() => setImageError(prev => ({ ...prev, [item.productId]: true }))}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">
                          <Link href={`/products/${item.productId}`} className="hover:text-green-600">
                            {item.name}
                          </Link>
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.productId)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="h-8 w-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          className="h-8 w-8 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        {item.maxQuantity !== undefined && item.quantity >= item.maxQuantity && (
                          <span className="text-xs text-gray-500">Only {item.maxQuantity} in stock</span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatCurrency(item.price * item.quantity)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(item.price)} each</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" asChild>
                <Link href="/shop">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal ({getTotalItems()} items)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? <span className="text-green-600 font-medium">Free</span> : formatCurrency(shipping)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {shipping > 0 && (
                  <div className="text-sm text-gray-500">
                    Add {formatCurrency(50 - subtotal)} more for free shipping
                  </div>
                )}
                
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
                  <Link href="/checkout" className="w-full flex items-center justify-center">
                    Proceed to Checkout
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
