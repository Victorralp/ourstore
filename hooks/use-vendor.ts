"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { getActiveStore, getUserStores, getVendorOwner, switchActiveStore, Vendor, VendorOwner } from "@/lib/firebase-vendors"

export function useVendor() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeStore, setActiveStore] = useState<Vendor | null>(null)
  const [allStores, setAllStores] = useState<Vendor[]>([])
  const [vendorOwner, setVendorOwner] = useState<VendorOwner | null>(null)
  const [vendorLoading, setVendorLoading] = useState(true)

  const fetchVendorData = async (userId: string) => {
    try {
      console.log("useVendor: fetchVendorData - Fetching vendor data for user:", userId);
      
      // First, quickly check for stores
      const stores = await getUserStores(userId);
      console.log("useVendor: getUserStores result:", stores);
      
      // DEBUGGING: Also check for old data structure
      try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const oldQuery = query(collection(db, "vendors"), where("uid", "==", userId));
        const oldSnapshot = await getDocs(oldQuery);
        const oldStores = oldSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        console.log("Old structure stores (uid field):", oldStores);
        
        if (oldStores.length > 0 && stores.length === 0) {
          console.log("Found stores with old structure! Running migration...");
          const { migrateOldVendorData } = await import("@/lib/vendor-migration");
          await migrateOldVendorData();
          // Refetch after migration
          const newStores = await getUserStores(userId);
          setAllStores(newStores);
          console.log("Stores after migration:", newStores);
          return;
        }
      } catch (migrationError) {
        console.log("Migration check failed:", migrationError);
      }
      
      setAllStores(stores);
      
      // If no stores, set everything to null and return early
      if (stores.length === 0) {
        console.log("useVendor: No stores found for user, setting activeStore and vendorOwner to null.");
        setActiveStore(null);
        setVendorOwner(null);
        return;
      }
      
      // Only fetch owner data if user has stores
      const owner = await getVendorOwner(userId);
      console.log("useVendor: getVendorOwner result:", owner);
      
      // If we have stores but no owner document, create one
      if (!owner) {
        console.log("Creating missing vendor owner document");
        const { ensureVendorOwnerExists } = await import("@/lib/vendor-migration");
        await ensureVendorOwnerExists(userId, stores[0].id);
        // Refetch owner data
        const newOwner = await getVendorOwner(userId);
        setVendorOwner(newOwner);
      } else {
        setVendorOwner(owner);
      }
      
      if (owner && owner.activeStoreId) {
        const active = stores.find(store => store.id === owner.activeStoreId);
        console.log("Setting active store from owner:", active);
        setActiveStore(active || null);
      } else if (stores.length > 0) {
        // If no active store set but stores exist, set first as active
        console.log("Setting first store as active:", stores[0]);
        setActiveStore(stores[0]);
        await switchActiveStore(userId, stores[0].id);
      }
    } catch (error) {
      console.error("useVendor: Failed to fetch vendor data:", error);
      setActiveStore(null);
      setAllStores([]);
      setVendorOwner(null);
    }
  }

  useEffect(() => {
    console.log("useVendor: useEffect - authLoading:", authLoading, "user:", user ? user.uid : "null");
    if (authLoading) {
      return; // Wait for authentication to resolve
    }

    if (!user) {
      console.log("useVendor: No user, setting vendor to null.");
      setActiveStore(null);
      setAllStores([]);
      setVendorOwner(null);
      setVendorLoading(false);
      return;
    }

    let isMounted = true;
    // Stay in a loading state until this user's stores are known, so guards
    // don't treat a real vendor as "no stores" for a moment
    setVendorLoading(true);
    
    fetchVendorData(user.uid)
      .finally(() => {
        if (isMounted) {
          setVendorLoading(false);
          console.log("useVendor: fetchVendorData finished, vendorLoading set to false.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, authLoading])

  const switchStore = async (storeId: string) => {
    if (!user || !vendorOwner) return
    
    try {
      await switchActiveStore(user.uid, storeId)
      const newActiveStore = allStores.find(store => store.id === storeId)
      setActiveStore(newActiveStore || null)
      setVendorOwner(prev => prev ? { ...prev, activeStoreId: storeId } : null)
    } catch (error) {
      console.error("Failed to switch store:", error)
    }
  }

  const refreshStores = async () => {
    if (!user) return
    await fetchVendorData(user.uid)
  }

  const loading = authLoading || vendorLoading

  // A vendor is anyone who has applied for at least one store. Pending applicants
  // can open the dashboard to see their status, but only approved stores can sell.
  const isVendor = !!user && allStores.length > 0
  const isApprovedVendor = !!activeStore?.approved

  return { 
    vendor: activeStore, // Current active store (backward compatibility)
    activeStore,
    allStores,
    vendorOwner,
    isVendor, 
    isApprovedVendor,
    loading,
    switchStore,
    refreshStores,
    canCreateMoreStores: allStores.length < 3
  }
} 