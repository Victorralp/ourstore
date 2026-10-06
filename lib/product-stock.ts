// Whether a product can't be bought right now. The same rule the payment API
// applies at checkout: marked not in stock, or no units left.
export const isOutOfStock = (product: { inStock?: boolean; stockQuantity?: number }) =>
  product.inStock === false || (typeof product.stockQuantity === "number" && product.stockQuantity < 1)

// How many more units can go in the cart, given how many are already there.
// Products without a stock count aren't limited (checkout doesn't limit them either).
export const unitsLeftToAdd = (product: { inStock?: boolean; stockQuantity?: number }, inCart: number) => {
  if (isOutOfStock(product)) return 0
  return typeof product.stockQuantity === "number" ? Math.max(product.stockQuantity - inCart, 0) : Infinity
}
