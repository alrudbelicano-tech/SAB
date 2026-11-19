import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_PRODUCTS, DEFAULT_SITE_SETTINGS } from '../data/defaults';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  DEFAULT_CATEGORIES,
  FIELD_LIMITS,
  OWNER_EMAIL,
  type Inquiry,
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderTracking,
  type OwnerProfile,
  type PaymentMethod,
  type Product,
  type Review,
  type SiteSettings,
} from '../types';
import { generateId, generateOrderNumber, validatePaymentReference } from '../utils/format';

export async function seedInitialStoreData(): Promise<void> {
  try {
    const settingsRef = doc(db, 'siteSettings', 'storefront');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        ...DEFAULT_SITE_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }

    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of DEFAULT_PRODUCTS) {
        const { isSeedPreview: _ignore, ...cleanProduct } = item;
        const ref = doc(db, 'products', cleanProduct.id);
        batch.set(ref, {
          ...cleanProduct,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products/seed');
  }
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const path = 'siteSettings/storefront';
  try {
    const rawCats =
      Array.isArray(settings.categories) && settings.categories.length > 0
        ? settings.categories
        : [...DEFAULT_CATEGORIES];
    const seenCats = new Set<string>();
    const cleanCategories: string[] = [];
    for (const c of rawCats) {
      const trimmed = String(c || '').trim().slice(0, 40);
      if (trimmed.length >= 2 && !seenCats.has(trimmed.toLowerCase())) {
        seenCats.add(trimmed.toLowerCase());
        cleanCategories.push(trimmed);
      }
      if (cleanCategories.length >= 24) break;
    }
    if (cleanCategories.length === 0) {
      cleanCategories.push(...DEFAULT_CATEGORIES);
    }

    const payload: SiteSettings = {
      announcementText: settings.announcementText.trim().slice(0, 160),
      showAnnouncement: Boolean(settings.showAnnouncement),
      heroEyebrow: settings.heroEyebrow.trim().slice(0, 80),
      heroTitle: settings.heroTitle.trim().slice(0, 140),
      heroSubtitle: settings.heroSubtitle.trim().slice(0, 320),
      heroCtaLabel: settings.heroCtaLabel.trim().slice(0, 40),
      heroImageUrl: settings.heroImageUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
      storyTitle: settings.storyTitle.trim().slice(0, 120),
      storyBody: settings.storyBody.trim().slice(0, 1000),
      gcashAccountName: settings.gcashAccountName.trim().slice(0, 80),
      gcashNumber: settings.gcashNumber.trim().slice(0, 24),
      gcashQrUrl: (settings.gcashQrUrl || '').trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
      mayaAccountName: settings.mayaAccountName.trim().slice(0, 80),
      mayaNumber: settings.mayaNumber.trim().slice(0, 24),
      mayaQrUrl: (settings.mayaQrUrl || '').trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX),
      storeName: (settings.storeName || 'SAB Jewelry').trim().slice(0, 80),
      contactPhone: (settings.contactPhone || '').trim().slice(0, 24),
      contactEmail: (settings.contactEmail || '').trim().slice(0, 160),
      studioHours: (settings.studioHours || '').trim().slice(0, 120),
      categories: cleanCategories,
      shippingFee: Math.max(0, Number(settings.shippingFee) || 0),
      freeShippingThreshold: Math.max(0, Number(settings.freeShippingThreshold) || 0),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'siteSettings', 'storefront'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveOwnerProfile(profile: OwnerProfile): Promise<void> {
  const path = 'ownerSettings/profile';
  try {
    const cleanEmail = profile.notificationEmail.trim().slice(0, 160) || OWNER_EMAIL;
    const payload: OwnerProfile = {
      ownerName: profile.ownerName.trim().slice(0, 80) || 'SAB Jewelry Studio',
      profilePhotoUrl: (profile.profilePhotoUrl || '').trim().slice(0, 250000),
      notificationEmail: cleanEmail,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'ownerSettings', 'profile'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveProduct(
  product: Omit<Product, 'createdAt' | 'updatedAt' | 'isSeedPreview'>,
  isNew: boolean
): Promise<void> {
  const safeId = product.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || generateId('prod');
  const path = `products/${safeId}`;
  try {
    const regularPrice = Math.max(1, Number(product.regularPrice));
    const salePrice = Math.min(regularPrice, Math.max(1, Number(product.salePrice)));
    const discountPercent = Math.min(
      95,
      Math.max(0, Math.round(((regularPrice - salePrice) / regularPrice) * 100))
    );

    const imageUrl = product.imageUrl.trim().slice(0, FIELD_LIMITS.IMAGE_URL_MAX);
    const imageUrl2 = (product.imageUrl2 || '').trim().slice(0, FIELD_LIMITS.GALLERY_IMAGE_MAX);
    const imageUrl3 = (product.imageUrl3 || '').trim().slice(0, FIELD_LIMITS.GALLERY_IMAGE_MAX);
    const videoUrl = (product.videoUrl || '').trim().slice(0, FIELD_LIMITS.VIDEO_URL_MAX);

    const totalMediaSize = imageUrl.length + imageUrl2.length + imageUrl3.length + videoUrl.length;
    if (totalMediaSize > 940000) {
      throw new Error(
        'Combined photos and video are too large for one item. Please use smaller photos or paste a video link.'
      );
    }

    const payload: Record<string, unknown> = {
      id: safeId,
      name: product.name.trim().slice(0, 120),
      category: product.category.trim().slice(0, 40) || 'Rings',
      finish: product.finish.trim().slice(0, 80),
      material: product.material.trim().slice(0, 120),
      description: product.description.trim().slice(0, 1200),
      regularPrice,
      salePrice,
      discountPercent,
      stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
      imageUrl,
      imageUrl2,
      imageUrl3,
      videoUrl,
      isFeatured: Boolean(product.isFeatured),
      isActive: Boolean(product.isActive),
      updatedAt: serverTimestamp(),
    };

    if (product.careNote?.trim()) {
      payload.careNote = product.careNote.trim().slice(0, 400);
    }
    if (product.sizes?.trim()) {
      payload.sizes = product.sizes.trim().slice(0, 120);
    }

    if (isNew) {
      payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'products', safeId), payload);
    } else {
      const existingSnap = await getDoc(doc(db, 'products', safeId));
      if (existingSnap.exists()) {
        await updateDoc(doc(db, 'products', safeId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, 'products', safeId), payload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface PlaceOrderInput {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentProofUrl?: string;
  amountPaid: number;
  subtotal: number;
  shippingFee: number;
  shippingZone?: string;
  shippingProvince?: string;
  estimatedDelivery?: string;
  totalAmount: number;
  items: {
    product: Product;
    quantity: number;
    selectedSize: string;
  }[];
  notes?: string;
}

export async function placeOrderWithExactPayment(input: PlaceOrderInput): Promise<Order> {
  if (
    !Number.isFinite(input.amountPaid) ||
    !Number.isFinite(input.totalAmount) ||
    Math.abs(input.amountPaid - input.totalAmount) >= 0.001
  ) {
    throw new Error(
      `Exact amount required: Order total is ₱${input.totalAmount.toFixed(2)}, but ₱${input.amountPaid.toFixed(2)} was entered.`
    );
  }

  const refValidation = validatePaymentReference(input.paymentMethod, input.paymentReference);
  if (!refValidation.valid) {
    throw new Error(refValidation.error || `Invalid ${input.paymentMethod} reference number.`);
  }

  const refKey = `${input.paymentMethod.toUpperCase()}_${refValidation.normalized}`.slice(0, 80);
  const orderId = generateId('ord');
  const orderNumber = generateOrderNumber();
  const path = `orders/${orderId}`;

  const orderItems: OrderItem[] = input.items.map((entry) => ({
    productId: entry.product.id,
    name: entry.product.name,
    finish: entry.product.finish,
    selectedSize: entry.selectedSize,
    unitPrice: entry.product.salePrice,
    quantity: entry.quantity,
    imageUrl: entry.product.imageUrl,
  }));

  const itemSummary = orderItems
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(', ')
    .slice(0, 300);

  try {
    const batch = writeBatch(db);

    const orderPayload: Record<string, unknown> = {
      id: orderId,
      orderNumber,
      userId: 'guest',
      customerName: input.customerName.trim().slice(0, 120),
      customerEmail: (input.customerEmail || '').trim().slice(0, 160),
      customerPhone: input.customerPhone.trim().slice(0, 24),
      shippingAddress: input.shippingAddress.trim().slice(0, 400),
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference.trim().slice(0, 64),
      subtotal: Number(input.subtotal.toFixed(2)),
      shippingFee: Number(input.shippingFee.toFixed(2)),
      totalAmount: Number(input.totalAmount.toFixed(2)),
      amountPaid: Number(input.totalAmount.toFixed(2)),
      exactAmountVerified: true,
      status: 'Pending Verification' as OrderStatus,
      items: orderItems,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.paymentProofUrl?.trim()) {
      orderPayload.paymentProofUrl = input.paymentProofUrl.trim().slice(0, 250000);
    }
    if (input.shippingZone?.trim()) {
      orderPayload.shippingZone = input.shippingZone.trim().slice(0, 100);
    }
    if (input.shippingProvince?.trim()) {
      orderPayload.shippingProvince = input.shippingProvince.trim().slice(0, 120);
    }
    if (input.estimatedDelivery?.trim()) {
      orderPayload.estimatedDelivery = input.estimatedDelivery.trim().slice(0, 80);
    }
    if (input.notes?.trim()) {
      orderPayload.notes = input.notes.trim().slice(0, 400);
    }

    batch.set(doc(db, 'paymentRefs', refKey), {
      refKey,
      paymentMethod: input.paymentMethod,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'orders', orderId), orderPayload);

    // Non-PII public order tracking document for zero-login status lookup
    const trackingPayload: Record<string, unknown> = {
      orderNumber,
      status: 'Pending Verification' as OrderStatus,
      paymentMethod: input.paymentMethod,
      totalAmount: Number(input.totalAmount.toFixed(2)),
      itemSummary,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.estimatedDelivery?.trim()) {
      trackingPayload.estimatedDelivery = input.estimatedDelivery.trim().slice(0, 80);
    }
    batch.set(doc(db, 'orderTracking', orderNumber), trackingPayload);

    // Decrement live Firestore product stock where backed by Firestore
    for (const entry of input.items) {
      if (!entry.product.isSeedPreview) {
        const productRef = doc(db, 'products', entry.product.id);
        const snap = await getDoc(productRef);
        if (snap.exists()) {
          const currentStock = Number(snap.data().stock ?? 0);
          if (currentStock < entry.quantity) {
            throw new Error(
              `Insufficient stock for "${entry.product.name}". Only ${currentStock} left.`
            );
          }
          batch.update(productRef, {
            stock: currentStock - entry.quantity,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    await batch.commit();

    return {
      id: orderId,
      orderNumber,
      userId: 'guest',
      customerName: String(orderPayload.customerName),
      customerEmail: String(orderPayload.customerEmail),
      customerPhone: String(orderPayload.customerPhone),
      shippingAddress: String(orderPayload.shippingAddress),
      paymentMethod: input.paymentMethod,
      paymentReference: String(orderPayload.paymentReference),
      paymentProofUrl: orderPayload.paymentProofUrl
        ? String(orderPayload.paymentProofUrl)
        : undefined,
      subtotal: Number(orderPayload.subtotal),
      shippingFee: Number(orderPayload.shippingFee),
      shippingZone: orderPayload.shippingZone ? String(orderPayload.shippingZone) : undefined,
      shippingProvince: orderPayload.shippingProvince
        ? String(orderPayload.shippingProvince)
        : undefined,
      estimatedDelivery: orderPayload.estimatedDelivery
        ? String(orderPayload.estimatedDelivery)
        : undefined,
      totalAmount: Number(orderPayload.totalAmount),
      amountPaid: Number(orderPayload.amountPaid),
      exactAmountVerified: true,
      status: 'Pending Verification',
      items: orderItems,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Insufficient stock')) {
        throw error;
      }
      if (error.message.toLowerCase().includes('permission')) {
        throw new Error(
          `This ${input.paymentMethod} reference number has already been submitted or could not be verified. Please double-check your ${input.paymentMethod} receipt.`
        );
      }
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function lookupOrderTracking(orderNumberInput: string): Promise<OrderTracking | null> {
  const normalized = orderNumberInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!normalized) return null;
  const path = `orderTracking/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'orderTracking', normalized));
    if (!snap.exists()) return null;
    return snap.data() as OrderTracking;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateOrderStatus(
  orderId: string,
  orderNumber: string,
  status: OrderStatus,
  notes?: string
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const batch = writeBatch(db);
    const updatePayload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (notes !== undefined) {
      updatePayload.notes = notes.trim().slice(0, 400);
    }
    batch.update(doc(db, 'orders', orderId), updatePayload);

    const trackingRef = doc(db, 'orderTracking', orderNumber);
    const trackingSnap = await getDoc(trackingRef);
    if (trackingSnap.exists()) {
      batch.update(trackingRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markOrderGmailNotified(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      gmailNotified: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markOrderShippingEmailSent(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      shippingEmailSent: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeOrderRecord(
  orderId: string,
  orderNumber: string,
  options?: {
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
  }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'orders', orderId));
    batch.delete(doc(db, 'orderTracking', orderNumber));
    if (options?.status === 'Cancelled' && options.paymentMethod && options.paymentReference) {
      const normalizedRef = options.paymentReference.replace(/[\s-]+/g, '').toUpperCase();
      const refKey = `${options.paymentMethod.toUpperCase()}_${normalizedRef}`.slice(0, 80);
      if (FIELD_LIMITS.ID_PATTERN.test(refKey)) {
        batch.delete(doc(db, 'paymentRefs', refKey));
      }
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function removeDeliveredOrder(orderId: string, orderNumber: string): Promise<void> {
  return removeOrderRecord(orderId, orderNumber, { status: 'Delivered' });
}

export async function submitProductReview(input: {
  authorName: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const reviewId = generateId('rev');
  const path = `reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      id: reviewId,
      userId: 'guest',
      authorName: input.authorName.trim().slice(0, 80),
      productId: input.productId,
      productName: input.productName.trim().slice(0, 120),
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      comment: input.comment.trim().slice(0, 600),
      isApproved: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function submitContactInquiry(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const inquiryId = generateId('inq');
  const path = `inquiries/${inquiryId}`;
  try {
    await setDoc(doc(db, 'inquiries', inquiryId), {
      id: inquiryId,
      name: input.name.trim().slice(0, 120),
      email: input.email.trim().slice(0, 160),
      subject: input.subject.trim().slice(0, 140),
      message: input.message.trim().slice(0, 1500),
      status: 'New' as Inquiry['status'],
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function resolveInquiry(inquiryId: string, status: 'New' | 'Resolved'): Promise<void> {
  const path = `inquiries/${inquiryId}`;
  try {
    await updateDoc(doc(db, 'inquiries', inquiryId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInquiry(inquiryId: string): Promise<void> {
  const path = `inquiries/${inquiryId}`;
  try {
    await deleteDoc(doc(db, 'inquiries', inquiryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
