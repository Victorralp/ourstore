// Whether a product can't be bought right now. The same rule the payment API
// applies at checkout: marked not in stock, or no units left.
export const isOutOfStock = (product: { inStock?: boolean; stockQuantity?: number }) =>
  product.inStock === false || (typeof product.stockQuantity === "number" && product.stockQuantity < 1)
