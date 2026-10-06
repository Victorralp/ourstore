"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { User, Package, Heart, Settings, Bell, Shield, CreditCard, MapPin, Edit, Plus, Home, Building, Briefcase, ShoppingCart, Trash2, ExternalLink } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import type { SavedAddress } from "@/lib/firebase-auth"
import { NIGERIA_STATES } from "@/lib/nigeria-states"
import { useCurrency } from "@/components/currency-provider"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useWishlist } from "@/hooks/use-wishlist"
import { useCart } from "@/components/cart-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Ids for new saved addresses: the time in milliseconds plus a random part,
// so two windows adding an address at the same moment don't clash
const newAddressId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000)

export default function ProfilePage() {
  const { user, profile, logout, updateSavedAddresses, isLoading: authLoading } = useAuth()
  const { formatPrice } = useCurrency()
  const { toast } = useToast()
  const fullName = profile?.name || user?.displayName || ""
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: fullName.split(" ")[0] || "",
    lastName: fullName.split(" ").slice(1).join(" "),
    email: user?.email || "",
    phone: "",
    dateOfBirth: "",
    gender: "",
  })

  // Auth and the Firestore profile load after the first render, so keep the form in
  // sync with the signed-in account, and start from a clean form if the account changes
  const accountUid = user?.uid
  const accountEmail = user?.email || ""
  const hydratedFor = useRef(accountUid)
  useEffect(() => {
    const accountChanged = hydratedFor.current !== accountUid
    hydratedFor.current = accountUid
    // An open address dialog belongs to the previous account, so discard it
    if (accountChanged) {
      setAddressDialogOpen(false)
      dialogAccount.current = null
    }
    setProfileData((prev) => ({
      ...(accountChanged ? { phone: "", dateOfBirth: "", gender: "" } : prev),
      firstName: fullName.split(" ")[0] || "",
      lastName: fullName.split(" ").slice(1).join(" "),
      email: accountEmail,
    }))
  }, [accountUid, fullName, accountEmail])
  // Saved addresses live on the user's Firestore profile
  const addresses: SavedAddress[] = profile?.savedAddresses ?? []
  const [savingAddresses, setSavingAddresses] = useState(false)
  // Address changes wait until this account's profile has loaded
  const addressesReady = !authLoading && !!user && profile?.uid === user.uid
  const addressActionsDisabled = !addressesReady || savingAddresses
  // The account the open address dialog belongs to
  const dialogAccount = useRef<string | null>(null)

  // Address dialog state
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [currentAddress, setCurrentAddress] = useState<SavedAddress | null>(null)
  const [addressForm, setAddressForm] = useState<SavedAddress>({
    id: 0,
    type: "Home",
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
  })

  // Use localStorage for wishlist to maintain consistency with the main wishlist page
  const { wishlistItems, removeFromWishlist } = useWishlist()

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true,
    orderUpdates: true,
    newsletter: true,
    language: "en",
    currency: "GBP",
  })

  // Mock order history
  const orderHistory = [
    // For testing purposes only - in production this would come from the database
    // Uncomment these for testing and comment out the empty array
    /*
    {
      id: "ORD-2024-001",
      date: "2024-01-15",
      status: "Delivered",
      total: 89.97,
      items: 3,
    },
    {
      id: "ORD-2024-002",
      date: "2024-01-10",
      status: "Processing",
      total: 45.5,
      items: 2,
    },
    {
      id: "ORD-2024-003",
      date: "2024-01-05",
      status: "Shipped",
      total: 123.45,
      items: 5,
    }
    */
    // Empty array represents a new user with no orders
  ]

  const { addToCart } = useCart()

  const handleSaveProfile = () => {
    // In a real app, you'd save to your backend
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved successfully.",
    })
    setIsEditing(false)
  }

  const handlePreferenceChange = (key: string, value: boolean | string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
    toast({
      title: "Preference updated",
      description: "Your preference has been saved.",
    })
  }

  const handleAddressChange = (key: string, value: any) => {
    setAddressForm((prev) => ({ ...prev, [key]: value }))
  }

  const openAddAddressDialog = () => {
    dialogAccount.current = user?.uid ?? null
    setCurrentAddress(null)
    setAddressForm({
      id: newAddressId(),
      type: "Home",
      name: `${profileData.firstName} ${profileData.lastName}`.trim() || "John Doe",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Nigeria",
      isDefault: addresses.length === 0, // Make default if it's the first address
    })
    setAddressDialogOpen(true)
  }

  const openEditAddressDialog = (address: SavedAddress) => {
    dialogAccount.current = user?.uid ?? null
    setCurrentAddress(address)
    setAddressForm({
      ...address,
      state: address.state ?? "",
    })
    setAddressDialogOpen(true)
  }

  // Save a change to the user's addresses. The change is applied to the latest
  // stored list, not this page's copy. Returns whether it worked.
  const saveAddresses = async (change: (current: SavedAddress[]) => SavedAddress[]) => {
    if (!addressesReady) return false

    setSavingAddresses(true)
    try {
      await updateSavedAddresses(change)
      return true
    } catch (error: any) {
      console.error("Failed to save addresses:", error)
      toast({
        title: "Couldn't save your addresses",
        description: error?.message || "Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setSavingAddresses(false)
    }
  }

  const handleDeleteAddress = async (id: number) => {
    // If this was the default, the first remaining address becomes the default
    const saved = await saveAddresses(current => current.filter(address => address.id !== id))
    if (!saved) return

    toast({
      title: "Address deleted",
      description: "The address has been removed from your account.",
    })
  }

  const setAddressAsDefault = async (id: number) => {
    const saved = await saveAddresses(current => {
      if (!current.some(address => address.id === id)) {
        throw new Error("That address was removed in another window. Refresh the page and try again.")
      }
      return current.map(address => ({
        ...address,
        isDefault: address.id === id
      }))
    })
    if (!saved) return

    toast({
      title: "Default address updated",
      description: "Your default address has been changed.",
    })
  }

  const handleSaveAddress = async () => {
    // Validate form data
    if (!addressForm.name || !addressForm.address || !addressForm.city || !addressForm.postalCode || !addressForm.country
      || (addressForm.country === "Nigeria" && !addressForm.state)) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    // Never save a form opened for a different account
    if (!user || dialogAccount.current !== user.uid) {
      setAddressDialogOpen(false)
      toast({
        title: "Your account changed",
        description: "Please open the address form again.",
        variant: "destructive",
      })
      return
    }

    const editing = currentAddress
    // Only an explicit switch to default in this dialog changes the default,
    // so a stale form can't override a newer choice made elsewhere
    const madeDefault = addressForm.isDefault && !editing?.isDefault

    const saved = await saveAddresses(current => {
      const others = current.map(address =>
        madeDefault ? { ...address, isDefault: false } : address)

      if (editing) {
        const latest = current.find(address => address.id === editing.id)
        if (!latest) {
          throw new Error("This address was removed in another window, so your changes weren't saved.")
        }
        // Edits stay in place and keep the latest default flag unless made default here
        return others.map(address => address.id === editing.id
          ? { ...addressForm, id: editing.id, isDefault: madeDefault || latest.isDefault }
          : address)
      }

      // New addresses go at the end, with an id that can't match an existing one
      const id = current.some(address => address.id === addressForm.id) ? newAddressId() : addressForm.id
      return [...others, { ...addressForm, id, isDefault: madeDefault }]
    })
    if (!saved) return

    toast(currentAddress
      ? { title: "Address updated", description: "Your address has been updated successfully." }
      : { title: "Address added", description: "Your new address has been saved successfully." })

    // Close the dialog
    setAddressDialogOpen(false)
  }

  // Wishlist functions
  const handleAddToCart = (product: any) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    })
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "shipped":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-4">Please log in</h1>
            <p className="text-muted-foreground mb-8">You need to be logged in to view your profile.</p>
            <Button asChild>
              <a href="/login">Log In</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>My Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="text-lg">
                {fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">Welcome back{fullName ? `, ${fullName.split(" ")[0]}` : ""}!</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, firstName: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, lastName: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={profileData.gender}
                        onValueChange={(value) => setProfileData((prev) => ({ ...prev, gender: value }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isEditing && (
                    <Button onClick={handleSaveProfile} className="w-full">
                      Save Changes
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Password</div>
                        <div className="text-sm text-muted-foreground">Last updated 3 months ago</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-muted-foreground">Not enabled</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Enable
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Payment Methods</div>
                        <div className="text-sm text-muted-foreground">1 card on file</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                {orderHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground mb-4">
                      When you place an order, it will appear here for you to track.
                    </p>
                    <Button asChild>
                      <a href="/shop">Start Shopping</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderHistory.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-medium">{order.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.date).toLocaleDateString()} • {order.items} items
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          <div className="text-right">
                            <div className="font-medium">{formatPrice(order.total)}</div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/profile/orders/${order.id}`}>View Details</a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Wishlist</CardTitle>
                <Link href="/wishlist">
                  <Button variant="ghost" className="h-9 w-9 p-0" title="View full wishlist">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="grid gap-4">
                {wishlistItems.length === 0 ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
                    <p className="text-muted-foreground mb-6">
                      Save items you love to your wishlist for easy access later.
                    </p>
                    <Button asChild>
                      <Link href="/shop">Browse Products</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {wishlistItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="relative rounded-lg border p-3 flex flex-col h-full">
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => removeFromWishlist(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-16 relative rounded overflow-hidden bg-muted">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{item.name}</h4>
                            <p className="text-sm font-bold">{formatPrice(item.price)}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8"
                            onClick={() => handleAddToCart(item)}
                            disabled={item.inStock === false}
                          >
                            <ShoppingCart className="h-3 w-3 mr-2" />
                            Add to Cart
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => removeFromWishlist(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {wishlistItems.length > 3 && (
                      <Link href="/wishlist" className="border rounded-lg p-4 flex flex-col items-center justify-center h-full">
                        <div className="text-xl font-semibold mb-2">
                          +{wishlistItems.length - 3} more {wishlistItems.length - 3 === 1 ? 'item' : 'items'}
                        </div>
                        <Button variant="outline">View All</Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Addresses</CardTitle>
                <Button onClick={openAddAddressDialog} disabled={addressActionsDisabled}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {addresses.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
                      <p className="text-muted-foreground mb-4">
                        Add a shipping address to make checkout faster.
                      </p>
                      <Button onClick={openAddAddressDialog} disabled={addressActionsDisabled}>Add Address</Button>
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div key={address.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{address.type}</span>
                              {address.isDefault && <Badge variant="secondary">Default</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>{address.name}</div>
                              <div>{address.address}</div>
                              <div>
                                {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                              </div>
                              <div>{address.country}</div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {!address.isDefault && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={addressActionsDisabled}
                                onClick={() => setAddressAsDefault(address.id)}
                              >
                                Set as Default
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={addressActionsDisabled}
                              onClick={() => openEditAddressDialog(address)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={addressActionsDisabled}
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Address Dialog */}
            <Dialog open={addressDialogOpen} onOpenChange={(open) => !savingAddresses && setAddressDialogOpen(open)}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{currentAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
                </DialogHeader>
                {/* Fields are locked while saving so nothing typed meanwhile is lost */}
                <fieldset disabled={savingAddresses} className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="addressType">Address Type</Label>
                    <RadioGroup 
                      id="addressType" 
                      value={addressForm.type}
                      onValueChange={(value) => handleAddressChange("type", value)}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Home" id="home" />
                        <Label htmlFor="home" className="flex items-center">
                          <Home className="h-4 w-4 mr-2" />
                          Home
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Work" id="work" />
                        <Label htmlFor="work" className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Work
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Other" id="other" />
                        <Label htmlFor="other" className="flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          Other
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      value={addressForm.name}
                      onChange={(e) => handleAddressChange("name", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input 
                      id="address"
                      value={addressForm.address}
                      onChange={(e) => handleAddressChange("address", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input 
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => handleAddressChange("city", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input 
                        id="postalCode"
                        value={addressForm.postalCode}
                        onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select 
                      value={addressForm.country}
                      // A state from one country doesn't apply to another
                      onValueChange={(value) => setAddressForm((prev) => ({ ...prev, country: value, state: "" }))}
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    {addressForm.country === "Nigeria" ? (
                      <>
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={addressForm.state || undefined}
                          onValueChange={(value) => handleAddressChange("state", value)}
                        >
                          <SelectTrigger id="state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {NIGERIA_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="state">State / Region (optional)</Label>
                        <Input
                          id="state"
                          value={addressForm.state || ""}
                          onChange={(e) => handleAddressChange("state", e.target.value)}
                        />
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isDefault"
                      checked={addressForm.isDefault}
                      onCheckedChange={(checked) => handleAddressChange("isDefault", checked)}
                      disabled={currentAddress?.isDefault} // Can't uncheck if it's already the default
                    />
                    <Label htmlFor="isDefault">Set as default address</Label>
                  </div>
                </fieldset>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddressDialogOpen(false)} disabled={savingAddresses}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAddress} disabled={savingAddresses}>
                    {savingAddresses ? "Saving..." : currentAddress ? "Update Address" : "Save Address"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive notifications via email</div>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive notifications via SMS</div>
                    </div>
                    <Switch
                      checked={preferences.smsNotifications}
                      onCheckedChange={(checked) => handlePreferenceChange("smsNotifications", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Order Updates</div>
                      <div className="text-sm text-muted-foreground">Get notified about order status changes</div>
                    </div>
                    <Switch
                      checked={preferences.orderUpdates}
                      onCheckedChange={(checked) => handlePreferenceChange("orderUpdates", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Marketing Emails</div>
                      <div className="text-sm text-muted-foreground">Receive promotional offers and updates</div>
                    </div>
                    <Switch
                      checked={preferences.marketingEmails}
                      onCheckedChange={(checked) => handlePreferenceChange("marketingEmails", checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Newsletter</div>
                      <div className="text-sm text-muted-foreground">Subscribe to our weekly newsletter</div>
                    </div>
                    <Switch
                      checked={preferences.newsletter}
                      onCheckedChange={(checked) => handlePreferenceChange("newsletter", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) => handlePreferenceChange("language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) => handlePreferenceChange("currency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
