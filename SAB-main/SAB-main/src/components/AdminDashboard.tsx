import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Mail,
  MessageSquare,
  Package,
  Plus,
  QrCode,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
  Truck,
  Upload,
  UserCog,
  Video,
  X,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, STUDIO_IMAGE_PRESETS } from '../data/defaults';
import { SHIPPING_ORIGIN, SHIPPING_ZONE_LIST } from '../data/shipping';
import {
  clearGmailAccessToken,
  getGmailAccessToken,
  signInWithGoogle,
} from '../lib/firebase';
import {
  CUSTOMER_SHIPPING_EMAIL_MESSAGE,
  sendCustomerShippingEmail,
  sendOrderNotificationToGmail,
} from '../services/gmailService';
import {
  deleteInquiry,
  deleteReview,
  markOrderGmailNotified,
  markOrderShippingEmailSent,
  removeOrderRecord,
  removeProduct,
  resolveInquiry,
  saveOwnerProfile,
  saveProduct,
  saveSiteSettings,
  seedInitialStoreData,
  updateOrderStatus,
} from '../services/storeService';
import {
  DEFAULT_CATEGORIES,
  FIELD_LIMITS,
  OWNER_EMAIL,
  type Inquiry,
  type Order,
  type OrderStatus,
  type OwnerProfile,
  type Product,
  type ProductCategory,
  type Review,
  type SiteSettings,
} from '../types';
import {
  compressImageFile,
  compressVideoFile,
  formatFirestoreDate,
  formatPHP,
  generateId,
  getYouTubeEmbedUrl,
} from '../utils/format';
import { ImageWithFallback } from './ImageWithFallback';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  inquiries: Inquiry[];
  reviews: Review[];
  settings: SiteSettings;
  ownerProfile: OwnerProfile;
  onSwitchToCustomerView: () => void;
}

type AdminTab = 'orders' | 'catalog' | 'payments' | 'profile' | 'website' | 'messages';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending Verification',
  'Confirmed',
  'Packing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const SIZE_PRESETS = [
  { label: 'Rings (US 5–9)', value: 'US 5, US 6, US 7, US 8, US 9' },
  { label: 'Chains (16–20 in)', value: '16 in, 18 in, 20 in' },
  { label: 'Cuffs (S / M / L)', value: 'S, M, L' },
  { label: 'Adjustable', value: 'Adjustable (Fits US 5–9)' },
];

interface ProductFormState {
  id: string;
  name: string;
  category: ProductCategory;
  finish: string;
  material: string;
  description: string;
  careNote: string;
  sizes: string;
  regularPrice: string;
  salePrice: string;
  discountPercent: string;
  stock: string;
  imageUrl: string;
  imageUrl2: string;
  imageUrl3: string;
  videoUrl: string;
  isFeatured: boolean;
  isActive: boolean;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: '',
  name: '',
  category: 'Rings',
  finish: 'Gold-Tone Finish',
  material: 'Stainless Finished Steel',
  description: '',
  careNote: 'Wipe gently with a soft dry cloth after wearing and store in a pouch.',
  sizes: 'Adjustable (Fits US 5–9)',
  regularPrice: '899',
  salePrice: '699',
  discountPercent: '22',
  stock: '15',
  imageUrl: STUDIO_IMAGE_PRESETS[0].url,
  imageUrl2: '',
  imageUrl3: '',
  videoUrl: '',
  isFeatured: false,
  isActive: true,
};

