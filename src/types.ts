export const DEFAULT_CATEGORIES = ['Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Sets'] as const;

export type ProductCategory = string;

export type OrderStatus =
  | 'Pending Verification'
  | 'Confirmed'
  | 'Packing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'GCash' | 'Maya';

export const OWNER_EMAIL = 'alrud.belicano@wvsu.edu.ph';

export const FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 120,
  DESCRIPTION_MIN: 5,
  DESCRIPTION_MAX: 1200,
  ADDRESS_MIN: 10,
  ADDRESS_MAX: 400,
  PHONE_MIN: 7,
  PHONE_MAX: 24,
  REF_MIN: 8,
  REF_MAX: 64,
  IMAGE_URL_MAX: 350000,
  GALLERY_IMAGE_MAX: 250000,
  VIDEO_URL_MAX: 550000,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  finish: string;
  material: string;
  description: string;
  careNote?: string;
  regularPrice: number;
  salePrice: number;
  discountPercent: number;
  stock: number;
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  videoUrl?: string;
  sizes?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  isSeedPreview?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  finish: string;
  selectedSize: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentProofUrl?: string;
  subtotal: number;
  shippingFee: number;
  shippingZone?: string;
  shippingProvince?: string;
  estimatedDelivery?: string;
  totalAmount: number;
  amountPaid: number;
  exactAmountVerified: boolean;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string;
  gmailNotified?: boolean;
  shippingEmailSent?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  itemSummary: string;
  estimatedDelivery?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Review {
  id: string;
  userId: string;
  authorName: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt?: unknown;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'New' | 'Resolved';
  createdAt?: unknown;
}

export interface SiteSettings {
  announcementText: string;
  showAnnouncement: boolean;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroImageUrl: string;
  storyTitle: string;
  storyBody: string;
  gcashAccountName: string;
  gcashNumber: string;
  gcashQrUrl?: string;
  mayaAccountName: string;
  mayaNumber: string;
  mayaQrUrl?: string;
  storeName?: string;
  contactPhone?: string;
  contactEmail?: string;
  studioHours?: string;
  categories?: string[];
  shippingFee: number;
  freeShippingThreshold: number;
  updatedAt?: unknown;
}

export interface OwnerProfile {
  ownerName: string;
  profilePhotoUrl: string;
  notificationEmail: string;
  updatedAt?: unknown;
}
