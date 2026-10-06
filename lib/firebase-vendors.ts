import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  addDoc,
  writeBatch,
  deleteDoc,
  arrayRemove,
} from "firebase/firestore"
import { db } from "./firebase"

export interface Vendor {
  id: string // Document ID (unique store identifier)
  ownerId: string // Firebase UID of the owner
  shopName: string
  bio: string
  logoUrl: string
  approved: boolean
  createdAt: Timestamp
  isActive: boolean // Whether this store is currently active
}

export interface VendorOwner {
  uid: string // Firebase UID
  stores: string[] // Array of store IDs owned by this user
  activeStoreId: string | null // Currently selected store
  maxStores: number // Maximum stores allowed (default 3)
}

// Create a new vendor store for a user
export const createVendorStore = async (
  ownerId: string,
  data: Omit<Vendor, "id" | "ownerId" | "approved" | "createdAt" | "isActive">,
): Promise<string> => {
  // Check if user already has maximum stores
  const ownerStores = await getUserStores(ownerId)
  if (ownerStores.length >= 3) {
    throw new Error("Maximum of 3 stores allowed per user")
  }

  // Create the vendor store
  const vendorRef = await addDoc(collection(db, "vendors"), {
    ownerId,
    ...data,
    approved: false,
    isActive: true,
    status: "pending",
    createdAt: serverTimestamp(),
  })

  // Update or create vendor owner record
  const ownerRef = doc(db, "vendorOwners", ownerId)
  const ownerDoc = await getDoc(ownerRef)
  
  if (ownerDoc.exists()) {
    const ownerData = ownerDoc.data() as VendorOwner
    await updateDoc(ownerRef, {
      stores: [...ownerData.stores, vendorRef.id],
      activeStoreId: ownerData.activeStoreId || vendorRef.id, // Set as active if first store
    })
  } else {
    await setDoc(ownerRef, {
      uid: ownerId,
      stores: [vendorRef.id],
      activeStoreId: vendorRef.id,
      maxStores: 3,
    })
  }

  return vendorRef.id
}

// Get all stores owned by a user
export const getUserStores = async (ownerId: string): Promise<Vendor[]> => {
  console.log("Getting stores for owner:", ownerId)
  const q = query(collection(db, "vendors"), where("ownerId", "==", ownerId))
  const snapshot = await getDocs(q)
  const stores = snapshot.docs.map(doc => {
    const data = doc.data()
    console.log("Store data:", { id: doc.id, ...data })
    return { id: doc.id, ...data } as Vendor
  })
  console.log("Returning stores:", stores)
  return stores
}

// Get vendor owner information
export const getVendorOwner = async (ownerId: string): Promise<VendorOwner | null> => {
  console.log("Getting vendor owner for:", ownerId)
  const snapshot = await getDoc(doc(db, "vendorOwners", ownerId))
  if (!snapshot.exists()) {
    console.log("No vendor owner document found")
    return null
  }
  const ownerData = snapshot.data() as VendorOwner
  console.log("Vendor owner data:", ownerData)
  return ownerData
}

// Switch active store for a user
export const switchActiveStore = async (ownerId: string, storeId: string): Promise<void> => {
  const ownerRef = doc(db, "vendorOwners", ownerId)
  await updateDoc(ownerRef, { activeStoreId: storeId })
}

// Get active store for a user
export const getActiveStore = async (ownerId: string): Promise<Vendor | null> => {
  const owner = await getVendorOwner(ownerId)
  if (!owner || !owner.activeStoreId) return null
  
  const storeDoc = await getDoc(doc(db, "vendors", owner.activeStoreId))
  if (!storeDoc.exists()) return null
  
  return { id: storeDoc.id, ...storeDoc.data() } as Vendor
}

// Approve a vendor store (callable from admin dashboard)
export const approveVendor = async (storeId: string) => {
  const vendorRef = doc(db, "vendors", storeId)
  await updateDoc(vendorRef, { approved: true, isActive: true, rejected: false, status: "approved" })
}

// Reject a vendor store application
export const rejectVendor = async (storeId: string) => {
  await updateDoc(doc(db, "vendors", storeId), { approved: false, isActive: false, rejected: true, status: "rejected" })
}

