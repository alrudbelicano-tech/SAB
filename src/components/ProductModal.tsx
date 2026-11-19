import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Play,
  Plus,
  ShieldCheck,
  X,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '../types';
import { formatPHP, getYouTubeEmbedUrl, parseSizeOptions } from '../utils/format';
import { ImageWithFallback } from './ImageWithFallback';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedSize: string) => void;
}

type MediaGalleryItem =
  | { type: 'image'; url: string; label: string }
  | { type: 'video'; url: string; label: string };

export function ProductModal({ product, onClose, onAddToCart }: ProductModalProps) {
  const sizeOptions = useMemo(() => parseSizeOptions(product?.sizes), [product?.sizes]);

  const mediaItems: MediaGalleryItem[] = useMemo(() => {
    if (!product) return [];
    const items: MediaGalleryItem[] = [];
    const imageUrls = [product.imageUrl, product.imageUrl2, product.imageUrl3]
      .map((u) => (u || '').trim())
      .filter(Boolean);
    imageUrls.forEach((url, idx) => {
      items.push({ type: 'image', url, label: `Photo ${idx + 1}` });
    });
    if (product.videoUrl?.trim()) {
      items.push({ type: 'video', url: product.videoUrl.trim(), label: 'Video' });
    }
    return items;
  }, [product]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveMediaIndex(0);
    setSelectedSize('');
    setQuantity(1);
    setAddedFeedback(false);
    setZoomedImageUrl(null);
    requestAnimationFrame(() => {
      modalScrollRef.current?.scrollTo({ top: 0 });
    });
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImageUrl) {
          setZoomedImageUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, zoomedImageUrl, onClose]);

  if (!product) return null;

  const safeIndex = activeMediaIndex < mediaItems.length ? activeMediaIndex : 0;
  const activeMedia = mediaItems[safeIndex] || {
    type: 'image' as const,
    url: product.imageUrl,
    label: 'Photo 1',
  };

  const activeSize =
    selectedSize && sizeOptions.includes(selectedSize) ? selectedSize : sizeOptions[0];
  const isSoldOut = product.stock <= 0;
  const maxQty = Math.max(1, product.stock);

  const handleAdd = () => {
    if (isSoldOut) return;
    onAddToCart(product, Math.min(quantity, product.stock), activeSize);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  const handlePrevMedia = () => {
    setActiveMediaIndex((idx) => (idx - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleNextMedia = () => {
    setActiveMediaIndex((idx) => (idx + 1) % mediaItems.length);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div
        ref={modalScrollRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F5] w-full max-w-4xl max-h-screen sm:max-h-[92vh] overflow-y-auto overscroll-contain border border-[#E6E0D6] relative flex flex-col"
      >
        {/* Sticky Mobile Back Navigation Bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-[#E6E0D6] px-4 py-3 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1C1917] hover:text-[#8C6D46] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main View</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="w-9 h-9 bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="hidden md:flex absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 border border-[#E6E0D6] items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 flex-1">
          {/* Left: Multi-Photo & Video Gallery */}
          <div className="bg-[#F2EFE9] flex flex-col border-b md:border-b-0 md:border-r border-[#E6E0D6]">
          <div className="relative aspect-[4/3] md:aspect-auto md:flex-1 md:min-h-[380px] bg-[#F2EFE9] overflow-hidden flex items-center justify-center">
            {activeMedia.type === 'image' ? (
              <button
                type="button"
                onClick={() => setZoomedImageUrl(activeMedia.url)}
                aria-label={`Zoom ${product.name} ${activeMedia.label}`}
                className="relative w-full h-full cursor-zoom-in group focus:outline-none"
              >
                <ImageWithFallback
                  src={activeMedia.url}
                  alt={`${product.name} — ${activeMedia.label}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-[#1C1917]/75 text-[#FAF8F5] text-[11px] font-medium">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Tap to zoom</span>
                </span>
              </button>
            ) : (
              (() => {
                const ytEmbed = getYouTubeEmbedUrl(activeMedia.url);
                if (ytEmbed) {
                  return (
                    <iframe
                      src={ytEmbed}
                      title={`${product.name} showcase video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full min-h-[260px] bg-[#1C1917]"
                    />
                  );
                }
                return (
                  <video
                    key={activeMedia.url}
                    src={activeMedia.url}
                    controls
                    playsInline
                    autoPlay
                    className="w-full h-full max-h-[460px] object-contain bg-[#1C1917]"
                  />
                );
              })()
            )}

            {mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  aria-label="Previous photo or video"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMedia}
                  aria-label="Next photo or video"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {mediaItems.length > 1 && (
            <div className="p-3 bg-white border-t border-[#E6E0D6] flex items-center gap-2.5 overflow-x-auto">
              {mediaItems.map((item, index) => {
                const isActive = index === safeIndex;
                return (
                  <button
                    key={`${item.type}_${index}`}
                    type="button"
                    onClick={() => setActiveMediaIndex(index)}
                    aria-label={`View ${item.label}`}
                    className={`relative w-16 h-16 shrink-0 overflow-hidden border-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#1C1917]'
                        : 'border-[#E6E0D6] opacity-75 hover:opacity-100'
                    }`}
                  >
                    {item.type === 'image' ? (
                      <ImageWithFallback
                        src={item.url}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1C1917] text-[#FAF8F5] flex flex-col items-center justify-center gap-0.5">
                        <Play className="w-4 h-4 fill-current" />
                        <span className="text-[10px] font-medium">Video</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="p-6 sm:p-10 pb-24 md:pb-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#78716C]">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{product.finish}</span>
              {product.discountPercent > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8C6D46] font-medium">Save {product.discountPercent}%</span>
                </>
              )}
            </div>

            <h2
              id="pdp-title"
              className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight"
            >
              {product.name}
            </h2>

            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xl font-semibold text-[#1C1917] tabular-nums">
                {formatPHP(product.salePrice)}
              </span>
              {product.regularPrice > product.salePrice && (
                <span className="font-mono text-sm text-[#78716C] line-through tabular-nums">
                  {formatPHP(product.regularPrice)}
                </span>
              )}
            </div>

            <p className="text-sm text-[#57534E] leading-relaxed">{product.description}</p>

            <div className="border-t border-[#E6E0D6] pt-4 space-y-2 text-xs text-[#57534E]">
              <p>
                <span className="font-medium text-[#1C1917]">Material:</span> {product.material}
              </p>
              {product.careNote && (
                <p>
                  <span className="font-medium text-[#1C1917]">Care:</span> {product.careNote}
                </p>
              )}
              <p className="tabular-nums">
                <span className="font-medium text-[#1C1917]">Availability:</span>{' '}
                {isSoldOut ? (
                  <span className="text-[#7F1D1D] font-medium">Currently Sold Out</span>
                ) : product.stock <= 5 ? (
                  <span className="text-[#8C6D46] font-medium">
                    Low Stock — {product.stock} remaining
                  </span>
                ) : (
                  <span>In Stock ({product.stock} available)</span>
                )}
              </p>
            </div>

            {/* Size / Variant Selector */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#1C1917]">
                  Available Sizes / Fit *
                </label>
                <span className="text-[11px] text-[#78716C]">
                  {sizeOptions.length === 1
                    ? 'Standard fit'
                    : `${sizeOptions.length} sizes available`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((option) => {
                  const selected = activeSize === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedSize(option)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selected
                          ? 'bg-[#1C1917] text-[#FAF8F5] border-[#1C1917]'
                          : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#1C1917]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E6E0D6]">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#E6E0D6] bg-white">
                <button
                  type="button"
                  disabled={isSoldOut || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-11 h-11 flex items-center justify-center text-[#1C1917] disabled:opacity-40 hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums">{quantity}</span>
                <button
                  type="button"
                  disabled={isSoldOut || quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  aria-label="Increase quantity"
                  className="w-11 h-11 flex items-center justify-center text-[#1C1917] disabled:opacity-40 hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={isSoldOut}
                onClick={handleAdd}
                className="flex-1 h-11 px-6 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] disabled:bg-[#D6D3D1] disabled:text-[#78716C] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added ({activeSize})</span>
                  </>
                ) : isSoldOut ? (
                  <span>Sold Out</span>
                ) : (
                  <span>Add to Bag · {formatPHP(product.salePrice * quantity)}</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#78716C]">
              <ShieldCheck className="w-4 h-4 text-[#8C6D46] shrink-0" />
              <span>Exact-amount verified checkout via GCash &amp; Maya App</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="md:hidden w-full h-11 px-5 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Main View</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Tap-to-Zoom Product Picture Lightbox */}
      {zoomedImageUrl && (
        <div
          onClick={() => setZoomedImageUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product photo"
          className="fixed inset-0 z-[70] bg-[#1C1917]/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white border border-[#E6E0D6] p-3 sm:p-4 max-w-2xl w-full flex flex-col items-center space-y-2.5 cursor-default"
          >
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              aria-label="Close zoomed photo"
              className="absolute top-2.5 right-2.5 w-9 h-9 bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <ImageWithFallback
              src={zoomedImageUrl}
              alt={`${product.name} enlarged view`}
              className="w-full max-h-[75vh] object-contain bg-[#FAF8F5]"
            />
            <p className="text-[11px] text-[#78716C]">Tap outside the picture to return</p>
          </div>
        </div>
      )}
    </div>
  );
}
