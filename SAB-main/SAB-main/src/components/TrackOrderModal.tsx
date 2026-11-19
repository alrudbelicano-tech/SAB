import { Package, Search, X } from 'lucide-react';
import { useState } from 'react';
import { lookupOrderTracking } from '../services/storeService';
import type { OrderTracking } from '../types';
import { formatFirestoreDate, formatPHP } from '../utils/format';

interface TrackOrderModalProps {
  isOpen: boolean;
  recentOrderNumbers: string[];
  onClose: () => void;
}

export function TrackOrderModal({
  isOpen,
  recentOrderNumbers,
  onClose,
}: TrackOrderModalProps) {
  const [queryOrderNumber, setQueryOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<OrderTracking | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!isOpen) return null;

  const handleLookup = async (orderNumber: string) => {
    const clean = orderNumber.trim().toUpperCase();
    if (!clean) return;
    setQueryOrderNumber(clean);
    setLoading(true);
    setNotFound(false);
    setTrackingResult(null);
    try {
      const result = await lookupOrderTracking(clean);
      if (result) {
        setTrackingResult(result);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-order-title"
    >
      <div className="bg-[#FAF8F5] w-full max-w-lg border border-[#E6E0D6]">
        <div className="px-6 py-4 bg-white border-b border-[#E6E0D6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-[#1C1917]" />
            <h2 id="track-order-title" className="font-display text-2xl font-semibold text-[#1C1917]">
              Track Your Order
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order tracker"
            className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-[#57534E] leading-relaxed">
            Enter your SAB Jewelry Order Number (for example <span className="font-mono text-[#1C1917]">SAB-482910</span>) to check live fulfillment status—no sign-in needed.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleLookup(queryOrderNumber);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              required
              value={queryOrderNumber}
              onChange={(e) => setQueryOrderNumber(e.target.value)}
              placeholder="SAB-123456"
              className="flex-1 h-11 px-3 bg-white border border-[#E6E0D6] font-mono text-sm uppercase text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 h-11 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? 'Checking...' : 'Check Status'}</span>
            </button>
          </form>

          {recentOrderNumbers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[#78716C]">Recent orders from this browser:</p>
              <div className="flex flex-wrap gap-2">
                {recentOrderNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => void handleLookup(num)}
                    className="px-3 py-1.5 bg-white border border-[#E6E0D6] font-mono text-xs text-[#1C1917] hover:border-[#1C1917] cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {notFound && (
            <div className="bg-white border border-[#E6E0D6] p-4 text-xs text-[#7F1D1D]">
              Order <span className="font-mono font-semibold">{queryOrderNumber}</span> was not found. Please verify your Order Number.
            </div>
          )}

          {trackingResult && (
            <div className="bg-white border border-[#E6E0D6] p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#F2EFE9]">
                <div>
                  <p className="font-mono text-sm font-semibold text-[#1C1917]">
                    {trackingResult.orderNumber}
                  </p>
                  <p className="text-xs text-[#78716C]">
                    Placed {formatFirestoreDate(trackingResult.createdAt)} <span aria-hidden="true">·</span>{' '}
                    {trackingResult.paymentMethod}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    trackingResult.status === 'Pending Verification'
                      ? 'text-[#8C6D46]'
                      : trackingResult.status === 'Cancelled'
                      ? 'text-[#7F1D1D]'
                      : 'text-[#14532D]'
                  }`}
                >
                  Status: {trackingResult.status}
                </span>
              </div>
              {trackingResult.status === 'Pending Verification' && (
                <p className="text-[11px] text-[#8C6D46] bg-[#FAF8F5] border border-[#E6E0D6] px-3 py-2">
                  Owner is verifying your GCash/Maya reference number and receipt before packing.
                </p>
              )}
              <p className="text-xs text-[#57534E] leading-relaxed">{trackingResult.itemSummary}</p>
              {trackingResult.estimatedDelivery && (
                <div className="flex justify-between text-xs pt-2 border-t border-[#F2EFE9]">
                  <span className="text-[#78716C]">Est. Delivery (J&amp;T Express)</span>
                  <span className="font-medium text-[#1C1917]">
                    {trackingResult.estimatedDelivery}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-2 border-t border-[#F2EFE9]">
                <span className="text-[#78716C]">Exact Amount Paid</span>
                <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                  {formatPHP(trackingResult.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
