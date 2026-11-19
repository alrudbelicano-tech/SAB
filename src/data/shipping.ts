export type ShippingZoneId = 'visayas' | 'luzon_ncr' | 'mindanao' | 'islands';

export interface ShippingZoneInfo {
  id: ShippingZoneId;
  label: string;
  shortLabel: string;
  fee: number;
  estimatedDays: string;
  coverage: string;
}

export interface ProvinceOption {
  id: string;
  name: string;
  zoneId: ShippingZoneId;
}

export const SHIPPING_ORIGIN = 'Jaro, Iloilo City (Visayas)';
export const SHIPPING_COURIER = 'J&T Express (Standard Jewelry Parcel ≤ 500g)';
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 1500;

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZoneInfo> = {
  visayas: {
    id: 'visayas',
    label: 'Visayas (Local / Intra-Visayas)',
    shortLabel: 'Visayas',
    fee: 85,
    estimatedDays: '1–2 business days',
    coverage: 'Iloilo, Guimaras, Panay, Negros, Cebu, Bohol, Siquijor, Leyte & Samar',
  },
  luzon_ncr: {
    id: 'luzon_ncr',
    label: 'Metro Manila (NCR) & Rest of Luzon',
    shortLabel: 'Metro Manila & Luzon',
    fee: 100,
    estimatedDays: '3–4 business days',
    coverage: 'NCR, CALABARZON, Central Luzon, Ilocos, CAR, Cagayan Valley & Bicol Mainland',
  },
  mindanao: {
    id: 'mindanao',
    label: 'Mindanao',
    shortLabel: 'Mindanao',
    fee: 105,
    estimatedDays: '3–4 business days',
    coverage: 'Davao, Cagayan de Oro, Zamboanga, Soccsksargen, Caraga & Northern Mindanao',
  },
  islands: {
    id: 'islands',
    label: 'Island & Remote Provinces',
    shortLabel: 'Island & Remote Provinces',
    fee: 115,
    estimatedDays: '5–6 business days',
    coverage: 'Palawan, Batanes, Siargao, Mindoro, Marinduque, Romblon, Catanduanes, Masbate & Sulu',
  },
};

export const SHIPPING_ZONE_LIST: ShippingZoneInfo[] = [
  SHIPPING_ZONES.visayas,
  SHIPPING_ZONES.luzon_ncr,
  SHIPPING_ZONES.mindanao,
  SHIPPING_ZONES.islands,
];

