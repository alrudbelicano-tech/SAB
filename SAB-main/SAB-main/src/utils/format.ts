export function formatPHP(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function generateId(prefix = 'sab'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${cleanPrefix}_${timePart}_${randomPart}`;
}

export function generateOrderNumber(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `SAB-${randomDigits}`;
}

export function formatFirestoreDate(value: unknown): string {
  if (!value) return 'Just now';
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return 'Recent';
}

export function getTimestampMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export async function compressImageFile(
  file: File,
  maxDimension = 960,
  quality = 0.8,
  maxDataUrlChars = 345000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > maxDataUrlChars * 0.9) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        if (dataUrl.length > maxDataUrlChars) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        }
        if (dataUrl.length > maxDataUrlChars) {
          reject(new Error('Image is still too large after compression. Please choose a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read video file.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export async function compressVideoFile(file: File, maxDataUrlChars = 520000): Promise<string> {
  if (!file.type.startsWith('video/')) {
    throw new Error('Please choose a valid video file (MP4, WebM, or MOV).');
  }
  if (file.size > 60_000_000) {
    throw new Error('Video file is over 60MB. Please trim it to a short clip or paste a video link.');
  }

  // If already compact enough (~380KB raw -> ~506KB base64), store directly without re-encoding
  if (file.size <= 370_000) {
    const directUrl = await readBlobAsDataUrl(file);
    if (directUrl.length <= maxDataUrlChars) {
      return directUrl;
    }
  }

  // Re-encode longer/larger video clips in browser using canvas + MediaRecorder
  if (typeof MediaRecorder === 'undefined') {
    throw new Error(
      'This browser cannot compress large videos automatically. Please upload a smaller clip (under 370 KB) or paste a video URL.'
    );
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not decode the selected video file.'));
    });

    const maxClipSeconds = 12;
    const targetDuration = Math.min(video.duration || maxClipSeconds, maxClipSeconds);
    const maxDim = 420;
    let width = video.videoWidth || 420;
    let height = video.videoHeight || 420;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    width = Math.max(2, width - (width % 2));
    height = Math.max(2, height - (height % 2));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') {
      throw new Error('Browser video compression unavailable. Please paste a video URL or use a clip under 370 KB.');
    }

    const mimeCandidates = [
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
      'video/mp4',
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const bitsPerSecond = Math.min(280_000, Math.floor((340_000 * 8) / Math.max(2, targetDuration)));

    const stream = canvas.captureStream(20);
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond })
      : new MediaRecorder(stream, { videoBitsPerSecond: bitsPerSecond });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const recordedBlob = await new Promise<Blob>((resolve, reject) => {
      let animId = 0;
      let stopped = false;

      const finish = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(animId);
        video.pause();
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.onerror = () => reject(new Error('Video compression failed. Try a shorter clip or paste a video URL.'));
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
      };

      const drawFrame = () => {
        if (stopped) return;
        ctx.drawImage(video, 0, 0, width, height);
        if (video.ended || video.currentTime >= targetDuration) {
          finish();
          return;
        }
        animId = requestAnimationFrame(drawFrame);
      };

      video.currentTime = 0;
      recorder.start(250);
      video.play().then(() => {
        drawFrame();
      }).catch(() => {
        finish();
        reject(new Error('Unable to play video for compression. Try pasting a video URL.'));
      });
    });

    const dataUrl = await readBlobAsDataUrl(recordedBlob);
    if (dataUrl.length > maxDataUrlChars) {
      throw new Error(
        'Compressed video is still too large for direct storage. Please trim to a shorter clip (3–8 sec) or paste a video URL.'
      );
    }
    return dataUrl;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.replace('/shorts/', '').split('/')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return trimmed;
      }
      const v = parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseSizeOptions(sizes?: string): string[] {
  const raw = (sizes || '').trim();
  if (!raw) return ['Adjustable / Standard'];
  const parts = raw
    .split(/[,/|;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? Array.from(new Set(parts)) : ['Adjustable / Standard'];
}

const BLOCKED_DUMMY_REFS = new Set([
  'TEST',
  'TESTING',
  'NONE',
  'NULL',
  'GCASH',
  'MAYA',
  'SAMPLE',
  'DUMMY',
  'ABCDEFGH',
  '12345678',
  '123456789',
  '1234567890',
  '0123456789',
  '9876543210',
  '0987654321',
]);

export function validatePaymentReference(
  method: 'GCash' | 'Maya',
  rawRef: string
): { valid: boolean; normalized: string; error?: string } {
  const cleaned = rawRef.replace(/[\s-]+/g, '').toUpperCase();

  if (!cleaned) {
    return {
      valid: false,
      normalized: '',
      error: `Please enter your ${method} transaction reference number.`,
    };
  }

  if (/^([A-Z0-9])\1+$/.test(cleaned) || BLOCKED_DUMMY_REFS.has(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: `That does not appear to be a valid ${method} reference number. Please copy the exact Reference No. from your ${method} receipt.`,
    };
  }

  if (
    '01234567890123456789'.includes(cleaned) ||
    '98765432109876543210'.includes(cleaned)
  ) {
    return {
      valid: false,
      normalized: cleaned,
      error: `Please enter the actual ${method} Reference No. shown on your payment receipt.`,
    };
  }

  if (method === 'GCash') {
    if (!/^\d{9,16}$/.test(cleaned)) {
      return {
        valid: false,
        normalized: cleaned,
        error:
          'GCash Reference Numbers are numeric (usually 13 digits, minimum 9 digits). Please enter only the numbers from your GCash receipt.',
      };
    }
  } else {
    if (!/^[A-Z0-9]{8,24}$/.test(cleaned) || !/(?:\d.*){4,}/.test(cleaned)) {
      return {
        valid: false,
        normalized: cleaned,
        error:
          'Maya Reference IDs must be 8–24 alphanumeric characters containing at least 4 numbers from your Maya receipt.',
      };
    }
  }

  return { valid: true, normalized: cleaned };
}