// Get vendor store by ID
export const getVendor = async (storeId: string): Promise<Vendor | null> => {
  const snapshot = await getDoc(doc(db, "vendors", storeId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as Vendor
}

export const getApprovedVendors = async (): Promise<Vendor[]> => {
  const q = query(collection(db, "vendors"), where("approved", "==", true))
  const sn = await getDocs(q)
  return sn.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor))
}

export const getAllVendors = async (): Promise<Vendor[]> => {
  const q = query(collection(db, "vendors"))
  const sn = await getDocs(q)
  return sn.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor))
}

export const getVendorProducts = async (storeId: string) => {
  const q = query(collection(db, "products"), where("vendorId", "==", storeId))
  const sn = await getDocs(q)
  return sn.docs.map((d) => ({ id: d.id, ...d.data() } as any))
}

// Update vendor store information
export const updateVendorStore = async (storeId: string, data: Partial<Vendor>) => {
  const vendorRef = doc(db, "vendors", storeId)
  await updateDoc(vendorRef, data)
}

// Permanently delete a vendor store and its related data
export const deleteVendorStore = async (ownerId: string, storeId: string) => {
  // Start a batch for atomic updates where possible
  const batch = writeBatch(db)

  // 1) Remove storeId from owner's stores and update active store if needed
  const owner = await getVendorOwner(ownerId)
  if (owner) {
    const updatedStores = owner.stores.filter(id => id !== storeId)
    const newActiveStore = owner.activeStoreId === storeId 
      ? (updatedStores.length > 0 ? updatedStores[0] : null)
      : owner.activeStoreId

    batch.update(doc(db, "vendorOwners", ownerId), {
      stores: updatedStores,
      activeStoreId: newActiveStore,
    })
  }

  // 2) Delete all products for this store
  const productsQ = query(collection(db, "products"), where("vendorId", "==", storeId))
  const productsSn = await getDocs(productsQ)
  for (const d of productsSn.docs) {
    batch.delete(doc(db, "products", d.id))
  }

  // 3) Optionally, delete store orders or mark them as orphaned
  // If you want to retain order history, comment this out.
  const ordersQ = query(collection(db, "orders"), where("vendorId", "==", storeId))
  const ordersSn = await getDocs(ordersQ)
  for (const d of ordersSn.docs) {
    // Retain order history by removing vendor linkage
    batch.update(doc(db, "orders", d.id), { vendorId: null })
    // Or to delete orders entirely, use: batch.delete(doc(db, "orders", d.id))
  }
  // Paystack orders list their stores in vendorIds
  const multiStoreOrdersSn = await getDocs(query(collection(db, "orders"), where("vendorIds", "array-contains", storeId)))
  for (const d of multiStoreOrdersSn.docs) {
    batch.update(doc(db, "orders", d.id), { vendorIds: arrayRemove(storeId) })
  }

  // 4) Delete the vendor store document itself
  batch.delete(doc(db, "vendors", storeId))

  // Commit all changes
  await batch.commit()
} 

// A store's orders and its sales from them. Paystack orders can mix stores, so
// they list theirs in `vendorIds` and only this store's items count towards its
// sales; older orders have a single `vendorId`. Unpaid checkouts and paid orders
// waiting for a refund aren't sales.
export async function getStoreOrders(storeId: string) {
  const [single, multi] = await Promise.all([
    getDocs(query(collection(db, "orders"), where("vendorId", "==", storeId))),
    getDocs(query(collection(db, "orders"), where("vendorIds", "array-contains", storeId))),
  ])
  const byId = new Map<string, any>()
  for (const d of [...single.docs, ...multi.docs]) byId.set(d.id, { id: d.id, ...d.data() })

  const orders = [...byId.values()].filter((order) =>
    !(order.paymentMethod === "paystack" && order.paymentStatus !== "paid") && !order.needsRefund)
  const sales = orders.reduce((sum, order) => {
    if (!Array.isArray(order.vendorIds)) return sum + (order.total || 0)
    const items: any[] = Array.isArray(order.items) ? order.items : []
    return sum + items
      .filter((item) => item.vendorId === storeId)
      .reduce((itemSum, item) => itemSum + (item.total || 0), 0)
  }, 0)
  return { orders, sales }
}
