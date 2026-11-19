import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  PROVINCE_OPTIONS,
  SHIPPING_COURIER,
  SHIPPING_ORIGIN,
  SHIPPING_ZONE_LIST,
  calculateShippingQuote,
} from '../data/shipping';
import { placeOrderWithExactPayment } from '../services/storeService';
import {
  FIELD_LIMITS,
  type CartItem,
  type Order,
  type PaymentMethod,
  type SiteSettings,
} from '../types';
import { compressImageFile, formatPHP, validatePaymentReference } from '../utils/format';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  settings: SiteSettings;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export function CheckoutModal({
  isOpen,
  items,
  settings,
  onClose,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GCash');
  const [paymentReference, setPaymentReference] = useState('');
  const [confirmPaymentReference, setConfirmPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState('');

  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string; caption?: string } | null>(
    null
  );
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setCompletedOrder(null);
      setZoomedImage(null);
      requestAnimationFrame(() => {
        modalScrollRef.current?.scrollTo({ top: 0 });
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (completedOrder) {
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [completedOrder]);

  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  const quote = calculateShippingQuote(
    subtotal,
    selectedProvinceId,
    settings.freeShippingThreshold
  );

  const hasSelectedRegion = Boolean(quote.province && quote.zone);
  const effectiveShippingFee = quote.isFreeShipping
    ? 0
    : quote.shippingFee !== null
    ? quote.shippingFee
    : null;
  const totalAmount =
    effectiveShippingFee !== null ? Number((subtotal + effectiveShippingFee).toFixed(2)) : null;

  const parsedAmountPaid = Number.parseFloat(amountPaidInput);
  const hasEnteredAmount = amountPaidInput.trim() !== '' && Number.isFinite(parsedAmountPaid);
  const amountDiff =
    hasEnteredAmount && totalAmount !== null
      ? Number((parsedAmountPaid - totalAmount).toFixed(2))
      : 0;
  const isExactAmount =
    hasSelectedRegion &&
    totalAmount !== null &&
    hasEnteredAmount &&
    Math.abs(amountDiff) < 0.001;

  const refValidation = validatePaymentReference(paymentMethod, paymentReference);
  const hasEnteredRef = paymentReference.trim().length > 0;
  const normalizedConfirmRef = confirmPaymentReference.replace(/[\s-]+/g, '').toUpperCase();
  const hasEnteredConfirmRef = confirmPaymentReference.trim().length > 0;
  const refsMatch =
    refValidation.valid &&
    hasEnteredConfirmRef &&
    refValidation.normalized === normalizedConfirmRef;

  const isCheckoutReady =
    hasSelectedRegion &&
    totalAmount !== null &&
    isExactAmount &&
    refValidation.valid &&
    refsMatch &&
    Boolean(paymentProofUrl);

  const submitButtonLabel = submitting
    ? 'Verifying & Submitting Order...'
    : !hasSelectedRegion || totalAmount === null
    ? 'Select Delivery Region First'
    : !refValidation.valid
    ? `Enter Valid ${paymentMethod} Reference No.`
    : !refsMatch
    ? `Confirm ${paymentMethod} Reference No.`
    : !paymentProofUrl
    ? `Upload ${paymentMethod} Receipt Screenshot`
    : !isExactAmount
    ? `Enter Exact ${formatPHP(totalAmount)} to Finish`
    : `Complete ${paymentMethod} Order`;

  const submitHelperText =
    totalAmount !== null
      ? `Requires exact ${formatPHP(totalAmount)}, verified ${paymentMethod} reference confirmation, and receipt screenshot.`
      : 'Choose your province in Step 01 to calculate J&T Express shipping from Jaro, Iloilo City.';

  const merchantAccountName =
    paymentMethod === 'GCash' ? settings.gcashAccountName : settings.mayaAccountName;
  const merchantNumber =
    paymentMethod === 'GCash' ? settings.gcashNumber : settings.mayaNumber;
  const merchantQrUrl =
    paymentMethod === 'GCash' ? settings.gcashQrUrl || '' : settings.mayaQrUrl || '';

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(merchantNumber.replace(/\s+/g, ''));
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleReceiptProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingProof(true);
    setError('');
    try {
      const compressed = await compressImageFile(file, 900, 0.78, 220000);
      setPaymentProofUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process receipt screenshot.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (customerName.trim().length < FIELD_LIMITS.NAME_MIN) {
      setError('Please enter your full name for delivery.');
      return;
    }

    if (customerPhone.trim().length < FIELD_LIMITS.PHONE_MIN) {
      setError('Please enter a valid mobile number.');
      return;
    }

    if (!quote.province || !quote.zone || effectiveShippingFee === null || totalAmount === null) {
      setError('Please select your delivery region / province to calculate shipping and total.');
      return;
    }

    if (shippingAddress.trim().length < FIELD_LIMITS.ADDRESS_MIN) {
      setError('Please enter your complete street/barangay delivery address.');
      return;
    }

    if (!refValidation.valid) {
      setError(
        refValidation.error ||
          `Please enter a valid ${paymentMethod} reference number from your receipt.`
      );
      return;
    }

    if (!refsMatch) {
      setError(
        `Your ${paymentMethod} reference numbers do not match. Please re-enter the exact Reference No. carefully.`
      );
      return;
    }

    if (!paymentProofUrl) {
      setError(
        `Please upload a screenshot of your ${paymentMethod} receipt showing the reference number and exact amount paid.`
      );
      return;
    }

    // Strict exact-amount gate
    if (!hasEnteredAmount) {
      setError(
        `Please enter the exact amount paid (${formatPHP(totalAmount)}) from your ${paymentMethod} receipt.`
      );
      return;
    }

    if (!isExactAmount) {
      const discrepancy =
        amountDiff < 0
          ? `short by ${formatPHP(Math.abs(amountDiff))}`
          : `over by ${formatPHP(amountDiff)}`;
      setError(
        `Order cannot be finished: Exact amount required (${formatPHP(totalAmount)}). Your entered amount (${formatPHP(parsedAmountPaid)}) is ${discrepancy}.`
      );
      return;
    }

    const combinedAddress = shippingAddress
      .trim()
      .toLowerCase()
      .includes(quote.province.name.split('(')[0].trim().toLowerCase())
      ? shippingAddress.trim()
      : `${shippingAddress.trim()}, ${quote.province.name}`;

    setSubmitting(true);
    try {
      const created = await placeOrderWithExactPayment({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: combinedAddress,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        paymentProofUrl,
        amountPaid: parsedAmountPaid,
        subtotal,
        shippingFee: effectiveShippingFee,
        shippingZone: quote.zone.label,
        shippingProvince: quote.province.name,
        estimatedDelivery: quote.zone.estimatedDays,
        totalAmount,
        items,
        notes: notes.trim() || undefined,
      });
      setCompletedOrder(created);
      onOrderSuccess(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div
        ref={modalScrollRef}
        className="bg-[#FAF8F5] w-full max-w-4xl max-h-screen sm:max-h-[90vh] overflow-y-auto overscroll-contain border border-[#E6E0D6] flex flex-col"
      >
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-white border-b border-[#E6E0D6] flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-[#8C6D46] shrink-0" />
            <h2
              id="checkout-title"
              className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917] truncate"
            >
              {completedOrder ? 'Order Submitted for Verification' : 'Express Checkout'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-9 h-9 bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completed Order Receipt */}
        {completedOrder ? (
          <div className="p-5 sm:p-10 pb-24 sm:pb-10 max-w-2xl mx-auto w-full space-y-6">
            <div className="bg-white border border-[#E6E0D6] p-6 sm:p-8 space-y-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#14532D] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#8C6D46] font-medium">
                    Pending Owner Reference Check <span aria-hidden="true">·</span> {completedOrder.paymentMethod}
                  </p>
                  <h3 className="font-display text-3xl font-semibold text-[#1C1917] mt-1">
                    Order {completedOrder.orderNumber} Received
                  </h3>
                  <p className="text-sm text-[#57534E] mt-1">
                    Thank you, {completedOrder.customerName}. Your receipt and reference number have been submitted. Our owner will verify your {completedOrder.paymentMethod} transfer before packing. Save your Order Number{' '}
                    <strong className="font-mono text-[#1C1917]">{completedOrder.orderNumber}</strong>{' '}
                    to track updates anytime under Track Order.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E6E0D6] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#78716C]">Payment Reference</p>
                  <p className="font-mono font-medium text-[#1C1917] mt-0.5">
                    {completedOrder.paymentReference}
                  </p>
                </div>
                <div>
                  <p className="text-[#78716C]">Amount Submitted</p>
                  <p className="font-mono font-semibold text-[#14532D] mt-0.5 tabular-nums">
                    {formatPHP(completedOrder.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-[#78716C]">Courier &amp; Shipping Fee</p>
                  <p className="text-[#1C1917] mt-0.5">
                    J&amp;T Express ({completedOrder.shippingZone || 'Standard'}) ·{' '}
                    <span className="font-mono font-medium">
                      {completedOrder.shippingFee === 0
                        ? 'FREE'
                        : formatPHP(completedOrder.shippingFee)}
                    </span>
                  </p>
                </div>
                {completedOrder.estimatedDelivery && (
                  <div>
                    <p className="text-[#78716C]">Estimated Delivery</p>
                    <p className="font-medium text-[#1C1917] mt-0.5">
                      {completedOrder.estimatedDelivery}
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-[#78716C]">Delivery Address</p>
                  <p className="text-[#1C1917] mt-0.5">
                    {completedOrder.customerPhone} <span aria-hidden="true">·</span>{' '}
                    {completedOrder.shippingAddress}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E6E0D6] pt-4 space-y-2.5">
                <p className="text-xs font-medium text-[#1C1917]">Items Ordered</p>
                {completedOrder.items.map((item) => (
                  <div
                    key={`${item.productId}_${item.selectedSize}`}
                    className="flex justify-between text-sm text-[#57534E]"
                  >
                    <span>
                      {item.quantity} × {item.name} ({item.selectedSize})
                    </span>
                    <span className="font-mono tabular-nums text-[#1C1917]">
                      {formatPHP(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#E6E0D6] text-sm font-semibold text-[#1C1917]">
                  <span>Total Submitted</span>
                  <span className="font-mono tabular-nums">{formatPHP(completedOrder.totalAmount)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] transition-colors cursor-pointer"
              >
                Continue Exploring SAB Jewelry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-12 pb-24 lg:pb-0">
            {/* Step 1: Shipping Details (Always first at top on mobile & desktop) */}
            <section className="order-1 lg:order-none lg:col-span-7 lg:col-start-1 lg:row-start-1 p-5 sm:p-8 pb-6 space-y-3.5 border-b border-[#E6E0D6] lg:border-r">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1917]">
                    01. Shipping &amp; Contact Details
                  </h3>
                  <span className="text-xs text-[#78716C]">No account required</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.NAME_MAX}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Maria Clara Santos"
                      className="w-full h-11 px-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={FIELD_LIMITS.PHONE_MAX}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0917 123 4567"
                      className="w-full h-11 px-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Email Address (Recommended — for J&amp;T Express shipping updates)
                  </label>
                  <input
                    type="email"
                    maxLength={160}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>

                {/* Region / Province Selector for J&T Express Shipping */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#1C1917]">
                    Delivery Region / Province (J&amp;T Express from Jaro, Iloilo City) *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#8C6D46] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      required
                      aria-label="Delivery Region or Province"
                      value={selectedProvinceId}
                      onChange={(e) => setSelectedProvinceId(e.target.value)}
                      className="w-full h-11 pl-9 pr-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917] cursor-pointer"
                    >
                      <option value="">Select your region / province...</option>
                      {SHIPPING_ZONE_LIST.map((zone) => (
                        <optgroup
                          key={zone.id}
                          label={`${zone.label} — ₱${zone.fee} · ${zone.estimatedDays}`}
                        >
                          {PROVINCE_OPTIONS.filter((p) => p.zoneId === zone.id).map((prov) => (
                            <option key={prov.id} value={prov.id}>
                              {prov.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Shipping Rate & Delivery ETA Card */}
                  {quote.zone && quote.province ? (
                    <div className="bg-[#F2EFE9] border border-[#E6E0D6] p-3.5 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#1C1917]">
                          <Truck className="w-3.5 h-3.5 text-[#8C6D46]" />
                          <span>{quote.zone.label}</span>
                        </span>
                        {quote.isFreeShipping ? (
                          <span className="font-mono font-semibold text-[#14532D]">
                            FREE{' '}
                            <span className="line-through text-[#78716C] font-normal ml-1">
                              {formatPHP(quote.zone.fee)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                            {formatPHP(quote.zone.fee)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[#57534E]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#8C6D46]" />
                          <span>
                            Estimated Delivery:{' '}
                            <strong className="text-[#1C1917]">{quote.zone.estimatedDays}</strong>
                          </span>
                        </span>
                        <span className="text-[11px] text-[#78716C]">{SHIPPING_COURIER}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E6E0D6] p-3 text-[11px] text-[#57534E] space-y-1.5">
                      <p className="font-medium text-[#1C1917]">
                        J&amp;T Express Rates from {SHIPPING_ORIGIN} (≤ 500g):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {SHIPPING_ZONE_LIST.map((z) => (
                          <div key={z.id} className="flex justify-between">
                            <span>{z.shortLabel}:</span>
                            <span className="font-mono text-[#1C1917]">
                              ₱{z.fee} · {z.estimatedDays}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Street, House/Unit No., Barangay &amp; City *
                  </label>
                  <textarea
                    required
                    rows={2}
                    maxLength={FIELD_LIMITS.ADDRESS_MAX}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="House/Unit No., Street, Barangay, City/Municipality, Postal Code"
                    className="w-full px-3 py-2.5 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Gift / Delivery Note (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={FIELD_LIMITS.ADDRESS_MAX}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional gift card message or landmark"
                    className="w-full h-11 px-3 bg-white border border-[#E6E0D6] text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
            </section>

            {/* Order Summary (Shown right after Step 01 on mobile before Step 02, and sticky right on desktop) */}
            <div className="order-2 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 bg-white p-5 sm:p-8 border-b lg:border-b-0 border-[#E6E0D6] flex flex-col justify-between space-y-6 lg:sticky lg:top-[73px] lg:self-start">
              <div className="space-y-4">
                <h3 className="font-display text-xl font-semibold text-[#1C1917]">Order Summary</h3>

                {/* Promo Status Callout */}
                <div
                  className={`p-3 border text-xs flex items-center gap-2 ${
                    quote.isFreeShipping
                      ? 'bg-[#14532D]/8 border-[#14532D]/25 text-[#14532D] font-medium'
                      : 'bg-[#FAF8F5] border-[#E6E0D6] text-[#57534E]'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  {quote.isFreeShipping ? (
                    <span>FREE Nationwide Shipping applied (₱{quote.threshold.toLocaleString('en-PH')}+)</span>
                  ) : (
                    <span>
                      Add{' '}
                      <strong className="font-mono text-[#1C1917]">
                        {formatPHP(quote.remainingForFreeShipping)}
                      </strong>{' '}
                      more for FREE Nationwide Shipping
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.product.id}_${item.selectedSize}`}
                      className="flex items-center justify-between gap-3 text-sm pb-3 border-b border-[#F2EFE9]"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#1C1917] truncate">{item.product.name}</p>
                        <p className="text-xs text-[#78716C]">
                          Qty {item.quantity} <span aria-hidden="true">·</span> {item.selectedSize}
                        </p>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-[#1C1917] shrink-0">
                        {formatPHP(item.product.salePrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 text-sm">
                  <div className="flex justify-between text-[#57534E]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums text-[#1C1917]">
                      {formatPHP(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#57534E]">
                    <span>
                      Shipping{' '}
                      {quote.zone ? (
                        <span className="text-xs text-[#78716C]">({quote.zone.shortLabel})</span>
                      ) : null}
                    </span>
                    <span className="font-mono tabular-nums text-[#1C1917]">
                      {quote.isFreeShipping ? (
                        <span className="text-[#14532D] font-semibold">FREE</span>
                      ) : effectiveShippingFee !== null ? (
                        formatPHP(effectiveShippingFee)
                      ) : (
                        <span className="text-xs font-sans text-[#78716C]">Select region</span>
                      )}
                    </span>
                  </div>
                  {quote.estimatedDays && (
                    <div className="flex justify-between text-xs text-[#78716C]">
                      <span>Est. Delivery (J&amp;T Express)</span>
                      <span className="font-medium text-[#1C1917]">{quote.estimatedDays}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-[#E6E0D6] text-base font-semibold text-[#1C1917]">
                    <span>Exact Total Due</span>
                    <span className="font-mono tabular-nums">
                      {totalAmount !== null ? formatPHP(totalAmount) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block space-y-3">
                <button
                  type="submit"
                  disabled={submitting || !isCheckoutReady}
                  className="w-full h-12 px-6 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] disabled:bg-[#D6D3D1] disabled:text-[#78716C] transition-colors cursor-pointer"
                >
                  {submitButtonLabel}
                </button>
                <p className="text-[11px] text-[#78716C] text-center leading-relaxed">
                  {submitHelperText}
                </p>
              </div>
            </div>

            {/* Step 2: GCash / Maya Exact-Amount Payment Gateway + Mobile Submit */}
            <section className="order-3 lg:order-none lg:col-span-7 lg:col-start-1 lg:row-start-2 p-5 sm:p-8 space-y-4 lg:border-r border-[#E6E0D6]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  02. Maya App &amp; GCash App Payment
                </h3>
                <span className="text-xs text-[#8C6D46] font-medium">Exact amount required</span>
              </div>

                {/* Gateway Selector */}
                <div className="grid grid-cols-2 gap-3">
                  {(['GCash', 'Maya'] as PaymentMethod[]).map((method) => {
                    const active = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-4 border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1C1917] text-[#FAF8F5] border-[#1C1917]'
                            : 'bg-white text-[#1C1917] border-[#E6E0D6] hover:border-[#1C1917]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{method} App</span>
                          <Smartphone className="w-4 h-4 opacity-80" />
                        </div>
                        <p className={`text-xs mt-1 ${active ? 'text-[#D6D3D1]' : 'text-[#78716C]'}`}>
                          {method === 'GCash' ? 'Instant e-wallet transfer' : 'Maya Wallet / QR Pay'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Official Merchant Wallet Card */}
                <div className="bg-[#F2EFE9] border border-[#E6E0D6] p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#78716C]">
                        Send exact total via {paymentMethod} App to
                      </p>
                      <p className="text-sm font-semibold text-[#1C1917] mt-0.5">
                        {merchantAccountName}
                      </p>
                      <p className="font-mono text-base font-semibold text-[#1C1917] tabular-nums mt-0.5">
                        {merchantNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                    >
                      {copiedWallet ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#14532D]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Number</span>
                        </>
                      )}
                    </button>
                  </div>

                  {merchantQrUrl ? (
                    <div className="bg-white border border-[#E6E0D6] p-3.5 flex flex-col sm:flex-row items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: merchantQrUrl,
                            alt: `${paymentMethod} QR Code`,
                            caption: `${paymentMethod} · ${merchantAccountName} (${merchantNumber})`,
                          })
                        }
                        aria-label={`Tap to zoom ${paymentMethod} QR code`}
                        className="group relative w-40 h-40 bg-white border border-[#E6E0D6] p-1.5 shrink-0 cursor-zoom-in focus:outline-none focus:border-[#1C1917]"
                      >
                        <img
                          src={merchantQrUrl}
                          alt={`${paymentMethod} QR Code`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-[#1C1917]/80 text-[#FAF8F5] text-[10px] font-medium">
                          <ZoomIn className="w-3 h-3" />
                          <span>Tap to zoom</span>
                        </span>
                      </button>
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="text-xs font-semibold text-[#1C1917]">
                          Scan {paymentMethod} QR to Pay
                        </p>
                        <p className="text-xs text-[#57534E] leading-relaxed">
                          Tap the QR code to enlarge it, scan using your {paymentMethod} App (or send to{' '}
                          <span className="font-mono text-[#1C1917]">{merchantNumber}</span>), then enter your reference number and upload your receipt screenshot below.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#78716C]">
                      Pay via {paymentMethod} mobile number above, then enter your receipt reference number and upload your receipt screenshot below.
                    </p>
                  )}

                  <div className="pt-2 border-t border-[#E6E0D6] flex items-center justify-between text-xs">
                    <span className="text-[#57534E]">Exact Amount Required:</span>
                    <span className="font-mono text-sm font-bold text-[#1C1917] tabular-nums">
                      {totalAmount !== null ? formatPHP(totalAmount) : 'Select region above'}
                    </span>
                  </div>
                </div>

                {/* Strict Reference Number + Confirm Reference + Exact Amount */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#57534E] mb-1">
                        {paymentMethod} Reference No. *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={FIELD_LIMITS.REF_MAX}
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder={
                          paymentMethod === 'GCash' ? 'e.g. 9012 4481 29011' : 'e.g. MAYA-8834120'
                        }
                        className="w-full h-11 px-3 bg-white border border-[#E6E0D6] font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#57534E] mb-1">
                        Confirm {paymentMethod} Reference No. *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={FIELD_LIMITS.REF_MAX}
                        value={confirmPaymentReference}
                        onChange={(e) => setConfirmPaymentReference(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                        placeholder="Re-enter Reference No."
                        className="w-full h-11 px-3 bg-white border border-[#E6E0D6] font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                      />
                    </div>
                  </div>

                  {hasEnteredRef && !refValidation.valid && (
                    <div className="bg-[#7F1D1D]/8 border border-[#7F1D1D]/30 p-3 flex items-start gap-2 text-xs text-[#7F1D1D]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{refValidation.error}</span>
                    </div>
                  )}

                  {refValidation.valid && hasEnteredConfirmRef && !refsMatch && (
                    <div className="bg-[#7F1D1D]/8 border border-[#7F1D1D]/30 p-3 flex items-start gap-2 text-xs text-[#7F1D1D]">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Reference numbers do not match. Please check your receipt digits carefully.</span>
                    </div>
                  )}

                  {refsMatch && (
                    <div className="bg-[#14532D]/8 border border-[#14532D]/30 p-2.5 flex items-center gap-2 text-xs text-[#14532D]">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        {paymentMethod} reference format checked ({refValidation.normalized}).
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="block text-xs text-[#57534E] mb-1">
                        Exact Amount Paid (₱) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        placeholder={totalAmount !== null ? totalAmount.toFixed(2) : 'Select region first'}
                        className="w-full h-11 px-3 bg-white border border-[#E6E0D6] font-mono text-sm text-[#1C1917] tabular-nums focus:outline-none focus:border-[#1C1917]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#57534E] mb-1">
                        {paymentMethod} Receipt Screenshot *
                      </label>
                      <div className="flex items-center gap-2.5">
                        <label className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-3 bg-white border border-[#E6E0D6] text-xs font-medium text-[#1C1917] hover:border-[#1C1917] transition-colors cursor-pointer">
                          <ImagePlus className="w-4 h-4 text-[#8C6D46]" />
                          <span>
                            {uploadingProof
                              ? 'Processing...'
                              : paymentProofUrl
                              ? 'Change Screenshot'
                              : 'Upload Receipt'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptProofUpload}
                            className="hidden"
                          />
                        </label>
                        {paymentProofUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setZoomedImage({
                                src: paymentProofUrl,
                                alt: `${paymentMethod} receipt screenshot`,
                                caption: 'Uploaded Receipt Screenshot',
                              })
                            }
                            aria-label="Preview uploaded receipt screenshot"
                            className="w-11 h-11 bg-white border border-[#E6E0D6] overflow-hidden shrink-0 cursor-zoom-in"
                          >
                            <img
                              src={paymentProofUrl}
                              alt="Uploaded receipt"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Exact-Amount Feedback Banner */}
                {hasEnteredAmount && totalAmount !== null && !isExactAmount && (
                  <div className="bg-[#7F1D1D]/8 border border-[#7F1D1D]/30 p-3.5 flex items-start gap-2.5 text-xs text-[#7F1D1D]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Exact amount required to finish order</p>
                      <p className="mt-0.5 leading-relaxed">
                        Required total is{' '}
                        <strong className="font-mono">{formatPHP(totalAmount)}</strong>. Your
                        entered amount ({formatPHP(parsedAmountPaid)}) is{' '}
                        {amountDiff < 0
                          ? `short by ${formatPHP(Math.abs(amountDiff))}.`
                          : `over by ${formatPHP(amountDiff)}.`}{' '}
                        Please remit and enter the exact amount to complete checkout.
                      </p>
                    </div>
                  </div>
                )}

                {isExactAmount && totalAmount !== null && (
                  <div className="bg-[#14532D]/8 border border-[#14532D]/30 p-3 flex items-center gap-2.5 text-xs text-[#14532D]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Exact amount verified:{' '}
                      <strong className="font-mono">{formatPHP(totalAmount)}</strong> matches your
                      order total.
                    </span>
                  </div>
                )}

                <div className="bg-white border border-[#E6E0D6] p-3 flex items-start gap-2 text-[11px] text-[#57534E] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#8C6D46] shrink-0 mt-0.5" />
                  <span>
                    Every reference number is checked for valid {paymentMethod} formatting, locked against duplicate reuse, and verified by the store owner against your receipt screenshot before shipping.
                  </span>
                </div>

              {error && (
                <div className="bg-[#7F1D1D]/10 border border-[#7F1D1D]/35 p-3.5 text-xs text-[#7F1D1D] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mobile Submit Action (with pb-24 clearance on form above) */}
              <div className="lg:hidden pt-3 border-t border-[#E6E0D6] space-y-3">
                <button
                  type="submit"
                  disabled={submitting || !isCheckoutReady}
                  className="w-full h-12 px-6 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] disabled:bg-[#D6D3D1] disabled:text-[#78716C] transition-colors cursor-pointer"
                >
                  {submitButtonLabel}
                </button>
                <p className="text-[11px] text-[#78716C] text-center leading-relaxed">
                  {submitHelperText}
                </p>
              </div>
            </section>
          </form>
        )}
      </div>

      {/* Tap-to-Zoom Lightbox (Tap outside picture to close) */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed image preview"
          className="fixed inset-0 z-[70] bg-[#1C1917]/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white border border-[#E6E0D6] p-3 sm:p-5 max-w-lg w-full flex flex-col items-center space-y-3 cursor-default"
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              aria-label="Close zoomed preview"
              className="absolute top-2.5 right-2.5 w-9 h-9 bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              referrerPolicy="no-referrer"
              className="w-full max-h-[72vh] object-contain bg-white"
            />
            {zoomedImage.caption && (
              <p className="text-xs font-medium text-[#1C1917] text-center">
                {zoomedImage.caption}
              </p>
            )}
            <p className="text-[11px] text-[#78716C]">Tap outside the picture to return</p>
          </div>
        </div>
      )}
    </div>
  );
}
