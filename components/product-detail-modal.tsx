"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Minus, Plus, Star } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { formatCurrency } from "@/lib/utils"
import { isOutOfStock, unitsLeftToAdd } from "@/lib/product-stock"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useWishlist, type WishlistItem } from "@/hooks/use-wishlist"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Product } from "@/types"
import CloudinaryImage from "@/components/cloudinary-image"

interface ProductDetailModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export default function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { addToCart, getCartItem } = useCart()
  const { isInWishlist, toggleWishlist } = useWishlist()

  // The modal is reused, so start each product at a quantity of 1
  useEffect(() => {
    setQuantity(1)
  }, [product?.id])

  if (!product) return null

  // Calculate discounted price if applicable
  const discountedPrice = product.discount && product.discount > 0 
    ? product.price * (1 - product.discount / 100) 
    : null

  const handleAddToCart = () => {
    if (outOfStock || maxQuantity < 1) return
    addToCart({
      productId: product.id,
      name: product.name,
      price: discountedPrice || product.price,
      image: product.cloudinaryImages?.[selectedImage]?.url || 
             product.images?.[selectedImage] || 
             product.images?.[0] || 
             "/placeholder.jpg",
      // Never more than are left after what's already in the cart
      quantity: Math.min(quantity, maxQuantity),
      options: {}
    })
  }

  const handleToggleWishlist = () => {
    const wishlistItem: WishlistItem = {
      id: product.id,
      name: product.name,
      price: discountedPrice || product.price,
      originalPrice: discountedPrice ? product.price : undefined,
      image: product.cloudinaryImages?.[0]?.url || 
             product.images?.[0] || 
             "/placeholder.jpg",
      category: product.category || product.displayCategory,
      inStock: product.inStock
    }
    
    toggleWishlist(wishlistItem)
  }

  const outOfStock = isOutOfStock(product as any)
  // Can't add more than are left, counting what's already in the cart
  const maxQuantity = unitsLeftToAdd(product as any, getCartItem(product.id)?.quantity ?? 0)
  const incrementQuantity = () => setQuantity(prev => Math.min(prev + 1, Math.max(maxQuantity, 1)))
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100">
              {product.cloudinaryImages && product.cloudinaryImages.length > 0 ? (
                <CloudinaryImage
                  publicId={product.cloudinaryImages[selectedImage].publicId}
                  alt={product.cloudinaryImages[selectedImage].alt || product.name}
                  size="medium"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={product.images?.[selectedImage] || "/product_images/unknown-product.jpg"}
                  alt={product.name}
                  fill
                  className="object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/product_images/unknown-product.jpg";
                  }}
                />
              )}
              
              {outOfStock && (
                <div className="absolute top-4 left-0 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-r-lg shadow-md">
                  Out of Stock
                </div>
              )}
              
              {product.discount && product.discount > 0 && (
                <div className="absolute top-12 left-0 z-10 bg-red-500 text-white text-xs font-bold px-3 py-0.5 rounded-r-lg shadow-md">
                  -{product.discount}% OFF
                </div>
              )}
            </div>
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{product.name}</h1>
              </div>
              
              <p className="text-gray-600 mt-1">{product.displayCategory || product.category}</p>
              
              {/* Price */}
              <div className="mt-4">
                {discountedPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(discountedPrice)}
                    </span>
                    <span className="text-gray-500 line-through">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
              
              {/* Description */}
              {product.description && (
                <div className="mt-4 text-gray-600">
                  <p>{product.description}</p>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Quantity */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="h-8 w-8 rounded-r-none"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="h-8 px-3 flex items-center justify-center border-y border-gray-200 bg-white">
                  {quantity}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={incrementQuantity}
                  disabled={quantity >= maxQuantity}
                  className="h-8 w-8 rounded-l-none"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={outOfStock || maxQuantity < 1}
              >
                <ShoppingCart className="h-4 w-4" />
                {!outOfStock && maxQuantity < 1 ? "All in Your Cart" : "Add to Cart"}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleToggleWishlist}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Add to Wishlist
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
