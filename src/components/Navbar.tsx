import React, { useState, useRef, useEffect } from 'react';
import {
  ChefHat,
  Bell,
  User,
  Shield,
  Home,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  Phone,
  Sparkles,
} from 'lucide-react';
import { appStore } from '../services/store';
import { UserRole } from '../types/database';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
  onOpenAuth: (defaultRole?: UserRole) => void;
  onOpenNotifications: () => void;
  onOpenLoginSelector?: () => void;
  onOpenContact?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenNotifications,
  onOpenLoginSelector,
  onOpenContact,
}) => {
  const [storeState, setStoreState] = useState(appStore.getState());
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
  }, []);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        loginDropdownRef.current &&
        !loginDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLoginDropdown(false);
      }
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { currentUser, activeRole, notifications } = storeState;

  const unreadCount = notifications.filter(
    (n) => n.recipientRole === activeRole && !n.read
  ).length;

  const handlePortalSelect = (portal: 'chef_login' | 'customer_login' | 'admin_login') => {
    setShowLoginDropdown(false);
    setMobileMenuOpen(false);
    onNavigate(portal);
  };

  const scrollToAbout = () => {
    setMobileMenuOpen(false);
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById('about-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B3027] text-white shadow-lg border-b border-[#14473b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left Brand: bookmychef.com Logo & Tagline */}
          <div 
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('landing');
            }}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            {/* Logo Image */}
            <div className="w-12 h-12 rounded-2xl bg-white p-1 overflow-hidden shadow-md group-hover:scale-105 transition-transform shrink-0 border border-amber-200/50">
              <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
            </div>

            <div>
              <div className="text-xl sm:text-2xl font-bold font-serif tracking-tight text-white leading-tight flex items-baseline">
                <span>bookmy<span className="text-[#D9A441]">chef</span></span>
                <span className="text-[#D9A441] text-xs font-mono font-bold ml-0.5">.com</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#D9A441] font-medium tracking-wide">
                Your Personal Chef, Booked.
              </p>
            </div>
          </div>

          {/* Center Navigation Links matching reference UI */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            
            {/* Home with active golden underline */}
            <button
              onClick={() => onNavigate('landing')}
              className={`flex items-center space-x-1.5 text-sm font-semibold transition-colors cursor-pointer py-1 ${
                currentView === 'landing'
                  ? 'text-[#D9A441] border-b-2 border-[#D9A441]'
                  : 'text-white/85 hover:text-[#D9A441]'
              }`}
            >
              <Home className="w-4 h-4 text-[#D9A441]" />
              <span>Home</span>
            </button>

            {/* Explore Chefs */}
            <button
              onClick={() => onNavigate('chefs')}
              className={`text-sm font-medium transition-colors cursor-pointer py-1 ${
                currentView === 'chefs'
                  ? 'text-[#D9A441] border-b-2 border-[#D9A441] font-semibold'
                  : 'text-white/85 hover:text-[#D9A441]'
              }`}
            >
              Explore Chefs
            </button>

            {/* About */}
            <button
              onClick={scrollToAbout}
              className="text-sm font-medium text-white/85 hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              About
            </button>

            {/* Contact */}
            <button
              onClick={() => {
                if (onOpenContact) onOpenContact();
                else scrollToAbout();
              }}
              className="text-sm font-medium text-white/85 hover:text-[#D9A441] transition-colors cursor-pointer py-1"
            >
              Contact
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">

            {/* Notifications Bell (if logged in or notifications exist) */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-full hover:bg-[#124236] text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="View notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#D9A441] text-[#0B3027] text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Quick Role Pill (shown on dashboard views or wide screens when active) */}
            {currentUser && (
              <div className="relative" ref={roleDropdownRef}>
                <button
                  onClick={() => {
                    setShowRoleDropdown(!showRoleDropdown);
                    setShowLoginDropdown(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#124236] hover:bg-[#185344] border border-[#D9A441]/40 text-xs text-left cursor-pointer transition-colors"
                >
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={currentUser.fullName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="font-semibold text-white max-w-[100px] truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-[#D9A441] font-bold capitalize">
                    ({activeRole})
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#D9A441]" />
                </button>

                {/* Role Switcher Menu */}
                {showRoleDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-stone-800 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-stone-100 bg-[#FFF8EC]">
                      <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Logged In As</p>
                      <p className="font-bold text-xs text-[#0B3027] truncate">{currentUser.fullName}</p>
                      <p className="text-[10px] text-[#D9A441] font-bold capitalize">{activeRole} Role</p>
                    </div>
                    <div className="p-1 space-y-1">
                      {currentUser.role === 'customer' && (
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            onNavigate('customer_dashboard');
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-stone-100 flex items-center justify-between"
                        >
                          <span>Customer Dashboard</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}

                      {currentUser.role === 'chef' && (
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            onNavigate('chef_dashboard');
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-stone-100 flex items-center justify-between"
                        >
                          <span>Chef Workspace</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}

                      {currentUser.role === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setShowRoleDropdown(false);
                              onNavigate('admin_portal');
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-stone-100 flex items-center justify-between"
                          >
                            <span>Admin Console</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-800" />
                          </button>
                          <button
                            onClick={() => {
                              setShowRoleDropdown(false);
                              onNavigate('chef_dashboard');
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-stone-100 flex items-center justify-between"
                          >
                            <span>Chef Workspace (Admin Preview)</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowRoleDropdown(false);
                              onNavigate('customer_dashboard');
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-stone-100 flex items-center justify-between"
                          >
                            <span>Customer Dashboard (Admin Preview)</span>
                          </button>
                        </>
                      )}

                      <div className="border-t border-stone-100 pt-1 mt-1">
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            const currentRole = currentUser?.role || 'customer';
                            appStore.logout();
                            const loginTarget = currentRole === 'chef' ? 'chef_login' : currentRole === 'admin' ? 'admin_login' : 'customer_login';
                            onNavigate(loginTarget, { replace: true });
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-between cursor-pointer"
                        >
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reference UI: Professional Pill Login Button with User Icon & Caret (Guest Only) */}
            {!currentUser && (
              <div className="relative" ref={loginDropdownRef}>
                <button
                  onClick={() => {
                    setShowLoginDropdown(!showLoginDropdown);
                    setShowRoleDropdown(false);
                  }}
                  className="flex items-center space-x-2 px-5 py-2 rounded-full border-2 border-[#D9A441] bg-[#0B3027] hover:bg-[#124236] text-white text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={showLoginDropdown}
                  title="Login to Chef, Customer, or Admin Portal"
                >
                  <User className="w-4 h-4 text-white" />
                  <span className="font-semibold tracking-wide">Login</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${
                      showLoginDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Reference UI: Dropdown Menu with Chef, Customer, and Admin Login */}
                {showLoginDropdown && (
                  <div className="absolute right-0 mt-3 w-72 bg-[#FFFDF8] rounded-2xl shadow-2xl border border-amber-200/60 p-2 z-50 text-stone-800 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      
                      {/* 1. Chef Login Option */}
                      <button
                        onClick={() => handlePortalSelect('chef_login')}
                        className="w-full text-left p-3 rounded-xl hover:bg-amber-50/80 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#0B3027] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                            <ChefHat className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-900 leading-snug">
                              Chef Login
                            </h4>
                            <p className="text-xs text-stone-500">
                              Manage your bookings
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#0B3027] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>

                      {/* 2. Customer Login Option */}
                      <button
                        onClick={() => handlePortalSelect('customer_login')}
                        className="w-full text-left p-3 rounded-xl hover:bg-amber-50/80 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#0B3027] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-900 leading-snug">
                              Customer Login
                            </h4>
                            <p className="text-xs text-stone-500">
                              Book a chef easily
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#0B3027] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>

                      {/* 3. Admin Login Option */}
                      <button
                        onClick={() => handlePortalSelect('admin_login')}
                        className="w-full text-left p-3 rounded-xl hover:bg-amber-50/80 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#0B3027] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                            <Shield className="w-5 h-5 text-[#D9A441]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-stone-900 leading-snug">
                              Admin Login
                            </h4>
                            <p className="text-xs text-stone-500">
                              Manage platform
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-[#0B3027] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>

                    </div>

                    {/* All Portals Selector Link */}
                    {onOpenLoginSelector && (
                      <div className="border-t border-amber-100/80 mt-1 pt-2 px-2 pb-1">
                        <button
                          onClick={() => {
                            setShowLoginDropdown(false);
                            onOpenLoginSelector();
                          }}
                          className="w-full py-1.5 text-center text-[11px] font-bold text-[#0B3027] hover:underline flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#D9A441]" />
                          <span>View Portal Comparison Hub</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#124236] text-white hover:bg-[#185344] transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#14473b] py-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('landing');
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-sm font-semibold hover:bg-[#124236]"
              >
                <Home className="w-4 h-4 text-[#D9A441]" />
                <span>Home</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('chefs');
                }}
                className="px-3 py-2 rounded-xl text-left text-sm font-medium hover:bg-[#124236]"
              >
                Explore Chefs
              </button>
              <button
                onClick={scrollToAbout}
                className="px-3 py-2 rounded-xl text-left text-sm font-medium hover:bg-[#124236]"
              >
                About
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenContact) onOpenContact();
                }}
                className="px-3 py-2 rounded-xl text-left text-sm font-medium hover:bg-[#124236]"
              >
                Contact
              </button>
            </div>

            {/* Mobile Account / Login Options */}
            {currentUser ? (
              <div className="bg-[#FFFDF8] p-3 rounded-2xl text-stone-800 shadow-md space-y-2">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-stone-200">
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={currentUser.fullName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-900 truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-[#D9A441] font-bold capitalize">{currentUser.role} Account</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const dashboardView = currentUser.role === 'chef' ? 'chef_dashboard' : currentUser.role === 'admin' ? 'admin_portal' : 'customer_dashboard';
                    onNavigate(dashboardView);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#173D2E] text-white font-bold text-xs flex items-center justify-between"
                >
                  <span>Open {currentUser.role === 'chef' ? 'Chef Workspace' : currentUser.role === 'admin' ? 'Admin Portal' : 'My Dashboard'}</span>
                  <ChevronRight className="w-4 h-4 text-[#D9A441]" />
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const role = currentUser.role;
                    appStore.logout();
                    const loginTarget = role === 'chef' ? 'chef_login' : role === 'admin' ? 'admin_login' : 'customer_login';
                    onNavigate(loginTarget, { replace: true });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs text-center transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="bg-[#FFFDF8] p-3 rounded-2xl text-stone-800 shadow-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B3027] mb-2 px-1">
                  Choose Login Portal:
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handlePortalSelect('chef_login')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B3027] flex items-center justify-center">
                        <ChefHat className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Chef Login</div>
                        <div className="text-[10px] text-stone-500">Manage bookings</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </button>

                  <button
                    onClick={() => handlePortalSelect('customer_login')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B3027] flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Customer Login</div>
                        <div className="text-[10px] text-stone-500">Book a chef easily</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </button>

                  <button
                    onClick={() => handlePortalSelect('admin_login')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B3027] flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[#D9A441]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Admin Login</div>
                        <div className="text-[10px] text-stone-500">Manage platform</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
