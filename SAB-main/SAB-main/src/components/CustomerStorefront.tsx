import {
  CheckCircle2,
  Mail,
  Package,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { submitContactInquiry, submitProductReview } from '../services/storeService';
import {
  DEFAULT_CATEGORIES,
  FIELD_LIMITS,
  type Product,
  type ProductCategory,
  type Review,
  type SiteSettings,
} from '../types';
import { formatFirestoreDate, formatPHP, parseSizeOptions } from '../utils/format';
import { ImageWithFallback } from './ImageWithFallback';

interface CustomerStorefrontProps {
  products: Product[];
  reviews: Review[];
  settings: SiteSettings;
  isOwner: boolean;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, selectedSize?: string) => void;
  onOpenTrackOrder: () => void;
  onOpenOwnerPortal: () => void;
}

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'discount';

export function CustomerStorefront({
  products,
  reviews,
  settings,
  isOwner,
  onSelectProduct,
  onQuickAdd,
  onOpenTrackOrder,
  onOpenOwnerPortal,
}: CustomerStorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);
  const [selectedCardSizes, setSelectedCardSizes] = useState<Record<string, string>>({});

  const filterCategories = useMemo(() => {
    const base =
      Array.isArray(settings.categories) && settings.categories.length > 0
        ? settings.categories
        : [...DEFAULT_CATEGORIES];
    return ['All', ...base];
  }, [settings.categories]);

  const effectiveCategory = filterCategories.includes(selectedCategory) ? selectedCategory : 'All';

  // Review Form State (Zero login required)
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);

  const reviewableProducts = useMemo(
    () => activeProducts.filter((p) => !p.isSeedPreview),
    [activeProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeProducts.filter((p) => {
      const matchesCat = effectiveCategory === 'All' || p.category === effectiveCategory;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.finish.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.salePrice - b.salePrice;
      if (sortBy === 'price-desc') return b.salePrice - a.salePrice;
      if (sortBy === 'discount') return b.discountPercent - a.discountPercent;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [activeProducts, effectiveCategory, searchQuery, sortBy]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '5.0';
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return avg.toFixed(1);
  }, [reviews]);

  const handleQuickAddClick = (e: React.MouseEvent, product: Product, chosenSize?: string) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    onQuickAdd(product, chosenSize);
    setQuickAddedId(product.id);
    setTimeout(() => setQuickAddedId(null), 1100);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewNotice('');

    const chosenProduct =
      reviewableProducts.find((p) => p.id === reviewProductId) || reviewableProducts[0];

    if (!chosenProduct) {
      setReviewError('Reviews open once the store owner publishes the catalog.');
      return;
    }

    setSubmittingReview(true);
    try {
      await submitProductReview({
        authorName: reviewAuthor.trim(),
        productId: chosenProduct.id,
        productName: chosenProduct.name,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewAuthor('');
      setReviewComment('');
      setReviewFormOpen(false);
      setReviewNotice('Thank you. Your review is now live.');
      setTimeout(() => setReviewNotice(''), 3500);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to post review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess(false);
    setSubmittingContact(true);
    try {
      await submitContactInquiry({
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
      });
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMessage('');
      setContactSuccess(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmittingContact(false);
    }
  };

  return (
    <div id="top" className="space-y-20 sm:space-y-24 pb-16">
      {/* 1. HERO SHOWCASE */}
      <section className="border-b border-[#E6E0D6] bg-white/75 backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 px-4 sm:px-8 lg:pr-12 py-12 sm:py-16 lg:py-24 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              {settings.heroEyebrow && (
                <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#8C6D46]">
                  {settings.heroEyebrow}
                </p>
              )}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-[#1C1917] leading-[1.08] text-balance">
                {settings.heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-[#57534E] leading-relaxed max-w-lg">
                {settings.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#catalog"
                className="px-6 py-3.5 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] transition-colors whitespace-nowrap shrink-0"
              >
                {settings.heroCtaLabel}
              </a>
              <a
                href="#story"
                className="px-5 py-3.5 border border-[#E6E0D6] text-sm font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors whitespace-nowrap shrink-0"
              >
                Material Craft
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#F2EFE9] aspect-[16/10] lg:aspect-auto lg:min-h-[520px]">
            <ImageWithFallback
              src={settings.heroImageUrl}
              alt="SAB Jewelry minimalist gold and silver collection"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Full-width 3-Column Trust Strip */}
        <div className="border-t border-[#E6E0D6] bg-[#FAF8F5]/80 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 text-xs text-[#57534E]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-[#8C6D46] shrink-0" />
              <span>Stainless Finished Steel — Curated minimalist rings, chains, and cuffs</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-[#8C6D46] shrink-0" />
              <span>Ready to Gift — Inspect-checked and neatly packaged before dispatch</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[#8C6D46] shrink-0" />
              <span>Exact-Amount GCash &amp; Maya Checkout — No account required</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MINIMALIST CATALOG SECTION */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs text-[#8C6D46] font-medium">Curated Collection</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
              Minimalist Everyday Pieces
            </h2>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rings, chains..."
                aria-label="Search jewelry catalog"
                className="w-full h-11 pl-10 pr-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 px-3.5 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917] cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="discount">Biggest Savings</option>
            </select>
          </div>
        </div>

        {/* Category Segmented Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#E6E0D6]">
          {filterCategories.map((category) => {
            const active = effectiveCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#1C1917] text-[#FAF8F5]'
                    : 'bg-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2EFE9]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E6E0D6] p-12 text-center space-y-3">
            <p className="font-display text-2xl text-[#1C1917]">No matching pieces found</p>
            <p className="text-sm text-[#78716C]">
              Try clearing your search filter or switching to All categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const isSoldOut = product.stock <= 0;
              const justAdded = quickAddedId === product.id;
              const sizeOptions = parseSizeOptions(product.sizes);
              const chosenSize =
                selectedCardSizes[product.id] && sizeOptions.includes(selectedCardSizes[product.id])
                  ? selectedCardSizes[product.id]
                  : sizeOptions[0];

              return (
                <article
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group bg-white/92 backdrop-blur-[2px] border border-[#E6E0D6] flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {/* 4:3 Uniform Imagery Container */}
                  <div className="aspect-[4/3] bg-[#F2EFE9] overflow-hidden">
                    <ImageWithFallback
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  {/* Clean Unboxed Metadata & Baseline-Aligned Pricing */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#78716C]">
                        <span>{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{product.finish}</span>
                        {(product.imageUrl2 || product.imageUrl3 || product.videoUrl) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#8C6D46] whitespace-nowrap">
                              {[product.imageUrl, product.imageUrl2, product.imageUrl3].filter(Boolean).length}{' '}
                              photos{product.videoUrl ? ' + video' : ''}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-[#1C1917] leading-snug">
                        {product.name}
                      </h3>

                      <div className="flex items-baseline gap-2.5 pt-0.5">
                        <span className="font-mono text-[15px] font-semibold text-[#1C1917] tabular-nums">
                          {formatPHP(product.salePrice)}
                        </span>
                        {product.regularPrice > product.salePrice && (
                          <>
                            <span className="font-mono text-xs text-[#78716C] line-through tabular-nums">
                              {formatPHP(product.regularPrice)}
                            </span>
                            <span className="text-xs text-[#8C6D46] font-medium">
                              Save {product.discountPercent}%
                            </span>
                          </>
                        )}
                      </div>

                      {sizeOptions.length > 1 ? (
                        <div
                          className="pt-2 space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-[11px] text-[#78716C]">
                            Size: <span className="font-medium text-[#1C1917]">{chosenSize}</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {sizeOptions.map((size) => {
                              const active = chosenSize === size;
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCardSizes((prev) => ({
                                      ...prev,
                                      [product.id]: size,
                                    }));
                                  }}
                                  className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer ${
                                    active
                                      ? 'bg-[#1C1917] text-[#FAF8F5] border-[#1C1917] font-medium'
                                      : 'bg-[#FAF8F5] text-[#57534E] border-[#E6E0D6] hover:border-[#1C1917]'
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#78716C] pt-1">
                          Size: <span className="text-[#57534E]">{sizeOptions[0]}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F2EFE9]">
                      <span
                        className={`text-xs tabular-nums ${
                          isSoldOut
                            ? 'text-[#7F1D1D] font-medium'
                            : product.stock <= 5
                            ? 'text-[#8C6D46]'
                            : 'text-[#78716C]'
                        }`}
                      >
                        {isSoldOut
                          ? 'Sold out'
                          : product.stock <= 5
                          ? `Low stock · ${product.stock} left`
                          : `${product.stock} in stock`}
                      </span>

                      <button
                        type="button"
                        disabled={isSoldOut}
                        onClick={(e) => handleQuickAddClick(e, product, chosenSize)}
                        className="px-4 py-2 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:bg-[#E6E0D6] disabled:text-[#78716C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {justAdded ? 'Added' : isSoldOut ? 'Unavailable' : 'Add to Bag'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. CRAFTSMANSHIP STORY & VERIFIED CUSTOMER REVIEWS */}
      <section id="story" className="border-y border-[#E6E0D6] bg-[#F2EFE9]/55 backdrop-blur-[2px] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-16">
          {/* Craftsmanship Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-2">
              <p className="text-xs text-[#8C6D46] font-medium">Our Standard</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] text-balance">
                {settings.storyTitle}
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
                {settings.storyBody}
              </p>
            </div>
          </div>

          {/* Customer Reviews */}
          <div id="reviews" className="space-y-8 pt-8 border-t border-[#E6E0D6]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-[#8C6D46] font-medium">Customer Satisfaction</p>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                    Worn &amp; Reviewed Daily
                  </h2>
                  <span className="font-mono text-sm font-semibold text-[#1C1917] tabular-nums">
                    {averageRating} / 5.0 ({reviews.length})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReviewFormOpen((prev) => !prev);
                  if (!reviewProductId && reviewableProducts[0]) {
                    setReviewProductId(reviewableProducts[0].id);
                  }
                }}
                className="px-5 py-2.5 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer"
              >
                {reviewFormOpen ? 'Close Review Form' : 'Write a Review'}
              </button>
            </div>

            {reviewNotice && (
              <div className="bg-[#14532D]/10 border border-[#14532D]/30 px-4 py-3 text-xs text-[#14532D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reviewNotice}</span>
              </div>
            )}

            {/* Write a Review Form (Guest Friendly) */}
            {reviewFormOpen && (
              <form
                onSubmit={handleReviewSubmit}
                className="bg-white border border-[#E6E0D6] p-6 space-y-4 max-w-2xl"
              >
                <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
                  Share Your Experience
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={reviewAuthor}
                      onChange={(e) => setReviewAuthor(e.target.value)}
                      placeholder="Your name"
                      className="w-full h-10 px-3 border border-[#E6E0D6] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Jewelry Piece *</label>
                    <select
                      value={reviewProductId}
                      onChange={(e) => setReviewProductId(e.target.value)}
                      className="w-full h-10 px-3 border border-[#E6E0D6] text-sm bg-white"
                    >
                      {reviewableProducts.length === 0 ? (
                        <option value="">Catalog initializing...</option>
                      ) : (
                        reviewableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Rating</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        aria-label={`${star} stars`}
                        className="p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= reviewRating
                              ? 'fill-[#8C6D46] text-[#8C6D46]'
                              : 'text-[#D6D3D1]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Your Review *</label>
                  <textarea
                    rows={3}
                    required
                    minLength={5}
                    maxLength={600}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How has your SAB Jewelry piece held up in daily wear?"
                    className="w-full px-3 py-2 border border-[#E6E0D6] text-sm"
                  />
                </div>

                {reviewError && <p className="text-xs text-[#7F1D1D]">{reviewError}</p>}

                <button
                  type="submit"
                  disabled={submittingReview || reviewableProducts.length === 0}
                  className="px-6 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? 'Publishing...' : 'Publish Review'}
                </button>
              </form>
            )}

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-[#E6E0D6] p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div
                      className="flex items-center gap-1"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < review.rating
                              ? 'fill-[#8C6D46] text-[#8C6D46]'
                              : 'text-[#E6E0D6]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-[#1C1917] leading-relaxed">“{review.comment}”</p>
                  </div>

                  <div className="pt-3 border-t border-[#F2EFE9] text-xs">
                    <p className="font-semibold text-[#1C1917]">{review.authorName}</p>
                    <p className="text-[#78716C] mt-0.5">
                      {review.productName} <span aria-hidden="true">·</span>{' '}
                      {formatFirestoreDate(review.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. CONTACT FORM & STUDIO FOOTER */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-white border border-[#E6E0D6] grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 p-6 sm:p-10 bg-[#F2EFE9]/50 border-b lg:border-b-0 lg:border-r border-[#E6E0D6] space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-[#8C6D46] font-medium">Direct Studio Support</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
                Questions or Custom Gift Orders?
              </h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                Reach out regarding ring sizing, bulk gift sets, or payment verification. Our studio replies within 24 hours.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E6E0D6] text-xs text-[#57534E]">
              {(settings.contactPhone || settings.contactEmail) && (
                <div>
                  <p className="font-semibold text-[#1C1917]">Studio Contact</p>
                  {settings.contactPhone && (
                    <p className="mt-0.5">
                      Mobile: <span className="font-mono text-[#1C1917]">{settings.contactPhone}</span>
                    </p>
                  )}
                  {settings.contactEmail && (
                    <p>
                      Email: <span className="text-[#1C1917]">{settings.contactEmail}</span>
                    </p>
                  )}
                </div>
              )}
              <div>
                <p className="font-semibold text-[#1C1917]">Accepted E-Wallets (Exact Amount)</p>
                <p className="mt-0.5">
                  GCash: <span className="font-mono text-[#1C1917]">{settings.gcashNumber}</span>
                </p>
                <p>
                  Maya: <span className="font-mono text-[#1C1917]">{settings.mayaNumber}</span>
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1C1917]">J&amp;T Express Shipping (From Jaro, Iloilo City)</p>
                <p className="mt-0.5 leading-relaxed">
                  Visayas ₱85 (1–2 days) · NCR &amp; Luzon ₱100 (3–4 days) · Mindanao ₱105 (3–4 days) · Islands ₱115 (5–6 days). Free nationwide on orders ₱1,500+.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1C1917]">Studio Hours</p>
                <p className="mt-0.5">
                  {settings.studioHours || 'Monday – Saturday · 9:00 AM – 6:00 PM PHT'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="lg:col-span-7 p-6 sm:p-10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1917]">
              <Mail className="w-4 h-4 text-[#8C6D46]" />
              <span>Send a Message</span>
            </div>

            {contactSuccess && (
              <div className="bg-[#14532D]/10 border border-[#14532D]/30 p-3.5 text-xs text-[#14532D] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your inquiry has been received. Thank you for contacting SAB Jewelry.</span>
              </div>
            )}
            {contactError && <p className="text-xs text-[#7F1D1D]">{contactError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Name *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={FIELD_LIMITS.NAME_MAX}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-11 px-3 border border-[#E6E0D6] text-sm focus:outline-none focus:border-[#1C1917]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#57534E] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  maxLength={160}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3 border border-[#E6E0D6] text-sm focus:outline-none focus:border-[#1C1917]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#57534E] mb-1">Subject *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={140}
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Order inquiry, sizing question, or custom request"
                className="w-full h-11 px-3 border border-[#E6E0D6] text-sm focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#57534E] mb-1">Message *</label>
              <textarea
                rows={4}
                required
                minLength={5}
                maxLength={1500}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help?"
                className="w-full px-3 py-2.5 border border-[#E6E0D6] text-sm focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <button
              type="submit"
              disabled={submittingContact}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingContact ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Clean Editorial Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 border-t border-[#E6E0D6] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold text-[#1C1917]">
            {settings.storeName || 'SAB Jewelry'}
          </span>
          <span aria-hidden="true">·</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#catalog" className="hover:text-[#1C1917] transition-colors">
            Catalog
          </a>
          <a href="#reviews" className="hover:text-[#1C1917] transition-colors">
            Reviews
          </a>
          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            Track Order
          </button>
          <a href="#contact" className="hover:text-[#1C1917] transition-colors">
            Contact
          </a>
          <button
            type="button"
            onClick={onOpenOwnerPortal}
            className="font-medium text-[#8C6D46] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            {isOwner ? 'Admin Dashboard' : 'Owner / Admin Login'}
          </button>
        </div>
      </footer>
    </div>
  );
}
