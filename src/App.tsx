import React, { useState, useEffect } from 'react';
import { Chef, Booking, BookingPayment, UserRole, EventType, FoodType } from './types/database';
import { appStore } from './services/store';

// Components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingHero } from './components/LandingHero';
import { CategoryGrid } from './components/CategoryGrid';
import { FeaturedChefs } from './components/FeaturedChefs';
import { HowItWorks } from './components/HowItWorks';
import { WhyChooseUs } from './components/WhyChooseUs';
import { ChefDirectory } from './components/ChefDirectory';
import { ChefDetailModal } from './components/ChefDetailModal';
import { BookingFormModal } from './components/BookingFormModal';
import { RazorpayModal } from './components/RazorpayModal';
import { UpiPaymentModal } from './components/UpiPaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomerDashboard } from './components/CustomerDashboard';
import { ChefDashboard } from './components/ChefDashboard';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ReviewModal } from './components/ReviewModal';
import { ContactModal } from './components/ContactModal';

// Dedicated Premium Login Pages
import { CustomerLoginPage } from './pages/CustomerLoginPage';
import { ChefLoginPage } from './pages/ChefLoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { LoginSelectionModal } from './components/LoginSelectionModal';
import { Shield, ChefHat, User, ArrowRight, Lock } from 'lucide-react';

import { GuestRoute, ProtectedRoute } from './components/AuthRoutes';

import {
  getViewFromPath,
  getPathFromView,
  resolveGuardedNavigation,
  isGuestOnlyRoute,
  isProtectedRoute,
  getDashboardViewForRole,
  getLoginViewForRole,
} from './utils/authNavigation';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';

