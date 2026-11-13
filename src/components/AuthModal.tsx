import React, { useState } from 'react';
import { UserRole } from '../types/database';
import {
  X,
  Eye,
  EyeOff,
  ChefHat,
  User,
  Shield,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { appStore } from '../services/store';
import { GoogleAuthModal } from './GoogleAuthModal';

interface AuthModalProps {
  isOpen: boolean;
  defaultRole?: UserRole;
  onClose: () => void;
  onSuccess: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  defaultRole = 'customer',
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Banjara Hills, Hyderabad');

  // Chef Registration Specific Fields
  const [experienceYears, setExperienceYears] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(600);
  const [baseCharge, setBaseCharge] = useState(500);
  const [bio, setBio] = useState('Culinary expert specializing in authentic regional recipes, live feasts, and desserts.');
  const [specialties, setSpecialties] = useState<string[]>([
    'Sweets & Laddu Preparation',
    'Festival Cooking',
  ]);
  const [workingHours, setWorkingHours] = useState('08:00 AM - 08:00 PM');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80'
  );

  // Quick 1-click test fill
  const handleQuickFill = (role: UserRole) => {
    setSelectedRole(role);
    setMode('login');
    if (role === 'customer') {
      setEmail('rahul@example.com');
      setPassword('customer123');
    } else if (role === 'chef') {
      setEmail('venkatesh@chefconnect.in');
      setPassword('chef123');
    } else if (role === 'admin') {
      setEmail('admin@chefconnect.in');
      setPassword('admin123');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      // Find matching user or switch role directly
      const state = appStore.getState();
      const existing = state.profiles.find((p) => p.email === email && p.role === selectedRole);
      if (existing) {
        appStore.setCurrentUser(existing);
      } else {
        appStore.switchRole(selectedRole);
      }
      onSuccess(selectedRole);
      onClose();
    } else {
      // Register
      if (selectedRole === 'customer') {
        appStore.registerCustomer({
          fullName: fullName || 'New Customer',
          email: email || `cust_${Date.now()}@example.com`,
          phone,
          address,
          city: 'Hyderabad',
        });
        onSuccess('customer');
        onClose();
      } else if (selectedRole === 'chef') {
        appStore.registerChef({
          fullName: fullName || 'Chef Partner',
          email: email || `chef_${Date.now()}@chefconnect.in`,
          phone,
          avatarUrl,
          experienceYears,
          bio,
          specialties,
          supportedEvents: ['family_function', 'festival', 'home_cooking'],
          location: address,
          serviceAreas: ['Jubilee Hills', 'Banjara Hills', 'Gachibowli', 'Madhapur'],
          hourlyRate,
          baseCharge,
          workingHours,
        });
        onSuccess('chef');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 relative">
        
        {/* Header */}
        <div className="bg-[#173D2E] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 overflow-hidden shadow-md shrink-0 border border-amber-200/50">
              <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold font-display text-white">bookmychef.com Access</span>
          </div>
          <p className="text-xs text-[#FFF8EC]/80">
            {mode === 'login' ? 'Sign in to access your portal' : 'Create an account to get started'}
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-4 bg-black/20 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              className={`py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                selectedRole === 'customer' ? 'bg-[#D9A441] text-[#173D2E]' : 'text-white/80 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('chef')}
              className={`py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                selectedRole === 'chef' ? 'bg-[#D9A441] text-[#173D2E]' : 'text-white/80 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Chef</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`py-1.5 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                selectedRole === 'admin' ? 'bg-[#D9A441] text-[#173D2E]' : 'text-white/80 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* 1-Click Test Fill Pill */}
        <div className="bg-[#FFF8EC] px-6 py-2.5 border-b border-[#D9A441]/30 flex items-center justify-between text-xs">
          <span className="text-stone-600 font-medium">Quick Demo Credential:</span>
          <button
            type="button"
            onClick={() => handleQuickFill(selectedRole)}
            className="text-[#173D2E] hover:text-[#c49132] font-bold flex items-center space-x-1 underline"
          >
            <Sparkles className="w-3 h-3 text-[#D9A441]" />
            <span>Fill Demo {selectedRole.toUpperCase()}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4 text-xs">
          
          {/* Mode Switcher */}
          {selectedRole !== 'admin' && (
            <div className="flex border-b border-stone-100 pb-4 mb-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1 text-center font-bold pb-2 border-b-2 ${
                  mode === 'login' ? 'border-[#173D2E] text-[#173D2E]' : 'border-transparent text-stone-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-1 text-center font-bold pb-2 border-b-2 ${
                  mode === 'register' ? 'border-[#173D2E] text-[#173D2E]' : 'border-transparent text-stone-400'
                }`}
              >
                Register New {selectedRole === 'chef' ? 'Chef Partner' : 'Customer'}
              </button>
            </div>
          )}

          {/* Registration Fields */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-600 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Verma or Chef Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                required
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="font-bold text-stone-600 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Password with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-stone-600 block">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#173D2E] font-bold flex items-center space-x-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'} Password</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-xs font-mono font-semibold"
                required
              />
            </div>
          </div>

          {/* Chef Specific Registration Details */}
          {mode === 'register' && selectedRole === 'chef' && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-600 block mb-1">Specialties & Bio</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 border border-amber-200">
                Notice: All new chef registrations start in <strong>Pending Approval</strong> status until reviewed by the Admin team.
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-extrabold text-xs shadow-md transition-all mt-4"
          >
            {mode === 'login'
              ? `Sign In as ${selectedRole.toUpperCase()}`
              : `Create ${selectedRole.toUpperCase()} Account`}
          </button>

          {/* Social Sign-In for Customer Role */}
          {selectedRole === 'customer' && (
            <div className="pt-2">
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-stone-400 font-semibold tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGoogleModalOpen(true)}
                className="w-full py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
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
            </div>
          )}
        </form>

      </div>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSuccess={() => {
          onSuccess('customer');
          onClose();
        }}
      />
    </div>
  );
};
