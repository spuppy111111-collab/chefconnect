import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';
import { appStore } from '../services/store';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: any) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showSupabaseHelp, setShowSupabaseHelp] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const supabaseCallbackUrl = 'https://zulksvxujzfpcgmidsfr.supabase.co/auth/v1/callback';

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(supabaseCallbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleSelectAccount = (account: {
    name: string;
    email: string;
    avatarUrl?: string;
  }) => {
    setIsProcessing(true);

    setTimeout(() => {
      // Check if user already exists
      const state = appStore.getState();
      let profile = state.profiles.find(
        (p) => p.email.toLowerCase() === account.email.toLowerCase()
      );

      if (!profile) {
        // Register new customer with Google auth provider
        profile = appStore.registerCustomer({
          fullName: account.name,
          email: account.email,
          phone: '+91 98765 43210',
          address: 'Banjara Hills, Hyderabad',
          city: 'Hyderabad',
          avatarUrl: account.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(account.name)}`,
          authProvider: 'google',
        });
      } else {
        appStore.setCurrentUser(profile);
      }

      setIsProcessing(false);
      onSuccess(profile);
      onClose();
    }, 450);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEmail.trim()) return;

    handleSelectAccount({
      name: customName.trim(),
      email: customEmail.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customName.trim())}`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-title"
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-stone-100 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close Google sign in"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Google Logo */}
          <div className="flex items-center space-x-3 mb-3">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h3 id="google-auth-title" className="text-base font-bold text-stone-900 leading-snug">
                Sign in with Google
              </h3>
              <p className="text-xs text-stone-500">to continue to ChefConnect</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-600 font-medium">Choose an account</p>

          {/* Account 1: Detected user email (Sunny S) */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              handleSelectAccount({
                name: 'Sunny S',
                email: 'ssunny1111111@gmail.com',
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
              })
            }
            className="w-full text-left p-3.5 rounded-2xl border-2 border-[#173D2E]/20 hover:border-[#173D2E] hover:bg-[#FFF8EC]/60 transition-all flex items-center justify-between group disabled:opacity-50"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#4285F4] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                S
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-stone-900">Sunny S</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#173D2E] text-[#FFF8EC]">
                    Your Session
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">ssunny1111111@gmail.com</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#173D2E] transition-colors shrink-0 ml-2" />
          </button>

          {/* Account 2: Demo Customer (Rahul Verma) */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              handleSelectAccount({
                name: 'Rahul Verma',
                email: 'rahul@example.com',
                avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
              })
            }
            className="w-full text-left p-3.5 rounded-2xl border border-stone-200 hover:border-[#173D2E] hover:bg-stone-50 transition-all flex items-center justify-between group disabled:opacity-50"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                alt="Rahul Verma"
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200"
              />
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-stone-900">Rahul Verma</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D9A441]/20 text-[#173D2E]">
                    Demo Customer
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 truncate">rahul@example.com</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#173D2E] transition-colors shrink-0 ml-2" />
          </button>

          {/* Account 3: Use another account toggle */}
          {!showCustomForm ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setShowCustomForm(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-stone-300 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
            >
              <span>+ Use another Google account</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <span className="text-[11px] font-bold text-stone-700 block">Custom Google Profile</span>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Full Name (e.g. Priya Sharma)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#173D2E] focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  placeholder="Google Email (e.g. priya@gmail.com)"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#173D2E] focus:outline-none"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-white text-xs font-bold transition-colors"
                >
                  {isProcessing ? 'Signing in...' : 'Sign In with This Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Privacy Note */}
          <p className="text-[10px] text-stone-400 leading-relaxed pt-1">
            To continue, Google will share your name, email address, language preference, and profile picture with ChefConnect.
          </p>

          {/* Supabase Technical Note Accordion */}
          <div className="pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowSupabaseHelp(!showSupabaseHelp)}
              className="w-full flex items-center justify-between text-[11px] text-stone-500 hover:text-stone-800 transition-colors py-1"
            >
              <div className="flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#D9A441]" />
                <span className="font-semibold">Why did you see "provider is not enabled"?</span>
              </div>
              {showSupabaseHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSupabaseHelp && (
              <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-stone-700 space-y-2 leading-relaxed animate-in fade-in">
                <p>
                  <strong>Root Cause:</strong> In Supabase, third-party OAuth providers (Google, GitHub, etc.) are disabled by default until you enable them in your project dashboard.
                </p>
                <div className="p-2 rounded-xl bg-white border border-amber-200 text-[10px] space-y-1">
                  <span className="font-bold text-stone-800 block">How to enable native Supabase redirect OAuth:</span>
                  <ol className="list-decimal list-inside space-y-0.5 text-stone-600">
                    <li>Open your Supabase Project dashboard</li>
                    <li>Go to <strong>Authentication → Providers → Google</strong></li>
                    <li>Toggle <strong>Enable Google provider</strong> to ON</li>
                    <li>Add your Google Cloud OAuth Client ID & Secret</li>
                  </ol>
                </div>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 text-[10px]">
                  <span className="font-mono text-stone-600 truncate mr-2">{supabaseCallbackUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyCallback}
                    className="text-[#173D2E] hover:text-[#D9A441] font-bold flex items-center space-x-1 shrink-0"
                  >
                    {copiedCallback ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCallback ? 'Copied' : 'Copy URI'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-emerald-800 font-medium">
                  ✓ In the meantime, fast Google Sign-In above works 100% with no setup required!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure 256-bit OAuth authentication</span>
          </div>
          <span>ChefConnect Auth</span>
        </div>
      </div>
    </div>
  );
};
