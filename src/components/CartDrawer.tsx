import { useEffect } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  SHIPPING_ORIGIN,
  getFreeShippingThreshold,
} from '../data/shipping';
import type { CartItem, SiteSettings } from '../types';
import { formatPHP, parseSizeOptions } from '../utils/format';
import { ImageWithFallback } from './ImageWithFallback';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  settings: SiteSettings;
  onClose: () => void;
  onUpdateQuantity: (productId: string, selectedSize: string, nextQty: number) => void;
  onUpdateSize: (productId: string, oldSize: string, newSize: string) => void;
  onRemoveItem: (productId: string, selectedSize: string) => void;
  onProceedToCheckout: () => void;
}

function formatShortPeso(amount: number): string {
  return Number.isInteger(amount)
    ? `₱${amount.toLocaleString('en-PH')}`
    : formatPHP(amount);
}

export function CartDrawer({
  isOpen,
  items,
  settings,
  onClose,
  onUpdateQuantity,
  onUpdateSize,
  onRemoveItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const threshold = getFreeShippingThreshold(
    settings.freeShippingThreshold || DEFAULT_FREE_SHIPPING_THRESHOLD
  );
  const qualifiesFreeShipping = subtotal >= threshold;
  const remainingForFreeShipping = Math.max(0, Number((threshold - subtotal).toFixed(2)));
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/50 backdrop-blur-xs flex justify-end overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md bg-[#FAF8F5] h-full border-l border-[#E6E0D6] overflow-y-auto overscroll-contain ${
          items.length === 0 ? 'flex flex-col' : 'pb-24 sm:pb-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Section: Header + Free Shipping + Always-Visible Proceed to Checkout */}
        <div className="sticky top-0 z-10 bg-[#FAF8F5]">
          <div className="px-5 sm:px-6 py-3 sm:py-4 border-b border-[#E6E0D6] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShoppingBag className="w-5 h-5 text-[#1C1917] shrink-0" />
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917] truncate">
                Your Bag {totalCount > 0 ? `(${totalCount})` : ''}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shopping bag"
              className="w-9 h-9 bg-white border border-[#E6E0D6] flex items-center justify-center text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {items.length > 0 && (
            <>
              {/* Free Nationwide Shipping Progress Banner */}
              <div className="px-5 sm:px-6 py-2 sm:py-2.5 bg-[#F2EFE9] border-b border-[#E6E0D6] space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Truck
                    className={`w-4 h-4 shrink-0 ${
                      qualifiesFreeShipping ? 'text-[#14532D]' : 'text-[#8C6D46]'
                    }`}
                  />
                  {qualifiesFreeShipping ? (
                    <span className="text-[#14532D] font-semibold">
                      FREE Nationwide Shipping unlocked! (Orders {formatShortPeso(threshold)}+)
                    </span>
                  ) : (
                    <span className="text-[#57534E]">
                      Add{' '}
                      <strong className="font-mono font-semibold text-[#1C1917] tabular-nums">
                        {formatShortPeso(remainingForFreeShipping)}
                      </strong>{' '}
                      more to unlock <strong className="text-[#1C1917]">FREE Nationwide Shipping!</strong>
                    </span>
                  )}
                </div>
                <div
                  className="w-full h-1.5 bg-[#E6E0D6] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Free shipping progress"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      qualifiesFreeShipping ? 'bg-[#14532D]' : 'bg-[#8C6D46]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Pinned Checkout Bar (always visible even with many items) */}
              <div className="px-5 sm:px-6 py-2.5 bg-white border-b border-[#E6E0D6] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#57534E]">
                    Subtotal ({totalCount} {totalCount === 1 ? 'item' : 'items'})
                  </span>
                  <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                    {formatPHP(subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="w-full h-10 sm:h-11 px-5 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Item List */}
        <div
          className={
            items.length === 0
              ? 'flex-1 px-5 sm:px-6 py-5'
              : 'px-5 sm:px-6 py-4 space-y-4'
          }
        >
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <ShoppingBag className="w-8 h-8 text-[#A8A29E] stroke-[1.25]" />
              <p className="font-display text-2xl text-[#1C1917]">Your bag is empty</p>
              <p className="text-sm text-[#78716C] max-w-xs">
                Explore our curated stainless finished steel jewelry pieces to begin.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] transition-colors cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            items.map((item) => {
              const sizeOptions = parseSizeOptions(item.product.sizes);
              const selectOptions = sizeOptions.includes(item.selectedSize)
                ? sizeOptions
                : [item.selectedSize, ...sizeOptions];

              return (
                <div
                  key={`${item.product.id}_${item.selectedSize}`}
                  className="flex gap-3.5 pb-4 border-b border-[#E6E0D6] last:border-b-0 last:pb-0"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F2EFE9] shrink-0 overflow-hidden">
                    <ImageWithFallback
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-[#1C1917] leading-snug line-clamp-2">
                        {item.product.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                        aria-label={`Remove ${item.product.name}`}
                        className="p-1 text-[#78716C] hover:text-[#7F1D1D] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                      <span>{item.product.finish}</span>
                      <span aria-hidden="true">·</span>
                      {selectOptions.length > 1 ? (
                        <select
                          aria-label={`Select size for ${item.product.name}`}
                          value={item.selectedSize}
                          onChange={(e) =>
                            onUpdateSize(item.product.id, item.selectedSize, e.target.value)
                          }
                          className="h-7 px-2 bg-white border border-[#E6E0D6] text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917] cursor-pointer"
                        >
                          {selectOptions.map((size) => (
                            <option key={size} value={size}>
                              Size: {size}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{item.selectedSize}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center border border-[#E6E0D6] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.selectedSize, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#1C1917] hover:bg-[#F2EFE9] cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.product.stock}
                          onClick={() =>
                            onUpdateQuantity(item.product.id, item.selectedSize, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#1C1917] disabled:opacity-40 hover:bg-[#F2EFE9] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-mono text-sm font-medium text-[#1C1917] tabular-nums">
                        {formatPHP(item.product.salePrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary & Checkout Action */}
        {items.length > 0 && (
          <div className="p-4 sm:p-6 bg-white border-t border-[#E6E0D6] space-y-3">
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between text-[#57534E]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-[#1C1917]">{formatPHP(subtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline text-[#57534E]">
                <span>J&amp;T Express Shipping</span>
                {qualifiesFreeShipping ? (
                  <span className="font-mono text-xs font-semibold text-[#14532D]">
                    FREE Nationwide
                  </span>
                ) : (
                  <span className="font-mono text-xs tabular-nums text-[#1C1917]">
                    ₱85 – ₱115 by region
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#78716C] leading-snug">
                Ships from {SHIPPING_ORIGIN}. Exact rate &amp; delivery ETA calculated at checkout.
              </p>
              <div className="flex justify-between pt-2 border-t border-[#E6E0D6] font-medium text-[#1C1917]">
                <span>{qualifiesFreeShipping ? 'Total Due' : 'Subtotal (excl. shipping)'}</span>
                <span className="font-mono text-base font-semibold tabular-nums">
                  {formatPHP(subtotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full h-11 sm:h-12 px-6 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
