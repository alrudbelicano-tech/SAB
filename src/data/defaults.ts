import {
  DEFAULT_CATEGORIES,
  OWNER_EMAIL,
  type OwnerProfile,
  type Product,
  type Review,
  type SiteSettings,
} from '../types';

export const STUDIO_IMAGE_PRESETS = [
  {
    label: 'Gold-Tone Engraved Open Ring',
    url: '/src/assets/images/product_grace_ring_gold_1794987721734.jpg',
  },
  {
    label: 'Silver-Tone Minimalist Band',
    url: '/src/assets/images/product_serene_ring_silver_1794987722463.jpg',
  },
  {
    label: 'Gold-Tone Dainty Pendant Necklace',
    url: '/src/assets/images/product_lumina_necklace_1794987723173.jpg',
  },
  {
    label: 'Gold-Tone Sculpted Cuff & Huggies',
    url: '/src/assets/images/product_aura_cuff_bracelet_1794987723858.jpg',
  },
  {
    label: 'Gold & Silver Duo Promise Set',
    url: '/src/assets/images/product_promise_duo_rings_1794987723186.jpg',
  },
  {
    label: 'SAB Jewelry Brand Logo',
    url: '/assets/aistudio/1794979242349_96c75379.jpg',
  },
  {
    label: 'SAB Jewelry Campaign Banner',
    url: '/src/assets/images/hero_sab_jewelry_1794987720764.jpg',
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  announcementText: 'Free shipping nationwide on orders ₱1,500+ · Curated stainless finished steel jewelry',
  showAnnouncement: true,
  heroEyebrow: 'Everyday Minimalist Pieces',
  heroTitle: 'Meaningful pieces made to stay with you.',
  heroSubtitle:
    'Thoughtfully curated stainless finished steel rings, chains, and cuffs—handpicked for everyday wear, clean minimalist styling, and ready-to-gift packaging.',
  heroCtaLabel: 'Explore Collection',
  heroImageUrl: '/assets/aistudio/1794979242349_96c75379.jpg',
  storyTitle: 'Curated for quiet daily wear.',
  storyBody:
    'SAB Jewelry curates and resells minimalist everyday pieces in stainless finished steel—selected for clean silhouettes, comfortable weight, and timeless gold- and silver-tone finishes. Whether chosen as a daily staple or a thoughtful gift, every item is inspected, packed with care, and shipped straight to your door.',
  gcashAccountName: 'SAB Jewelry Studio',
  gcashNumber: '0917 842 5910',
  gcashQrUrl: '',
  mayaAccountName: 'SAB Jewelry Studio',
  mayaNumber: '0917 842 5910',
  mayaQrUrl: '',
  storeName: 'SAB Jewelry',
  contactPhone: '0917 842 5910',
  contactEmail: '',
  studioHours: 'Monday – Saturday · 9:00 AM – 6:00 PM PHT',
  categories: [...DEFAULT_CATEGORIES],
  shippingFee: 85,
  freeShippingThreshold: 1500,
};

export const DEFAULT_OWNER_PROFILE: OwnerProfile = {
  ownerName: 'SAB Jewelry Studio',
  profilePhotoUrl: '/assets/aistudio/1794979242349_96c75379.jpg',
  notificationEmail: OWNER_EMAIL,
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'sab_grace_open_ring',
    name: 'Grace Adjustable Script Ring',
    category: 'Rings',
    finish: 'Gold-Tone Finish',
    material: 'Stainless Finished Steel',
    description:
      'An open-band ring featuring delicate interior script and softly rounded edges for comfortable everyday stacking. Gently adjustable for an easy fit across finger sizes.',
    careNote: 'Wipe gently with a soft dry cloth after wearing and store in its pouch when not in use.',
    regularPrice: 899,
    salePrice: 649,
    discountPercent: 28,
    stock: 18,
    imageUrl: '/src/assets/images/product_grace_ring_gold_1794987721734.jpg',
    sizes: 'Adjustable (Fits US 5–9)',
    isFeatured: true,
    isActive: true,
    isSeedPreview: true,
  },
  {
    id: 'sab_serene_silver_band',
    name: 'Serene Classic Band Ring',
    category: 'Rings',
    finish: 'Polished Silver Finish',
    material: 'Stainless Finished Steel',
    description:
      'A sleek, low-profile comfort-fit band with a smooth mirror finish. Designed for clean solo wear or paired beside gold-tone accents.',
    careNote: 'Keep dry and store separately to minimize surface scratches.',
    regularPrice: 699,
    salePrice: 549,
    discountPercent: 21,
    stock: 24,
    imageUrl: '/src/assets/images/product_serene_ring_silver_1794987722463.jpg',
    sizes: 'US 6, US 7, US 8, US 9',
    isFeatured: true,
    isActive: true,
    isSeedPreview: true,
  },
  {
    id: 'sab_lumina_pendant',
    name: 'Lumina Medallion Necklace',
    category: 'Necklaces',
    finish: 'Gold-Tone Finish',
    material: 'Stainless Finished Steel & Cubic Zirconia',
    description:
      'A hammered disc medallion set with a subtle accent stone on an 18-inch delicate chain. Lightweight enough to layer or wear solo from morning to evening.',
    careNote: 'Avoid direct sprays of perfume or lotion on the chain and clasp.',
    regularPrice: 1299,
    salePrice: 999,
    discountPercent: 23,
    stock: 14,
    imageUrl: '/src/assets/images/product_lumina_necklace_1794987723173.jpg',
    sizes: '18 in + 2 in Extender',
    isFeatured: true,
    isActive: true,
    isSeedPreview: true,
  },
  {
    id: 'sab_aura_cuff_duo',
    name: 'Aura Sculpted Cuff & Huggies',
    category: 'Bracelets',
    finish: 'Gold-Tone Finish',
    material: 'Stainless Finished Steel',
    description:
      'A fluid wraparound wrist cuff paired with classic minimal huggie hoops. Smooth tapered ends sit comfortably on your wrist.',
    careNote: 'Store flat in your SAB pouch when traveling.',
    regularPrice: 1499,
    salePrice: 1199,
    discountPercent: 20,
    stock: 9,
    imageUrl: '/src/assets/images/product_aura_cuff_bracelet_1794987723858.jpg',
    sizes: 'Adjustable Cuff · 12mm Huggies',
    isFeatured: false,
    isActive: true,
    isSeedPreview: true,
  },
  {
    id: 'sab_promise_duo_set',
    name: 'Covenant Duo Ring Set',
    category: 'Sets',
    finish: 'Gold-Tone & Brushed Silver',
    material: 'Stainless Finished Steel',
    description:
      'A matching pair of sculpted band rings—one high-polish gold-tone and one satin-brushed silver-tone—curated as a thoughtful gift set for couples, friends, or mixed-metal stacking.',
    careNote: 'Includes dual gift boxes and a soft polishing cloth.',
    regularPrice: 1399,
    salePrice: 1099,
    discountPercent: 21,
    stock: 11,
    imageUrl: '/src/assets/images/product_promise_duo_rings_1794987723186.jpg',
    sizes: 'Adjustable Pair (US 5–10)',
    isFeatured: true,
    isActive: true,
    isSeedPreview: true,
  },
];

