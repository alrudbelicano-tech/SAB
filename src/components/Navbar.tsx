import { Menu, Package, ShoppingBag, SlidersHorizontal, Store, X } from 'lucide-react';
import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  storeName?: string;
  announcementText: string;
  showAnnouncement: boolean;
  cartCount: number;
  user: FirebaseUser | null;
  isOwner: boolean;
  viewMode: 'customer' | 'admin';
  onSetViewMode: (mode: 'customer' | 'admin') => void;
  onOpenCart: () => void;
  onOpenTrackOrder: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export function Navbar({
  storeName = 'SAB Jewelry',
  announcementText,
  showAnnouncement,
  cartCount,
  user,
  isOwner,
  viewMode,
  onSetViewMode,
  onOpenCart,
  onOpenTrackOrder,
  onNavigateSection,
}: NavbarProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (viewMode !== 'customer') {
      onSetViewMode('customer');
      setTimeout(() => onNavigateSection(sectionId), 60);
    } else {
      onNavigateSection(sectionId);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E6E0D6]">
      {showAnnouncement && !bannerDismissed && announcementText.trim() && (
        <div className="bg-[#1C1917] text-[#FAF8F5] text-xs px-4 py-1.5 flex items-center justify-center relative">
          <p className="truncate max-w-[85vw] text-center tracking-wide">{announcementText}</p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 p-1 text-[#D6D3D1] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strictly 3-Zone Top Bar Contract */}
      <header className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('top');
          }}
          className="font-display text-2xl sm:text-[26px] font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          {storeName}
        </a>

        {/* Zone 2: 5 concise single-line nav links (Zero customer login required) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('catalog');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Catalog
          </a>
          <a
            href="#story"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('story');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Our Craft
          </a>
          <a
            href="#reviews"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('reviews');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Reviews
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('contact');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Contact
          </a>
          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Track Order
          </button>
        </nav>

        {/* Zone 3: 1 primary action (plus mobile menu trigger on <md) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2.5 text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium tracking-wide hover:bg-[#332E2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tabular-nums">Bag ({cartCount})</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E6E0D6] bg-[#FAF8F5] px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleLinkClick('catalog')}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('story')}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            Our Craft
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('reviews')}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('contact')}
            className="w-full text-left px-3 py-3 text-sm font-medium text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTrackOrder();
            }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm font-medium text-[#8C6D46] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Track Order</span>
          </button>
        </div>
      )}

      {/* Owner Workspace Mode Bar (Rendered strictly outside the 3-zone header for the verified owner) */}
      {isOwner && (
        <div className="border-t border-[#E6E0D6] bg-[#F2EFE9] px-4 sm:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#57534E]">
              Owner Studio Mode <span aria-hidden="true">·</span>{' '}
              <span className="font-medium text-[#1C1917]">Verified Session</span>
            </p>
            <div className="inline-flex items-center bg-white border border-[#E6E0D6] p-0.5">
              <button
                type="button"
                onClick={() => onSetViewMode('customer')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'customer'
                    ? 'bg-[#1C1917] text-[#FAF8F5]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Customer Storefront</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewMode('admin')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'admin'
                    ? 'bg-[#1C1917] text-[#FAF8F5]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
