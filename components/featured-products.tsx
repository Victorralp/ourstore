"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star, Award, TrendingUp, ChevronRight, Heart, Sparkles, Eye, X } from "lucide-react"
import { getProducts, type Product } from "@/lib/firebase-products"
import { useStockAwareAddToCart } from "@/hooks/use-stock-aware-add-to-cart"
import { isOutOfStock } from "@/lib/product-stock"
import { formatCurrency } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useWishlist, type WishlistItem } from "@/hooks/use-wishlist"

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const addToCartWithinStock = useStockAwareAddToCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        setLoading(true)
        // Get products from Firebase
        const { products: allProducts } = await getProducts({}, 20)

        // Filter for featured products or just take the first few
        const featured = allProducts.filter(p => !isOutOfStock(p)).slice(0, 8)

        setProducts(featured)
        console.log("Featured products loaded:", featured.length)
      } catch (error) {
        console.error("Error loading featured products:", error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadFeaturedProducts()
  }, [])

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    addToCartWithinStock(product, {
      productId: product.id,
      name: product.name,
      price: product.discount ?
        product.price * (1 - product.discount / 100) :
        product.price,
      image: product.images?.[0] || "/placeholder.jpg",
      quantity: 1,
      options: {}
    });
  };

  const handleQuickView = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setQuickViewProduct(product);
  };

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    const wishlistItem: WishlistItem = {
      id: product.id,
      name: product.name,
      price: product.discount ? product.price * (1 - product.discount / 100) : product.price,
      originalPrice: product.discount ? product.price : undefined,
      image: product.images?.[0] || "/placeholder.jpg",
      category: product.category,
      inStock: product.inStock !== false // Default to true if not specified
    };

    toggleWishlist(wishlistItem);
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="h-60 bg-gray-100" />
                <CardContent className="pt-4">
                  <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="h-5 bg-gray-100 rounded w-1/4" />
                  <div className="h-9 bg-gray-100 rounded w-1/3" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="py-16 bg-white text-gray-800">
        <div className="flex flex-col items-center mb-12">
          <div className="inline-flex items-center bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-green-100">
            <Sparkles className="h-4 w-4 mr-2" />
            <span>Handpicked Selection</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">Featured Products</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-6"></div>
          <p className="text-gray-600 text-center max-w-2xl mb-8">
            From our hands to yours. Discover the best of products in our featured collection. We've sourced the most unique products, from everyday essentials to one-of-a-kind treasures.
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {products.map((product) => (
              <Card
                key={product.id}
                className="group relative overflow-hidden border border-gray-200 hover:border-green-500 hover:shadow-lg transition-all duration-200 rounded-xl bg-white"
                onMouseEnter={() => setHoveredProductId(product.id)}
                onMouseLeave={() => setHoveredProductId(null)}
              >
                <div className="absolute right-3 top-3 z-20">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-rose-500 backdrop-blur-sm shadow-sm"
                    onClick={(e) => handleToggleWishlist(product, e)}
                  >
                    <Heart
                      className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                    <span className="sr-only">Add to wishlist</span>
                  </Button>
                </div>

                <Link href={`/products/${encodeURIComponent(product.id)}`} className="block">
                  <div className="relative aspect-square bg-white overflow-hidden">
                    {product.category && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {product.category}
                        </Badge>
                      </div>
                    )}

                    {product.discount && (
                      <div className="absolute top-12 left-0 z-10 bg-red-500 text-white text-xs font-bold px-3 py-0.5 rounded-r-lg shadow-md">
                        -{product.discount}% OFF
                      </div>
                    )}

                    {product.originalPrice && (
                      <div className="absolute top-12 left-0 z-10 bg-red-500 text-white text-xs font-bold px-3 py-0.5 rounded-r-lg shadow-md">
                        SAVE £{(product.originalPrice - product.price).toFixed(2)}
                      </div>
                    )}

                    {product.bestseller && (
                      <div className="absolute bottom-3 left-3 z-10">
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Bestseller
                        </Badge>
                      </div>
                    )}

                    {product.new && (
                      <div className="absolute bottom-3 left-3 z-10">
                        <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm">
                          New Arrival
                        </Badge>
                      </div>
                    )}

                    {product.popular && (
                      <div className="absolute bottom-3 left-3 z-10">
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 shadow-sm flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Top Rated
                        </Badge>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-gray-100/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />

                    <Image
                      src={product.images?.[0] || "/placeholder.jpg"}
                      alt={product.name}
                      fill
                      className="object-contain p-1 transition-all duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      onError={(e) => {
                        console.error(`Failed to load image: ${product.images?.[0]}`);
                        const imgElement = e.currentTarget as HTMLImageElement;
                        imgElement.src = "/placeholder.jpg";
                        imgElement.onerror = null;
                      }}
                    />

                    {/* Hover action buttons */}
                    <div className={`absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center gap-2 transition-opacity duration-300 ${hoveredProductId === product.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={(e) => handleQuickView(product, e)}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
                        aria-label="Quick view"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </Link>

                <CardContent className="pt-4">
                  <Link href={`/products/${encodeURIComponent(product.id)}`} className="block">
                    <h3 className="font-semibold text-lg truncate group-hover:text-green-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2 h-10">
                    {product.description}
                  </p>

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center mt-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${product.rating && i < Math.floor(product.rating)
                              ? "text-amber-400 fill-amber-400"
                              : product.rating && i < product.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 ml-1">
                        ({product.reviewCount || 0})
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-0">
                  <div className="flex flex-col">
                    {product.discount ? (
                      <>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(product.price * (1 - product.discount / 100))}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-gray-900 text-lg">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            No featured products available at the moment.
          </div>
        )}

        <div className="flex justify-center mt-12">
          <Link
            href="/shop"
            className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Browse All Products
            <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Quick View Modal */}
      <Dialog open={quickViewProduct !== null} onOpenChange={(isOpen) => !isOpen && setQuickViewProduct(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{quickViewProduct?.name}</DialogTitle>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {quickViewProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={quickViewProduct.images?.[0] || "/placeholder.jpg"}
                  alt={quickViewProduct.name}
                  fill
                  className="object-contain p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.jpg";
                  }}
                />

                {/* Product tags */}
                <div className="absolute top-3 left-3 z-10">
                  {quickViewProduct.category && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 mb-2 block w-fit">
                      {quickViewProduct.category}
                    </Badge>
                  )}

                  {quickViewProduct.bestseller && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm flex items-center gap-1 mb-2 block w-fit">
                      <TrendingUp className="h-3 w-3" />
                      Bestseller
                    </Badge>
                  )}

                  {quickViewProduct.new && (
                    <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm mb-2 block w-fit">
                      New Arrival
                    </Badge>
                  )}

                  {quickViewProduct.popular && (
                    <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-0 shadow-sm flex items-center gap-1 mb-2 block w-fit">
                      <Award className="h-3 w-3" />
                      Top Rated
                    </Badge>
                  )}
                </div>

                {quickViewProduct.discount && (
                  <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-md">
                    -{quickViewProduct.discount}% OFF
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <h2 className="text-2xl font-bold">{quickViewProduct.name}</h2>

                {/* Rating */}
                {quickViewProduct.rating && (
                  <div className="flex items-center mt-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${quickViewProduct.rating && i < Math.floor(quickViewProduct.rating)
                            ? "text-amber-400 fill-amber-400"
                            : quickViewProduct.rating && i < quickViewProduct.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 ml-2">
                      {quickViewProduct.rating} ({quickViewProduct.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  {quickViewProduct.discount ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(quickViewProduct.price * (1 - quickViewProduct.discount / 100))}
                      </span>
                      <span className="text-lg text-gray-500 line-through">
                        {formatCurrency(quickViewProduct.price)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold">
                      {formatCurrency(quickViewProduct.price)}
                    </span>
                  )}
                </div>

                {quickViewProduct.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <p className="text-gray-600">{quickViewProduct.description}</p>
                  </div>
                )}

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleAddToCart(quickViewProduct)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>

                  <button
                    onClick={() => handleToggleWishlist(quickViewProduct)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 border rounded-lg 
                    ${isInWishlist(quickViewProduct.id)
                        ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
                        : 'border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(quickViewProduct.id) ? 'fill-rose-500' : ''}`} />
                    {isInWishlist(quickViewProduct.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  </button>

                  <Link
                    href={`/products/${encodeURIComponent(quickViewProduct.id)}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
