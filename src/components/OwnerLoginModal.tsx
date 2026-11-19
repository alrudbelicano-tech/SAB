import { LogOut, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { signInWithGoogle, signOutAccount } from '../lib/firebase';
import { OWNER_EMAIL } from '../types';

interface OwnerLoginModalProps {
  isOpen: boolean;
  user: FirebaseUser | null;
  isOwner: boolean;
  onClose: () => void;
  onEnterAdminDashboard: () => void;
}

export function OwnerLoginModal({
  isOpen,
  user,
  isOwner,
  onClose,
  onEnterAdminDashboard,
}: OwnerLoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithGoogle();
      if (
        cred.user.emailVerified &&
        cred.user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
      ) {
        onEnterAdminDashboard();
        onClose();
      } else {
        await signOutAccount();
        setError('Access denied. This portal is restricted strictly to the authorized store owner.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C1917]/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-portal-title"
    >
      <div className="bg-[#FAF8F5] w-full max-w-md border border-[#E6E0D6]">
        <div className="px-6 py-4 bg-white border-b border-[#E6E0D6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#8C6D46]" />
            <h2 id="owner-portal-title" className="font-display text-2xl font-semibold text-[#1C1917]">
              Owner / Admin Portal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close owner login"
            className="p-2 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isOwner ? (
            <div className="space-y-4">
              <div className="bg-white border border-[#E6E0D6] p-4 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#14532D] shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-[#1C1917]">Owner Session Active</p>
                  <p className="text-[#57534E]">Authenticated with verified store owner permissions.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onEnterAdminDashboard();
                    onClose();
                  }}
                  className="w-full h-11 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] cursor-pointer"
                >
                  Open Admin Dashboard
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutAccount();
                    onClose();
                  }}
                  className="w-full h-10 border border-[#E6E0D6] text-xs font-medium text-[#57534E] hover:text-[#1C1917] inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <p className="text-xs text-[#7F1D1D] leading-relaxed">
                Access denied. The Admin Dashboard is restricted strictly to the authorized store owner.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await signOutAccount();
                }}
                className="w-full h-11 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#57534E] leading-relaxed">
                Sign in with your authorized store owner Google account to manage orders, inventory, photos, discounts, and storefront content.
              </p>
              {error && <p className="text-xs text-[#7F1D1D]">{error}</p>}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full h-11 bg-[#1C1917] text-[#FAF8F5] text-xs font-medium hover:bg-[#332E2A] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifying Owner Access...' : 'Sign In as Store Owner (Google)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
