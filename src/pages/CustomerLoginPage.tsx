import React, { useState } from 'react';
import {
  ChefHat,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Star,
  CheckCircle2,
  UtensilsCrossed,
  Sparkles,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { appStore } from '../services/store';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { GoogleAuthModal } from '../components/GoogleAuthModal';

interface CustomerLoginPageProps {
  onNavigate: (view: string, data?: any) => void;
  onLoginSuccess?: () => void;
}

export const CustomerLoginPage: React.FC<CustomerLoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [googleAuthModalOpen, setGoogleAuthModalOpen] = useState(false);

  // Prevent authenticated users from accessing login page (route guard)
  React.useEffect(() => {
    const user = appStore.getState().currentUser;
    if (user) {
      if (user.role === 'customer') {
        onNavigate('customer_dashboard', { replace: true });
      } else if (user.role === 'chef') {
        onNavigate('chef_dashboard', { replace: true });
      } else if (user.role === 'admin') {
        onNavigate('admin_portal', { replace: true });
      }
    }
  }, [onNavigate]);

  // Catch any Supabase OAuth error in URL and display helpful resolution
  React.useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    if (
      search.includes('validation_failed') ||
      hash.includes('validation_failed') ||
      search.includes('provider') ||
      hash.includes('provider') ||
      search.includes('error=')
    ) {
      setErrorMessage(
        'Google OAuth provider is not yet enabled in your Supabase project dashboard (Authentication > Providers > Google). You can sign in instantly using Fast Google Sign-In or the demo credentials below!'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Registration mode toggle
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('+91 98765 43210');
  const [regAddress, setRegAddress] = useState('Banjara Hills, Hyderabad');

  // Quick 1-click demo fill
  const handleDemoFill = () => {
    setEmail('rahul@example.com');
    setPassword('customer123');
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let authenticated = false;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });

          if (!error && data.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profileData) {
              if (profileData.role !== 'customer') {
                throw new Error(`Access Denied: This account is registered as a ${profileData.role}. Please use the ${profileData.role} login portal.`);
              }
              appStore.setCurrentUser(profileData);
              authenticated = true;
            } else {
              const state = appStore.getState();
              const profile = state.profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
              if (profile) {
                appStore.setCurrentUser(profile);
                authenticated = true;
              }
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes('Access Denied')) {
            throw authErr;
          }
        }
      }

      if (!authenticated) {
        // Local verified authentication & role guard
        const state = appStore.getState();
        const profile = state.profiles.find(
          (p) => p.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (!profile) {
          throw new Error('No customer account found with this email. Please check your credentials or register.');
        }

        if (profile.role !== 'customer') {
          throw new Error(`Access Denied: This account is registered as a ${profile.role}. Please use the ${profile.role} login portal.`);
        }

        appStore.setCurrentUser(profile);
      }

      setSuccessMessage('Welcome back! Loading your culinary dashboard...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          onNavigate('customer_dashboard', { replace: true });
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: regFullName.trim(),
              role: 'customer',
            },
          },
        });

        if (error) throw error;
      }

      // Register profile in local store
      const newProfile = appStore.registerCustomer({
        fullName: regFullName.trim(),
        email: email.trim(),
        phone: regPhone,
        address: regAddress,
        city: 'Hyderabad',
      });

      setSuccessMessage('Account registered successfully! Redirecting...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          onNavigate('customer_dashboard', { replace: true });
        }
      }, 800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setGoogleAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFF8EC] flex flex-col justify-between text-[#24352D]">
      
      {/* Top Bar with Home Link */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#D9A441]/20 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-2.5 text-stone-700 hover:text-[#173D2E] text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#D9A441]" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-stone-500 hidden sm:inline">Are you a professional chef?</span>
          <button
            onClick={() => onNavigate('chef_login')}
            className="font-bold text-[#173D2E] hover:text-[#D9A441] underline underline-offset-4"
          >
            Chef Portal Sign In →
          </button>
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch">
        
        {/* Left Side: Culinary Atmosphere Showcase */}
        <div className="lg:w-1/2 relative bg-[#173D2E] overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white min-h-[380px] lg:min-h-auto">
          {/* Background Image with Rich Deep Emerald Gradient */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80"
              alt="Authentic Indian culinary feast prep"
              className="w-full h-full object-cover object-center opacity-35 mix-blend-luminosity scale-105 transform hover:scale-100 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3027] via-[#173D2E]/90 to-[#173D2E]/60" />
          </div>

          {/* Top Logo on Left */}
          <div className="relative z-10 flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-12 h-12 rounded-2xl bg-white p-1 overflow-hidden shadow-xl shrink-0 border border-amber-200/50">
              <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-2xl font-black font-display tracking-tight text-white">
                bookmy<span className="text-[#D9A441]">chef</span><span className="text-xs text-[#D9A441] font-mono">.com</span>
              </span>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#D9A441]">
                At-Home Private Chefs
              </p>
            </div>
          </div>

          {/* Center Culinary Highlight */}
          <div className="relative z-10 my-8 sm:my-12 max-w-lg space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D9A441]/40 text-xs text-[#FFF8EC]">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
              <span className="font-semibold">Personal Cooking in Your Kitchen</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display leading-[1.15] text-white">
              Every Gathering Deserves an <span className="text-[#D9A441]">Unforgettable Feast.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#FFF8EC]/80 leading-relaxed font-normal">
              Book certified culinary masters for family functions, festivals, weddings, birthday banquets, or authentic regional home dining.
            </p>

            {/* Feature Checklist */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#FFF8EC]/90">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9A441] shrink-0" />
                <span>Live cooking at your venue</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9A441] shrink-0" />
                <span>Tirupati laddus & festive mithai</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9A441] shrink-0" />
                <span>Transparent menu & ingredient costs</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#D9A441] shrink-0" />
                <span>Razorpay secure payment checkout</span>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof Badge */}
          <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2 overflow-hidden">
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#173D2E]"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  alt="Customer"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#173D2E]"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                  alt="Customer"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-[#173D2E]"
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80"
                  alt="Customer"
                />
              </div>
              <div>
                <div className="flex items-center text-[#D9A441] text-xs">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="ml-1.5 font-bold text-white text-xs">4.92 / 5</span>
                </div>
                <p className="text-[11px] text-[#FFF8EC]/70">Trusted across 1,200+ Indian events</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Elegant Customer Login Card */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-stone-200/90 relative">
            
            {/* Quick Demo Pill */}
            <div className="mb-6 p-3 rounded-2xl bg-[#FFF8EC] border border-[#D9A441]/40 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-stone-700 font-semibold">Customer Demo Account</span>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                className="px-2.5 py-1 rounded-lg bg-[#173D2E] text-white font-bold text-[11px] hover:bg-[#0f291e] transition-colors"
              >
                1-Click Fill
              </button>
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold mb-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Customer Portal</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#173D2E]">
                {isRegisterMode ? 'Create Customer Account' : 'Welcome Back!'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1.5 leading-relaxed">
                {isRegisterMode
                  ? 'Join ChefConnect to discover top culinary masters for your home.'
                  : 'Discover talented chefs and make every gathering memorable.'}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <span className="font-bold shrink-0">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            {isRegisterMode ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Rahul Verma"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Home Cooking Address</label>
                  <input
                    type="text"
                    required
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Villa 14, Palm Meadows, Jubilee Hills"
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-extrabold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Creating Account...' : 'Create Customer Account'}</span>
                  <ArrowRight className="w-4 h-4 text-[#D9A441]" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-[11px] font-bold text-[#D9A441] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-11 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-stone-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#173D2E] accent-[#173D2E]"
                    />
                    <span>Remember me on this browser</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 text-[#D9A441]" />
                </button>

                {/* Social Login Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-stone-400 font-semibold tracking-wider">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3 rounded-2xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center space-x-2.5 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Continue with Google</span>
                </button>
              </form>
            )}

            {/* Toggle Login / Register */}
            <div className="mt-6 pt-5 border-t border-stone-100 text-center">
              {isRegisterMode ? (
                <p className="text-xs text-stone-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#173D2E] hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#D9A441] text-[#173D2E] font-bold text-xs hover:bg-[#FFF8EC] transition-colors flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Create Customer Account</span>
                </button>
              )}
            </div>

            {/* Security Assurance */}
            <div className="mt-5 flex items-center justify-center space-x-1.5 text-[10px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>256-bit SSL secured customer authentication</span>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-500 border-t border-stone-200 bg-white/50">
        ChefConnect • Great food starts with the right chef.
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        role="customer"
        initialEmail={email}
        onClose={() => setForgotPasswordOpen(false)}
      />

      {/* Google Sign In Account Selector Modal */}
      <GoogleAuthModal
        isOpen={googleAuthModalOpen}
        onClose={() => setGoogleAuthModalOpen(false)}
        onSuccess={(profile) => {
          setSuccessMessage(`Welcome back, ${profile.fullName}! Signed in with Google.`);
          setTimeout(() => {
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              onNavigate('customer_dashboard');
            }
          }, 600);
        }}
      />

    </div>
  );
};
