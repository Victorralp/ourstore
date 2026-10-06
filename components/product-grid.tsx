"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { isOutOfStock } from "@/lib/product-stock"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Eye, ShoppingCart, Heart, X, User } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { formatCurrency } from "@/lib/utils"
import { useWishlist, type WishlistItem } from "@/hooks/use-wishlist"
import ProductDetailModal from "@/components/product-detail-modal"
import { Product } from "@/types"

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
}

export default function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isOutOfStock(product as any)) return;
    
    const discount = (product as any).discount || 0;
    const finalPrice = discount > 0 ? product.price * (1 - discount / 100) : product.price;
    
    addToCart({
      productId: product.id,
      name: product.name,
      price: finalPrice,
      image: product.images?.[0] || "/placeholder.jpg",
      quantity: 1,
      options: {}
    });
  };

  const handleProductClick = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Create a compatible product object with fallbacks
    const discount = (product as any).discount || 0;
    const originalPrice = discount > 0 ? product.price : undefined;
    const discountedPrice = discount > 0 ? product.price * (1 - discount / 100) : product.price;
    
    const wishlistItem: WishlistItem = {
      id: product.id,
      name: product.name,
      price: discountedPrice,
      originalPrice,
      image: product.images?.[0] || "/placeholder.jpg",
      category: product.category || product.displayCategory,
      inStock: product.inStock
    };
    
    toggleWishlist(wishlistItem);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
            <div className="aspect-square bg-gray-100 relative">
              <div className="absolute inset-0 animate-pulse bg-gray-200" />
            </div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse mb-4 w-1/2" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600">No products found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <Card 
            key={product.id} 
            className="group relative overflow-hidden hover:shadow-lg transition-all duration-300"
            onMouseEnter={() => setHoveredProductId(product.id)}
            onMouseLeave={() => setHoveredProductId(null)}
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <div 
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={(e) => handleProductClick(product, e)}
              >
                {isOutOfStock(product as any) && (
                  <div className="absolute top-4 left-0 z-20 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-r-lg shadow-md">
                    Out of Stock
                  </div>
                )}
                
                {(product as any).discount && (
                  <div className="absolute top-12 left-0 z-20 bg-red-500 text-white text-xs font-bold px-3 py-0.5 rounded-r-lg shadow-md">
                    -{(product as any).discount}% OFF
                  </div>
                )}
                
                {(product as any).bestseller && (
                  <div className="absolute bottom-4 left-4 z-20">
                    <Badge className="bg-amber-500 hover:bg-amber-600">Bestseller</Badge>
                  </div>
                )}
                
                {(product as any).new && (
                  <div className="absolute bottom-4 left-4 z-20">
                    <Badge className="bg-blue-500 hover:bg-blue-600">New Arrival</Badge>
                  </div>
                )}
              </div>
            
              <Image
                src={product.images?.[0] || "/placeholder.jpg"}
                alt={product.name}
                fill
                className="object-contain p-1 transition-all duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                }}
              />
              
              {/* Wishlist button */}
              <div className="absolute top-3 right-3 z-30">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-rose-500 shadow-sm"
                  onClick={(e) => handleToggleWishlist(product, e)}
                >
                  <Heart 
                    className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''}`}
                  />
                  <span className="sr-only">Toggle wishlist</span>
                </Button>
              </div>
              
              {/* Hover actions: above the image's click layer (z-10) so the buttons can be
                  clicked; the dimmed background lets clicks through to open quick view.
                  Shown on hover, or when a button has keyboard focus. */}
              <div className={`absolute inset-0 z-20 pointer-events-none bg-black bg-opacity-20 flex items-center justify-center gap-2 transition-opacity duration-300 focus-within:opacity-100 ${hoveredProductId === product.id ? 'opacity-100' : 'opacity-0'}`}>
                <button 
                  onClick={(e) => handleProductClick(product, e)}
                  className={`w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors focus-visible:pointer-events-auto ${hoveredProductId === product.id ? 'pointer-events-auto' : ''}`}
                  aria-label="View product details"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button 
                  onClick={(e) => handleAddToCart(product, e)}
                  className={`w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors focus-visible:pointer-events-auto ${hoveredProductId === product.id ? 'pointer-events-auto' : ''}`}
                  aria-label="Add to cart"
                  disabled={isOutOfStock(product as any)}
                >
                  <ShoppingCart className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div 
                className="cursor-pointer"
                onClick={(e) => handleProductClick(product, e)}
              >
                <h3 className="font-medium text-lg hover:text-green-600 transition-colors">
                  {product.name}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">{product.displayCategory || product.category}</p>
              
              {product.rating && (
                <div className="flex items-center mt-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          product.rating && i < Math.floor(product.rating) 
                            ? "text-amber-400 fill-amber-400" 
                            : product.rating && i < product.rating 
                              ? "text-amber-400 fill-amber-400" 
                              : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {(product as any).reviewCount && (
                    <span className="text-sm text-gray-600 ml-2">
                      ({(product as any).reviewCount})
                    </span>
                  )}
                </div>
              )}
              
              <div className="mt-2">
                {(product as any).discount ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(product.price * (1 - (product as any).discount / 100))}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <Button 
                className="w-full" 
                size="sm"
                onClick={(e) => handleAddToCart(product, e)}
                disabled={isOutOfStock(product as any)}
              >
                {isOutOfStock(product as any) ? "Out of Stock" : "Add to Cart"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
