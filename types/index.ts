export type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  displayCategory?: string // Human-readable category name
  origin: string
  inStock: boolean
  images: string[]
  cloudinaryImages?: CloudinaryImage[]
  discount?: number
  rating?: number
  reviews?: Review[]
  options?: ProductOption[]
  featured?: boolean
  bulkPricing?: BulkPricingTier[]
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  shippingClass?: string
  createdAt?: string
  popularity?: number
}

export type Review = {
  id: string
  userId: string
  userName: string
  rating: number
  title: string
  content: string
  date: string
  helpful?: number
  verified?: boolean
}

export type ProductOption = {
  name: string
  values: string[]
}

export type BulkPricingTier = {
  quantity: number
  price: number
}

export type CartItem = {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  options?: Record<string, string>
}

export type UserAddress = {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

export type Order = {
  id: string
  userId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: string
  paymentId?: string
  // Name of the chosen delivery option, e.g. "Lagos Mainland 1"
  shippingMethod?: string
  shippingAddress: UserAddress
  billingAddress: UserAddress
  trackingNumber?: string
  trackingUrl?: string
  notes?: string
  estimatedDelivery?: string | number
  createdAt: string | number | null
  updatedAt: string | number | null
}

export type User = {
  id: string
  email: string
  name?: string
  avatar?: string
  addresses?: UserAddress[]
}

export type Country = {
  code: string
  name: string
  currency: {
    code: string
    symbol: string
    rate: number // Exchange rate relative to base currency (e.g., USD or GBP)
  }
  shipping: {
    available: boolean
    methods: ShippingMethod[]
  }
  vat: number // VAT rate as percentage
}

export type ShippingMethod = {
  id: string
  name: string
  price: number
  estimatedDelivery: string
}

export type CloudinaryImage = {
  publicId: string
  url: string
  alt?: string
  primary?: boolean
}

// Service Provider Types
export type ServiceProvider = {
  id: string
  ownerId: string
  name: string
  description: string
  category: ServiceCategory
  contactEmail: string
  contactPhone: string
  serviceAreas: string[] // Cities/regions covered
  workingHours?: {
    [key: string]: { // days of week
      start: string
      end: string
      available: boolean
    }
  }
  qualifications?: string[]
  certifications?: CloudinaryImage[]
  profileImage?: CloudinaryImage
  gallery?: CloudinaryImage[]
  rating: number
  reviewCount: number
  totalBookings: number
  isActive: boolean
  isApproved: boolean
  createdAt: string | number | null
  updatedAt: string | number | null
}

export type ServiceCategory = 
  | "plumbing" 
  | "electrical" 
  | "cleaning" 
  | "event-planning" 
  | "catering" 
  | "beauty" 
  | "fitness" 
  | "tutoring" 
  | "photography" 
  | "repairs" 
  | "landscaping" 
  | "other"

export type Service = {
  id: string
  providerId: string // ServiceProvider ID
  name: string
  description: string
  category: ServiceCategory
  subcategory?: string
  pricingType: "fixed" | "custom" | "hourly"
  basePrice?: number // for fixed pricing
  hourlyRate?: number // for hourly pricing
  duration?: number // estimated duration in minutes
  images: CloudinaryImage[]
  features: string[]
  requirements?: string[] // what customer needs to provide
  serviceAreas: string[]
  availableSlots?: AvailableSlot[]
  bookingRequiresApproval: boolean
  depositRequired: boolean
  depositAmount?: number
  isActive: boolean
  // Statistics and ratings
  bookingCount: number
  rating: number
  reviewCount: number
  createdAt: string | number | null
  updatedAt: string | number | null
}

export type AvailableSlot = {
  date: string // YYYY-MM-DD format
  timeSlots: string[] // ["09:00", "10:00", "14:00"]
}

export type ServiceBooking = {
  id: string
  serviceId: string
  providerId: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceDetails: {
    name: string
    description: string
    pricingType: "fixed" | "custom" | "hourly"
    agreedPrice: number
    duration?: number
  }
  scheduledDate: string
  scheduledTime: string
  address: UserAddress
  specialRequirements?: string
  status: BookingStatus
  paymentStatus: "pending" | "deposit_paid" | "fully_paid" | "refunded"
  paymentId?: string
  depositAmount?: number
  totalAmount: number
  providerNotes?: string
  customerNotes?: string
  completionNotes?: string
  rating?: number
  review?: string
  createdAt: string | number | null
  updatedAt: string | number | null
}

export type BookingStatus = 
  | "pending" // awaiting provider approval
  | "confirmed" // approved by provider
  | "in_progress" // service is being performed
  | "completed" // service finished
  | "cancelled" // cancelled by either party
  | "disputed" // dispute raised

export type ServiceReview = {
  id: string
  serviceId: string
  providerId: string
  bookingId: string
  customerId: string
  customerName: string
  rating: number
  title: string
  content: string
  images?: CloudinaryImage[]
  helpful: number
  verified: boolean
  providerResponse?: string
  createdAt: string
}

export type Complaint = {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: "product" | "service" | "vendor" | "service_provider" | "platform" | "other"
  subject: string
  description: string
  orderId?: string
  bookingId?: string
  vendorId?: string
  providerId?: string
  attachments?: CloudinaryImage[]
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  assignedTo?: string // admin user ID
  adminNotes?: string
  resolution?: string
  createdAt: string | number | null
  updatedAt: string | number | null
}