export function AdminDashboard({
  products,
  orders,
  inquiries,
  reviews,
  settings,
  ownerProfile,
  onSwitchToCustomerView,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [statusFeedback, setStatusFeedback] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Product Editor Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingIsNew, setEditingIsNew] = useState(true);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingPhotoSlot, setUploadingPhotoSlot] = useState<1 | 2 | 3 | null>(null);
  const [uploadingProductVideo, setUploadingProductVideo] = useState(false);
  const [productModalError, setProductModalError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteOrderConfirm, setDeleteOrderConfirm] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Gmail Order Notification State (in-memory token only)
  const [gmailToken, setGmailToken] = useState<string | null>(() => getGmailAccessToken());
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [gmailConfirmOrders, setGmailConfirmOrders] = useState<Order[] | null>(null);
  const [sendingGmail, setSendingGmail] = useState(false);
  const [shipEmailConfirmOrder, setShipEmailConfirmOrder] = useState<Order | null>(null);
  const [sendingShipEmail, setSendingShipEmail] = useState(false);

  // Website Editor & Payment QR State
  const [siteForm, setSiteForm] = useState<SiteSettings>(settings);
  const [savingSite, setSavingSite] = useState(false);
  const [uploadingHeroImg, setUploadingHeroImg] = useState(false);
  const [uploadingGcashQr, setUploadingGcashQr] = useState(false);
  const [uploadingMayaQr, setUploadingMayaQr] = useState(false);

  // Owner Profile, Gmail & Numbers State
  const [profileForm, setProfileForm] = useState<OwnerProfile>(ownerProfile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);

  // Category Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);

  // Fullscreen Tap-to-Zoom Lightbox State (Receipts & QR Previews)
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    alt: string;
    caption?: string;
  } | null>(null);

  const configuredCategories =
    Array.isArray(siteForm.categories) && siteForm.categories.length > 0
      ? siteForm.categories
      : [...DEFAULT_CATEGORIES];

  useEffect(() => {
    setSiteForm(settings);
  }, [settings]);

  useEffect(() => {
    setProfileForm(ownerProfile);
  }, [ownerProfile]);

  useEffect(() => {
    if (!zoomedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedImage]);

  const showNotice = (msg: string) => {
    setErrorBanner('');
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(''), 3000);
  };

  // KPIs
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingVerificationCount = orders.filter(
    (o) => o.status === 'Pending Verification'
  ).length;
  const pendingDispatchCount = orders.filter(
    (o) =>
      o.status === 'Pending Verification' || o.status === 'Confirmed' || o.status === 'Packing'
  ).length;
  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const openInquiriesCount = inquiries.filter((i) => i.status === 'New').length;
  const unnotifiedOrders = orders.filter((o) => !o.gmailNotified && o.status !== 'Cancelled');

  const filteredOrders =
    orderStatusFilter === 'All'
      ? orders
      : orders.filter((o) => o.status === orderStatusFilter);

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    setErrorBanner('');
    try {
      await signInWithGoogle();
      const token = getGmailAccessToken();
      if (!token) {
        setErrorBanner(
          'Google sign-in completed, but Gmail send permission was not granted. Please click Sign in with Google again and allow Gmail sending.'
        );
        return;
      }
      setGmailToken(token);
      showNotice('Gmail connected for order notifications.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to connect Gmail.');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleSendConfirmedGmailAlerts = async () => {
    if (!gmailConfirmOrders || gmailConfirmOrders.length === 0) return;
    const token = gmailToken || getGmailAccessToken();
    if (!token) {
      setGmailConfirmOrders(null);
      setErrorBanner('Please connect Gmail with Google first before sending order alerts.');
      return;
    }

    setSendingGmail(true);
    setErrorBanner('');
    let sentCount = 0;
    try {
      for (const order of gmailConfirmOrders) {
        await sendOrderNotificationToGmail(token, order, profileForm.notificationEmail);
        await markOrderGmailNotified(order.id);
        sentCount += 1;
      }
      setGmailConfirmOrders(null);
      showNotice(
        sentCount === 1
          ? `Sent Gmail notification for order ${gmailConfirmOrders[0].orderNumber}.`
          : `Sent ${sentCount} new order notifications to ${profileForm.notificationEmail || OWNER_EMAIL}.`
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'GMAIL_AUTH_REQUIRED') {
        clearGmailAccessToken();
        setGmailToken(null);
        setGmailConfirmOrders(null);
        setErrorBanner('Your Gmail session expired. Please reconnect with Google and try again.');
      } else {
        setErrorBanner(err instanceof Error ? err.message : 'Unable to send Gmail notification.');
      }
    } finally {
      setSendingGmail(false);
    }
  };

  const handleConfirmShipAndSendEmail = async () => {
    if (!shipEmailConfirmOrder) return;
    const target = shipEmailConfirmOrder;
    const token = gmailToken || getGmailAccessToken();
    if (!token) {
      setErrorBanner('Please connect Gmail with Google first before sending the shipping email.');
      return;
    }

    setSendingShipEmail(true);
    setErrorBanner('');
    try {
      if (target.status !== 'Shipped') {
        await updateOrderStatus(target.id, target.orderNumber, 'Shipped', target.notes);
      }
      await sendCustomerShippingEmail(token, target);
      await markOrderShippingEmailSent(target.id);
      setShipEmailConfirmOrder(null);
      showNotice(
        `Order ${target.orderNumber} marked Shipped and shipping email sent to ${target.customerEmail}.`
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'GMAIL_AUTH_REQUIRED') {
        clearGmailAccessToken();
        setGmailToken(null);
        setErrorBanner('Your Gmail session expired. Please reconnect with Google and try again.');
      } else {
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to send customer shipping confirmation email.'
        );
      }
    } finally {
      setSendingShipEmail(false);
    }
  };

  const openCreateProductModal = () => {
    setEditingIsNew(true);
    setProductModalError('');
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category: configuredCategories[0] || 'Rings',
      id: generateId('sab'),
    });
    setProductModalOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim().slice(0, 40);
    if (trimmed.length < 2) {
      setErrorBanner('Category name must be at least 2 characters.');
      return;
    }
    if (configuredCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorBanner(`Category "${trimmed}" already exists.`);
      return;
    }
    if (configuredCategories.length >= 24) {
      setErrorBanner('Maximum of 24 categories reached.');
      return;
    }
    const nextCategories = [...configuredCategories, trimmed];
    setSavingCategories(true);
    setErrorBanner('');
    try {
      const updated = { ...siteForm, categories: nextCategories };
      setSiteForm(updated);
      await saveSiteSettings(updated);
      setNewCategoryName('');
      showNotice(`Added category "${trimmed}".`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to add category.');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleRemoveCategory = async (categoryToRemove: string) => {
    if (configuredCategories.length <= 1) {
      setErrorBanner('At least 1 category is required for your storefront.');
      return;
    }
    const nextCategories = configuredCategories.filter((c) => c !== categoryToRemove);
    setSavingCategories(true);
    setErrorBanner('');
    try {
      const updated = { ...siteForm, categories: nextCategories };
      setSiteForm(updated);
      await saveSiteSettings(updated);
      showNotice(`Removed category "${categoryToRemove}".`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to remove category.');
    } finally {
      setSavingCategories(false);
    }
  };

  const openEditProductModal = (product: Product) => {
    setEditingIsNew(Boolean(product.isSeedPreview));
    setProductModalError('');
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      finish: product.finish,
      material: product.material,
      description: product.description,
      careNote: product.careNote || '',
      sizes: product.sizes || '',
      regularPrice: String(product.regularPrice),
      salePrice: String(product.salePrice),
      discountPercent: String(product.discountPercent),
      stock: String(product.stock),
      imageUrl: product.imageUrl,
      imageUrl2: product.imageUrl2 || '',
      imageUrl3: product.imageUrl3 || '',
      videoUrl: product.videoUrl || '',
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setProductModalOpen(true);
  };

  const handleRegularPriceChange = (val: string) => {
    const reg = Number.parseFloat(val);
    const pct = Number.parseFloat(productForm.discountPercent) || 0;
    if (Number.isFinite(reg) && reg > 0) {
      const nextSale = Math.max(1, Math.round(reg * (1 - pct / 100)));
      setProductForm((prev) => ({
        ...prev,
        regularPrice: val,
        salePrice: String(nextSale),
      }));
    } else {
      setProductForm((prev) => ({ ...prev, regularPrice: val }));
    }
  };

  const handleDiscountPercentChange = (val: string) => {
    const pct = Math.min(95, Math.max(0, Number.parseFloat(val) || 0));
    const reg = Number.parseFloat(productForm.regularPrice);
    if (Number.isFinite(reg) && reg > 0) {
      const nextSale = Math.max(1, Math.round(reg * (1 - pct / 100)));
      setProductForm((prev) => ({
        ...prev,
        discountPercent: val,
        salePrice: String(nextSale),
      }));
    } else {
      setProductForm((prev) => ({ ...prev, discountPercent: val }));
    }
  };

  const handleSalePriceChange = (val: string) => {
    const sale = Number.parseFloat(val);
    const reg = Number.parseFloat(productForm.regularPrice);
    if (Number.isFinite(sale) && Number.isFinite(reg) && reg > 0 && sale <= reg) {
      const nextPct = Math.round(((reg - sale) / reg) * 100);
      setProductForm((prev) => ({
        ...prev,
        salePrice: val,
        discountPercent: String(nextPct),
      }));
    } else {
      setProductForm((prev) => ({ ...prev, salePrice: val }));
    }
  };

  const handleProductImageUpload = async (
    slot: 1 | 2 | 3,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhotoSlot(slot);
    setProductModalError('');
    try {
      const compressed = await compressImageFile(
        file,
        880,
        0.78,
        slot === 1 ? 180000 : 150000
      );
      setProductForm((prev) => ({
        ...prev,
        ...(slot === 1
          ? { imageUrl: compressed }
          : slot === 2
          ? { imageUrl2: compressed }
          : { imageUrl3: compressed }),
      }));
    } catch (err) {
      setProductModalError(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setUploadingPhotoSlot(null);
    }
  };

  const handleProductVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingProductVideo(true);
    setProductModalError('');
    try {
      const compressed = await compressVideoFile(file, 520000);
      setProductForm((prev) => ({ ...prev, videoUrl: compressed }));
    } catch (err) {
      setProductModalError(err instanceof Error ? err.message : 'Unable to process video.');
    } finally {
      setUploadingProductVideo(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeroImg(true);
    setErrorBanner('');
    try {
      const compressed = await compressImageFile(file, 1280, 0.8);
      setSiteForm((prev) => ({ ...prev, heroImageUrl: compressed }));
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to process hero image.');
    } finally {
      setUploadingHeroImg(false);
    }
  };

  const handleWalletQrUpload = async (
    wallet: 'gcash' | 'maya',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setLoading = wallet === 'gcash' ? setUploadingGcashQr : setUploadingMayaQr;
    setLoading(true);
    setErrorBanner('');
    try {
      const compressed = await compressImageFile(file, 640, 0.78);
      if (compressed.length > FIELD_LIMITS.IMAGE_URL_MAX) {
        setErrorBanner('QR image is too large. Please choose a smaller or cropped QR screenshot.');
        return;
      }
      setSiteForm((prev) => ({
        ...prev,
        ...(wallet === 'gcash' ? { gcashQrUrl: compressed } : { mayaQrUrl: compressed }),
      }));
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to process QR code image.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner('');
    setProductModalError('');

    const regPrice = Number.parseFloat(productForm.regularPrice);
    const salePrice = Number.parseFloat(productForm.salePrice);
    const stockNum = Number.parseInt(productForm.stock, 10);

    if (!Number.isFinite(regPrice) || regPrice <= 0) {
      setProductModalError('Regular price must be greater than ₱0.');
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice > regPrice) {
      setProductModalError('Sale price must be greater than ₱0 and cannot exceed regular price.');
      return;
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setProductModalError('Stock quantity must be 0 or greater.');
      return;
    }

    setSavingProduct(true);
    try {
      await saveProduct(
        {
          id: productForm.id || generateId('sab'),
          name: productForm.name,
          category: productForm.category,
          finish: productForm.finish,
          material: productForm.material,
          description: productForm.description,
          careNote: productForm.careNote,
          sizes: productForm.sizes,
          regularPrice: regPrice,
          salePrice,
          discountPercent: Math.round(((regPrice - salePrice) / regPrice) * 100),
          stock: stockNum,
          imageUrl: productForm.imageUrl,
          imageUrl2: productForm.imageUrl2,
          imageUrl3: productForm.imageUrl3,
          videoUrl: productForm.videoUrl,
          isFeatured: productForm.isFeatured,
          isActive: productForm.isActive,
        },
        editingIsNew
      );
      setProductModalOpen(false);
      showNotice(`Saved "${productForm.name}" to catalog.`);
    } catch (err) {
      setProductModalError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSite(true);
    setErrorBanner('');
    try {
      await saveSiteSettings(siteForm);
      showNotice('Website content & payment details published.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to update storefront settings.');
    } finally {
      setSavingSite(false);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingProfilePhoto(true);
    setErrorBanner('');
    try {
      const compressed = await compressImageFile(file, 480, 0.8, 120000);
      setProfileForm((prev) => ({ ...prev, profilePhotoUrl: compressed }));
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to process profile photo.');
    } finally {
      setUploadingProfilePhoto(false);
    }
  };

  const handleSaveProfileAndNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = profileForm.notificationEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorBanner('Please enter a valid Gmail address for order notifications.');
      return;
    }
    setSavingProfile(true);
    setErrorBanner('');
    try {
      await Promise.all([saveOwnerProfile(profileForm), saveSiteSettings(siteForm)]);
      showNotice('Owner profile, Gmail settings, and numbers saved.');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to save profile, Gmail, and numbers.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSyncStarterCatalog = async () => {
    try {
      await seedInitialStoreData();
      showNotice('Starter catalog synced to your Firestore database.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to sync starter catalog.');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E0D6]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-[#E6E0D6] overflow-hidden shrink-0">
            <ImageWithFallback
              src={profileForm.profilePhotoUrl || '/assets/aistudio/1794979242349_96c75379.jpg'}
              alt={profileForm.ownerName || 'Owner profile'}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs text-[#8C6D46] font-medium">
              Owner Portal · {profileForm.ownerName || 'SAB Jewelry Studio'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] mt-0.5">
              {siteForm.storeName || 'SAB Jewelry'} Dashboard
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {products.some((p) => p.isSeedPreview) && (
            <button
              type="button"
              onClick={handleSyncStarterCatalog}
              className="px-4 py-2 border border-[#8C6D46] text-xs font-medium text-[#8C6D46] hover:bg-[#8C6D46] hover:text-white transition-colors cursor-pointer"
            >
              Initialize Catalog in Database
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchToCustomerView}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Customer View</span>
          </button>
        </div>
      </div>

      {/* Feedback & Errors */}
      {statusFeedback && (
        <div className="bg-[#14532D]/10 border border-[#14532D]/30 px-4 py-3 text-xs text-[#14532D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}
      {errorBanner && (
        <div className="bg-[#7F1D1D]/10 border border-[#7F1D1D]/30 px-4 py-3 text-xs text-[#7F1D1D]">
          {errorBanner}
        </div>
      )}

      {/* 4-Column KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6E0D6] p-5">
          <p className="text-xs text-[#78716C]">Verified Revenue</p>
          <p className="font-mono text-2xl font-semibold text-[#1C1917] tabular-nums mt-1">
            {formatPHP(totalRevenue)}
          </p>
          <p className="text-xs text-[#57534E] mt-1 tabular-nums">{orders.length} total orders</p>
        </div>
        <div className="bg-white border border-[#E6E0D6] p-5">
          <p className="text-xs text-[#78716C]">Pending Fulfillment</p>
          <p className="font-mono text-2xl font-semibold text-[#1C1917] tabular-nums mt-1">
            {pendingDispatchCount}
          </p>
          <p className="text-xs text-[#57534E] mt-1">
            {pendingVerificationCount > 0
              ? `${pendingVerificationCount} awaiting payment ref check`
              : 'Confirmed or packing'}
          </p>
        </div>
        <div className="bg-white border border-[#E6E0D6] p-5">
          <p className="text-xs text-[#78716C]">Low Stock Items (≤ 5)</p>
          <p className="font-mono text-2xl font-semibold text-[#1C1917] tabular-nums mt-1">
            {lowStockProducts.length}
          </p>
          <p className="text-xs text-[#57534E] mt-1 tabular-nums">{products.length} catalog pieces</p>
        </div>
        <div className="bg-white border border-[#E6E0D6] p-5">
          <p className="text-xs text-[#78716C]">Unread Inquiries</p>
          <p className="font-mono text-2xl font-semibold text-[#1C1917] tabular-nums mt-1">
            {openInquiriesCount}
          </p>
          <p className="text-xs text-[#57534E] mt-1 tabular-nums">{reviews.length} customer reviews</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E6E0D6] pb-3">
        {(
          [
            { id: 'orders', label: 'Orders & Fulfillment', icon: Package },
            { id: 'catalog', label: 'Catalog, Photos & Discounts', icon: Plus },
            { id: 'payments', label: 'GCash & Maya QR', icon: QrCode },
            { id: 'profile', label: 'Profile, Gmail & Numbers', icon: UserCog },
            { id: 'website', label: 'Website Editor', icon: Sliders },
            { id: 'messages', label: `Inquiries & Reviews (${openInquiriesCount})`, icon: MessageSquare },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#1C1917] text-[#FAF8F5]'
                  : 'bg-white border border-[#E6E0D6] text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <section className="space-y-5">
          {/* Gmail Order Notifications Bar */}
          <div className="bg-white border border-[#E6E0D6] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#8C6D46] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[#1C1917]">
                  Gmail New Order Notifications
                </p>
                <p className="text-xs text-[#57534E]">
                  {!gmailToken ? (
                    <>
                      Connect your Google account to send order alerts to{' '}
                      <span className="font-mono text-[#1C1917]">
                        {profileForm.notificationEmail || OWNER_EMAIL}
                      </span>
                      .
                    </>
                  ) : unnotifiedOrders.length > 0 ? (
                    <>
                      {unnotifiedOrders.length} newly placed{' '}
                      {unnotifiedOrders.length === 1 ? 'order is' : 'orders are'} ready to send to{' '}
                      <span className="font-mono text-[#1C1917]">
                        {profileForm.notificationEmail || OWNER_EMAIL}
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      Connected — all current orders have been sent to{' '}
                      <span className="font-mono text-[#1C1917]">
                        {profileForm.notificationEmail || OWNER_EMAIL}
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="h-10 px-3 bg-white border border-[#E6E0D6] text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
              >
                Change Gmail
              </button>
              {!gmailToken ? (
                <button
                  type="button"
                  disabled={connectingGmail}
                  onClick={handleConnectGmail}
                  className="inline-flex items-center gap-2.5 h-10 px-4 bg-white border border-[#747775]/40 text-xs font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{connectingGmail ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              ) : (
                unnotifiedOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGmailConfirmOrders(unnotifiedOrders)}
                    className="inline-flex items-center gap-2 h-10 px-4 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>
                      Send {unnotifiedOrders.length} New Order{' '}
                      {unnotifiedOrders.length === 1 ? 'Alert' : 'Alerts'} to Gmail
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-[#1C1917]">Customer Orders</h2>
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...ORDER_STATUSES] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    orderStatusFilter === status
                      ? 'bg-[#1C1917] text-[#FAF8F5] border-[#1C1917]'
                      : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#1C1917]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white border border-[#E6E0D6] p-12 text-center space-y-2">
              <Package className="w-8 h-8 text-[#A8A29E] mx-auto stroke-[1.25]" />
              <p className="text-sm font-medium text-[#1C1917]">No orders in this status</p>
              <p className="text-xs text-[#78716C]">
                Verified GCash and Maya customer orders will appear here immediately after checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isPendingCheck = order.status === 'Pending Verification';
                return (
                  <div
                    key={order.id}
                    className={`bg-white border p-5 sm:p-6 space-y-4 ${
                      isPendingCheck ? 'border-[#8C6D46]' : 'border-[#E6E0D6]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#F2EFE9]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                          <span className="font-mono font-semibold text-sm text-[#1C1917]">
                            {order.orderNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatFirestoreDate(order.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`px-2 py-0.5 border text-[11px] font-medium ${
                              isPendingCheck
                                ? 'bg-[#8C6D46]/10 border-[#8C6D46]/40 text-[#8C6D46]'
                                : order.status === 'Cancelled'
                                ? 'bg-[#7F1D1D]/10 border-[#7F1D1D]/30 text-[#7F1D1D]'
                                : 'bg-[#14532D]/10 border-[#14532D]/30 text-[#14532D]'
                            }`}
                          >
                            {isPendingCheck
                              ? `${order.paymentMethod} Ref Awaiting Owner Check`
                              : `${order.paymentMethod} Verified (${order.status})`}
                          </span>
                          {order.gmailNotified && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#8C6D46] font-medium">Gmail Sent</span>
                            </>
                          )}
                          {order.shippingEmailSent && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#14532D] font-medium">Shipping Email Sent</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[#1C1917]">
                          {order.customerName} <span aria-hidden="true">·</span>{' '}
                          <span className="font-normal text-[#57534E]">{order.customerPhone}</span>{' '}
                          {order.customerEmail && (
                            <>
                              <span aria-hidden="true">·</span>{' '}
                              <span className="font-normal text-[#57534E]">{order.customerEmail}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-[#57534E]">{order.shippingAddress}</p>
                        <p className="text-xs text-[#78716C]">
                          Payment Ref:{' '}
                          <span className="font-mono font-semibold text-[#1C1917]">
                            {order.paymentReference}
                          </span>
                          {' · '}
                          Shipping:{' '}
                          <span className="font-mono text-[#1C1917]">
                            {order.shippingFee === 0 ? 'FREE' : formatPHP(order.shippingFee)}
                          </span>
                          {order.shippingZone ? ` (${order.shippingZone})` : ''}
                          {order.estimatedDelivery ? ` · ETA: ${order.estimatedDelivery}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="font-mono text-lg font-semibold text-[#1C1917] tabular-nums">
                          {formatPHP(order.totalAmount)}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Update status for ${order.orderNumber}`}
                            value={order.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as OrderStatus;
                              if (
                                nextStatus === 'Shipped' &&
                                order.status !== 'Shipped' &&
                                order.customerEmail?.trim() &&
                                !order.shippingEmailSent
                              ) {
                                setShipEmailConfirmOrder(order);
                                return;
                              }
                              try {
                                await updateOrderStatus(
                                  order.id,
                                  order.orderNumber,
                                  nextStatus,
                                  order.notes
                                );
                                if (nextStatus === 'Shipped' && !order.customerEmail?.trim()) {
                                  showNotice(
                                    `Order ${order.orderNumber} updated to Shipped (no customer email provided for shipping alert).`
                                  );
                                } else {
                                  showNotice(`Order ${order.orderNumber} updated to ${nextStatus}.`);
                                }
                              } catch (err) {
                                setErrorBanner(
                                  err instanceof Error ? err.message : 'Unable to update status.'
                                );
                              }
                            }}
                            className="h-9 px-3 bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-medium text-[#1C1917] cursor-pointer"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                Status: {st}
                              </option>
                            ))}
                          </select>

                          {order.status === 'Shipped' &&
                            order.customerEmail?.trim() &&
                            !order.shippingEmailSent && (
                              <button
                                type="button"
                                onClick={() => setShipEmailConfirmOrder(order)}
                                className="h-9 px-3 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Send Shipping Email</span>
                              </button>
                            )}

                          {gmailToken && !order.gmailNotified && (
                            <button
                              type="button"
                              onClick={() => setGmailConfirmOrders([order])}
                              className="h-9 px-3 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#8C6D46]" />
                              <span>Notify Gmail</span>
                            </button>
                          )}

                          {(order.status === 'Delivered' || order.status === 'Cancelled') && (
                            <button
                              type="button"
                              onClick={() => setDeleteOrderConfirm(order)}
                              className="h-9 px-3 bg-white border border-[#E6E0D6] text-xs font-medium text-[#7F1D1D] hover:border-[#7F1D1D] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Receipt Verification Bar */}
                    {(isPendingCheck || order.paymentProofUrl) && (
                      <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-3.5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {order.paymentProofUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setZoomedImage({
                                  src: order.paymentProofUrl!,
                                  alt: `${order.orderNumber} ${order.paymentMethod} receipt`,
                                  caption: `${order.orderNumber} · ${order.paymentMethod} Ref: ${order.paymentReference} · ${formatPHP(order.totalAmount)}`,
                                })
                              }
                              className="group relative w-14 h-14 bg-white border border-[#E6E0D6] overflow-hidden shrink-0 cursor-zoom-in"
                              title="Tap receipt screenshot to zoom"
                            >
                              <img
                                src={order.paymentProofUrl}
                                alt={`${order.orderNumber} payment receipt`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute inset-0 bg-[#1C1917]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </span>
                            </button>
                          ) : null}

                          <div className="space-y-0.5 text-xs">
                            <p className="font-medium text-[#1C1917]">
                              {order.paymentProofUrl
                                ? 'Payment Receipt Screenshot Attached'
                                : 'No receipt image attached (older order)'}
                            </p>
                            <p className="text-[#57534E]">
                              Compare <span className="font-mono text-[#1C1917]">{order.paymentReference}</span>{' '}
                              &amp; <span className="font-mono text-[#1C1917]">{formatPHP(order.totalAmount)}</span>{' '}
                              in your {order.paymentMethod} app.
                              {order.paymentProofUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomedImage({
                                      src: order.paymentProofUrl!,
                                      alt: `${order.orderNumber} ${order.paymentMethod} receipt`,
                                      caption: `${order.orderNumber} · ${order.paymentMethod} Ref: ${order.paymentReference} · ${formatPHP(order.totalAmount)}`,
                                    })
                                  }
                                  className="ml-2 text-[#8C6D46] font-medium hover:underline cursor-pointer"
                                >
                                  Tap receipt to zoom
                                </button>
                              )}
                            </p>
                          </div>
                        </div>

                        {isPendingCheck && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateOrderStatus(
                                    order.id,
                                    order.orderNumber,
                                    'Confirmed',
                                    order.notes
                                  );
                                  showNotice(
                                    `Verified payment ref for ${order.orderNumber} and marked Confirmed.`
                                  );
                                } catch (err) {
                                  setErrorBanner(
                                    err instanceof Error
                                      ? err.message
                                      : 'Unable to confirm order.'
                                  );
                                }
                              }}
                              className="h-9 px-3.5 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify Ref &amp; Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await updateOrderStatus(
                                    order.id,
                                    order.orderNumber,
                                    'Cancelled',
                                    order.notes
                                  );
                                  showNotice(
                                    `Order ${order.orderNumber} cancelled (invalid or unreceived reference).`
                                  );
                                } catch (err) {
                                  setErrorBanner(
                                    err instanceof Error ? err.message : 'Unable to cancel order.'
                                  );
                                }
                              }}
                              className="h-9 px-3 bg-white border border-[#7F1D1D]/40 text-[#7F1D1D] text-xs font-medium hover:border-[#7F1D1D] transition-colors cursor-pointer"
                            >
                              Invalid Ref / Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-[#57534E]">
                      {order.items.map((item) => (
                        <div
                          key={`${item.productId}_${item.selectedSize}`}
                          className="flex justify-between"
                        >
                          <span>
                            {item.quantity} × {item.name} ({item.finish} · {item.selectedSize})
                          </span>
                          <span className="font-mono tabular-nums text-[#1C1917]">
                            {formatPHP(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CATALOG, PHOTOS & DISCOUNTS */}
      {activeTab === 'catalog' && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                Inventory, Pictures &amp; Discounts
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Add new pieces, upload photos, adjust stock counts, and configure regular vs. discounted pricing.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateProductModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          {/* Manage Item Categories */}
          <div className="bg-white border border-[#E6E0D6] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1C1917]">Item Categories</h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Add or remove categories for your catalog items and customer storefront filter bar.
                </p>
              </div>
              <span className="text-xs text-[#78716C] tabular-nums">
                {configuredCategories.length} active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {configuredCategories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#1C1917]"
                  >
                    <span className="font-medium">{cat}</span>
                    <span className="text-[#78716C] font-mono tabular-nums">({count})</span>
                    <button
                      type="button"
                      disabled={savingCategories || configuredCategories.length <= 1}
                      onClick={() => handleRemoveCategory(cat)}
                      aria-label={`Remove ${cat} category`}
                      title={
                        configuredCategories.length <= 1
                          ? 'Keep at least 1 category'
                          : `Remove ${cat}`
                      }
                      className="p-0.5 text-[#78716C] hover:text-[#7F1D1D] disabled:opacity-35 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
              <input
                type="text"
                minLength={2}
                maxLength={40}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category (e.g. Anklets, Pendants, Watches)"
                aria-label="New category name"
                className="flex-1 h-10 px-3 bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
              />
              <button
                type="submit"
                disabled={savingCategories || newCategoryName.trim().length < 2}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{savingCategories ? 'Saving...' : 'Add Category'}</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white border border-[#E6E0D6] flex flex-col">
                <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden relative">
                  <ImageWithFallback
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#78716C]">
                      <span>
                        {product.category} <span aria-hidden="true">·</span> {product.finish}
                      </span>
                      <span className={product.isActive ? 'text-[#14532D]' : 'text-[#7F1D1D]'}>
                        {product.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#1C1917]">{product.name}</h3>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-sm font-semibold text-[#1C1917] tabular-nums">
                        {formatPHP(product.salePrice)}
                      </span>
                      {product.regularPrice > product.salePrice && (
                        <>
                          <span className="font-mono text-xs text-[#78716C] line-through tabular-nums">
                            {formatPHP(product.regularPrice)}
                          </span>
                          <span className="text-xs text-[#8C6D46] font-medium">
                            -{product.discountPercent}%
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[#57534E] tabular-nums">
                      Stock: <strong>{product.stock}</strong> units
                      {product.isFeatured && ' · Featured'}
                      {' · '}
                      {[product.imageUrl, product.imageUrl2, product.imageUrl3].filter(Boolean).length}{' '}
                      photo
                      {[product.imageUrl, product.imageUrl2, product.imageUrl3].filter(Boolean).length === 1
                        ? ''
                        : 's'}
                      {product.videoUrl?.trim() ? ' · 1 video' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[#F2EFE9]">
                    <button
                      type="button"
                      onClick={() => openEditProductModal(product)}
                      className="flex-1 h-9 px-3 border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveProduct(
                          {
                            ...product,
                            isActive: !product.isActive,
                          },
                          Boolean(product.isSeedPreview)
                        ).then(() =>
                          showNotice(
                            `${product.name} is now ${!product.isActive ? 'visible' : 'hidden'} on storefront.`
                          )
                        )
                      }
                      aria-label={product.isActive ? 'Hide product' : 'Show product'}
                      className="h-9 px-3 border border-[#E6E0D6] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                    >
                      {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {!product.isSeedPreview && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(product.id)}
                        aria-label={`Delete ${product.name}`}
                        className="h-9 px-3 border border-[#E6E0D6] text-[#78716C] hover:text-[#7F1D1D] hover:border-[#7F1D1D] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: GCASH & MAYA QR SETUP */}
      {activeTab === 'payments' && (
        <form onSubmit={handleSaveSiteSettings} className="bg-white border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E6E0D6]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                GCash &amp; Maya Numbers &amp; QR Codes
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Set your receiving mobile numbers and upload your GCash / Maya QR codes. Customers see these directly at Express Checkout.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSite}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingSite ? 'Saving...' : 'Save Payment Details'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GCash Card */}
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
                <div>
                  <h3 className="text-base font-semibold text-[#1C1917]">GCash App</h3>
                  <p className="text-xs text-[#78716C]">Shown when customer selects GCash</p>
                </div>
                <QrCode className="w-5 h-5 text-[#8C6D46]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">GCash Account Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={siteForm.gcashAccountName}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, gcashAccountName: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">GCash Mobile Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={siteForm.gcashNumber}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, gcashNumber: e.target.value }))
                    }
                    placeholder="0917 000 0000"
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-medium text-[#1C1917]">GCash QR Code</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-40 h-40 bg-white border border-[#E6E0D6] p-2 flex items-center justify-center shrink-0">
                    {siteForm.gcashQrUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: siteForm.gcashQrUrl || '',
                            alt: 'GCash QR code preview',
                            caption: `GCash · ${siteForm.gcashAccountName} (${siteForm.gcashNumber})`,
                          })
                        }
                        className="group relative w-full h-full cursor-zoom-in"
                        title="Tap QR to zoom"
                      >
                        <img
                          src={siteForm.gcashQrUrl}
                          alt="GCash QR code preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 bg-white/90 border border-[#E6E0D6] p-1 text-[#1C1917] opacity-80 group-hover:opacity-100">
                          <ZoomIn className="w-3 h-3" />
                        </span>
                      </button>
                    ) : (
                      <div className="text-center space-y-1 px-2">
                        <QrCode className="w-7 h-7 text-[#A8A29E] mx-auto stroke-[1.25]" />
                        <p className="text-[11px] text-[#78716C]">No GCash QR uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingGcashQr ? 'Optimizing QR...' : 'Upload GCash QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleWalletQrUpload('gcash', e)}
                          className="hidden"
                        />
                      </label>
                      {siteForm.gcashQrUrl && (
                        <button
                          type="button"
                          onClick={() => setSiteForm((prev) => ({ ...prev, gcashQrUrl: '' }))}
                          className="px-3 py-2 bg-white border border-[#E6E0D6] text-xs text-[#7F1D1D] hover:border-[#7F1D1D] transition-colors cursor-pointer"
                        >
                          Remove QR
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={siteForm.gcashQrUrl || ''}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, gcashQrUrl: e.target.value }))
                      }
                      placeholder="Or paste GCash QR image URL"
                      className="w-full h-9 px-2.5 bg-white border border-[#E6E0D6] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Maya Card */}
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
                <div>
                  <h3 className="text-base font-semibold text-[#1C1917]">Maya App</h3>
                  <p className="text-xs text-[#78716C]">Shown when customer selects Maya</p>
                </div>
                <QrCode className="w-5 h-5 text-[#8C6D46]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Maya Account Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={siteForm.mayaAccountName}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, mayaAccountName: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Maya Mobile Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={siteForm.mayaNumber}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, mayaNumber: e.target.value }))
                    }
                    placeholder="0917 000 0000"
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-medium text-[#1C1917]">Maya QR Code</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-40 h-40 bg-white border border-[#E6E0D6] p-2 flex items-center justify-center shrink-0">
                    {siteForm.mayaQrUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: siteForm.mayaQrUrl || '',
                            alt: 'Maya QR code preview',
                            caption: `Maya · ${siteForm.mayaAccountName} (${siteForm.mayaNumber})`,
                          })
                        }
                        className="group relative w-full h-full cursor-zoom-in"
                        title="Tap QR to zoom"
                      >
                        <img
                          src={siteForm.mayaQrUrl}
                          alt="Maya QR code preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1 right-1 bg-white/90 border border-[#E6E0D6] p-1 text-[#1C1917] opacity-80 group-hover:opacity-100">
                          <ZoomIn className="w-3 h-3" />
                        </span>
                      </button>
                    ) : (
                      <div className="text-center space-y-1 px-2">
                        <QrCode className="w-7 h-7 text-[#A8A29E] mx-auto stroke-[1.25]" />
                        <p className="text-[11px] text-[#78716C]">No Maya QR uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingMayaQr ? 'Optimizing QR...' : 'Upload Maya QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleWalletQrUpload('maya', e)}
                          className="hidden"
                        />
                      </label>
                      {siteForm.mayaQrUrl && (
                        <button
                          type="button"
                          onClick={() => setSiteForm((prev) => ({ ...prev, mayaQrUrl: '' }))}
                          className="px-3 py-2 bg-white border border-[#E6E0D6] text-xs text-[#7F1D1D] hover:border-[#7F1D1D] transition-colors cursor-pointer"
                        >
                          Remove QR
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={siteForm.mayaQrUrl || ''}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, mayaQrUrl: e.target.value }))
                      }
                      placeholder="Or paste Maya QR image URL"
                      className="w-full h-9 px-2.5 bg-white border border-[#E6E0D6] font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: PROFILE, GMAIL & NUMBERS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfileAndNumbers} className="bg-white border border-[#E6E0D6] p-6 sm:p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E6E0D6]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                Owner Profile, Gmail &amp; Numbers
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Update your studio profile, change the Gmail address for order notifications, and manage your contact and e-wallet numbers.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Profile & Numbers'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Owner & Store Profile */}
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-5 space-y-4">
              <div className="border-b border-[#E6E0D6] pb-3">
                <h3 className="text-base font-semibold text-[#1C1917]">Owner &amp; Store Profile</h3>
                <p className="text-xs text-[#78716C]">Shown in your Owner Portal and storefront header</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white border border-[#E6E0D6] overflow-hidden shrink-0 flex items-center justify-center">
                  <ImageWithFallback
                    src={profileForm.profilePhotoUrl || '/assets/aistudio/1794979242349_96c75379.jpg'}
                    alt="Owner profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingProfilePhoto ? 'Optimizing...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {profileForm.profilePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setProfileForm((prev) => ({ ...prev, profilePhotoUrl: '' }))}
                        className="px-3 py-2 bg-white border border-[#E6E0D6] text-xs text-[#7F1D1D] hover:border-[#7F1D1D] transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#78716C]">Visible only inside your Owner Dashboard.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Profile Photo URL (Optional)</label>
                <input
                  type="text"
                  value={profileForm.profilePhotoUrl}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, profilePhotoUrl: e.target.value }))
                  }
                  placeholder="/assets/aistudio/1794979242349_96c75379.jpg"
                  className="w-full h-9 px-2.5 bg-white border border-[#E6E0D6] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Owner / Studio Display Name *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={profileForm.ownerName}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, ownerName: e.target.value }))
                  }
                  placeholder="SAB Jewelry Studio"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Public Storefront Brand Name *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={siteForm.storeName || ''}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, storeName: e.target.value }))
                  }
                  placeholder="SAB Jewelry"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Studio Support Hours</label>
                <input
                  type="text"
                  maxLength={120}
                  value={siteForm.studioHours || ''}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, studioHours: e.target.value }))
                  }
                  placeholder="Monday – Saturday · 9:00 AM – 6:00 PM PHT"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                />
              </div>
            </div>

            {/* 2. Gmail Account & Notifications */}
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-5 space-y-4">
              <div className="border-b border-[#E6E0D6] pb-3">
                <h3 className="text-base font-semibold text-[#1C1917]">Gmail Account Settings</h3>
                <p className="text-xs text-[#78716C]">Manage where order alerts are sent and Google authorization</p>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">
                  Order Notification Gmail Address *
                </label>
                <input
                  type="email"
                  required
                  maxLength={160}
                  value={profileForm.notificationEmail}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, notificationEmail: e.target.value }))
                  }
                  placeholder="your.email@gmail.com"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                />
                <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
                  Private to your admin portal. New order alerts will be sent to this Gmail address.
                </p>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">
                  Public Storefront Contact Email (Optional)
                </label>
                <input
                  type="email"
                  maxLength={160}
                  value={siteForm.contactEmail || ''}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  placeholder="Leave blank to keep Gmail private"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                />
                <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
                  Only displayed on the customer Contact Studio section if you choose to fill this in.
                </p>
              </div>

              <div className="bg-white border border-[#E6E0D6] p-3.5 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#1C1917]">
                    Google Gmail Sender Connection
                  </p>
                  <p className="text-[11px] text-[#57534E] leading-relaxed">
                    {gmailToken
                      ? 'Gmail send permission is active for this session. Click below to switch or refresh your Google sender account.'
                      : 'Connect your Google account so the dashboard can send order alerts via Gmail.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={connectingGmail}
                  onClick={handleConnectGmail}
                  className="inline-flex items-center justify-center gap-2.5 w-full h-10 px-4 bg-white border border-[#747775]/40 text-xs font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {connectingGmail
                      ? 'Connecting Google...'
                      : gmailToken
                      ? 'Switch / Refresh Google Account'
                      : 'Sign in with Google'}
                  </span>
                </button>

                <p className="text-[11px] text-[#78716C] leading-relaxed">
                  Owner Portal login remains protected under <span className="font-mono">{OWNER_EMAIL}</span>.
                </p>
              </div>
            </div>

            {/* 3. Business & Wallet Numbers */}
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-5 space-y-4">
              <div className="border-b border-[#E6E0D6] pb-3">
                <h3 className="text-base font-semibold text-[#1C1917]">Mobile &amp; Payment Numbers</h3>
                <p className="text-xs text-[#78716C]">Storefront support line and e-wallet receiving numbers</p>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Storefront Support Number</label>
                <input
                  type="text"
                  maxLength={24}
                  value={siteForm.contactPhone || ''}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="0917 842 5910"
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                />
                <p className="text-[11px] text-[#78716C] mt-1">
                  Displayed in the Contact Studio card on your storefront.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E6E0D6] space-y-3">
                <p className="text-xs font-semibold text-[#1C1917]">GCash Receiving Details</p>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">GCash Account Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={siteForm.gcashAccountName}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, gcashAccountName: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">GCash Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={siteForm.gcashNumber}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, gcashNumber: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E6E0D6] space-y-3">
                <p className="text-xs font-semibold text-[#1C1917]">Maya Receiving Details</p>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Maya Account Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={siteForm.mayaAccountName}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, mayaAccountName: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Maya Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={siteForm.mayaNumber}
                    onChange={(e) =>
                      setSiteForm((prev) => ({ ...prev, mayaNumber: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] font-mono text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="text-xs font-medium text-[#8C6D46] hover:underline cursor-pointer"
              >
                Manage GCash &amp; Maya QR Code Images &rarr;
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: WEBSITE EDITOR */}
      {activeTab === 'website' && (
        <form onSubmit={handleSaveSiteSettings} className="bg-white border border-[#E6E0D6] p-6 sm:p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E6E0D6]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                Live Storefront &amp; Payment Settings
              </h2>
              <p className="text-xs text-[#78716C] mt-0.5">
                Changes published here immediately update the customer-facing SAB Jewelry website.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSiteForm((prev) => ({
                    ...DEFAULT_SITE_SETTINGS,
                    storeName: prev.storeName,
                    contactPhone: prev.contactPhone,
                    contactEmail: prev.contactEmail,
                    studioHours: prev.studioHours,
                    categories: prev.categories,
                    gcashAccountName: prev.gcashAccountName,
                    gcashNumber: prev.gcashNumber,
                    gcashQrUrl: prev.gcashQrUrl,
                    mayaAccountName: prev.mayaAccountName,
                    mayaNumber: prev.mayaNumber,
                    mayaQrUrl: prev.mayaQrUrl,
                  }));
                  showNotice('Loaded updated default copy. Click Publish Changes to save.');
                }}
                className="px-4 py-2.5 bg-white border border-[#E6E0D6] text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
              >
                Load Default Copy
              </button>
              <button
                type="submit"
                disabled={savingSite}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingSite ? 'Publishing...' : 'Publish Changes'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editorial Copy & Hero */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1C1917]">Storefront Copy &amp; Hero</h3>

              <div className="flex items-center justify-between border border-[#E6E0D6] p-3">
                <span className="text-xs font-medium text-[#1C1917]">Show Top Announcement Bar</span>
                <input
                  type="checkbox"
                  checked={siteForm.showAnnouncement}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, showAnnouncement: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Announcement Banner Text</label>
                <input
                  type="text"
                  maxLength={160}
                  value={siteForm.announcementText}
                  onChange={(e) =>
                    setSiteForm((prev) => ({ ...prev, announcementText: e.target.value }))
                  }
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Hero Eyebrow Label</label>
                <input
                  type="text"
                  maxLength={80}
                  value={siteForm.heroEyebrow}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, heroEyebrow: e.target.value }))}
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Hero Main Headline</label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={siteForm.heroTitle}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Hero Subtitle</label>
                <textarea
                  rows={3}
                  required
                  maxLength={320}
                  value={siteForm.heroSubtitle}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Hero Button Label</label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={siteForm.heroCtaLabel}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, heroCtaLabel: e.target.value }))}
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Brand Story Title</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={siteForm.storyTitle}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, storyTitle: e.target.value }))}
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Brand Story Copy</label>
                <textarea
                  rows={4}
                  required
                  maxLength={1000}
                  value={siteForm.storyBody}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, storyBody: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E6E0D6] text-sm"
                />
              </div>
            </div>

            {/* Hero Visual & Payment Gateways */}
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1C1917]">Hero Banner Picture</h3>
                <div className="aspect-[16/9] bg-[#F2EFE9] border border-[#E6E0D6] overflow-hidden">
                  <ImageWithFallback
                    src={siteForm.heroImageUrl}
                    alt="Hero banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2EFE9] border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:bg-[#E6E0D6] transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingHeroImg ? 'Optimizing...' : 'Upload Custom Hero Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={siteForm.heroImageUrl}
                  onChange={(e) => setSiteForm((prev) => ({ ...prev, heroImageUrl: e.target.value }))}
                  placeholder="Or paste image URL"
                  className="w-full h-10 px-3 border border-[#E6E0D6] text-xs font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[#E6E0D6] space-y-4">
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  GCash &amp; Maya Receiving Accounts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">GCash Account Name</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={siteForm.gcashAccountName}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, gcashAccountName: e.target.value }))
                      }
                      className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">GCash Mobile Number</label>
                    <input
                      type="text"
                      required
                      maxLength={24}
                      value={siteForm.gcashNumber}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, gcashNumber: e.target.value }))
                      }
                      className="w-full h-10 px-3 border border-[#E6E0D6] font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Maya Account Name</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={siteForm.mayaAccountName}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, mayaAccountName: e.target.value }))
                      }
                      className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Maya Mobile Number</label>
                    <input
                      type="text"
                      required
                      maxLength={24}
                      value={siteForm.mayaNumber}
                      onChange={(e) =>
                        setSiteForm((prev) => ({ ...prev, mayaNumber: e.target.value }))
                      }
                      className="w-full h-10 px-3 border border-[#E6E0D6] font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E6E0D6] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#1C1917]">
                    J&amp;T Express Shipping Rules (PHP)
                  </h3>
                  <span className="text-[11px] text-[#78716C]">
                    Origin: {SHIPPING_ORIGIN} · ≤ 500g
                  </span>
                </div>
                <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-3.5 space-y-2 text-xs">
                  {SHIPPING_ZONE_LIST.map((zone) => (
                    <div
                      key={zone.id}
                      className="flex flex-wrap items-center justify-between gap-2 pb-1.5 last:pb-0 border-b last:border-b-0 border-[#E6E0D6]"
                    >
                      <span className="text-[#1C1917] font-medium">{zone.label}</span>
                      <span className="font-mono text-[#57534E]">
                        ₱{zone.fee} · {zone.estimatedDays}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Free Nationwide Shipping Threshold (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={siteForm.freeShippingThreshold}
                    onChange={(e) =>
                      setSiteForm((prev) => ({
                        ...prev,
                        freeShippingThreshold: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full h-10 px-3 border border-[#E6E0D6] font-mono text-sm tabular-nums"
                  />
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Orders reaching this subtotal automatically receive FREE nationwide shipping (default ₱1,500).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: INQUIRIES & REVIEWS */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inquiries */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
              Customer Inquiries ({inquiries.length})
            </h2>
            {inquiries.length === 0 ? (
              <div className="bg-white border border-[#E6E0D6] p-8 text-center text-xs text-[#78716C]">
                No contact form submissions yet.
              </div>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="bg-white border border-[#E6E0D6] p-5 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917]">{inq.subject}</p>
                      <p className="text-xs text-[#78716C]">
                        {inq.name} <span aria-hidden="true">·</span> {inq.email}{' '}
                        <span aria-hidden="true">·</span> {formatFirestoreDate(inq.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        inq.status === 'New' ? 'text-[#8C6D46]' : 'text-[#14532D]'
                      }`}
                    >
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#57534E] leading-relaxed">{inq.message}</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-[#F2EFE9] text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        resolveInquiry(inq.id, inq.status === 'New' ? 'Resolved' : 'New').then(() =>
                          showNotice('Inquiry status updated.')
                        )
                      }
                      className="font-medium text-[#1C1917] hover:underline cursor-pointer"
                    >
                      {inq.status === 'New' ? 'Mark Resolved' : 'Reopen'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        deleteInquiry(inq.id).then(() => showNotice('Inquiry deleted.'))
                      }
                      className="text-[#7F1D1D] hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Reviews Moderation */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
              Customer Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <div className="bg-white border border-[#E6E0D6] p-8 text-center text-xs text-[#78716C]">
                No custom Firestore reviews submitted yet.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-[#E6E0D6] p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917]">
                        {rev.authorName}{' '}
                        <span className="font-normal text-[#8C6D46]">({rev.rating}/5)</span>
                      </p>
                      <p className="text-xs text-[#78716C]">
                        {rev.productName} <span aria-hidden="true">·</span>{' '}
                        {formatFirestoreDate(rev.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        deleteReview(rev.id).then(() => showNotice('Review removed.'))
                      }
                      className="text-xs text-[#7F1D1D] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm text-[#57534E] leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-0 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Jewelry Piece"
        >
          <div className="bg-[#FAF8F5] w-full max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-y-auto border border-[#E6E0D6]">
            <div className="px-6 py-4 bg-white border-b border-[#E6E0D6] flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
                {editingIsNew ? 'Add New Jewelry Item' : 'Edit Jewelry Item'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                aria-label="Close item editor"
                className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="p-6 space-y-5">
              {productModalError && (
                <div className="bg-[#7F1D1D]/10 border border-[#7F1D1D]/30 px-4 py-3 text-xs text-[#7F1D1D]">
                  {productModalError}
                </div>
              )}

              {/* 3 Product Pictures + 1 Product Video */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#1C1917]">
                    Product Photos (up to 3) &amp; Video (1)
                  </p>
                  <span className="text-[11px] text-[#78716C]">
                    Customers can view all photos and video when tapping this item
                  </span>
                </div>

                {/* 3 Picture Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { slot: 1 as const, label: 'Picture 1 (Main) *', value: productForm.imageUrl, required: true },
                      { slot: 2 as const, label: 'Picture 2 (Optional)', value: productForm.imageUrl2, required: false },
                      { slot: 3 as const, label: 'Picture 3 (Optional)', value: productForm.imageUrl3, required: false },
                    ] as const
                  ).map(({ slot, label, value, required }) => (
                    <div key={slot} className="bg-white border border-[#E6E0D6] p-3 space-y-2.5 flex flex-col">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-[#1C1917]">{label}</span>
                        {slot !== 1 && value && (
                          <button
                            type="button"
                            onClick={() =>
                              setProductForm((prev) => ({
                                ...prev,
                                ...(slot === 2 ? { imageUrl2: '' } : { imageUrl3: '' }),
                              }))
                            }
                            aria-label={`Remove Picture ${slot}`}
                            className="text-[11px] text-[#7F1D1D] hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="aspect-[4/3] bg-[#F2EFE9] border border-[#E6E0D6] overflow-hidden flex items-center justify-center">
                        {value ? (
                          <ImageWithFallback
                            src={value}
                            alt={`${productForm.name || 'Product'} photo ${slot}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center px-2 space-y-1">
                            <ImagePlus className="w-5 h-5 text-[#A8A29E] mx-auto stroke-[1.25]" />
                            <p className="text-[11px] text-[#78716C]">No photo {slot}</p>
                          </div>
                        )}
                      </div>

                      <label className="inline-flex items-center justify-center gap-1.5 w-full h-9 px-3 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>
                          {uploadingPhotoSlot === slot ? 'Compressing...' : `Upload Photo ${slot}`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProductImageUpload(slot, e)}
                          className="hidden"
                        />
                      </label>

                      {slot === 1 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }));
                            }
                          }}
                          className="w-full h-8 px-2 bg-[#FAF8F5] border border-[#E6E0D6] text-[11px]"
                        >
                          <option value="">Studio preset...</option>
                          {STUDIO_IMAGE_PRESETS.map((preset) => (
                            <option key={preset.url} value={preset.url}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <input
                        type="text"
                        required={required}
                        value={value}
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            ...(slot === 1
                              ? { imageUrl: e.target.value }
                              : slot === 2
                              ? { imageUrl2: e.target.value }
                              : { imageUrl3: e.target.value }),
                          }))
                        }
                        placeholder="Paste image URL"
                        className="w-full h-8 px-2 bg-[#FAF8F5] border border-[#E6E0D6] font-mono text-[11px]"
                      />
                    </div>
                  ))}
                </div>

                {/* 1 Video Slot */}
                <div className="bg-white border border-[#E6E0D6] p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[#8C6D46]" />
                      <span className="text-xs font-medium text-[#1C1917]">
                        Product Video (1 Optional Clip)
                      </span>
                    </div>
                    {productForm.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setProductForm((prev) => ({ ...prev, videoUrl: '' }))}
                        className="text-xs text-[#7F1D1D] hover:underline cursor-pointer"
                      >
                        Remove Video
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 aspect-video bg-[#F2EFE9] border border-[#E6E0D6] overflow-hidden flex items-center justify-center">
                      {productForm.videoUrl ? (
                        (() => {
                          const ytEmbed = getYouTubeEmbedUrl(productForm.videoUrl);
                          if (ytEmbed) {
                            return (
                              <iframe
                                src={ytEmbed}
                                title="Product video preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            );
                          }
                          return (
                            <video
                              key={productForm.videoUrl}
                              src={productForm.videoUrl}
                              controls
                              playsInline
                              className="w-full h-full object-contain bg-[#1C1917]"
                            />
                          );
                        })()
                      ) : (
                        <div className="text-center px-3 space-y-1">
                          <Video className="w-6 h-6 text-[#A8A29E] mx-auto stroke-[1.25]" />
                          <p className="text-[11px] text-[#78716C]">No video attached</p>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-7 space-y-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingProductVideo ? 'Compressing Video...' : 'Upload Video Clip'}
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleProductVideoUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={productForm.videoUrl}
                        onChange={(e) =>
                          setProductForm((prev) => ({ ...prev, videoUrl: e.target.value }))
                        }
                        placeholder="Or paste MP4 / WebM / YouTube link"
                        className="w-full h-9 px-2.5 bg-[#FAF8F5] border border-[#E6E0D6] font-mono text-xs"
                      />
                      <p className="text-[11px] text-[#78716C] leading-relaxed">
                        Short clips (up to ~12 seconds) are automatically compressed, or paste a direct video / YouTube URL.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#57534E] mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={FIELD_LIMITS.NAME_MAX}
                    value={productForm.name}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Grace Adjustable Script Ring"
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category: e.target.value as ProductCategory,
                      }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  >
                    {Array.from(
                      new Set([
                        ...configuredCategories,
                        ...(productForm.category ? [productForm.category] : []),
                      ])
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Finish *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={productForm.finish}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, finish: e.target.value }))}
                    placeholder="Gold-Tone Finish"
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Material *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={productForm.material}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, material: e.target.value }))
                    }
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#57534E] mb-1">Sizes / Fit Options</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={productForm.sizes}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, sizes: e.target.value }))}
                    placeholder="e.g. US 5, US 6, US 7, US 8 or Adjustable (Fits US 5–9)"
                    className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-[#78716C]">Quick presets:</span>
                    {SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({ ...prev, sizes: preset.value }))
                        }
                        className="px-2 py-1 bg-white border border-[#E6E0D6] text-[11px] text-[#57534E] hover:text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-1">
                    Separate multiple sizes with commas (e.g. US 6, US 7, US 8) so customers can pick their preferred size.
                  </p>
                </div>
              </div>

              {/* Pricing, Discounts & Inventory */}
              <div className="bg-white border border-[#E6E0D6] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Regular Price (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={productForm.regularPrice}
                    onChange={(e) => handleRegularPriceChange(e.target.value)}
                    className="w-full h-10 px-2.5 border border-[#E6E0D6] font-mono text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="95"
                    step="1"
                    value={productForm.discountPercent}
                    onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    className="w-full h-10 px-2.5 border border-[#E6E0D6] font-mono text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Sale Price (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={productForm.salePrice}
                    onChange={(e) => handleSalePriceChange(e.target.value)}
                    className="w-full h-10 px-2.5 border border-[#E6E0D6] font-mono text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Stock Qty *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, stock: e.target.value }))}
                    className="w-full h-10 px-2.5 border border-[#E6E0D6] font-mono text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Product Description *</label>
                <textarea
                  rows={3}
                  required
                  minLength={5}
                  maxLength={FIELD_LIMITS.DESCRIPTION_MAX}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white border border-[#E6E0D6] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Care Instructions</label>
                <input
                  type="text"
                  maxLength={400}
                  value={productForm.careNote}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, careNote: e.target.value }))}
                  className="w-full h-10 px-3 bg-white border border-[#E6E0D6] text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-6 text-xs text-[#1C1917]">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isFeatured}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, isFeatured: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#1C1917]"
                  />
                  <span>Feature on Storefront</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#1C1917]"
                  />
                  <span>Visible to Customers</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-5 py-2.5 border border-[#E6E0D6] text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-6 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 cursor-pointer"
                >
                  {savingProduct ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#E6E0D6] max-w-sm w-full p-6 space-y-4">
            <h3 className="font-display text-2xl font-semibold text-[#1C1917]">Delete Item?</h3>
            <p className="text-sm text-[#57534E]">
              This will permanently remove the piece from your catalog. You can hide it instead if you plan to restock later.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-[#E6E0D6] text-xs font-medium text-[#57534E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  await removeProduct(id);
                  showNotice('Catalog item deleted.');
                }}
                className="px-4 py-2 bg-[#7F1D1D] text-white text-xs font-medium hover:bg-[#661414] cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      {/* INLINE DELETE DELIVERED / CANCELLED ORDER MODAL */}
      {deleteOrderConfirm && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${deleteOrderConfirm.status} Order`}
        >
          <div className="bg-white border border-[#E6E0D6] max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
              Delete {deleteOrderConfirm.status} Order {deleteOrderConfirm.orderNumber}?
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed">
              This will permanently remove this {deleteOrderConfirm.status.toLowerCase()} order{' '}
              <strong className="font-mono text-[#1C1917]">
                {deleteOrderConfirm.orderNumber}
              </strong>{' '}
              ({deleteOrderConfirm.customerName} · {formatPHP(deleteOrderConfirm.totalAmount)}) and
              its public tracking entry. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingOrder}
                onClick={() => setDeleteOrderConfirm(null)}
                className="px-4 py-2 border border-[#E6E0D6] text-xs font-medium text-[#57534E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingOrder}
                onClick={async () => {
                  const target = deleteOrderConfirm;
                  setDeletingOrder(true);
                  setErrorBanner('');
                  try {
                    await removeOrderRecord(target.id, target.orderNumber, {
                      status: target.status,
                      paymentMethod: target.paymentMethod,
                      paymentReference: target.paymentReference,
                    });
                    setDeleteOrderConfirm(null);
                    showNotice(`${target.status} order ${target.orderNumber} deleted.`);
                  } catch (err) {
                    setErrorBanner(
                      err instanceof Error
                        ? err.message
                        : `Unable to delete ${target.status.toLowerCase()} order.`
                    );
                  } finally {
                    setDeletingOrder(false);
                  }
                }}
                className="px-4 py-2 bg-[#7F1D1D] text-white text-xs font-medium hover:bg-[#661414] disabled:opacity-50 cursor-pointer"
              >
                {deletingOrder ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE CUSTOMER SHIPPING EMAIL CONFIRMATION MODAL */}
      {shipEmailConfirmOrder && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Customer Shipping Email"
        >
          <div className="bg-white border border-[#E6E0D6] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-[#8C6D46]" />
              <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
                {shipEmailConfirmOrder.status === 'Shipped'
                  ? 'Send Shipping Confirmation Email?'
                  : 'Mark Shipped & Email Customer?'}
              </h3>
            </div>

            <div className="text-xs text-[#57534E] space-y-1">
              <p>
                Order:{' '}
                <span className="font-mono font-semibold text-[#1C1917]">
                  {shipEmailConfirmOrder.orderNumber}
                </span>
              </p>
              <p>
                Recipient:{' '}
                <span className="font-medium text-[#1C1917]">
                  {shipEmailConfirmOrder.customerName}
                </span>{' '}
                &lt;<span className="font-mono text-[#1C1917]">{shipEmailConfirmOrder.customerEmail}</span>&gt;
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-4 space-y-2 text-xs text-[#1C1917] whitespace-pre-line leading-relaxed">
              <p className="font-semibold text-[#8C6D46]">Email Message Preview</p>
              <p>{CUSTOMER_SHIPPING_EMAIL_MESSAGE}</p>
            </div>

            {!gmailToken && (
              <div className="bg-[#FAF8F5] border border-[#8C6D46]/40 p-3.5 space-y-2.5 text-xs text-[#57534E]">
                <p>
                  Connect your Google account in this session to send the confirmation email directly from your Gmail.
                </p>
                <button
                  type="button"
                  disabled={connectingGmail}
                  onClick={handleConnectGmail}
                  className="inline-flex items-center gap-2.5 h-9 px-3.5 bg-white border border-[#747775]/40 text-xs font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{connectingGmail ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={sendingShipEmail}
                onClick={() => setShipEmailConfirmOrder(null)}
                className="px-4 py-2 border border-[#E6E0D6] text-xs font-medium text-[#57534E] cursor-pointer"
              >
                Cancel
              </button>

              {shipEmailConfirmOrder.status !== 'Shipped' && (
                <button
                  type="button"
                  disabled={sendingShipEmail}
                  onClick={async () => {
                    const target = shipEmailConfirmOrder;
                    setSendingShipEmail(true);
                    try {
                      await updateOrderStatus(target.id, target.orderNumber, 'Shipped', target.notes);
                      setShipEmailConfirmOrder(null);
                      showNotice(`Order ${target.orderNumber} updated to Shipped.`);
                    } catch (err) {
                      setErrorBanner(
                        err instanceof Error ? err.message : 'Unable to update status to Shipped.'
                      );
                    } finally {
                      setSendingShipEmail(false);
                    }
                  }}
                  className="px-4 py-2 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] disabled:opacity-50 cursor-pointer"
                >
                  Mark Shipped Only
                </button>
              )}

              <button
                type="button"
                disabled={sendingShipEmail || !gmailToken}
                onClick={handleConfirmShipAndSendEmail}
                className="px-5 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-45 cursor-pointer"
              >
                {sendingShipEmail
                  ? 'Sending Email...'
                  : shipEmailConfirmOrder.status === 'Shipped'
                  ? 'Confirm & Send Shipping Email'
                  : 'Mark Shipped & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE GMAIL NOTIFICATION CONFIRMATION MODAL */}
      {gmailConfirmOrders && gmailConfirmOrders.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Gmail Order Notification"
        >
          <div className="bg-white border border-[#E6E0D6] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-[#8C6D46]" />
              <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
                Send Order Notification to Gmail?
              </h3>
            </div>
            <p className="text-sm text-[#57534E] leading-relaxed">
              This will send{' '}
              {gmailConfirmOrders.length === 1
                ? 'an email summary'
                : `${gmailConfirmOrders.length} email summaries`}{' '}
              to <span className="font-mono text-[#1C1917]">{profileForm.notificationEmail || OWNER_EMAIL}</span>:
            </p>
            <div className="bg-[#FAF8F5] border border-[#E6E0D6] p-3.5 max-h-52 overflow-y-auto space-y-2 text-xs">
              {gmailConfirmOrders.map((ord) => (
                <div key={ord.id} className="flex justify-between gap-3 pb-2 last:pb-0 border-b last:border-b-0 border-[#E6E0D6]">
                  <div>
                    <p className="font-mono font-semibold text-[#1C1917]">{ord.orderNumber}</p>
                    <p className="text-[#57534E]">
                      {ord.customerName} · {ord.paymentMethod} ({ord.paymentReference})
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-[#1C1917] tabular-nums shrink-0">
                    {formatPHP(ord.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={sendingGmail}
                onClick={() => setGmailConfirmOrders(null)}
                className="px-4 py-2 border border-[#E6E0D6] text-xs font-medium text-[#57534E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingGmail}
                onClick={handleSendConfirmedGmailAlerts}
                className="px-5 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 cursor-pointer"
              >
                {sendingGmail ? 'Sending to Gmail...' : 'Confirm & Send to Gmail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAP-TO-ZOOM FULLSCREEN IMAGE / RECEIPT / QR LIGHTBOX */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[70] bg-[#1C1917]/88 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          aria-label={zoomedImage.alt}
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            aria-label="Close zoomed preview"
            className="absolute top-4 right-4 p-2.5 bg-white/95 text-[#1C1917] border border-[#E6E0D6] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-3 max-w-full max-h-full">
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
              className="max-w-[92vw] max-h-[82vh] w-auto h-auto object-contain bg-white p-3 border border-[#E6E0D6] shadow-2xl cursor-default"
            />
            <p className="text-xs text-[#FAF8F5]/90 text-center">
              {zoomedImage.caption ? `${zoomedImage.caption} · ` : ''}Tap outside the picture to close
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
