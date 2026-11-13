import React from 'react';
import {
  X,
  User,
  ChefHat,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { appStore } from '../services/store';

interface LoginSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, data?: any) => void;
}

export const LoginSelectionModal: React.FC<LoginSelectionModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const handleSelectPortal = (view: 'customer_login' | 'chef_login' | 'admin_login') => {
    onClose();
    const currentUser = appStore.getState().currentUser;
    if (currentUser) {
      const dashboard = currentUser.role === 'chef' ? 'chef_dashboard' : currentUser.role === 'admin' ? 'admin_portal' : 'customer_dashboard';
      onNavigate(dashboard, { replace: true });
    } else {
      onNavigate(view);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF8EC] rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 md:p-8 border border-[#D9A441]/40 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
      >
        {/* Decorative ambient background accents */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#D9A441]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#173D2E]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button with touch target */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors z-20 touch-manipulation"
          aria-label="Close login portal selector"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container on Mobile */}
        <div className="overflow-y-auto overscroll-contain pr-1 sm:pr-2 space-y-6">
          
          {/* Header with Logo */}
          <div className="text-center max-w-2xl mx-auto pt-1 sm:pt-0">
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 overflow-hidden shadow-md border border-[#D9A441]/40">
                <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#173D2E] text-[#FFF8EC] text-[11px] sm:text-xs font-bold mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>bookmychef.com Access Portals</span>
            </div>
            <h2 id="login-modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display text-[#173D2E]">
              Choose Your Login Portal
            </h2>
            <p className="mt-1.5 text-stone-600 text-xs sm:text-sm max-w-lg mx-auto">
              Select your role to access your customized booking schedules, chef quotations, or administrative controls.
            </p>
          </div>

          {/* 3 Portal Cards: 1 column on mobile, 3 columns on tablet/desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative z-10">
            
            {/* 1. Customer Login Card */}
            <div
              onClick={() => handleSelectPortal('customer_login')}
              className="group cursor-pointer bg-white rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-stone-200/90 hover:border-[#173D2E] hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-50 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100/80 text-[#173D2E] flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform shadow-sm">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#173D2E]" />
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#173D2E] text-[10px] font-extrabold uppercase tracking-wider mb-1.5 border border-emerald-200">
                  For Clients & Hosts
                </div>

                <h3 className="text-lg sm:text-xl font-bold font-display text-[#173D2E] group-hover:text-emerald-700 transition-colors">
                  Customer Login
                </h3>

                <p className="text-xs text-stone-600 mt-1 sm:mt-2 leading-relaxed">
                  Book professional at-home chefs for weddings, birthdays, poojas, and everyday home meals.
                </p>

                <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs text-stone-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Browse & filter verified chefs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Custom menu & dish quantities</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Track status & Razorpay payments</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-stone-100">
                <button
                  type="button"
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs bg-[#173D2E] group-hover:bg-[#0f291e] text-[#FFF8EC] flex items-center justify-center space-x-2 shadow-sm transition-colors min-h-[44px] touch-manipulation"
                >
                  <span>Sign In as Customer</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A441]" />
                </button>
                <p className="text-center text-[10px] text-stone-400 mt-1.5 font-mono">
                  /customer/login
                </p>
              </div>
            </div>

            {/* 2. Chef Login Card */}
            <div
              onClick={() => handleSelectPortal('chef_login')}
              className="group cursor-pointer bg-white rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-[#D9A441]/40 hover:border-[#D9A441] hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-[#FFF8EC] rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FFF8EC] text-[#173D2E] border border-[#D9A441]/40 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform shadow-sm">
                  <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-[#173D2E]" />
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 border border-amber-200">
                  For Culinary Artisans
                </div>

                <h3 className="text-lg sm:text-xl font-bold font-display text-[#173D2E] group-hover:text-amber-800 transition-colors">
                  Chef Partner Login
                </h3>

                <p className="text-xs text-stone-600 mt-1 sm:mt-2 leading-relaxed">
                  Accept booking requests, send dish quotations, manage availability calendar, and track direct bank payouts.
                </p>

                <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs text-stone-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
                    <span>Receive custom feast requests</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
                    <span>Set availability & block leave dates</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
                    <span>Revise quotation & earnings tracker</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-stone-100">
                <button
                  type="button"
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs bg-[#D9A441] hover:bg-[#c49132] text-[#173D2E] flex items-center justify-center space-x-2 shadow-sm transition-colors min-h-[44px] touch-manipulation"
                >
                  <span>Sign In as Chef</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#173D2E]" />
                </button>
                <p className="text-center text-[10px] text-stone-400 mt-1.5 font-mono">
                  /chef/login
                </p>
              </div>
            </div>

            {/* 3. Admin Login Card */}
            <div
              onClick={() => handleSelectPortal('admin_login')}
              className="group cursor-pointer bg-white rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-stone-200/90 hover:border-stone-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-stone-100 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform shadow-sm">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-stone-800" />
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-extrabold uppercase tracking-wider mb-1.5 border border-stone-300">
                  Staff & Operations
                </div>

                <h3 className="text-lg sm:text-xl font-bold font-display text-stone-900 group-hover:text-black transition-colors">
                  Admin Console
                </h3>

                <p className="text-xs text-stone-600 mt-1 sm:mt-2 leading-relaxed">
                  Approve newly registered chefs, manage platform commission rates, audit database records, and monitor disputes.
                </p>

                <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs text-stone-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                    <span>Chef identity & hygiene verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                    <span>Platform revenue & dispute refunds</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                    <span>Database schema & RLS audits</span>
                  </li>
                </ul>
              </div>

              <div className="mt-5 sm:mt-6 pt-3.5 sm:pt-4 border-t border-stone-100">
                <button
                  type="button"
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs bg-stone-900 group-hover:bg-black text-white flex items-center justify-center space-x-2 shadow-sm transition-colors min-h-[44px] touch-manipulation"
                >
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A441]" />
                </button>
                <p className="text-center text-[10px] text-stone-400 mt-1.5 font-mono">
                  /admin/login
                </p>
              </div>
            </div>

          </div>

          {/* Footer Quick Links */}
          <div className="pt-4 border-t border-[#D9A441]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2.5">
            <div className="flex items-center space-x-2 text-[11px] text-center sm:text-left">
              <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>256-Bit SSL Encrypted Authentication • Role-Based Access Control</span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4 font-medium text-[11px] sm:text-xs">
              <button
                onClick={() => {
                  onClose();
                  onNavigate('chefs');
                }}
                className="text-[#173D2E] hover:underline"
              >
                Browse Chefs First
              </button>
              <span className="text-stone-300">•</span>
              <button
                onClick={() => {
                  onClose();
                  onNavigate('customer_login');
                }}
                className="text-[#173D2E] hover:underline font-bold"
              >
                New Customer Registration
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
