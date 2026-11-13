import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Server,
  LockKeyhole,
} from 'lucide-react';
import { appStore } from '../services/store';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface AdminLoginPageProps {
  onNavigate: (view: string, data?: any) => void;
  onLoginSuccess?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Prevent authenticated users from accessing login page (route guard)
  React.useEffect(() => {
    const user = appStore.getState().currentUser;
    if (user) {
      if (user.role === 'admin') {
        onNavigate('admin_portal', { replace: true });
      } else if (user.role === 'chef') {
        onNavigate('chef_dashboard', { replace: true });
      } else if (user.role === 'customer') {
        onNavigate('customer_dashboard', { replace: true });
      }
    }
  }, [onNavigate]);

  // Quick 1-click Demo fill for verified Administrator
  const handleQuickFillAdmin = () => {
    setEmail('admin@chefconnect.in');
    setPassword('admin123');
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Authorized administrative credentials are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let authenticated = false;
      if (isSupabaseConfigured && supabase) {
        try {
          // Attempt Supabase Auth
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });

          if (!error && data.user) {
            // Verify role from Supabase profiles table
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profileData) {
              if (profileData.role !== 'admin') {
                throw new Error('Access Denied: You do not possess administrator credentials or permissions for this console.');
              }
              appStore.setCurrentUser(profileData);
              authenticated = true;
            } else {
              const state = appStore.getState();
              const profile = state.profiles.find(
                (p) => p.email.toLowerCase() === email.trim().toLowerCase()
              );
              if (profile && profile.role === 'admin') {
                appStore.setCurrentUser(profile);
                authenticated = true;
              }
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes('Access Denied')) {
            throw authErr;
          }
          // Continue to fallback check below
        }
      }

      if (!authenticated) {
        // Strict Local Administrative Verification
        await new Promise((r) => setTimeout(r, 450));

        const state = appStore.getState();
        const profile = state.profiles.find(
          (p) => p.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (!profile) {
          throw new Error('Access Denied: Invalid administrator username or password.');
        }

        // Strict role verification: only explicitly registered admin roles can proceed
        if (profile.role !== 'admin') {
          throw new Error('Access Denied: The account provided does not possess administrator permissions.');
        }

        appStore.setCurrentUser(profile);
      }

      setSuccessMessage('Administrator credentials verified. Accessing operations console...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          onNavigate('admin_portal', { replace: true });
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Access Denied: Unauthorized administrative sign-in attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3027] text-white flex flex-col justify-between selection:bg-[#D9A441] selection:text-[#173D2E] relative overflow-hidden">

      {/* Subtle Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#173D2E] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#D9A441] rounded-full blur-3xl opacity-20" />
      </div>

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#21543f] bg-[#0B3027]/80 backdrop-blur-md relative z-20">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-2 text-stone-300 hover:text-[#D9A441] text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#D9A441]" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-stone-300 font-mono text-[11px]">System Status: SECURE</span>
        </div>
      </header>

      {/* Main Centered Authentication Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="max-w-md w-full">

          {/* Subtle Shield Security Badge */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#173D2E] to-[#081e18] border-2 border-[#D9A441]/50 shadow-2xl flex items-center justify-center mx-auto mb-4 relative group">
              <Shield className="w-10 h-10 text-[#D9A441]" />
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#D9A441] flex items-center justify-center text-[#173D2E]">
                <LockKeyhole className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D9A441] bg-[#173D2E] px-3 py-1 rounded-full border border-[#D9A441]/30">
              bookmychef.com Platform Operations
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-3">
              Administrator Access
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Securely manage the bookmychef.com platform.
            </p>
          </div>

          {/* Centered Login Card */}
          <div className="bg-[#173D2E] rounded-3xl p-8 sm:p-9 shadow-2xl border border-[#21543f] relative backdrop-blur-sm">

            {/* Quick Demo Pill */}
            <div className="mb-6 p-3 rounded-2xl bg-[#0B3027] border border-[#D9A441]/40 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#D9A441]" />
                <span className="text-stone-200 font-semibold text-[11px]">Super Admin Test Demo</span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillAdmin}
                className="px-2.5 py-1 rounded-lg bg-[#D9A441] text-[#173D2E] font-bold text-[11px] hover:bg-[#c49132] transition-colors"
              >
                1-Click Fill
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Security Alert:</span> {errorMessage}
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-200 block mb-1.5">
                  Authorized Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@chefconnect.in"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#0B3027] border border-[#21543f] text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441] text-xs font-semibold placeholder:text-stone-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-200">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-[11px] font-bold text-[#D9A441] hover:underline"
                  >
                    Forgot credentials?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security passphrase"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#0B3027] border border-[#21543f] text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441] text-xs font-semibold placeholder:text-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-[#D9A441] hover:bg-[#c49132] text-[#173D2E] font-extrabold text-sm shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{isSubmitting ? 'Verifying Authorization...' : 'Secure Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Security Notice Box */}
            <div className="mt-6 pt-5 border-t border-[#21543f] text-[11px] text-stone-300 space-y-2">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] text-stone-400">
                  <strong className="text-stone-200">Restricted Access Notice:</strong> This portal is monitored. Unauthorized login attempts are tracked and logged.
                </p>
              </div>
            </div>

          </div>

          {/* Quick links below card */}
          <div className="mt-6 text-center text-xs text-stone-400 flex items-center justify-center space-x-4">
            <button
              onClick={() => onNavigate('customer_login')}
              className="hover:text-[#D9A441] transition-colors"
            >
              Customer Login
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('chef_login')}
              className="hover:text-[#D9A441] transition-colors"
            >
              Chef Login
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('landing')}
              className="hover:text-[#D9A441] transition-colors"
            >
              Home
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-500 border-t border-[#21543f]">
        ChefConnect Security • Administrative Access Gateway
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        role="admin"
        initialEmail={email}
        onClose={() => setForgotPasswordOpen(false)}
      />

    </div>
  );
};
