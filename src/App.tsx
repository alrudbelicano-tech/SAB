import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { CustomerStorefront } from './components/CustomerStorefront';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { ProductModal } from './components/ProductModal';
import { TrackOrderModal } from './components/TrackOrderModal';
import {
  DEFAULT_OWNER_PROFILE,
  DEFAULT_PRODUCTS,
  DEFAULT_REVIEWS,
  DEFAULT_SITE_SETTINGS,
} from './data/defaults';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { seedInitialStoreData } from './services/storeService';
import {
  OWNER_EMAIL,
  type CartItem,
  type Inquiry,
  type Order,
  type OwnerProfile,
  type Product,
  type Review,
  type SiteSettings,
} from './types';
import { getTimestampMs, parseSizeOptions } from './utils/format';

const CART_STORAGE_KEY = 'sab_jewelry_bag_v1';
const RECENT_ORDERS_STORAGE_KEY = 'sab_recent_order_numbers_v1';

function SabJewelryApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const isOwner = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );

  const [viewMode, setViewMode] = useState<'customer' | 'admin'>('customer');
  const seededOnceRef = useRef(false);

  // Storefront Data State
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Owner-Only Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>(DEFAULT_OWNER_PROFILE);

  // Interactive UI State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trackOrderOpen, setTrackOrderOpen] = useState(false);
  const [ownerPortalOpen, setOwnerPortalOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [recentOrderNumbers, setRecentOrderNumbers] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(recentOrderNumbers));
    } catch {
      // Ignore storage errors
    }
  }, [recentOrderNumbers]);

  // 1. Auth Listener (Used strictly for Owner / Admin access)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setViewMode('customer');
        setOrders([]);
        setInquiries([]);
        setOwnerProfile(DEFAULT_OWNER_PROFILE);
      }
    });
    return () => unsub();
  }, []);

  // Auto-seed starter catalog & settings when verified Owner signs in on an empty DB
  useEffect(() => {
    if (authReady && isOwner && !seededOnceRef.current) {
      seededOnceRef.current = true;
      void seedInitialStoreData();
    }
  }, [authReady, isOwner]);

  // 2. Site Settings Listener
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'siteSettings', 'storefront'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SiteSettings;
          setSettings({
            ...DEFAULT_SITE_SETTINGS,
            ...data,
            heroImageUrl:
              data.heroImageUrl === '/src/assets/images/hero_sab_jewelry_1794987720764.jpg'
                ? '/assets/aistudio/1794979242349_96c75379.jpg'
                : data.heroImageUrl,
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'siteSettings/storefront')
    );
    return () => unsub();
  }, []);

  // 3. Catalog Products Listener (Owner sees all; Guests query active only)
  useEffect(() => {
    if (!authReady) return;
    const productsQuery = isOwner
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('isActive', '==', true));

    const unsub = onSnapshot(
      productsQuery,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Product);
        rows.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setFirestoreProducts(rows);
        setProductsLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );
    return () => unsub();
  }, [authReady, isOwner]);

  // 4. Reviews Listener
  useEffect(() => {
    if (!authReady) return;
    const reviewsQuery = isOwner
      ? collection(db, 'reviews')
      : query(collection(db, 'reviews'), where('isApproved', '==', true));

    const unsub = onSnapshot(
      reviewsQuery,
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Review);
        rows.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setFirestoreReviews(rows);
        setReviewsLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
    );
    return () => unsub();
  }, [authReady, isOwner]);

  // 5. Owner-Only Orders & Inquiries Listeners
  useEffect(() => {
    if (!authReady || !isOwner) return;

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Order);
        rows.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setOrders(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubInquiries = onSnapshot(
      collection(db, 'inquiries'),
      (snap) => {
        const rows = snap.docs.map((d) => d.data() as Inquiry);
        rows.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setInquiries(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'inquiries')
    );

    const unsubOwnerProfile = onSnapshot(
      doc(db, 'ownerSettings', 'profile'),
      (snap) => {
        if (snap.exists()) {
          setOwnerProfile({
            ...DEFAULT_OWNER_PROFILE,
            ...(snap.data() as OwnerProfile),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'ownerSettings/profile')
    );

    return () => {
      unsubOrders();
      unsubInquiries();
      unsubOwnerProfile();
    };
  }, [authReady, isOwner]);

  const displayProducts = useMemo(() => {
    if (productsLoaded && firestoreProducts.length > 0) return firestoreProducts;
    return DEFAULT_PRODUCTS;
  }, [productsLoaded, firestoreProducts]);

  const displayReviews = useMemo(() => {
    if (!reviewsLoaded || firestoreReviews.length === 0) return DEFAULT_REVIEWS;
    return [...firestoreReviews, ...DEFAULT_REVIEWS];
  }, [reviewsLoaded, firestoreReviews]);

  const syncedCart = useMemo(() => {
    return cart
      .map((item) => {
        const fresh = displayProducts.find((p) => p.id === item.product.id);
        if (!fresh || fresh.stock <= 0 || !fresh.isActive) return null;
        return {
          ...item,
          product: fresh,
          quantity: Math.min(item.quantity, fresh.stock),
        };
      })
      .filter((entry): entry is CartItem => entry !== null);
  }, [cart, displayProducts]);

  const cartCount = syncedCart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: Product, quantity: number, selectedSize: string) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (c) => c.product.id === product.id && c.selectedSize === selectedSize
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        const nextQty = Math.min(product.stock, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = { ...updated[existingIndex], product, quantity: nextQty };
        return updated;
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity), selectedSize }];
    });
  };

  const handleQuickAdd = (product: Product, chosenSize?: string) => {
    const options = parseSizeOptions(product.sizes);
    const defaultSize = chosenSize && options.includes(chosenSize) ? chosenSize : options[0];
    handleAddToCart(product, 1, defaultSize);
  };

  const handleUpdateCartSize = (productId: string, oldSize: string, newSize: string) => {
    if (oldSize === newSize) return;
    setCart((prev) => {
      const sourceIndex = prev.findIndex(
        (item) => item.product.id === productId && item.selectedSize === oldSize
      );
      if (sourceIndex < 0) return prev;
      const sourceItem = prev[sourceIndex];
      const targetIndex = prev.findIndex(
        (item) => item.product.id === productId && item.selectedSize === newSize
      );
      if (targetIndex >= 0) {
        const updated = [...prev];
        const mergedQty = Math.min(
          sourceItem.product.stock,
          updated[targetIndex].quantity + sourceItem.quantity
        );
        updated[targetIndex] = { ...updated[targetIndex], quantity: mergedQty };
        updated.splice(sourceIndex, 1);
        return updated;
      }
      return prev.map((item, idx) =>
        idx === sourceIndex ? { ...item, selectedSize: newSize } : item
      );
    });
  };

  const handleUpdateCartQty = (productId: string, selectedSize: string, nextQty: number) => {
    if (nextQty <= 0) {
      handleRemoveCartItem(productId, selectedSize);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.selectedSize === selectedSize
          ? { ...item, quantity: Math.min(item.product.stock, nextQty) }
          : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string, selectedSize: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.selectedSize === selectedSize))
    );
  };

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative min-h-screen text-[#1C1917]">
      <div
        className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden bg-[#FAF8F5]"
        aria-hidden="true"
      >
        <img
          src="/assets/aistudio/1794979242349_96c75379.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#FAF8F5]/35" />
      </div>

      <Navbar
        storeName={settings.storeName || 'SAB Jewelry'}
        announcementText={settings.announcementText}
        showAnnouncement={settings.showAnnouncement}
        cartCount={cartCount}
        user={user}
        isOwner={isOwner}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        onOpenCart={() => setCartOpen(true)}
        onOpenTrackOrder={() => setTrackOrderOpen(true)}
        onNavigateSection={handleNavigateSection}
      />

      {isOwner && viewMode === 'admin' ? (
        <AdminDashboard
          products={displayProducts}
          orders={orders}
          inquiries={inquiries}
          reviews={firestoreReviews}
          settings={settings}
          ownerProfile={ownerProfile}
          onSwitchToCustomerView={() => setViewMode('customer')}
        />
      ) : (
        <CustomerStorefront
          products={displayProducts}
          reviews={displayReviews}
          settings={settings}
          isOwner={isOwner}
          onSelectProduct={(product) => setSelectedProduct(product)}
          onQuickAdd={handleQuickAdd}
          onOpenTrackOrder={() => setTrackOrderOpen(true)}
          onOpenOwnerPortal={() => {
            if (isOwner) {
              setViewMode('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setOwnerPortalOpen(true);
            }
          }}
        />
      )}

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={cartOpen}
        items={syncedCart}
        settings={settings}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQty}
        onUpdateSize={handleUpdateCartSize}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        items={syncedCart}
        settings={settings}
        onClose={() => setCheckoutOpen(false)}
        onOrderSuccess={(createdOrder) => {
          setCart([]);
          setRecentOrderNumbers((prev) =>
            [createdOrder.orderNumber, ...prev.filter((n) => n !== createdOrder.orderNumber)].slice(
              0,
              6
            )
          );
        }}
      />

      <TrackOrderModal
        isOpen={trackOrderOpen}
        recentOrderNumbers={recentOrderNumbers}
        onClose={() => setTrackOrderOpen(false)}
      />

      <OwnerLoginModal
        isOpen={ownerPortalOpen}
        user={user}
        isOwner={isOwner}
        onClose={() => setOwnerPortalOpen(false)}
        onEnterAdminDashboard={() => {
          setViewMode('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SabJewelryApp />
    </ErrorBoundary>
  );
}
