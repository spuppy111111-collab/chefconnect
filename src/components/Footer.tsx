import React from 'react';
import { ChefHat, Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { UserRole } from '../types/database';

interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAuth }) => {
  return (
    <footer className="bg-[#173D2E] text-white border-t border-[#21543f] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#21543f]">
          
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 overflow-hidden shadow-md shrink-0 border border-amber-200/50">
                <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-2xl font-bold font-display text-white">
                  bookmy<span className="text-[#D9A441]">chef</span><span className="text-xs text-[#D9A441] font-mono">.com</span>
                </span>
                <p className="text-[11px] text-[#D9A441] font-medium">Your Personal Chef, Booked.</p>
              </div>
            </div>
            <p className="text-sm text-[#FFF8EC]/70 max-w-sm leading-relaxed mb-6">
              India's premier verified at-home chef booking platform. Handcrafted sweets, regional delicacies, and festive multi-course feasts cooked live in your home or event venue.
            </p>
            <div className="space-y-2 text-xs text-[#FFF8EC]/80">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-[#D9A441]" />
                <span>+91 800-243-3266 (ChefConnect Helpline)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#D9A441]" />
                <span>bookings@chefconnect.in</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#D9A441]" />
                <span>Financial District & Jubilee Hills, Hyderabad</span>
              </div>
            </div>
          </div>

          {/* Customer Portal Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D9A441] mb-4">
              Customer Portal
            </h4>
            <ul className="space-y-2.5 text-xs text-[#FFF8EC]/80">
              <li>
                <button onClick={() => onNavigate('chefs')} className="hover:text-white transition-colors">
                  Find a Chef
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('customer_dashboard')} className="hover:text-white transition-colors">
                  My Bookings
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('customer_dashboard')} className="hover:text-white transition-colors">
                  Upcoming Cooking Services
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('customer_dashboard')} className="hover:text-white transition-colors">
                  Payment History & Receipts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('customer_login')} className="hover:text-white transition-colors font-semibold text-[#D9A441]">
                  Customer Sign In (/customer/login)
                </button>
              </li>
            </ul>
          </div>

          {/* Chef Portal Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D9A441] mb-4">
              Chef Portal
            </h4>
            <ul className="space-y-2.5 text-xs text-[#FFF8EC]/80">
              <li>
                <button onClick={() => onNavigate('chef_login')} className="hover:text-white transition-colors font-semibold text-[#D9A441]">
                  Chef Partner Login (/chef/login)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('chef_dashboard')} className="hover:text-white transition-colors">
                  Chef Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('chef_dashboard')} className="hover:text-white transition-colors">
                  Manage Quotations & Bookings
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('chef_dashboard')} className="hover:text-white transition-colors">
                  Earnings & Availability
                </button>
              </li>
            </ul>
          </div>

          {/* Admin & Trust */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#D9A441] mb-4">
              Admin & Trust
            </h4>
            <ul className="space-y-2.5 text-xs text-[#FFF8EC]/80">
              <li>
                <button onClick={() => onNavigate('admin_login')} className="hover:text-white transition-colors font-semibold text-[#D9A441]">
                  Admin Console Login (/admin/login)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin_portal')} className="hover:text-white transition-colors">
                  Operations Console
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin_portal')} className="hover:text-white transition-colors">
                  Approve Chef Registrations
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin_portal')} className="hover:text-white transition-colors">
                  PostgreSQL / Supabase Schema
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin_portal')} className="hover:text-white transition-colors">
                  Platform Commission Settings
                </button>
              </li>
              <li>
                <span className="inline-flex items-center text-emerald-300 font-semibold mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#D9A441]" />
                  Razorpay Secured
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#FFF8EC]/60 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} ChefConnect Inc. All rights reserved.</p>
          <p className="flex items-center">
            Cooked with passion & pure ingredients <Heart className="w-3.5 h-3.5 mx-1 text-red-400 fill-current" /> for Indian homes
          </p>
        </div>

      </div>
    </footer>
  );
};