export const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev_seed_1',
    userId: 'seed_customer_1',
    authorName: 'Camille Mendoza',
    productId: 'sab_grace_open_ring',
    productName: 'Grace Adjustable Script Ring',
    rating: 5,
    comment:
      'Love how clean and comfortable the Grace ring feels for daily wear. It arrived neatly boxed and the adjustable fit is spot on.',
    isApproved: true,
    createdAt: '2026-10-18T10:00:00Z',
  },
  {
    id: 'rev_seed_2',
    userId: 'seed_customer_2',
    authorName: 'Rafael Villanueva',
    productId: 'sab_promise_duo_set',
    productName: 'Covenant Duo Ring Set',
    rating: 5,
    comment:
      'Ordered the duo set for our anniversary via GCash. The exact-amount checkout was straightforward and the box presentation felt genuinely thoughtful.',
    isApproved: true,
    createdAt: '2026-10-29T14:30:00Z',
  },
  {
    id: 'rev_seed_3',
    userId: 'seed_customer_3',
    authorName: 'Bea Santos',
    productId: 'sab_lumina_pendant',
    productName: 'Lumina Medallion Necklace',
    rating: 5,
    comment:
      'Such a delicate, quiet piece. The gold-tone finish pairs easily with my everyday outfits and the clasp feels sturdy.',
    isApproved: true,
    createdAt: '2026-11-05T09:15:00Z',
  },
];