export const PROVINCE_OPTIONS: ProvinceOption[] = [
  // Visayas (₱85 · 1–2 business days)
  { id: 'iloilo', name: 'Iloilo (Jaro / Iloilo City & Province)', zoneId: 'visayas' },
  { id: 'guimaras', name: 'Guimaras', zoneId: 'visayas' },
  { id: 'aklan', name: 'Aklan (incl. Boracay / Kalibo)', zoneId: 'visayas' },
  { id: 'antique', name: 'Antique', zoneId: 'visayas' },
  { id: 'capiz', name: 'Capiz', zoneId: 'visayas' },
  { id: 'negros_occidental', name: 'Negros Occidental (incl. Bacolod)', zoneId: 'visayas' },
  { id: 'negros_oriental', name: 'Negros Oriental (incl. Dumaguete)', zoneId: 'visayas' },
  { id: 'cebu', name: 'Cebu', zoneId: 'visayas' },
  { id: 'bohol', name: 'Bohol', zoneId: 'visayas' },
  { id: 'siquijor', name: 'Siquijor', zoneId: 'visayas' },
  { id: 'leyte', name: 'Leyte / Southern Leyte', zoneId: 'visayas' },
  { id: 'samar', name: 'Samar / Northern & Eastern Samar / Biliran', zoneId: 'visayas' },
  { id: 'visayas_other', name: 'Other Visayas Province', zoneId: 'visayas' },

  // Metro Manila (NCR) & Rest of Luzon (₱100 · 3–4 business days)
  { id: 'ncr', name: 'Metro Manila (NCR)', zoneId: 'luzon_ncr' },
  { id: 'cavite', name: 'Cavite', zoneId: 'luzon_ncr' },
  { id: 'laguna', name: 'Laguna', zoneId: 'luzon_ncr' },
  { id: 'batangas', name: 'Batangas', zoneId: 'luzon_ncr' },
  { id: 'rizal', name: 'Rizal', zoneId: 'luzon_ncr' },
  { id: 'quezon', name: 'Quezon Province', zoneId: 'luzon_ncr' },
  { id: 'bulacan', name: 'Bulacan', zoneId: 'luzon_ncr' },
  { id: 'pampanga', name: 'Pampanga', zoneId: 'luzon_ncr' },
  { id: 'central_luzon', name: 'Nueva Ecija / Tarlac / Zambales / Bataan / Aurora', zoneId: 'luzon_ncr' },
  { id: 'ilocos', name: 'Pangasinan / La Union / Ilocos Norte & Sur', zoneId: 'luzon_ncr' },
  { id: 'car', name: 'Benguet (Baguio) & Cordillera (CAR)', zoneId: 'luzon_ncr' },
  { id: 'cagayan_valley', name: 'Cagayan / Isabela / Nueva Vizcaya / Quirino', zoneId: 'luzon_ncr' },
  { id: 'bicol_mainland', name: 'Albay / Camarines Sur & Norte / Sorsogon', zoneId: 'luzon_ncr' },
  { id: 'luzon_other', name: 'Other Luzon Province', zoneId: 'luzon_ncr' },

  // Mindanao (₱105 · 3–4 business days)
  { id: 'davao_sur', name: 'Davao del Sur (incl. Davao City)', zoneId: 'mindanao' },
  { id: 'davao_region', name: 'Davao del Norte / Davao de Oro / Oriental / Occidental', zoneId: 'mindanao' },
  { id: 'misamis_oriental', name: 'Misamis Oriental (incl. Cagayan de Oro)', zoneId: 'mindanao' },
  { id: 'northern_mindanao', name: 'Bukidnon / Misamis Occidental / Lanao del Norte (Iligan)', zoneId: 'mindanao' },
  { id: 'soccsksargen', name: 'South Cotabato (General Santos) / Cotabato / Sultan Kudarat / Sarangani', zoneId: 'mindanao' },
  { id: 'zamboanga', name: 'Zamboanga del Sur / del Norte / Sibugay', zoneId: 'mindanao' },
  { id: 'caraga', name: 'Agusan del Norte (Butuan) / Agusan del Sur / Surigao del Sur', zoneId: 'mindanao' },
  { id: 'surigao_norte_mainland', name: 'Surigao del Norte (Mainland)', zoneId: 'mindanao' },
  { id: 'barmm_mainland', name: 'Maguindanao / Lanao del Sur', zoneId: 'mindanao' },
  { id: 'mindanao_other', name: 'Other Mindanao Province', zoneId: 'mindanao' },

  // Island & Remote Provinces (₱115 · 5–6 business days)
  { id: 'palawan', name: 'Palawan (incl. Puerto Princesa, El Nido, Coron)', zoneId: 'islands' },
  { id: 'batanes', name: 'Batanes', zoneId: 'islands' },
  { id: 'siargao', name: 'Siargao Island', zoneId: 'islands' },
  { id: 'mindoro', name: 'Occidental Mindoro / Oriental Mindoro', zoneId: 'islands' },
  { id: 'marinduque_romblon', name: 'Marinduque / Romblon', zoneId: 'islands' },
  { id: 'catanduanes_masbate', name: 'Catanduanes / Masbate', zoneId: 'islands' },
  { id: 'camiguin_dinagat', name: 'Camiguin / Dinagat Islands', zoneId: 'islands' },
  { id: 'barmm_islands', name: 'Basilan / Sulu / Tawi-Tawi', zoneId: 'islands' },
  { id: 'islands_other', name: 'Other Island / Remote Province', zoneId: 'islands' },
];

export function getProvinceById(provinceId: string): ProvinceOption | null {
  return PROVINCE_OPTIONS.find((p) => p.id === provinceId) || null;
}

export function getFreeShippingThreshold(configuredThreshold?: number): number {
  if (typeof configuredThreshold === 'number' && configuredThreshold > 0) {
    return configuredThreshold;
  }
  return DEFAULT_FREE_SHIPPING_THRESHOLD;
}

export interface ShippingQuote {
  zone: ShippingZoneInfo | null;
  province: ProvinceOption | null;
  baseFee: number | null;
  shippingFee: number | null;
  isFreeShipping: boolean;
  estimatedDays: string | null;
  threshold: number;
  remainingForFreeShipping: number;
}

export function calculateShippingQuote(
  subtotal: number,
  provinceId: string,
  configuredThreshold?: number
): ShippingQuote {
  const threshold = getFreeShippingThreshold(configuredThreshold);
  const remainingForFreeShipping = Math.max(0, Number((threshold - subtotal).toFixed(2)));
  const isFreeShipping = subtotal >= threshold;

  const province = getProvinceById(provinceId);
  const zone = province ? SHIPPING_ZONES[province.zoneId] : null;
  const baseFee = zone ? zone.fee : null;
  const shippingFee = isFreeShipping ? 0 : baseFee;

  return {
    zone,
    province,
    baseFee,
    shippingFee,
    isFreeShipping,
    estimatedDays: zone ? zone.estimatedDays : null,
    threshold,
    remainingForFreeShipping,
  };
}
