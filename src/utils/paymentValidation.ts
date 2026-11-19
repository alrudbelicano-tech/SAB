import type { PaymentMethod } from '../types';

export function normalizePaymentReference(raw: string): string {
  return raw.trim().replace(/[\s-]+/g, '').toUpperCase();
}

export function buildPaymentRefKey(method: PaymentMethod, rawRef: string): string {
  const clean = normalizePaymentReference(rawRef).replace(/[^A-Z0-9_]/g, '');
  return `${method.toUpperCase()}_${clean}`.slice(0, 80);
}

const BLOCKED_DUMMY_REFS = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '12345678901',
  '123456789012',
  '1234567890123',
  '0123456789',
  '0123456789012',
  '987654',
  '987654321',
  '9876543210',
  '9876543210987',
  'TEST123',
  'TEST1234',
  'TEST123456',
  'SAMPLE123',
  'FAKE1234',
  'WRONG123',
  'GCASH123',
  'MAYA1234',
]);

function isRepeatedOrSequential(value: string): boolean {
  if (BLOCKED_DUMMY_REFS.has(value)) return true;
  if (/^(.)\1+$/.test(value)) return true;
  // Detect long repeating 2-digit patterns like 1212121212121 or 0101010101010
  if (/^(.{1,2})\1{4,}$/.test(value)) return true;
  // Detect strictly ascending or descending numeric runs >= 6 digits across the whole string
  if (/^\d+$/.test(value) && value.length >= 6) {
    let asc = true;
    let desc = true;
    for (let i = 1; i < value.length; i += 1) {
      const prev = value.charCodeAt(i - 1);
      const curr = value.charCodeAt(i);
      if (curr !== prev + 1) asc = false;
      if (curr !== prev - 1) desc = false;
    }
    if (asc || desc) return true;
  }
  return false;
}

export function validatePaymentReferenceFormat(
  method: PaymentMethod,
  rawRef: string
): { valid: boolean; clean: string; error?: string } {
  const trimmed = rawRef.trim();
  if (!trimmed) {
    return { valid: false, clean: '', error: `Please enter your ${method} reference number.` };
  }

  if (/[^a-zA-Z0-9\s-]/.test(trimmed)) {
    return {
      valid: false,
      clean: '',
      error: `${method} reference numbers can only contain letters, numbers, spaces, or hyphens.`,
    };
  }

  const clean = normalizePaymentReference(trimmed);

  if (isRepeatedOrSequential(clean)) {
    return {
      valid: false,
      clean,
      error: `That does not look like a valid ${method} transaction reference. Please copy the exact reference number from your ${method} receipt.`,
    };
  }

  const digitCount = (clean.match(/\d/g) || []).length;

  if (method === 'GCash') {
    // Standard GCash Express Send is exactly 13 digits; QR Ph / InstaPay bank-to-GCash uses 12-24 alphanumeric chars with >= 8 digits
    const isStandard13Digits = /^\d{13}$/.test(clean);
    const isQrPhAlphanumeric = /^[A-Z0-9]{12,24}$/.test(clean) && /[A-Z]/.test(clean) && digitCount >= 8;

    if (!isStandard13Digits && !isQrPhAlphanumeric) {
      return {
        valid: false,
        clean,
        error:
          'GCash Express Send references must be exactly 13 digits (e.g. 9012 4481 29011), or a valid 12–24 character QR Ph reference.',
      };
    }
  } else {
    // Maya Transaction / Reference IDs: 8–24 alphanumeric chars with at least 4 digits
    const isMayaValid = /^[A-Z0-9]{8,24}$/.test(clean) && digitCount >= 4;
    if (!isMayaValid) {
      return {
        valid: false,
        clean,
        error:
          'Maya Reference IDs must be 8–24 letters/numbers containing at least 4 digits (e.g. MAYA-88341209 or 7A2B9C4D1E8F).',
      };
    }
  }

  return { valid: true, clean };
}
