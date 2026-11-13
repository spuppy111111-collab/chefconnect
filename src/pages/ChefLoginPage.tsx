import React, { useState } from 'react';
import {
  ChefHat,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Award,
  Sparkles,
  DollarSign,
  Calendar,
  XCircle,
} from 'lucide-react';
import { appStore } from '../services/store';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface ChefLoginPageProps {
  onNavigate: (view: string, data?: any) => void;
  onLoginSuccess?: () => void;
}

export const ChefLoginPage: React.FC<ChefLoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalStatusNotice, setApprovalStatusNotice] = useState<{
    status: 'pending' | 'rejected' | 'suspended';
    message: string;
    chefName?: string;
  } | null>(null);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Prevent authenticated users from accessing login page (route guard)
  React.useEffect(() => {
    const user = appStore.getState().currentUser;
    if (user) {
      if (user.role === 'chef') {
        onNavigate('chef_dashboard', { replace: true });
      } else if (user.role === 'customer') {
        onNavigate('customer_dashboard', { replace: true });
      } else if (user.role === 'admin') {
        onNavigate('admin_portal', { replace: true });
      }
    }
  }, [onNavigate]);

  // Registration Mode
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+91 98765 11223');
  const [location, setLocation] = useState('Banjara Hills, Hyderabad');
  const [experienceYears, setExperienceYears] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(600);
  const [baseCharge, setBaseCharge] = useState(500);
  const [specialties, setSpecialties] = useState<string[]>([
    'Sweets & Laddu Preparation',
    'Festival Cooking',
  ]);
  const [bio, setBio] = useState('Experienced sweet maker and traditional caterer for family functions, pujas, and weddings.');

  // Quick Demo Pills
  const handleQuickFillApproved = () => {
    setEmail('venkatesh@chefconnect.in');
    setPassword('chef123');
    setErrorMessage(null);
    setApprovalStatusNotice(null);
  };

  const handleQuickFillPending = () => {
    // Look up or set pending chef
    const pendingChef = appStore.getState().chefs.find((c) => c.status === 'pending');
    if (pendingChef) {
      setEmail(pendingChef.email);
    } else {
      setEmail('anand@chefconnect.in');
    }
    setPassword('chef123');
    setErrorMessage(null);
    setApprovalStatusNotice(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your registered chef email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setApprovalStatusNotice(null);

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
              if (profileData.role !== 'chef') {
                throw new Error(`Access Denied: This account is registered as a ${profileData.role}. Please use the customer or admin login.`);
              }

              // Check chef approval status in chefs table
              const { data: chefRecord } = await supabase
                .from('chefs')
                .select('*')
                .eq('profile_id', profileData.id)
                .maybeSingle();

              if (chefRecord) {
                if (chefRecord.status === 'pending') {
                  setApprovalStatusNotice({
                    status: 'pending',
                    chefName: chefRecord.full_name,
                    message: 'Your chef application is currently under review by the ChefConnect onboarding board. You cannot accept customer booking requests until administrative approval is granted.',
                  });
                  setIsSubmitting(false);
                  return;
                }

                if (chefRecord.status === 'rejected' || chefRecord.status === 'suspended') {
                  setApprovalStatusNotice({
                    status: chefRecord.status,
                    chefName: chefRecord.full_name,
                    message: chefRecord.rejection_reason || 'Your chef account has been deactivated or rejected by administration. Please reach out to chef-support@chefconnect.in.',
                  });
                  setIsSubmitting(false);
                  return;
                }
              }

              appStore.setCurrentUser(profileData);
              authenticated = true;
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes('Access Denied')) throw authErr;
        }
      }

      if (!authenticated) {
        // Local verified authentication & role guard
        await new Promise((r) => setTimeout(r, 600));

        const state = appStore.getState();
        const profile = state.profiles.find(
          (p) => p.email.toLowerCase() === email.trim().toLowerCase()
        );

        if (!profile) {
          throw new Error('No chef account found with this email. Please check your credentials or register as a partner chef.');
        }

        if (profile.role !== 'chef') {
          throw new Error(`Access Denied: This account is registered as a ${profile.role}. Please use the ${profile.role} login portal.`);
        }

        // Check chef record approval status
        const chefRecord = state.chefs.find((c) => c.profileId === profile.id || c.email.toLowerCase() === email.trim().toLowerCase());

        if (chefRecord) {
          if (chefRecord.status === 'pending') {
            setApprovalStatusNotice({
              status: 'pending',
              chefName: chefRecord.fullName,
              message: 'Your chef application is currently pending admin approval. You will receive an email once our culinary board verifies your experience. Pending chefs cannot accept booking requests.',
            });
            setIsSubmitting(false);
            return;
          }

          if (chefRecord.status === 'rejected' || chefRecord.status === 'suspended') {
            setApprovalStatusNotice({
              status: chefRecord.status,
              chefName: chefRecord.fullName,
              message: chefRecord.rejectionReason || 'Your chef account has been rejected or suspended. Access to booking management is restricted.',
            });
            setIsSubmitting(false);
            return;
          }
        }

        appStore.setCurrentUser(profile);
      }

      setSuccessMessage('Chef credentials verified! Entering Chef Workspace...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          onNavigate('chef_dashboard', { replace: true });
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Chef authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterChef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newChef = appStore.registerChef({
        fullName: fullName.trim(),
        email: email.trim(),
        phone,
        avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80',
        experienceYears,
        bio,
        specialties,
        supportedEvents: ['family_function', 'festival', 'wedding', 'home_cooking'],
        location,
        serviceAreas: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur'],
        hourlyRate,
        baseCharge,
        workingHours: '08:00 AM - 08:00 PM',
      });

      setApprovalStatusNotice({
        status: 'pending',
        chefName: newChef.fullName,
        message: 'Your partner application has been submitted to Admin! Our onboarding manager will verify your credentials shortly. You will be notified when approved.',
      });
      setIsRegisterMode(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B3027] text-white flex flex-col justify-between selection:bg-[#D9A441] selection:text-[#173D2E]">

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#21543f] bg-[#173D2E]/90 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-2 text-[#FFF8EC] hover:text-[#D9A441] text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#D9A441]" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-4 text-xs">
          <span className="text-stone-300 hidden sm:inline">Looking to book a chef for your event?</span>
          <button
            onClick={() => onNavigate('customer_login')}
            className="font-bold text-[#D9A441] hover:underline underline-offset-4"
          >
            Customer Login →
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch">

        {/* Left Side: Chef Prestige & Onboarding Journey */}
        <div className="lg:w-1/2 relative bg-[#173D2E] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
          {/* Chef Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1400&q=80"
              alt="Professional Chef in Uniform"
              className="w-full h-full object-cover object-top opacity-30 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3027] via-[#173D2E]/90 to-[#173D2E]/70" />
          </div>

          {/* Top Logo */}
          <div className="relative z-10 flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-12 h-12 rounded-2xl bg-white p-1 overflow-hidden shadow-xl shrink-0 border border-amber-200/50">
              <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-2xl font-bold font-display text-white">
                bookmy<span className="text-[#D9A441]">chef</span><span className="text-xs text-[#D9A441] font-mono">.com</span>
              </span>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#D9A441]">
                Culinary Partner Portal
              </p>
            </div>
          </div>

          {/* Center Pitch */}
          <div className="relative z-10 my-8 sm:my-10 max-w-lg space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#D9A441]/40 text-xs text-[#FFF8EC]">
              <Award className="w-3.5 h-3.5 text-[#D9A441]" />
              <span className="font-semibold">Join 400+ Elite Culinary Artisans</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display leading-[1.15] text-white">
              Cook on Your Terms. <span className="text-[#D9A441]">Earn Respect & Fair Pay.</span>
            </h1>

            <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
              Connect directly with customers hosting weddings, traditional festivals, intimate family poojas, and birthday parties. Manage your availability and quotations effortlessly.
            </p>

            {/* Chef Benefits Cards */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
                <DollarSign className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Direct Advance Payouts</span>
                  <span className="text-[11px] text-stone-300">50% deposit guaranteed before every service.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
                <Calendar className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Flexible Schedule</span>
                  <span className="text-[11px] text-stone-300">Accept only the dates and slots you desire.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding Steps Card */}
          <div className="relative z-10 p-5 rounded-3xl bg-[#0B3027]/90 border border-[#21543f] text-xs">
            <span className="text-[10px] uppercase font-bold text-[#D9A441] tracking-wider block mb-2">
              Chef Verification & Quality Assurance
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-xl bg-white/5">
                <span className="font-bold text-[#D9A441] block">1. Apply</span>
                <span className="text-[10px] text-stone-300">Register profile</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <span className="font-bold text-[#D9A441] block">2. Review</span>
                <span className="text-[10px] text-stone-300">Admin audit</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <span className="font-bold text-[#D9A441] block">3. Approved</span>
                <span className="text-[10px] text-stone-300">Go live</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <span className="font-bold text-[#D9A441] block">4. Cook</span>
                <span className="text-[10px] text-stone-300">Earn & grow</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Chef Authentication Card */}
        <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#FFF8EC] text-[#24352D]">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-stone-200/90 relative">

            {/* Quick Demo Credentials */}
            <div className="mb-6 p-3 rounded-2xl bg-[#FFF8EC] border border-[#D9A441]/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#173D2E]">Quick Chef Demo Logins</span>
                <span className="text-[10px] text-stone-500">1-click test</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleQuickFillApproved}
                  className="px-2.5 py-1.5 rounded-xl bg-[#173D2E] text-white text-[11px] font-bold hover:bg-[#0f291e] transition-colors truncate"
                  title="Chef Venkatesh (Approved Master)"
                >
                  ✓ Approved Chef
                </button>
                <button
                  type="button"
                  onClick={handleQuickFillPending}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold hover:bg-amber-200 transition-colors truncate"
                  title="Test Pending Verification Status"
                >
                  ⏳ Pending Chef
                </button>
              </div>
            </div>

            {/* Header Titles */}
            <div className="mb-6">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#173D2E]/10 text-[#173D2E] text-xs font-semibold mb-2">
                <ChefHat className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Chef Workspace Access</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#173D2E]">
                {isRegisterMode ? 'Register as a Chef Partner' : 'Welcome Back, Chef!'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
                {isRegisterMode
                  ? 'Showcase your culinary art to thousands of customers looking for event chefs.'
                  : 'Your next great cooking experience starts here.'}
              </p>
            </div>

            {/* Approval Status Banner (When Pending or Suspended) */}
            {approvalStatusNotice && (
              <div
                className={`mb-5 p-4 rounded-2xl border text-xs leading-relaxed ${approvalStatusNotice.status === 'pending'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-300 text-red-900'
                  }`}
              >
                <div className="flex items-center space-x-2 font-bold mb-1">
                  {approvalStatusNotice.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>
                    {approvalStatusNotice.status === 'pending'
                      ? 'Account Under Verification (Pending Approval)'
                      : 'Account Access Restricted'}
                  </span>
                </div>
                <p className="text-[11px] mt-1">{approvalStatusNotice.message}</p>
                {approvalStatusNotice.status === 'pending' && (
                  <div className="mt-2 text-[10px] text-amber-700 bg-amber-100/60 p-2 rounded-xl">
                    ℹ️ You can switch to the Admin Portal to review and approve this pending application.
                  </div>
                )}
              </div>
            )}

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

            {/* Registration Form */}
            {isRegisterMode ? (
              <form onSubmit={handleRegisterChef} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Chef Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Master Chef Anand Rao"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="chef@chefconnect.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Experience (Yrs)</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Base Rate (₹/hr)</label>
                    <input
                      type="number"
                      min="300"
                      step="50"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">Base Charge (₹)</label>
                    <input
                      type="number"
                      min="200"
                      step="50"
                      value={baseCharge}
                      onChange={(e) => setBaseCharge(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Food Specialties & Cuisines (Click to toggle or type below)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'South Indian Cuisine',
                      'North Indian Cuisine',
                      'Traditional Sweets',
                      'Wedding Special Foods',
                      'Festival Cooking',
                      'Chinese Cuisine',
                      'Breakfast & Snacks',
                    ].map((cat) => {
                      const isSelected = specialties.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSpecialties(specialties.filter((s) => s !== cat));
                            } else {
                              setSpecialties([...specialties, cat]);
                            }
                          }}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${isSelected
                            ? 'bg-[#173D2E] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={specialties.join(', ')}
                    onChange={(e) =>
                      setSpecialties(
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="e.g. South Indian Cuisine, Traditional Sweets, Dum Biryani"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Your chosen specialties become the dynamic food categories on the Customer Dashboard upon approval.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Service Location & City</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Banjara Hills, Hyderabad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
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
                  <span>{isSubmitting ? 'Submitting Application...' : 'Submit Partner Application'}</span>
                  <ArrowRight className="w-4 h-4 text-[#D9A441]" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Chef Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. venkatesh@chefconnect.in"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Password Field */}
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
                      placeholder="Enter chef password"
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

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Chef'}</span>
                  <ArrowRight className="w-4 h-4 text-[#D9A441]" />
                </button>
              </form>
            )}

            {/* Toggle Mode */}
            <div className="mt-6 pt-5 border-t border-stone-100 text-center">
              {isRegisterMode ? (
                <p className="text-xs text-stone-600">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#173D2E] hover:underline"
                  >
                    Chef Sign In here
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
                  <Award className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Register as a Chef Partner</span>
                </button>
              )}
            </div>

            {/* Security note */}
            <div className="mt-5 flex items-center justify-center space-x-1.5 text-[10px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chef identity & cooking hygiene standards enforced</span>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400 border-t border-[#21543f] bg-[#0B3027]">
        ChefConnect Partner Program • Empowering culinary master artisans.
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        role="chef"
        initialEmail={email}
        onClose={() => setForgotPasswordOpen(false)}
      />

    </div>
  );
};
