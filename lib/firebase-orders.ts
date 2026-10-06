import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where, orderBy, limit, startAfter, onSnapshot } from "firebase/firestore"
import { db } from "./firebase"
import { updateProduct } from "./firebase-products"

export interface OrderItem {
  productId: string
  name: string  // Changed from productName to match AdminOrdersPage
  image?: string  // Changed from productImage to match AdminOrdersPage
  quantity: number
  price: number
  total: number
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

export interface Order {
  id: string
  userId: string
  orderNumber: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  currency: string
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
  paymentMethod: string
  shippingAddress: ShippingAddress
  billingAddress: ShippingAddress
  trackingNumber?: string
  estimatedDelivery?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Order functions
export const createOrder = async (orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">) => {
  try {
    // Generate order number
    const orderNumber = `AYO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const order: Omit<Order, "id"> = {
      ...orderData,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create the order first
    const docRef = await addDoc(collection(db, "orders"), order)
    
    // CRITICAL: Decrement inventory for each ordered item
    try {
      for (const item of orderData.items) {
        // Get current product data
        const productDoc = await getDoc(doc(db, "products", item.productId))
        if (productDoc.exists()) {
          const productData = productDoc.data()
          const currentStock = productData.stockQuantity || 0
          const newStock = Math.max(0, currentStock - item.quantity)
          
          // Update product stock
          await updateProduct(item.productId, {
            stockQuantity: newStock,
            inStock: newStock > 0
          })
          
          console.log(`Decremented stock for ${item.name}: ${currentStock} -> ${newStock}`)
        }
      }
    } catch (stockError) {
      console.error("Error updating stock levels:", stockError)
      // Note: Order still created, but stock update failed
      // Consider implementing compensating transaction in production
    }
    
    return { id: docRef.id, ...order }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const getOrder = async (id: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(db, "orders", id))
    if (orderDoc.exists()) {
      const data = orderDoc.data()
      return {
        id: orderDoc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        estimatedDelivery: data.estimatedDelivery?.toDate(),
      } as Order
    }
    return null
  } catch (error: any) {
    console.error("Error getting order:", error)
    return null
  }
}

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const orders: Order[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        estimatedDelivery: data.estimatedDelivery?.toDate(),
      } as Order)
    })

    return orders
  } catch (error: any) {
    console.error("Error getting user orders:", error)
    return []
  }
}

export const updateOrderStatus = async (id: string, status: Order["status"], trackingNumber?: string) => {
  try {
    const updates: any = {
      status,
      updatedAt: new Date(),
    }

    if (trackingNumber) {
      updates.trackingNumber = trackingNumber
    }

    if (status === "shipped" && !trackingNumber) {
      // Set estimated delivery date (7 days from now)
      updates.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    await updateDoc(doc(db, "orders", id), updates)
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const updatePaymentStatus = async (id: string, paymentStatus: Order["paymentStatus"]) => {
  try {
    await updateDoc(doc(db, "orders", id), {
      paymentStatus,
      updatedAt: new Date(),
    })
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const getAllOrders = async (maxOrders: number = 100): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, "orders"), 
      orderBy("createdAt", "desc"),
      limit(maxOrders)
    )

    const querySnapshot = await getDocs(q)
    const orders: Order[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        estimatedDelivery: data.estimatedDelivery?.toDate(),
      } as Order)
    })

    return orders
  } catch (error: any) {
    console.error("Error getting all orders:", error)
    // Let the caller show a load failure instead of an empty list
    throw new Error(error.message)
  }
}

// Fetch the next batch of orders placed before `before`, newest first.
// Used to page back through order history without re-reading newer orders.
export const getOrdersBefore = async (before: Date, maxOrders: number = 100): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      startAfter(before),
      limit(maxOrders)
    )

    const querySnapshot = await getDocs(q)
    const orders: Order[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        estimatedDelivery: data.estimatedDelivery?.toDate(),
      } as Order)
    })

    return orders
  } catch (error: any) {
    console.error("Error getting older orders:", error)
    throw new Error(error.message)
  }
}

export const listenToAllOrders = (
  callback: (orders: Order[]) => void,
  maxOrders: number = 100,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(
      collection(db, "orders"), 
      orderBy("createdAt", "desc"),
      limit(maxOrders)
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders: Order[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          estimatedDelivery: data.estimatedDelivery?.toDate(),
        } as Order)
      })
      
      callback(orders)
    }, (error) => {
      console.error("Error listening to orders:", error)
      if (onError) {
        onError(error)
      } else {
        callback([])
      }
    })

    return unsubscribe
  } catch (error: any) {
    console.error("Error setting up orders listener:", error)
    throw new Error(error.message)
  }
}

export const listenToUserOrders = (callback: (orders: Order[]) => void, userId?: string) => {
  try {
    if (!userId) {
      console.error("No userId provided to listenToUserOrders");
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          estimatedDelivery: data.estimatedDelivery?.toDate(),
        } as Order);
      });
      
      callback(orders);
    }, (error) => {
      console.error("Error listening to user orders:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error: any) {
    console.error("Error setting up user orders listener:", error);
    throw new Error(error.message);
  }
};
export const listenToOrder = (orderId: string, callback: (orderData: any) => void) => {
  // Your existing code...
}
export const updateOrder = async (id: string, updates: Partial<Order>) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    await updateDoc(doc(db, "orders", id), updateData)
    return true
  } catch (error: any) {
    console.error("Error updating order:", error)
    throw new Error(error.message)
  }
}
