"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, ShoppingCart, Heart, Flame, Store, Eye } from "lucide-react"
import { getProducts, type Product } from "@/lib/firebase-products"
import { useStockAwareAddToCart } from "@/hooks/use-stock-aware-add-to-cart"
import { isOutOfStock } from "@/lib/product-stock"
import { formatCurrency } from "@/lib/utils"
import { useWishlist, type WishlistItem } from "@/hooks/use-wishlist"

export default function TrendingProducts() {
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTrendingProducts = async () => {
      setLoading(true)
      try {
        // Get trending products - just get recent products for now
        const { products: allProducts } = await getProducts({}, 12)
        setTrendingProducts(allProducts.slice(0, 8))
      } catch (error) {
        console.error("Error loading trending products:", error)
        setTrendingProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadTrendingProducts()
  }, [])

  const addToCartWithinStock = useStockAwareAddToCart()
  const { toggleWishlist, isInWishlist } = useWishlist()

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    addToCartWithinStock(product, {
      productId: product.id,
      name: product.name,
      price: product.discount ? product.price * (1 - product.discount / 100) : product.price,
      image: product.images?.[0] || "/placeholder.jpg",
      quantity: 1,
      options: {}
    });
  }

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const wishlistItem: WishlistItem = {
      id: product.id,
      name: product.name,
      price: product.discount ? product.price * (1 - product.discount / 100) : product.price,
      originalPrice: product.discount ? product.price : undefined,
      image: product.images?.[0] || "/placeholder.jpg",
      category: product.category,
      inStock: product.inStock
    };
    toggleWishlist(wishlistItem);
  }

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-200 rounded-md w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-md w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-md mb-4"></div>
                <div className="h-4 bg-gray-200 rounded-md mb-2"></div>
                <div className="h-6 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (trendingProducts.length === 0) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <Flame className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Trending Products Yet</h3>
            <p className="text-gray-600 mb-6">
              Trending products will appear here once vendors start adding products and customers begin shopping.
            </p>
            <div className="space-x-4">
              <Link href="/vendor/register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Store className="h-4 w-4 mr-2" />
                  Become a Vendor
                </Button>
              </Link>
              <Link href="/shop">
                <Button variant="outline">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Trending Now
            </h2>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover what's popular right now - these products are flying off our shelves!
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {trendingProducts.map((product, index) => (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-white relative overflow-hidden">
              {/* Trending Badge */}
              {index < 3 && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                    <Flame className="h-3 w-3 mr-1" />
                    #{index + 1} Trending
                  </Badge>
                </div>
              )}

              {/* Product Image */}
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                <Link href={`/products/${product.id}`}>
                  <Image 
                    src={product.images?.[0] || "/placeholder.jpg"} 
                    alt={product.name} 
                    fill
                    className="object-contain p-1 group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </Link>
                
                {product.discount && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-red-500 hover:bg-red-600 text-white">
                      -{product.discount}% OFF
                    </Badge>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => handleToggleWishlist(product, e)}
                      className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors ${
                        isInWishlist(product.id) 
                          ? 'bg-rose-100 text-rose-500' 
                          : 'bg-white hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={isOutOfStock(product)}
                      aria-label="Add to cart"
                      className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <Link href={`/products/${product.id}`}>
                  <h3 className="font-medium text-lg hover:text-green-600 transition-colors mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                
                <p className="text-sm text-gray-500 mb-2">
                  {product.category}
                </p>

                
                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">
                      {product.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({Math.floor(Math.random() * 50) + 10} reviews)
                    </span>
                  </div>
                )}
                
                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    {product.discount ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">
                          ₦{(product.price * (1 - product.discount / 100)).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          ₦{product.price?.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-gray-900">
                        ₦{product.price?.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <Badge variant="outline" className="text-xs">
                    {isOutOfStock(product) ? "Out of Stock" : "In Stock"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All Buttons */}
        <div className="text-center space-x-4">
          <Link href="/shop">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
              <TrendingUp className="h-5 w-5 mr-2" />
              View All Trending Products
            </Button>
          </Link>
          <Link href="/stores">
            <Button size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
              <Store className="h-5 w-5 mr-2" />
              Browse All Stores
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}