export default function App() {
  const [storeState, setStoreState] = useState(appStore.getState());
  
  // Initialize with route-guarded resolution (prevents flashing or landing on forbidden views)
  const [currentView, setCurrentView] = useState<string>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const initialView = getViewFromPath(pathname);
    const initialDecision = resolveGuardedNavigation(initialView, appStore.getState().currentUser);
    if (!initialDecision.allowed && initialDecision.redirectToView) {
      if (typeof window !== 'undefined') {
        window.history.replaceState({ view: initialDecision.redirectToView }, '', initialDecision.targetPath);
      }
      return initialDecision.redirectToView;
    }
    return initialView;
  });
  
  // Search & Filter state for Directory
  const [directoryFilters, setDirectoryFilters] = useState<{
    location?: string;
    specialty?: string;
    eventType?: EventType;
    foodType?: FoodType;
  }>({});

  // Active Modals
  const [selectedChefForDetail, setSelectedChefForDetail] = useState<Chef | null>(null);
  const [selectedChefForBooking, setSelectedChefForBooking] = useState<Chef | null>(null);
  const [bookingInitialSlot, setBookingInitialSlot] = useState<{ date: string; time: string } | undefined>(undefined);
  
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<BookingPayment | null>(null);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [contactInfo, setContactInfo] = useState<{ name: string; phone: string } | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<UserRole>('customer');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loginSelectorOpen, setLoginSelectorOpen] = useState(false);

  // Loading state for initial resolution and skeletons
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Subscribe to real-time store updates
  useEffect(() => {
    const unsub = appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 600);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  // Catch any lingering URL OAuth error params and clean them up gracefully
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (
      hash.includes('error=') ||
      search.includes('error=') ||
      hash.includes('validation_failed') ||
      search.includes('validation_failed') ||
      search.includes('provider')
    ) {
      console.warn('OAuth query/hash parameter detected and cleared:', hash || search);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen to browser forward/back buttons with route guarding and state replacement
  useEffect(() => {
    const handlePopState = () => {
      const targetPath = window.location.pathname;
      const poppedView = getViewFromPath(targetPath);
      const currentUser = appStore.getState().currentUser;
      const decision = resolveGuardedNavigation(poppedView, currentUser, { isPopState: true });

      if (!decision.allowed && decision.redirectToView) {
        // Forbidden navigation attempted via browser Back or Forward button!
        // Immediately replace the URL with the authorized route so user cannot re-enter forbidden route.
        window.history.replaceState({ view: decision.redirectToView }, '', decision.targetPath);
        setCurrentView(decision.redirectToView);
      } else {
        setCurrentView(poppedView);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guarded navigation handler supporting replaceState
  const handleNavigate = (view: string, options?: { replace?: boolean; data?: any }) => {
    const currentUser = appStore.getState().currentUser;
    const decision = resolveGuardedNavigation(view, currentUser, options);
    const finalView = decision.allowed ? (view as any) : (decision.redirectToView || 'landing');
    const targetPath = decision.targetPath;
    const shouldReplace = options?.replace || decision.shouldReplace || false;

    setCurrentView(finalView);
    if (typeof window !== 'undefined') {
      if (shouldReplace) {
        window.history.replaceState({ view: finalView }, '', targetPath);
      } else if (window.location.pathname !== targetPath) {
        window.history.pushState({ view: finalView }, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Continuous route protection: automatically redirects if auth state changes (e.g. login or logout)
  useEffect(() => {
    const decision = resolveGuardedNavigation(currentView, storeState.currentUser);
    if (!decision.allowed && decision.redirectToView) {
      window.history.replaceState({ view: decision.redirectToView }, '', decision.targetPath);
      setCurrentView(decision.redirectToView);
    }
  }, [storeState.currentUser, currentView]);

  // Global logout handler
  const handleLogout = () => {
    const currentRole = storeState.currentUser?.role || 'customer';
    appStore.logout();
    const loginTarget = currentRole === 'chef' ? 'chef_login' : currentRole === 'admin' ? 'admin_login' : 'customer_login';
    handleNavigate(loginTarget, { replace: true });
  };

  // Supabase Auth Session restoration & listener: restores session on refresh and handles revocation
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      // 1. Restore active Supabase session on mount
      client.auth.getSession().then(async ({ data: { session }, error }) => {
        if (!error && session?.user) {
          const { data: profileData } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileData) {
            appStore.setCurrentUser(profileData);
          }
        }
      }).catch((err) => {
        console.warn('Supabase session restoration notice:', err);
      });

      // 2. Auth state change listener
      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          appStore.logout();
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data: profileData } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileData) {
            appStore.setCurrentUser(profileData);
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Search from hero
  const handleHeroSearch = (filters: {
    location?: string;
    specialty?: string;
    eventType?: EventType;
    foodType?: FoodType;
  }) => {
    setDirectoryFilters(filters);
    handleNavigate('chefs');
  };

  // Open Auth Modal
  const handleOpenAuth = (role: UserRole = 'customer') => {
    if (role === 'customer') {
      handleNavigate('customer_login');
    } else if (role === 'chef') {
      handleNavigate('chef_login');
    } else if (role === 'admin') {
      handleNavigate('admin_login');
    } else {
      setAuthDefaultRole(role);
      setAuthModalOpen(true);
    }
  };

  // Handle booking form submission
  const handleSubmitBooking = (bookingData: any) => {
    try {
      appStore.createBooking(bookingData);
      setSelectedChefForBooking(null);
      handleNavigate('customer_dashboard');
    } catch (err: any) {
      alert(err?.message || 'Unable to submit booking.');
    }
  };

  // Handle payment success
  const handlePaymentSuccess = (paymentData: any) => {
    if (!payingBooking) return;
    try {
      const payment = appStore.confirmPayment(payingBooking.id, paymentData);
      const updated = appStore.getState().bookings.find((b) => b.id === payingBooking.id) || payingBooking;
      setPayingBooking(null);
      setReceiptBooking(updated);
      setReceiptPayment(payment || null);
    } catch (err: any) {
      alert(err?.message || 'Payment verification failed.');
    }
  };

  const isDedicatedAuthPage =
    currentView === 'customer_login' ||
    currentView === 'chef_login' ||
    currentView === 'admin_login';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EC] text-stone-900 selection:bg-[#D9A441] selection:text-[#173D2E]">
      
      {/* Top Navbar (Hidden on dedicated full-page login views) */}
      {!isDedicatedAuthPage && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenAuth={handleOpenAuth}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenLoginSelector={() => setLoginSelectorOpen(true)}
          onOpenContact={() =>
            setContactInfo({
              name: 'ChefConnect 24/7 Helpline',
              phone: '+91 800-243-3266',
            })
          }
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* VIEW: Customer Dedicated Login Page */}
        {currentView === 'customer_login' && (
          <GuestRoute
            currentUser={storeState.currentUser}
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <CustomerLoginPage
              onNavigate={handleNavigate}
              onLoginSuccess={() => handleNavigate('customer_dashboard', { replace: true })}
            />
          </GuestRoute>
        )}

        {/* VIEW: Chef Dedicated Login Page */}
        {currentView === 'chef_login' && (
          <GuestRoute
            currentUser={storeState.currentUser}
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <ChefLoginPage
              onNavigate={handleNavigate}
              onLoginSuccess={() => handleNavigate('chef_dashboard', { replace: true })}
            />
          </GuestRoute>
        )}

        {/* VIEW: Admin Dedicated Login Page */}
        {currentView === 'admin_login' && (
          <GuestRoute
            currentUser={storeState.currentUser}
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <AdminLoginPage
              onNavigate={handleNavigate}
              onLoginSuccess={() => handleNavigate('admin_portal', { replace: true })}
            />
          </GuestRoute>
        )}

        {/* VIEW: Landing Page */}
        {currentView === 'landing' && (
          <div>
            <LandingHero
              onSearch={handleHeroSearch}
              onExploreChefs={() => handleNavigate('chefs')}
              onOpenBookingExample={() => {
                const sweetChef = storeState.chefs.find((c) =>
                  c.specialties.includes('Sweets & Laddu Preparation')
                ) || storeState.chefs[0];
                setSelectedChefForBooking(sweetChef);
              }}
            />

            <CategoryGrid
              categories={storeState.categories}
              onSelectCategory={(categoryName) => {
                setDirectoryFilters({ specialty: categoryName });
                handleNavigate('chefs');
              }}
            />

            <FeaturedChefs
              chefs={storeState.chefs}
              onSelectChef={(chef) => setSelectedChefForDetail(chef)}
              onViewAllChefs={() => {
                setDirectoryFilters({});
                handleNavigate('chefs');
              }}
            />

            <div id="about-section">
              <HowItWorks />
              <WhyChooseUs reviews={storeState.reviews} />
            </div>
          </div>
        )}

        {/* VIEW: Chefs Directory */}
        {currentView === 'chefs' && (
          <ChefDirectory
            chefs={storeState.chefs}
            initialFilters={directoryFilters}
            isLoading={isInitialLoading}
            onSelectChef={(chef) => setSelectedChefForDetail(chef)}
          />
        )}

        {/* VIEW: Customer Dashboard with Role Protection */}
        {currentView === 'customer_dashboard' && (
          <ProtectedRoute
            currentUser={storeState.currentUser}
            allowedRoles={['customer', 'admin']}
            fallbackLoginView="customer_login"
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <CustomerDashboard
              isLoading={isInitialLoading}
              onFindChef={() => handleNavigate('chefs')}
              onSelectChefForBooking={(chef) => setSelectedChefForBooking(chef)}
              onPayBooking={(booking) => setPayingBooking(booking)}
              onViewReceipt={(booking, payment) => {
                setReceiptBooking(booking);
                setReceiptPayment(payment);
              }}
              onWriteReview={(booking) => setReviewBooking(booking)}
              onContactChef={(name, phone) => setContactInfo({ name, phone })}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        )}

        {/* VIEW: Chef Dashboard with Role Protection */}
        {currentView === 'chef_dashboard' && (
          <ProtectedRoute
            currentUser={storeState.currentUser}
            allowedRoles={['chef', 'admin']}
            fallbackLoginView="chef_login"
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <ChefDashboard
              isLoading={isInitialLoading}
              onContactCustomer={(name, phone) => setContactInfo({ name, phone })}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        )}

        {/* VIEW: Admin Portal with Strict Role Protection */}
        {currentView === 'admin_portal' && (
          <ProtectedRoute
            currentUser={storeState.currentUser}
            allowedRoles={['admin']}
            fallbackLoginView="admin_login"
            isLoading={isInitialLoading}
            onNavigate={handleNavigate}
          >
            <AdminPortal isLoading={isInitialLoading} onLogout={handleLogout} />
          </ProtectedRoute>
        )}

      </main>

      {/* Footer (Hidden on dedicated full-page login views) */}
      {!isDedicatedAuthPage && (
        <Footer onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
      )}

      {/* MODAL: Chef Details & Availability */}
      {selectedChefForDetail && (
        <ChefDetailModal
          chef={selectedChefForDetail}
          reviews={storeState.reviews}
          onClose={() => setSelectedChefForDetail(null)}
          onProceedToBooking={(chef, slot) => {
            setSelectedChefForDetail(null);
            setSelectedChefForBooking(chef);
            setBookingInitialSlot(slot);
          }}
        />
      )}

      {/* MODAL: Cooking Requirements Form */}
      {selectedChefForBooking && (
        <BookingFormModal
          chef={selectedChefForBooking}
          initialSlot={bookingInitialSlot}
          onClose={() => setSelectedChefForBooking(null)}
          onSubmitBooking={handleSubmitBooking}
        />
      )}

      {/* MODAL: BookMyChef Static UPI QR Scan & Pay Checkout */}
      {payingBooking && (
        <UpiPaymentModal
          booking={payingBooking}
          onClose={() => setPayingBooking(null)}
          onPaymentSubmitted={() => setPayingBooking(null)}
        />
      )}

      {/* MODAL: Receipt & Proof of Payment */}
      {receiptBooking && (
        <ReceiptModal
          booking={receiptBooking}
          payment={receiptPayment}
          onClose={() => {
            setReceiptBooking(null);
            setReceiptPayment(null);
          }}
        />
      )}

      {/* MODAL: Review & Rating Submission */}
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitSuccess={() => {
            // Updated in store
          }}
        />
      )}

      {/* MODAL: Contact / Chat Modal */}
      {contactInfo && (
        <ContactModal
          recipientName={contactInfo.name}
          recipientPhone={contactInfo.phone}
          onClose={() => setContactInfo(null)}
        />
      )}

      {/* MODAL: Authentication with Show/Hide Password */}
      <AuthModal
        isOpen={authModalOpen}
        defaultRole={authDefaultRole}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(role) => {
          if (role === 'customer') handleNavigate('customer_dashboard', { replace: true });
          else if (role === 'chef') handleNavigate('chef_dashboard', { replace: true });
          else if (role === 'admin') handleNavigate('admin_portal', { replace: true });
        }}
      />

      {/* DRAWER: Notifications */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onSelectBooking={() => {
          if (storeState.activeRole === 'customer') {
            handleNavigate('customer_dashboard');
          } else if (storeState.activeRole === 'chef') {
            handleNavigate('chef_dashboard');
          }
        }}
      />

      {/* MODAL: Login Portals Selector (Chef, Customer, Admin) */}
      <LoginSelectionModal
        isOpen={loginSelectorOpen || currentView === 'login_hub'}
        onClose={() => {
          setLoginSelectorOpen(false);
          if (currentView === 'login_hub') {
            handleNavigate('landing');
          }
        }}
        onNavigate={handleNavigate}
      />

    </div>
  );
}
