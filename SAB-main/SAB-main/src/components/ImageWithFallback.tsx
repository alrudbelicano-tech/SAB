import { Gem } from 'lucide-react';
import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageWithFallback({ src, alt, className = '' }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F2EFE9] to-[#E6E0D6] text-[#78716C] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Gem className="w-7 h-7 stroke-[1.25] text-[#8C6D46] mb-2" />
        <span className="text-xs font-medium tracking-wide text-[#57534E] line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
