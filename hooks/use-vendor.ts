"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { getActiveStore, getUserStores, getVendorOwner, switchActiveStore, Vendor, VendorOwner } from "@/lib/firebase-vendors"

export function useVendor() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeStore, setActiveStoreState] = useState<Vendor | null>(null)
  const [allStores, setAllStoresState] = useState<Vendor[]>([])
  const [vendorOwner, setVendorOwnerState] = useState<VendorOwner | null>(null)
  // The user whose stores have finished loading, so "loading" is derived rather
  // than flipped by effects that can lag a render behind sign-in
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // The signed-in user right now. A fetch started for an earlier account must not
  // write its stores into this one's state.
  const currentUid = useRef<string | null>(null)

  const fetchVendorData = async (userId: string) => {
    const isCurrent = () => currentUid.current === userId
    const setAllStores = (stores: Vendor[]) => { if (isCurrent()) setAllStoresState(stores) }
    const setActiveStore = (store: Vendor | null) => { if (isCurrent()) setActiveStoreState(store) }
    const setVendorOwner = (owner: VendorOwner | null) => { if (isCurrent()) setVendorOwnerState(owner) }
    if (isCurrent()) setLoadError(null)
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
      // Keep what we had: a failed load must not look like "this user has no stores"
      console.error("useVendor: Failed to fetch vendor data:", error);
      if (isCurrent()) setLoadError("We couldn't load your store details. Please try again.");
    }
  }

  useEffect(() => {
    console.log("useVendor: useEffect - authLoading:", authLoading, "user:", user ? user.uid : "null");
    if (authLoading) {
      return; // Wait for authentication to resolve
    }

    // Clear any previous account's stores before loading this one's
    currentUid.current = user?.uid ?? null;
    setActiveStoreState(null);
    setAllStoresState([]);
    setVendorOwnerState(null);
    setLoadedFor(null);
    setLoadError(null);

    if (!user) {
      console.log("useVendor: No user, setting vendor to null.");
      return;
    }

    let isMounted = true;
    const uid = user.uid;
    
    fetchVendorData(uid)
      .finally(() => {
        if (isMounted) {
          setLoadedFor(uid);
          console.log("useVendor: fetchVendorData finished for", uid);
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
      setActiveStoreState(newActiveStore || null)
      setVendorOwnerState(prev => prev ? { ...prev, activeStoreId: storeId } : null)
    } catch (error) {
      console.error("Failed to switch store:", error)
    }
  }

  const refreshStores = async () => {
    if (!user) return
    await fetchVendorData(user.uid)
  }

  // Only this user's loaded stores count; until then (including the render right
  // after switching accounts) nothing from an earlier account is exposed
  const ready = !!user && loadedFor === user.uid
  const loading = authLoading || (!!user && !ready)
  const stores = ready ? allStores : []
  const store = ready ? activeStore : null

  // A vendor is anyone who has applied for at least one store. Pending applicants
  // can open the dashboard to see their status, but only approved stores can sell.
  const isVendor = stores.length > 0
  const isApprovedVendor = !!store?.approved

  return { 
    vendor: store, // Current active store (backward compatibility)
    activeStore: store,
    allStores: stores,
    vendorOwner: ready ? vendorOwner : null,
    isVendor, 
    isApprovedVendor,
    loadError,
    loading,
    switchStore,
    refreshStores,
    canCreateMoreStores: stores.length < 3
  }
} 