import React, { useState, useMemo } from 'react';
import {
  Booking,
  BookingPayment,
  Chef,
  CustomerAddress,
  DietaryPreferences,
  Review,
  SupportTicket,
  UserRole,
} from '../types/database';
import {
  ChefHat,
  LayoutDashboard,
  Search,
  Calendar,
  Clock,
  CreditCard,
  Heart,
  Star,
  Bell,
  User,
  HelpCircle,
  LogOut,
  MapPin,
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ArrowRight,
  Phone,
  MessageSquare,
  FileText,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Flame,
  Menu,
  X,
  Send,
  RefreshCw,
  Eye,
  Crown,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import { getBookingStatusBadge, getPaymentStatusBadge } from '../utils/bookingWorkflow';
import { appStore } from '../services/store';
import { CustomerDashboardHome } from './CustomerDashboardHome';
import { FoodItemSelectDropdown } from './FoodItemSelectDropdown';
import { ChefCard } from './ChefCard';
import { ChefDetailModal } from './ChefDetailModal';
import { getDynamicFoodCatalog, filterAndRankChefs } from '../utils/foodItemsCatalog';
import { getDynamicCategoriesFromApprovedChefs } from '../utils/dynamicCategories';
import { getChefStats } from '../utils/chefStats';
import { ChefCardSkeleton } from './skeletons/ChefCardSkeleton';
import { DashboardStatsSkeleton, BookingCardSkeleton } from './skeletons/DashboardSkeletons';

interface CustomerDashboardProps {
  isLoading?: boolean;
  onFindChef: () => void;
  onSelectChefForBooking: (chef: Chef) => void;
  onPayBooking: (booking: Booking) => void;
  onViewReceipt: (booking: Booking, payment: BookingPayment | null) => void;
  onWriteReview: (booking: Booking) => void;
  onContactChef: (chefName: string, phone: string) => void;
  onLogout?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  isLoading = false,
  onFindChef,
  onSelectChefForBooking,
  onPayBooking,
  onViewReceipt,
  onWriteReview,
  onContactChef,
  onLogout,
}) => {
  const [storeState, setStoreState] = useState(appStore.getState());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<
    | 'dashboard'
    | 'find_chef'
    | 'book_chef'
    | 'my_bookings'
    | 'food_menu'
    | 'upcoming'
    | 'history'
    | 'payments'
    | 'saved_chefs'
    | 'reviews'
    | 'notifications'
    | 'profile'
    | 'settings'
    | 'help'
  >('dashboard');

  // Food & Menu Filter
  const [menuFilterCategory, setMenuFilterCategory] = useState<string>('all');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');

  // Settings & Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Dietary preferences state
  const [prefVegetarian, setPrefVegetarian] = useState(storeState.currentUser?.dietaryPreferences?.isVegetarian ?? false);
  const [prefJain, setPrefJain] = useState(storeState.currentUser?.dietaryPreferences?.isJain ?? false);
  const [prefSpiceLevel, setPrefSpiceLevel] = useState(storeState.currentUser?.dietaryPreferences?.spiceLevel ?? 'medium');
  const [prefAllergies, setPrefAllergies] = useState((storeState.currentUser?.dietaryPreferences?.allergies || []).join(', '));
  const [prefSpecialNotes, setPrefSpecialNotes] = useState(storeState.currentUser?.dietaryPreferences?.specialInstructions ?? '');
  const [dietarySavedMsg, setDietarySavedMsg] = useState(false);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Bookings sub-tab filter
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  // Search in dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('');
  const [selectedFoodItems, setSelectedFoodItems] = useState<string[]>([]);
  const [customerLocationFilter, setCustomerLocationFilter] = useState<string>('');
  const [exploreMaxBudget, setExploreMaxBudget] = useState<number | undefined>(undefined);
  const [exploreAvailableTodayOnly, setExploreAvailableTodayOnly] = useState<boolean>(false);
  const [selectedChefForDetail, setSelectedChefForDetail] = useState<Chef | null>(null);

  // Modals inside customer dashboard
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState<'Home' | 'Office' | 'Event Venue' | 'Other'>('Home');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('Hyderabad');
  const [newAddressLandmark, setNewAddressLandmark] = useState('');

  // Reschedule modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel booking modal
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');
  const [cancelErrorMsg, setCancelErrorMsg] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  // Booking Confirmation & Details Modal
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  // Support Ticket Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState<'booking' | 'refund' | 'chef_behavior' | 'billing' | 'general'>('booking');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Profile editable state
  const [profileName, setProfileName] = useState(storeState.currentUser?.fullName || '');
  const [profileEmail, setProfileEmail] = useState(storeState.currentUser?.email || '');
  const [profilePhone, setProfilePhone] = useState(storeState.currentUser?.phone || '');
  const [dietaryType, setDietaryType] = useState<any>(storeState.currentUser?.dietaryPreferences?.dietType || 'vegetarian');
  const [spiceLevel, setSpiceLevel] = useState<any>(storeState.currentUser?.dietaryPreferences?.spiceLevel || 'medium');
  const [isLowOil, setIsLowOil] = useState<boolean>(Boolean(storeState.currentUser?.dietaryPreferences?.isLowOil ?? true));
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  React.useEffect(() => {
    return appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
  }, []);

  const { currentUser, bookings, payments, reviews, chefs, notifications, supportTickets } = storeState;

  // Dynamic food catalog derived from chef profiles, menu items, and cooking categories
  const dynamicFoodCatalog = useMemo(() => {
    return getDynamicFoodCatalog(chefs, storeState.cookingServices, storeState.categories);
  }, [chefs, storeState.cookingServices, storeState.categories]);

  // Filter user records
  const userBookings = useMemo(() => {
    return bookings.filter((b) => b.customerId === currentUser?.id);
  }, [bookings, currentUser?.id]);

  const upcomingBookings = useMemo(() => {
    return userBookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'accepted' || b.status === 'pending'
    );
  }, [userBookings]);

  const confirmedUpcoming = useMemo(() => {
    return userBookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress');
  }, [userBookings]);

  const completedBookings = useMemo(() => {
    return userBookings.filter((b) => b.status === 'completed');
  }, [userBookings]);

  const cancelledBookings = useMemo(() => {
    return userBookings.filter((b) => b.status === 'cancelled');
  }, [userBookings]);

  const historyBookings = useMemo(() => {
    return userBookings.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected');
  }, [userBookings]);

  const filteredHistoryBookings = useMemo(() => {
    if (historyStatusFilter === 'completed') {
      return userBookings.filter((b) => b.status === 'completed');
    }
    if (historyStatusFilter === 'cancelled') {
      return userBookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
    }
    return historyBookings;
  }, [userBookings, historyBookings, historyStatusFilter]);

  const totalSpent = useMemo(() => {
    return payments
      .filter((p) => p.customerId === currentUser?.id && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentUser?.id]);

  const nextBooking = confirmedUpcoming[0] || upcomingBookings[0] || null;

  const savedChefs = useMemo(() => {
    const savedIds = currentUser?.savedChefIds || [];
    return chefs.filter((c) => savedIds.includes(c.id));
  }, [chefs, currentUser?.savedChefIds]);

  const userReviews = useMemo(() => {
    return reviews.filter((r) => r.customerId === currentUser?.id);
  }, [reviews, currentUser?.id]);

  const userNotifications = useMemo(() => {
    return notifications.filter((n) => n.recipientRole === 'customer');
  }, [notifications]);

  const unreadNotifsCount = userNotifications.filter((n) => !n.read).length;

  // Filtered bookings according to tab
  const filteredBookingsByStatus = useMemo(() => {
    if (bookingStatusFilter === 'all') return userBookings;
    return userBookings.filter((b) => b.status === bookingStatusFilter);
  }, [userBookings, bookingStatusFilter]);

  // Handle saving new address
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine.trim()) return;
    appStore.addCustomerAddress({
      customerId: currentUser?.id || 'user-cust-1',
      label: newAddressLabel,
      addressLine: newAddressLine,
      city: newAddressCity,
      landmark: newAddressLandmark,
      isDefault: false,
    });
    setShowAddressModal(false);
    setNewAddressLine('');
    setNewAddressLandmark('');
  };

  // Handle profile update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.updateProfile({
      fullName: profileName,
      email: profileEmail,
      phone: profilePhone,
      dietaryPreferences: {
        dietType: dietaryType,
        spiceLevel,
        isNutFree: false,
        isLowOil,
      },
    });
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2500);
  };

  // Handle support ticket submit
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    appStore.submitSupportTicket({
      customerId: currentUser?.id || 'user-cust-1',
      customerName: currentUser?.fullName || 'Customer',
      customerEmail: currentUser?.email || 'customer@example.com',
      subject: supportSubject,
      category: supportCategory,
      message: supportMessage,
    });
    setSupportSuccess(true);
    setTimeout(() => {
      setSupportSuccess(false);
      setShowSupportModal(false);
      setSupportSubject('');
      setSupportMessage('');
    }, 1800);
  };

  // Handle reschedule request
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || !rescheduleDate) return;
    appStore.requestReschedule(
      rescheduleBooking.id,
      rescheduleDate,
      rescheduleTime,
      rescheduleReason || 'Family schedule timing change',
      'customer'
    );
    setRescheduleBooking(null);
    setRescheduleDate('');
  };

  // Handle cancellation
  const handleConfirmCancel = () => {
    if (!cancelModalBooking) return;
    try {
      const reasonToSave = cancelReason.trim() || 'Cancelled by customer';
      appStore.cancelBooking(cancelModalBooking.id, reasonToSave, 'customer');
      setCancelSuccessMsg(`Booking #${cancelModalBooking.bookingNumber} with ${cancelModalBooking.chefName} has been cancelled.`);
      setCancelModalBooking(null);
      setCancelReason('');
      setCancelErrorMsg('');
      setTimeout(() => setCancelSuccessMsg(''), 5000);
    } catch (err: any) {
      setCancelErrorMsg(err?.message || 'Failed to cancel booking.');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'find_chef', label: 'Explore Chefs', icon: <Search className="w-5 h-5" /> },
    { id: 'book_chef', label: 'Book a Chef', icon: <ChefHat className="w-5 h-5" /> },
    {
      id: 'my_bookings',
      label: 'My Bookings',
      icon: <Calendar className="w-5 h-5" />,
      badge: upcomingBookings.length > 0 ? `${upcomingBookings.length}` : undefined,
    },
    { id: 'food_menu', label: 'Food & Menu', icon: <Utensils className="w-5 h-5" /> },
    { id: 'saved_chefs', label: 'Favorite Chefs', icon: <Heart className="w-5 h-5" />, count: savedChefs.length },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'reviews', label: 'My Reviews', icon: <Star className="w-5 h-5" /> },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
    },
    { id: 'profile', label: 'My Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <ShieldCheck className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8EC] flex flex-col lg:flex-row text-[#24352D]">
      
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-[#173D2E] text-white p-3.5 sm:p-4 flex items-center justify-between sticky top-0 sm:top-20 z-30 shadow-md">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-[#0B3027] text-[#D9A441] touch-manipulation"
          aria-label="Toggle Navigation Menu"
        >
          {sidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <div className="flex items-center space-x-2">
          <ChefHat className="w-5 h-5 text-[#D9A441]" />
          <span className="font-bold text-xs sm:text-sm tracking-tight">Customer Dashboard</span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D9A441]">
          <img src={currentUser?.avatarUrl} alt="" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Left Sidebar (Desktop Fixed & Mobile Drawer) */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-20 z-40 h-[100vh] lg:h-[calc(100vh-5rem)] w-72 max-w-[85vw] bg-[#173D2E] text-white flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 sm:p-6 overflow-y-auto">
          {/* Logo in sidebar */}
          <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-[#21543f]">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-white p-1 overflow-hidden shadow-md shrink-0 border border-amber-200/50">
                <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg font-bold font-display text-white">
                  bookmy<span className="text-[#D9A441]">chef</span><span className="text-[10px] text-[#D9A441] font-mono">.com</span>
                </span>
                <p className="text-[10px] text-[#FFF8EC]/60 uppercase tracking-wider font-semibold">
                  Customer Portal
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#FFF8EC]/70 hover:text-white hover:bg-white/10 touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs font-semibold">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id as any);
                    setSidebarOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#D9A441] text-[#173D2E] font-bold shadow-md scale-[1.02]'
                      : 'text-[#FFF8EC]/80 hover:text-white hover:bg-[#0B3027]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-[#173D2E]' : 'text-[#D9A441]'}>
                      {item.icon}
                    </span>
                    <span className="tracking-wide">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-[#173D2E] text-[#D9A441]'
                          : 'bg-[#D9A441] text-[#173D2E]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-[#21543f] bg-[#0B3027]/70 m-4 rounded-2xl">
          <div className="flex items-center space-x-3">
            <img
              src={currentUser?.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-[#D9A441]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.fullName}</p>
              <p className="text-[11px] text-[#D9A441] truncate">{currentUser?.email}</p>
            </div>
            <button
              onClick={() => appStore.switchRole('chef')}
              title="Switch to Chef Portal"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFF8EC]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full mt-3 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-200 text-xs font-bold border border-red-800/40 transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-stone-200/80 px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 lg:top-20 z-20 shadow-2xs">
          <div className="flex items-center space-x-4 flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chefs, regional cuisines, laddus, biryani..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-stone-200 bg-[#FFF8EC]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications Button */}
            <button
              onClick={() => setActiveNav('notifications')}
              className="relative p-2.5 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-[#D9A441] text-[#173D2E] text-xs font-black rounded-full flex items-center justify-center">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* User Profile Pill */}
            <div
              onClick={() => setActiveNav('profile')}
              className="flex items-center space-x-2.5 pl-2 cursor-pointer group"
            >
              <img
                src={currentUser?.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-[#D9A441]"
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="font-bold text-[#173D2E] block group-hover:text-[#D9A441] transition-colors truncate max-w-[120px]">
                  {currentUser?.fullName}
                </span>
                <span className="text-[10px] text-stone-400 font-semibold uppercase">
                  Verified Host
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body Container */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          
          {/* ======================================================== */}
          {/* MODULE 1: DASHBOARD HOME – PREMIUM REDESIGN */}
          {/* ======================================================== */}
          {activeNav === 'dashboard' && (
            <CustomerDashboardHome
              currentUser={currentUser}
              chefs={chefs}
              bookings={bookings}
              reviews={reviews}
              onNavigateTab={setActiveNav}
              onSelectChefForBooking={onSelectChefForBooking}
              onViewChefProfile={(chef) => setSelectedChefForDetail(chef)}
              onToggleSaveChef={(id) => appStore.toggleSaveChef(id)}
              selectedFoodItems={selectedFoodItems}
              onChangeSelectedFoodItems={setSelectedFoodItems}
              customerLocationFilter={customerLocationFilter}
              onChangeCustomerLocationFilter={setCustomerLocationFilter}
              onSelectSpecialtyFilter={(spec) => {
                setSelectedSpecialtyFilter(spec);
                setActiveNav('find_chef');
              }}
              onPayBooking={onPayBooking}
              onContactChef={onContactChef}
              nextBooking={nextBooking}
              dynamicFoodCatalog={dynamicFoodCatalog}
            />
          )}

          {/* ======================================================== */}
          {/* MODULE 2: FIND A CHEF DIRECTORY */}
          {/* ======================================================== */}
          {activeNav === 'find_chef' && (() => {
            const hasActiveFilters =
              selectedFoodItems.length > 0 ||
              Boolean(customerLocationFilter.trim()) ||
              Boolean(searchQuery.trim()) ||
              Boolean(selectedSpecialtyFilter) ||
              Boolean(exploreMaxBudget) ||
              exploreAvailableTodayOnly;

            const {
              rankedChefs,
              evaluations,
              totalFullMatches,
            } = filterAndRankChefs({
              chefs,
              selectedFoodItems,
              customerLocation: customerLocationFilter,
              searchQuery,
              selectedSpecialtyFilter,
              maxBudget: exploreMaxBudget,
              availableTodayOnly: exploreAvailableTodayOnly,
              cookingServices: storeState.cookingServices,
            });

            const resetExploreFilters = () => {
              setSelectedFoodItems([]);
              setCustomerLocationFilter('');
              setSearchQuery('');
              setSelectedSpecialtyFilter('');
              setExploreMaxBudget(undefined);
              setExploreAvailableTodayOnly(false);
            };

            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Find a Chef</h2>
                  <p className="text-xs text-stone-500">
                    Select your favorite food items, enter your location, and automatically discover verified chefs who serve your neighborhood.
                  </p>
                </div>

                {/* Filter and Search Box */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Searchable Food Items Dropdown */}
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1.5 flex items-center space-x-1.5">
                        <Utensils className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>Food Items & Dishes (Multi-select)</span>
                      </label>
                      <FoodItemSelectDropdown
                        selectedItems={selectedFoodItems}
                        onChange={setSelectedFoodItems}
                        categories={dynamicFoodCatalog}
                        placeholder="Search food (e.g. Biryani, Dosa, Paneer, Laddu)..."
                      />
                    </div>

                    {/* 2. Customer Location Input */}
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1.5 flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>Your Location (City or Neighborhood)</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerLocationFilter}
                          onChange={(e) => setCustomerLocationFilter(e.target.value)}
                          placeholder="e.g. Madhapur, Jubilee Hills, Guntur, Kukatpally..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#173D2E] bg-white shadow-xs"
                        />
                        {customerLocationFilter && (
                          <button
                            type="button"
                            onClick={() => setCustomerLocationFilter('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Combined Filters: Budget & Availability */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-bold text-stone-600 shrink-0">Max Budget:</label>
                      <select
                        value={exploreMaxBudget ?? ''}
                        onChange={(e) => setExploreMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full py-1.5 px-3 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E] bg-stone-50"
                      >
                        <option value="">Any Hourly Budget</option>
                        <option value="350">Up to ₹350/hr</option>
                        <option value="450">Up to ₹450/hr</option>
                        <option value="550">Up to ₹550/hr</option>
                        <option value="750">Up to ₹750/hr</option>
                        <option value="1000">Up to ₹1,000/hr</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3 sm:justify-end">
                      <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exploreAvailableTodayOnly}
                          onChange={(e) => setExploreAvailableTodayOnly(e.target.checked)}
                          className="w-4 h-4 rounded text-[#173D2E] focus:ring-[#173D2E]"
                        />
                        <span className="text-xs font-bold text-stone-700 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Available Today Only</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Secondary Filter & Results Info Bar */}
                  <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-600">
                        Showing <strong className="text-[#173D2E] font-black">{rankedChefs.length}</strong> available chefs
                      </span>
                      {selectedFoodItems.length > 0 && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                          Matching: {selectedFoodItems.join(', ')}
                        </span>
                      )}
                      {selectedFoodItems.length > 1 && totalFullMatches > 0 && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                          ✨ {totalFullMatches} {totalFullMatches === 1 ? 'chef prepares' : 'chefs prepare'} all selected items
                        </span>
                      )}
                      {customerLocationFilter.trim() && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                          Serving: {customerLocationFilter}
                        </span>
                      )}
                      {exploreMaxBudget && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                          ≤ ₹{exploreMaxBudget}/hr
                        </span>
                      )}
                      {exploreAvailableTodayOnly && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          ⚡ Available Today
                        </span>
                      )}
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetExploreFilters}
                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chef Cards Grid or Empty State */}
                {rankedChefs.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 shadow-sm max-w-xl mx-auto my-8">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-[#D9A441] flex items-center justify-center mx-auto mb-4 border border-amber-200">
                      <Search className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-[#173D2E]">
                      No chefs available for your selected food items and location. Try changing your filters.
                    </h3>
                    <p className="mt-2 text-xs text-stone-500 leading-relaxed">
                      Try removing some food items, checking a nearby neighborhood, or resetting your filter criteria.
                    </p>
                    <button
                      type="button"
                      onClick={resetExploreFilters}
                      className="mt-6 px-6 py-2.5 rounded-xl bg-[#173D2E] text-[#FFF8EC] font-bold text-xs hover:bg-[#0f291e] transition-colors shadow-sm"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rankedChefs.map((chef) => {
                      const isSaved = currentUser?.savedChefIds?.includes(chef.id);
                      const evalInfo = evaluations.get(chef.id);
                      return (
                        <ChefCard
                          key={chef.id}
                          chef={chef}
                          bookings={bookings}
                          reviews={reviews}
                          matchedInfo={evalInfo}
                          isSaved={isSaved}
                          onToggleSave={(id) => appStore.toggleSaveChef(id)}
                          onViewProfile={(c) => setSelectedChefForDetail(c)}
                          onBookChef={(c) => onSelectChefForBooking(c)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* MODULE: BOOK A CHEF */}
          {/* ======================================================== */}
          {activeNav === 'book_chef' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-[#173D2E] to-[#0B3027] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
                <div className="max-w-2xl relative z-10">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D9A441]/20 text-[#D9A441] text-xs font-bold mb-3 border border-[#D9A441]/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Simple 3-Step Booking</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight">
                    Hire a Professional Chef for Your Next Gathering
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#FFF8EC]/80 leading-relaxed">
                    Select an approved culinary artisan, customize your food preferences, and receive fresh dishes prepared live right in your home kitchen.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 relative z-10">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-[#D9A441] text-[#173D2E] font-black text-xs flex items-center justify-center mb-2">1</div>
                    <h4 className="font-bold text-sm">Choose Your Chef</h4>
                    <p className="text-[11px] text-[#FFF8EC]/70 mt-1">Pick based on verified rating, cuisine specialties, and hourly rate.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-[#D9A441] text-[#173D2E] font-black text-xs flex items-center justify-center mb-2">2</div>
                    <h4 className="font-bold text-sm">Customize Menu & Date</h4>
                    <p className="text-[11px] text-[#FFF8EC]/70 mt-1">Specify dishes, guest count, slot timing, and ingredient supply option.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-[#D9A441] text-[#173D2E] font-black text-xs flex items-center justify-center mb-2">3</div>
                    <h4 className="font-bold text-sm">Live Home Cooking</h4>
                    <p className="text-[11px] text-[#FFF8EC]/70 mt-1">Chef arrives on time, prepares meals, plates dishes, and tidies your kitchen.</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold font-display text-[#173D2E]">Available Verified Chefs</h3>
                    <p className="text-xs text-stone-500">Select a master chef below to open the booking scheduler.</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('food_menu')}
                    className="px-4 py-2 rounded-xl border border-[#173D2E] text-[#173D2E] hover:bg-[#173D2E] hover:text-[#FFF8EC] text-xs font-bold transition-colors flex items-center space-x-1.5 self-start"
                  >
                    <Utensils className="w-4 h-4 text-[#D9A441]" />
                    <span>Browse Dishes & Menus</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {chefs
                    .filter((c) => c.status === 'approved')
                    .map((chef) => (
                      <div
                        key={chef.id}
                        className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div className="relative h-44 bg-stone-100">
                          <img src={chef.avatarUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-[#D9A441] text-xs font-bold border border-[#D9A441]/40">
                            ★ {chef.rating.toFixed(2)} ({chef.reviewCount})
                          </div>
                          <div className="absolute bottom-3 left-4 right-4 text-white">
                            <h4 className="text-base font-bold font-display">{chef.fullName}</h4>
                            <p className="text-[11px] text-[#FFF8EC]/80">{chef.experienceYears} Years Master Experience</p>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <p className="text-xs text-stone-600 line-clamp-2">{chef.bio}</p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {chef.specialties.map((s, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF8EC] text-[#173D2E] font-medium border border-[#D9A441]/30">
                                  {s}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 text-[11px] text-stone-500 flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-[#D9A441]" />
                              <span>{chef.location}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-stone-400 font-bold block uppercase">Base Rate</span>
                              <span className="text-base font-extrabold text-[#173D2E]">{formatINR(chef.hourlyRate)}/hr</span>
                            </div>
                            <button
                              onClick={() => onSelectChefForBooking(chef)}
                              className="px-5 py-2.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs shadow-sm flex items-center space-x-1"
                            >
                              <span>Book Chef</span>
                              <ChevronRight className="w-3.5 h-3.5 text-[#D9A441]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE: FOOD & MENU */}
          {/* ======================================================== */}
          {activeNav === 'food_menu' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Food & Dish Catalogue</h2>
                  <p className="text-xs text-stone-500">
                    Explore curated festive sweets, traditional thalis, biryanis, and chef specialties for your home gathering.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes or ingredients..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#173D2E]"
                  />
                </div>
              </div>

              {/* Category Pills dynamically derived from approved chefs' offerings */}
              {(() => {
                const approvedChefIds = new Set(chefs.filter((c) => c.status === 'approved' || !c.status).map((c) => c.id));
                const activeServices = (storeState.cookingServices || []).filter(
                  (s) => s.isActive !== false && (!s.chefId || approvedChefIds.has(s.chefId))
                );
                const distinctCategoryIds = Array.from(new Set(activeServices.map((s) => s.categoryId).filter(Boolean)));
                const dynamicPills = [
                  { id: 'all', label: 'All Dishes' },
                  ...distinctCategoryIds.map((catId) => {
                    const match = storeState.categories.find((c) => c.id === catId);
                    return {
                      id: catId,
                      label: match ? match.name : catId.replace(/^cat-/, '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                    };
                  }),
                ];

                return (
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none text-xs font-semibold">
                    {dynamicPills.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMenuFilterCategory(cat.id)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                          menuFilterCategory === cat.id
                            ? 'bg-[#173D2E] text-[#FFF8EC] font-bold shadow-xs'
                            : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Dishes Grid */}
              {(() => {
                const approvedChefIds = new Set(chefs.filter((c) => c.status === 'approved' || !c.status).map((c) => c.id));
                const filteredServices = (storeState.cookingServices || []).filter((item) => {
                  if (item.isActive === false) return false;
                  if (item.chefId && !approvedChefIds.has(item.chefId)) return false;
                  if (menuFilterCategory !== 'all' && item.categoryId !== menuFilterCategory) return false;
                  if (menuSearchQuery) {
                    const q = menuSearchQuery.toLowerCase();
                    const matchName = item.serviceName.toLowerCase().includes(q);
                    const matchDesc = (item.description || '').toLowerCase().includes(q);
                    if (!matchName && !matchDesc) return false;
                  }
                  return true;
                });

                if (filteredServices.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200">
                      <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                      <h3 className="font-bold text-stone-700 text-sm">No dishes found</h3>
                      <p className="text-xs text-stone-400 mt-1">
                        {menuSearchQuery ? `No dishes match "${menuSearchQuery}".` : 'No registered chefs currently offer dishes under this category.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => {
                      const chef = chefs.find((c) => c.id === service.chefId);
                      return (
                        <div
                          key={service.id}
                          className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          <div className="relative h-44 bg-stone-100">
                            <img
                              src={service.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[#173D2E] text-[11px] font-bold shadow-xs capitalize">
                              {service.pricingType.replace('_', ' ')}
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9A441]">
                                  {service.categoryId.replace('cat-', '').toUpperCase()}
                                </span>
                                <span className="text-[11px] text-stone-400 font-medium">
                                  Min {service.minDurationHours}h session
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-[#173D2E] line-clamp-1">{service.serviceName}</h4>
                              <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed">
                                {service.description}
                              </p>

                              {chef && (
                                <div className="mt-3 flex items-center space-x-2.5 p-2 bg-[#FFF8EC]/60 rounded-xl border border-[#D9A441]/20">
                                  <img src={chef.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-[#D9A441]" />
                                  <div className="text-[11px]">
                                    <span className="font-bold text-[#173D2E] block">{chef.fullName}</span>
                                    <span className="text-stone-500">★ {chef.rating.toFixed(2)} • {chef.location}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-stone-400 font-bold block uppercase">Base Rate</span>
                                <span className="text-base font-black text-[#173D2E]">
                                  {formatINR(service.baseRate)}
                                  <span className="text-xs font-normal text-stone-500">
                                    {service.pricingType === 'per_kg' ? ' / kg' : service.pricingType === 'hourly' ? ' / hr' : service.pricingType === 'per_person' ? ' / person' : ' / event'}
                                  </span>
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  if (chef) {
                                    onSelectChefForBooking(chef);
                                  } else if (chefs.length > 0) {
                                    onSelectChefForBooking(chefs[0]);
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs"
                              >
                                Book This Dish
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 3: MY BOOKINGS (WITH TABS & STATUSES) */}
          {/* ======================================================== */}
          {activeNav === 'my_bookings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">My Bookings</h2>
                  <p className="text-xs text-stone-500">
                    Track requests, review quotations, make advance payments, and view receipts.
                  </p>
                </div>
                <button
                  onClick={() => setActiveNav('find_chef')}
                  className="px-5 py-2.5 rounded-2xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4 text-[#D9A441]" />
                  <span>New Booking</span>
                </button>
              </div>

              {cancelSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{cancelSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => setCancelSuccessMsg('')}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex space-x-1 border-b border-stone-200 overflow-x-auto pb-1 text-xs font-bold">
                {[
                  { id: 'all', label: 'All Bookings', count: userBookings.length },
                  { id: 'pending', label: 'Pending', count: userBookings.filter(b => b.status === 'pending').length },
                  { id: 'accepted', label: 'Accepted', count: userBookings.filter(b => b.status === 'accepted').length },
                  { id: 'confirmed', label: 'Confirmed', count: userBookings.filter(b => b.status === 'confirmed').length },
                  { id: 'in_progress', label: 'In Progress', count: userBookings.filter(b => b.status === 'in_progress').length },
                  { id: 'completed', label: 'Completed', count: userBookings.filter(b => b.status === 'completed').length },
                  { id: 'cancelled', label: 'Cancelled', count: userBookings.filter(b => b.status === 'cancelled').length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setBookingStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
                      bookingStatusFilter === tab.id
                        ? 'border-b-2 border-[#173D2E] text-[#173D2E] bg-white shadow-2xs font-extrabold'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="ml-1.5 text-[10px] opacity-70">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Bookings List */}
              <div className="space-y-4">
                {isLoading ? (
                  <BookingCardSkeleton count={3} />
                ) : filteredBookingsByStatus.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    No bookings found in this category.
                  </div>
                ) : (
                  filteredBookingsByStatus.map((b) => {
                    const badge = getBookingStatusBadge(b.status);
                    const linkedPayment = payments.find((p) => p.bookingId === b.id) || null;
                    const chef = chefs.find((c) => c.id === b.chefId);

                  return (
                    <div
                      key={b.id}
                      className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono font-bold text-sm text-[#173D2E]">#{b.bookingNumber}</span>
                          <span className="text-stone-300">•</span>
                          <span className="text-xs text-stone-500 capitalize">{b.eventType.replace('_', ' ')}</span>
                          <span className="text-stone-300">•</span>
                          <span className="text-xs text-stone-500 font-semibold">{b.eventDate} ({b.startTime})</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass} self-start sm:self-auto`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4 flex items-center space-x-3">
                          <img
                            src={b.chefAvatarUrl}
                            alt=""
                            className="w-12 h-12 rounded-2xl object-cover border border-[#D9A441]"
                          />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400">Chef</span>
                            <h4 className="text-sm font-bold text-[#173D2E]">{b.chefName}</h4>
                            <span className="text-xs text-stone-500 block truncate">{b.venueAddress}</span>
                          </div>
                        </div>

                        <div className="md:col-span-5 text-xs text-stone-600 space-y-1">
                          <div className="font-semibold text-stone-800">
                            Menu: {b.items.map((i) => `${i.quantity} ${i.unit} ${i.dishName}`).join(', ')}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            Ingredients: {b.ingredientArrangement === 'chef_provided' ? 'Chef to supply fresh ingredients' : 'Customer provides all ingredients'}
                          </div>
                          {b.chefQuotationNotes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              <strong>Chef Note:</strong> {b.chefQuotationNotes}
                            </div>
                          )}

                          {/* Payment status banner for pending or rejected UPI payments */}
                          {b.paymentStatus === 'payment_verification_pending' && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-300 flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-spin" />
                              <span>
                                UPI verification pending for reference <strong>{linkedPayment?.paymentReference || 'submitted'}</strong>.
                              </span>
                            </div>
                          )}
                          {b.paymentStatus === 'rejected' && (
                            <div className="text-[11px] text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-300 flex items-center space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>
                                Payment rejected: "{linkedPayment?.rejectionReason || 'Please resubmit valid UTR'}".
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-3 text-right flex flex-col items-end space-y-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Total</span>
                            <span className="text-lg font-black text-[#173D2E]">{formatINR(b.totalAmount)}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 justify-end">
                            <button
                              onClick={() => setSelectedBookingForDetail(b)}
                              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#173D2E] hover:text-white text-stone-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>

                            {b.status === 'accepted' && (
                              b.paymentStatus === 'payment_verification_pending' ? (
                                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center space-x-1 border border-amber-300">
                                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Verification Pending</span>
                                </span>
                              ) : b.paymentStatus === 'rejected' ? (
                                <button
                                  onClick={() => onPayBooking(b)}
                                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Resubmit UPI Payment</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onPayBooking(b)}
                                  className="px-4 py-2 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] text-xs font-bold shadow-sm"
                                >
                                  Pay Advance ({formatINR(b.advanceDepositRequired)})
                                </button>
                              )
                            )}

                            {linkedPayment && (
                              <button
                                onClick={() => onViewReceipt(b, linkedPayment)}
                                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center space-x-1"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                            )}

                            {b.status === 'completed' && (
                              reviews.some((r) => r.bookingId === b.id) ? (
                                <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex items-center space-x-1 border border-amber-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Reviewed</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => onWriteReview(b)}
                                  className="px-3 py-1.5 rounded-xl bg-[#D9A441] text-[#173D2E] hover:bg-[#c49132] text-xs font-bold flex items-center space-x-1"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>Rate</span>
                                </button>
                              )
                            )}

                            {/* Reschedule Button */}
                            {(b.status === 'accepted' || b.status === 'confirmed') && (
                              <button
                                onClick={() => {
                                  setRescheduleBooking(b);
                                  setRescheduleDate(b.eventDate);
                                }}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                              >
                                Reschedule
                              </button>
                            )}

                            {/* Book Again */}
                            {b.status === 'completed' && chef && (
                              <button
                                onClick={() => onSelectChefForBooking(chef)}
                                className="px-3 py-1.5 rounded-xl bg-[#173D2E] text-[#FFF8EC] hover:bg-[#0f291e] text-xs font-bold"
                              >
                                Book Again
                              </button>
                            )}

                            {/* Cancel Button */}
                            {['pending', 'accepted', 'confirmed'].includes(b.status) && (
                              <button
                                onClick={() => setCancelModalBooking(b)}
                                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Cancelled Booking Details Banner */}
                        {b.status === 'cancelled' && (
                          <div className="md:col-span-12 mt-2 p-4 rounded-2xl bg-rose-50 border border-rose-200/90 text-xs text-rose-950 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold flex items-center space-x-1.5 text-rose-700">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Booking Cancelled {b.cancelledBy ? `by ${b.cancelledBy.toUpperCase()}` : ''}</span>
                              </span>
                              {(b.cancelledAt || b.updatedAt) && (
                                <span className="text-[11px] text-stone-500 font-medium">
                                  Cancelled on {new Date(b.cancelledAt || b.updatedAt).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-700">
                              <strong className="text-stone-900">Cancellation Reason:</strong> {b.cancellationReason || 'No reason provided'}
                            </p>
                            {b.paymentStatus === 'refunded' ? (
                              <div className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1.5 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Advance Payment Refund Initiated: 100% refund processed back to original payment method.</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-stone-500 italic">
                                Note: No deposit charges were billed for this booking.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 4: UPCOMING SERVICES */}
          {/* ======================================================== */}
          {activeNav === 'upcoming' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold font-display text-[#173D2E]">Upcoming Cooking Services</h2>
              <p className="text-xs text-stone-500">
                Chefs scheduled to visit your home or event venue.
              </p>

              <div className="space-y-4">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <img src={b.chefAvatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-[#D9A441]" />
                      <div>
                        <span className="text-xs font-bold text-[#173D2E]">#{b.bookingNumber} • {b.eventDate} at {b.startTime}</span>
                        <h4 className="text-base font-bold text-stone-900">{b.chefName}</h4>
                        <p className="text-xs text-stone-500">{b.venueAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onContactChef(b.chefName, b.customerPhone)}
                        className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center space-x-1"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>Contact Chef</span>
                      </button>
                      {['pending', 'accepted', 'confirmed'].includes(b.status) && (
                        <button
                          onClick={() => setCancelModalBooking(b)}
                          className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          Cancel Booking
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedBookingForDetail(b)}
                        className="px-4 py-2 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e] transition-colors"
                      >
                        View Order Details
                      </button>
                    </div>
                  </div>
                ))}

                {upcomingBookings.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    No upcoming services scheduled.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 5: BOOKING HISTORY */}
          {/* ======================================================== */}
          {activeNav === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Booking History</h2>
                  <p className="text-xs text-stone-500">
                    Past completed dinners, culinary services, and cancelled booking requests.
                  </p>
                </div>

                {/* Sub-tabs for History filter */}
                <div className="flex bg-stone-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
                  <button
                    onClick={() => setHistoryStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      historyStatusFilter === 'all'
                        ? 'bg-white text-[#173D2E] shadow-2xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Past ({historyBookings.length})
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      historyStatusFilter === 'completed'
                        ? 'bg-white text-emerald-800 shadow-2xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Completed ({completedBookings.length})
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter('cancelled')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      historyStatusFilter === 'cancelled'
                        ? 'bg-white text-rose-800 shadow-2xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Cancelled ({cancelledBookings.length})
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {filteredHistoryBookings.map((b) => {
                  const linkedChef = chefs.find(c => c.id === b.chefId);
                  const isCancelled = b.status === 'cancelled' || b.status === 'rejected';

                  if (isCancelled) {
                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-3xl p-6 border border-rose-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center space-x-1">
                              <X className="w-3.5 h-3.5 text-rose-600" />
                              <span>Cancelled</span>
                            </span>
                            <span className="font-mono text-xs font-bold text-stone-500">#{b.bookingNumber}</span>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500">Scheduled: {b.eventDate} ({b.startTime})</span>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-[#173D2E]">{b.chefName}</h4>
                            <p className="text-xs text-stone-500">
                              Venue: {b.venueAddress}, {b.city} • {b.guestsCount} guests
                            </p>
                          </div>

                          <div className="p-3 bg-stone-50 rounded-2xl text-xs space-y-1 border border-stone-200/60 max-w-xl">
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                              <span className="font-bold text-stone-700">
                                Cancelled by: <strong className="text-stone-900 capitalize">{b.cancelledBy || 'customer'}</strong>
                              </span>
                              {(b.cancelledAt || b.updatedAt) && (
                                <span className="text-stone-500">
                                  {new Date(b.cancelledAt || b.updatedAt).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-700">
                              <strong>Reason:</strong> {b.cancellationReason || 'No reason provided'}
                            </p>
                            {b.paymentStatus === 'refunded' && (
                              <p className="text-[11px] text-emerald-800 font-semibold flex items-center space-x-1 pt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Advance Payment: Refunded</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-start sm:self-center">
                          <button
                            onClick={() => setSelectedBookingForDetail(b)}
                            className="px-3 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          {linkedChef && (
                            <button
                              onClick={() => onSelectChefForBooking(linkedChef)}
                              className="px-4 py-2.5 rounded-xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] transition-colors shadow-sm"
                            >
                              Book Chef Again
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={b.id}
                      className="bg-white rounded-3xl p-6 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-emerald-700">✓ Completed on {b.eventDate}</span>
                          <span className="font-mono text-xs text-stone-400">#{b.bookingNumber}</span>
                        </div>
                        <h4 className="text-base font-bold text-[#173D2E] mt-0.5">{b.chefName}</h4>
                        <p className="text-xs text-stone-500">Menu: {b.items.map(i => `${i.quantity} ${i.unit} ${i.dishName}`).join(', ')}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedBookingForDetail(b)}
                          className="px-3 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        {reviews.some((r) => r.bookingId === b.id) ? (
                          <span className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs flex items-center space-x-1 border border-amber-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reviewed</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => onWriteReview(b)}
                            className="px-4 py-2 rounded-xl bg-[#D9A441] text-[#173D2E] font-bold text-xs flex items-center space-x-1"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Leave Review</span>
                          </button>
                        )}
                        {linkedChef && (
                          <button
                            onClick={() => onSelectChefForBooking(linkedChef)}
                            className="px-4 py-2 rounded-xl bg-[#173D2E] text-white font-bold text-xs"
                          >
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredHistoryBookings.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    {historyStatusFilter === 'completed'
                      ? 'No completed cooking services yet.'
                      : historyStatusFilter === 'cancelled'
                      ? 'No cancelled bookings in history.'
                      : 'No past booking records found.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 6: PAYMENTS & RECEIPTS */}
          {/* ======================================================== */}
          {activeNav === 'payments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Payments & Verified Receipts</h2>
                <p className="text-xs text-stone-500">
                  Itemized service fees, ingredient reimbursements, Razorpay transaction IDs, and downloadable receipts.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden text-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[580px] text-left">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-4">Receipt #</th>
                      <th className="p-4">Booking #</th>
                      <th className="p-4">Method & UTR</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {payments
                      .filter((p) => p.customerId === currentUser?.id)
                      .map((p) => {
                        const linkedBooking = bookings.find((b) => b.id === p.bookingId);
                        const badge = getPaymentStatusBadge(p.status);
                        return (
                          <tr key={p.id}>
                            <td className="p-4 font-mono font-bold text-[#173D2E]">{p.receiptNumber}</td>
                            <td className="p-4 font-mono text-stone-600">#{linkedBooking?.bookingNumber}</td>
                            <td className="p-4">
                              <div className="font-mono text-stone-800 font-semibold">
                                {p.paymentReference || p.razorpayPaymentId || 'N/A'}
                              </div>
                              <span className="text-[10px] text-stone-400 uppercase">
                                {p.paymentGateway === 'upi_qr' ? 'Static UPI QR' : (p.paymentGateway || 'Gateway')}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-emerald-700">{formatINR(p.amount)}</td>
                            <td className="p-4">
                              <div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.bgClass} ${badge.textClass}`}>
                                  {badge.label}
                                </span>
                                {p.status === 'rejected' && p.rejectionReason && (
                                  <p className="text-[10px] text-rose-700 font-medium mt-0.5 line-clamp-1">
                                    {p.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              {p.status === 'paid' && linkedBooking && (
                                <button
                                  onClick={() => onViewReceipt(linkedBooking, p)}
                                  className="text-xs font-bold text-[#D9A441] hover:underline"
                                >
                                  View Receipt
                                </button>
                              )}
                              {p.status === 'rejected' && linkedBooking && (
                                <button
                                  onClick={() => onPayBooking(linkedBooking)}
                                  className="text-xs font-bold text-rose-600 hover:underline"
                                >
                                  Resubmit Payment
                                </button>
                              )}
                              {p.status === 'payment_verification_pending' && (
                                <span className="text-[11px] text-amber-700 font-semibold">
                                  Under Bank Review
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 7: SAVED CHEFS */}
          {/* ======================================================== */}
          {activeNav === 'saved_chefs' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Saved Favorite Chefs</h2>
                <p className="text-xs text-stone-500">
                  Your hand-picked chefs for quick rebooking and instant event planning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedChefs.map((chef) => (
                  <div key={chef.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <img src={chef.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border border-[#D9A441]" />
                          <div>
                            <h4 className="text-sm font-bold text-[#173D2E]">{chef.fullName}</h4>
                            <span className="text-[11px] text-stone-500">{chef.location}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => appStore.toggleSaveChef(chef.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <p className="text-xs text-stone-600 line-clamp-2">{chef.bio}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="font-bold text-xs text-[#173D2E]">{formatINR(chef.hourlyRate)}/hr</span>
                      <button
                        onClick={() => onSelectChefForBooking(chef)}
                        className="px-4 py-2 rounded-xl bg-[#173D2E] text-white hover:bg-[#0f291e] font-bold text-xs"
                      >
                        Book Again
                      </button>
                    </div>
                  </div>
                ))}

                {savedChefs.length === 0 && (
                  <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    <Heart className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    You haven't saved any chefs yet. Click the heart icon on any chef profile to bookmark them!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 8: REVIEWS & RATINGS */}
          {/* ======================================================== */}
          {activeNav === 'reviews' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Your Reviews & Ratings</h2>
                <p className="text-xs text-stone-500">
                  Reviews left for chefs after completed cooking sessions, with official chef responses.
                </p>
              </div>

              {/* Pending reviews for completed bookings */}
              {userBookings.filter((b) => b.status === 'completed' && !storeState.reviews.some((r) => r.bookingId === b.id)).length > 0 && (
                <div className="bg-[#FFF8EC] border-2 border-[#D9A441] rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center space-x-2 text-[#173D2E] font-bold text-sm mb-2">
                    <Sparkles className="w-5 h-5 text-[#D9A441]" />
                    <span>Completed Bookings Awaiting Your Review</span>
                  </div>
                  <p className="text-xs text-stone-600 mb-4">
                    Your feedback helps our home chef community thrive and rewards outstanding culinary craftsmanship.
                  </p>
                  <div className="space-y-3">
                    {userBookings
                      .filter((b) => b.status === 'completed' && !storeState.reviews.some((r) => r.bookingId === b.id))
                      .map((b) => (
                        <div key={b.id} className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <img src={b.chefAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[#D9A441]" />
                            <div>
                              <h4 className="font-bold text-xs text-[#173D2E]">{b.chefName}</h4>
                              <p className="text-[11px] text-stone-500">Booking #{b.bookingNumber} • {b.eventDate}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => onWriteReview(b)}
                            className="px-4 py-2 rounded-xl bg-[#D9A441] hover:bg-[#c49132] text-[#173D2E] font-extrabold text-xs flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
                          >
                            <Star className="w-4 h-4 fill-current" />
                            <span>Rate & Review Chef</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {userReviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex text-[#D9A441]">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 italic leading-relaxed">
                      "{rev.comment}"
                    </p>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex gap-4 text-[11px] text-stone-500">
                      <span>Taste: {rev.foodTasteRating}/5</span>
                      <span>Cleanliness: {rev.cleanlinessRating}/5</span>
                      <span>Punctuality: {rev.punctualityRating}/5</span>
                    </div>

                    {/* Chef Response if present */}
                    {rev.chefReply && (
                      <div className="mt-4 p-4 rounded-2xl bg-[#FFF8EC] border border-[#D9A441]/40">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#173D2E] mb-1">
                          <ChefHat className="w-4 h-4 text-[#D9A441]" />
                          <span>Chef's Response</span>
                          {rev.chefReplyAt && (
                            <span className="text-[10px] text-stone-400 font-normal">
                              • {new Date(rev.chefReplyAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-700 italic leading-relaxed">
                          "{rev.chefReply}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {userReviews.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    No reviews written yet. After your chef completes cooking, you will be prompted to leave a rating.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 9: NOTIFICATIONS */}
          {/* ======================================================== */}
          {activeNav === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Notification Inbox</h2>
                  <p className="text-xs text-stone-500">Booking status, quotations, and payment alerts.</p>
                </div>
                <button
                  onClick={() => appStore.markAllNotificationsRead('customer')}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  Mark All Read
                </button>
              </div>

              <div className="space-y-3">
                {userNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => appStore.markNotificationAsRead(notif.id)}
                    className={`p-4 rounded-3xl border transition-colors cursor-pointer ${
                      !notif.read ? 'bg-[#FFF8EC] border-[#D9A441]' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#173D2E]">{notif.title}</h4>
                      <span className="text-[10px] text-stone-400">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 10: PROFILE & ADDRESSES */}
          {/* ======================================================== */}
          {activeNav === 'profile' && (
            <div className="max-w-3xl space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Profile & Venue Addresses</h2>
                <p className="text-xs text-stone-500">
                  Manage personal contact information, multiple cooking venues, and dietary preferences.
                </p>
              </div>

              {/* Personal Details Form */}
              <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4 text-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-stone-600 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-600 block mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-600 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <h4 className="font-bold text-stone-700 mb-2">Default Dietary Preferences</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-stone-400 block mb-1">Diet Type</label>
                      <select
                        value={dietaryType}
                        onChange={(e) => setDietaryType(e.target.value)}
                        className="w-full p-2 border rounded-xl"
                      >
                        <option value="vegetarian">Pure Vegetarian</option>
                        <option value="all">Non-Veg & All</option>
                        <option value="pure_jain">Jain (No Onion/Garlic)</option>
                        <option value="vegan">Vegan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-stone-400 block mb-1">Spice Preference</label>
                      <select
                        value={spiceLevel}
                        onChange={(e) => setSpiceLevel(e.target.value)}
                        className="w-full p-2 border rounded-xl"
                      >
                        <option value="mild">Mild</option>
                        <option value="medium">Medium</option>
                        <option value="spicy">Spicy</option>
                        <option value="authentic_regional">Authentic Regional</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex items-center pt-4">
                      <label className="flex items-center space-x-2 font-bold text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isLowOil}
                          onChange={(e) => setIsLowOil(e.target.checked)}
                          className="w-4 h-4 rounded text-[#173D2E] accent-[#173D2E]"
                        />
                        <span>Prefer Low Oil / Cold-Pressed Ghee</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  {profileSavedMsg && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Profile details saved successfully!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-6 py-2.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              {/* Saved Addresses Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                      Saved Cooking Venues & Addresses
                    </h3>
                    <p className="text-xs text-stone-500">
                      Chefs will arrive at the venue chosen during booking.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#173D2E] text-white hover:bg-[#0f291e] text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4 text-[#D9A441]" />
                    <span>Add Address</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(currentUser?.addresses || []).map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between bg-stone-50/60"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-[#173D2E]">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-700 mt-1">{addr.addressLine}, {addr.city}</p>
                        {addr.landmark && (
                          <p className="text-[11px] text-stone-400">Landmark: {addr.landmark}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!addr.isDefault && (
                          <button
                            onClick={() => appStore.setDefaultAddress(addr.id)}
                            className="text-xs text-stone-500 hover:text-[#173D2E] font-semibold"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => appStore.deleteCustomerAddress(addr.id)}
                          className="p-1.5 text-stone-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE: SETTINGS & ACCOUNT PREFERENCES */}
          {/* ======================================================== */}
          {(activeNav === 'settings' || activeNav === 'help') && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Settings & Account Preferences</h2>
                <p className="text-xs text-stone-500">
                  Manage your dietary preferences, security, kitchen setup details, and concierge support.
                </p>
              </div>

              {/* 1. Dietary & Kitchen Setup */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF8EC] text-[#D9A441] flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#173D2E]">Dietary Restrictions & Cooking Standards</h3>
                    <p className="text-xs text-stone-500">Chefs adhere to these preferences for all your bookings automatically.</p>
                  </div>
                </div>

                {dietarySavedMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Your dietary preferences have been saved successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-start space-x-3 p-4 rounded-2xl border border-stone-200 hover:bg-[#FFF8EC]/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={prefVegetarian}
                      onChange={(e) => setPrefVegetarian(e.target.checked)}
                      className="mt-0.5 rounded text-[#173D2E] focus:ring-[#173D2E]"
                    />
                    <div>
                      <span className="font-bold text-stone-800 block">Strictly Vegetarian Kitchen</span>
                      <span className="text-[11px] text-stone-500">No meat, poultry, or seafood dishes prepared in your kitchen.</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 rounded-2xl border border-stone-200 hover:bg-[#FFF8EC]/30 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={prefJain}
                      onChange={(e) => setPrefJain(e.target.checked)}
                      className="mt-0.5 rounded text-[#173D2E] focus:ring-[#173D2E]"
                    />
                    <div>
                      <span className="font-bold text-stone-800 block">Jain / No Onion-Garlic</span>
                      <span className="text-[11px] text-stone-500">Strictly no root vegetables, onions, or garlic in any preparation.</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Preferred Spice Level</label>
                    <select
                      value={prefSpiceLevel}
                      onChange={(e) => setPrefSpiceLevel(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs bg-white font-medium"
                    >
                      <option value="mild">Mild (Subtle spices, kid-friendly)</option>
                      <option value="medium">Medium (Balanced authentic spices)</option>
                      <option value="spicy">Spicy (Traditional Andhra / Fiery)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Food Allergies (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Peanuts, Cashews, Shellfish, Gluten"
                      value={prefAllergies}
                      onChange={(e) => setPrefAllergies(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Special Cooking Instructions for Chefs</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. We prefer rock salt and cold-pressed sesame oil. Please use copper utensils for sweets."
                    value={prefSpecialNotes}
                    onChange={(e) => setPrefSpecialNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (currentUser) {
                        appStore.updateProfile(currentUser.id, {
                          dietaryPreferences: {
                            isVegetarian: prefVegetarian,
                            isJain: prefJain,
                            spiceLevel: prefSpiceLevel as any,
                            allergies: prefAllergies ? prefAllergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                            specialInstructions: prefSpecialNotes,
                          },
                        });
                        setDietarySavedMsg(true);
                        setTimeout(() => setDietarySavedMsg(false), 4000);
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs shadow-sm"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>

              {/* 2. Security & Password */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-3 pb-4 border-b border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF8EC] text-[#D9A441] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#173D2E]">Security & Password</h3>
                    <p className="text-xs text-stone-500">Update your account credentials to keep your reservations protected.</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password updated securely!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!newPassword || newPassword.length < 6) {
                        setPasswordError('New password must be at least 6 characters.');
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPasswordError('New passwords do not match.');
                        return;
                      }
                      setPasswordError('');
                      setPasswordSuccess(true);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setTimeout(() => setPasswordSuccess(false), 4000);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* 3. Support & Helpline */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center space-x-3 pb-3 border-b border-stone-100">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF8EC] text-[#D9A441] flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#173D2E]">Help & Concierge Support</h3>
                    <p className="text-xs text-stone-500">Reach our dedicated booking concierge team anytime.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#FFF8EC] rounded-2xl border border-[#D9A441]/30">
                    <span className="font-bold text-[#173D2E] block">Phone Helpline</span>
                    <span className="text-sm font-extrabold text-[#D9A441] block mt-1">+91 800-243-3266</span>
                    <span className="text-[10px] text-stone-500">Available 7:00 AM - 10:00 PM</span>
                  </div>

                  <div className="p-4 bg-[#FFF8EC] rounded-2xl border border-[#D9A441]/30">
                    <span className="font-bold text-[#173D2E] block">Email Support</span>
                    <span className="text-sm font-extrabold text-[#D9A441] block mt-1">support@bookmychef.com</span>
                    <span className="text-[10px] text-stone-500">Response within 30 minutes</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowSupportModal(true)}
                    className="w-full py-3 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <HelpCircle className="w-4 h-4 text-[#D9A441]" />
                    <span>Submit a Support Ticket / Assistance Request</span>
                  </button>
                </div>

                {/* Previous Tickets */}
                <div className="space-y-3 pt-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Your Support Tickets ({supportTickets.length})
                  </h3>
                  {supportTickets.map((tkt) => (
                    <div key={tkt.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#173D2E]">{tkt.subject}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-stone-600 mt-1">{tkt.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: Add New Address */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#173D2E]">Add Cooking Venue Address</h3>
            <form onSubmit={handleSaveAddress} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-600 block mb-1">Label</label>
                <select
                  value={newAddressLabel}
                  onChange={(e) => setNewAddressLabel(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Event Venue">Event Venue / Community Hall</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-600 block mb-1">Address Line</label>
                <textarea
                  rows={2}
                  placeholder="Street, flat/villa number, locality..."
                  value={newAddressLine}
                  onChange={(e) => setNewAddressLine(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-600 block mb-1">City</label>
                  <input
                    type="text"
                    value={newAddressCity}
                    onChange={(e) => setNewAddressCity(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Landmark</label>
                  <input
                    type="text"
                    placeholder="Near..."
                    value={newAddressLandmark}
                    onChange={(e) => setNewAddressLandmark(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reschedule Request */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#173D2E]">Reschedule Cooking Service</h3>
            <p className="text-xs text-stone-500 mt-1">
              Booking #{rescheduleBooking.bookingNumber} with {rescheduleBooking.chefName}
            </p>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-600 block mb-1">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 block mb-1">New Arrival Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-600 block mb-1">Reason for Rescheduling</label>
                <input
                  type="text"
                  placeholder="e.g. Guest arrival delayed by 2 hours"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                >
                  Send Reschedule Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cancellation */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5 text-rose-700">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 leading-tight">Cancel Booking</h3>
                  <span className="font-mono text-xs text-stone-400 font-bold">#{cancelModalBooking.bookingNumber}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCancelModalBooking(null);
                  setCancelErrorMsg('');
                }}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Booking Details Card */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 text-xs space-y-2">
              <div className="flex items-center space-x-3">
                <img
                  src={cancelModalBooking.chefAvatarUrl}
                  alt={cancelModalBooking.chefName}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                />
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{cancelModalBooking.chefName}</h4>
                  <p className="text-stone-500 text-[11px]">
                    {cancelModalBooking.eventDate} at {cancelModalBooking.startTime} ({cancelModalBooking.expectedDurationHours}h cooking)
                  </p>
                  <p className="text-stone-500 text-[11px] truncate">
                    Venue: {cancelModalBooking.venueAddress}, {cancelModalBooking.city}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
                <span className="text-stone-600 font-medium">Total Amount: <strong>{formatINR(cancelModalBooking.totalAmount)}</strong></span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                  cancelModalBooking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                }`}>
                  Payment: {cancelModalBooking.paymentStatus}
                </span>
              </div>
            </div>

            {/* Refund & Policy Info */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">
                Cancellation & Refund Notice
              </span>
              <p className="text-[11px] text-amber-950 leading-relaxed">
                {cancelModalBooking.paymentStatus === 'paid'
                  ? 'Your advance payment will be refunded to your original payment method in accordance with our 24-hour cancellation policy.'
                  : 'This booking has not been charged yet. Cancellation is completely free of charge with zero penalties.'}
              </p>
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700 text-xs block">
                Reason for Cancellation <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Change of plans',
                  'Schedule conflict',
                  'Found alternative',
                  'Family emergency',
                  'Budget / Pricing',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border ${
                      cancelReason === preset
                        ? 'bg-[#173D2E] text-white border-[#173D2E]'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div>
              <textarea
                rows={3}
                placeholder="Optional: Explain why you are cancelling or leave a polite note for the chef..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 rounded-2xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#173D2E] focus:outline-none"
              />
            </div>

            {cancelErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                {cancelErrorMsg}
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setCancelModalBooking(null);
                  setCancelErrorMsg('');
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Support Request */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#173D2E]">Contact bookmychef.com Support</h3>
            {supportSuccess ? (
              <div className="py-8 text-center text-xs text-emerald-700 font-bold">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                Support request submitted! Our concierge coordinator will contact you shortly.
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Category</label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="booking">Booking Assistance</option>
                    <option value="refund">Refund or Payment Inquiry</option>
                    <option value="chef_behavior">Chef / Quality Experience</option>
                    <option value="billing">Invoice / Billing</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-600 block mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-600 block mb-1">Detailed Message</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details or booking ID..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2 border rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Chef Profile Detail */}
      {selectedChefForDetail && (
        <ChefDetailModal
          chef={selectedChefForDetail}
          reviews={reviews}
          onClose={() => setSelectedChefForDetail(null)}
          onProceedToBooking={(chef) => {
            setSelectedChefForDetail(null);
            onSelectChefForBooking(chef);
          }}
        />
      )}

      {/* MODAL: Booking Confirmation & Details */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-xl text-[#173D2E]">
                    #{selectedBookingForDetail.bookingNumber}
                  </span>
                  {(() => {
                    const badge = getBookingStatusBadge(selectedBookingForDetail.status);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Booking Confirmation & Service Agreement Details
                </p>
              </div>
              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chef Information Card */}
            {(() => {
              const assignedChef = chefs.find((c) => c.id === selectedBookingForDetail.chefId);
              return (
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedBookingForDetail.chefAvatarUrl || assignedChef?.avatarUrl}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D9A441]"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D9A441]">Assigned Professional Chef</span>
                      <h4 className="text-base font-bold text-stone-900">{selectedBookingForDetail.chefName}</h4>
                      <p className="text-xs text-stone-600">
                        {assignedChef?.experienceYears || 3}+ years exp • ⭐ {assignedChef?.rating || 5.0} ({assignedChef?.reviewCount || 0} reviews)
                      </p>
                      {assignedChef?.specialties && (
                        <p className="text-[11px] text-stone-500 truncate max-w-sm">
                          Specialties: {assignedChef.specialties.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <button
                      onClick={() => onContactChef(selectedBookingForDetail.chefName, selectedBookingForDetail.customerPhone)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                      <span>Contact Chef</span>
                    </button>
                    {assignedChef && (
                      <button
                        onClick={() => {
                          setSelectedBookingForDetail(null);
                          setSelectedChefForDetail(assignedChef);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e]"
                      >
                        Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Service & Venue Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                <span className="font-bold text-stone-700 block uppercase tracking-wider text-[10px]">Event & Timing</span>
                <div className="space-y-1 text-stone-600">
                  <div className="flex justify-between">
                    <span>Occasion:</span>
                    <span className="font-semibold text-stone-900 capitalize">{selectedBookingForDetail.eventType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-semibold text-stone-900">{selectedBookingForDetail.eventDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Start Time:</span>
                    <span className="font-semibold text-stone-900">{selectedBookingForDetail.startTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Duration:</span>
                    <span className="font-semibold text-stone-900">{selectedBookingForDetail.expectedDurationHours} Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests Attending:</span>
                    <span className="font-semibold text-stone-900">{selectedBookingForDetail.guestsCount} Guests</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                <span className="font-bold text-stone-700 block uppercase tracking-wider text-[10px]">Service Venue</span>
                <div className="space-y-1 text-stone-600">
                  <div className="font-semibold text-stone-900">{selectedBookingForDetail.customerName}</div>
                  <div className="text-stone-600 flex items-start space-x-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>{selectedBookingForDetail.venueAddress}, {selectedBookingForDetail.city}</span>
                  </div>
                  <div className="pt-2 text-[11px] text-stone-500">
                    <strong>Ingredient Arrangement:</strong>{' '}
                    {selectedBookingForDetail.ingredientArrangement === 'chef_provided'
                      ? 'Chef arranges fresh ingredients'
                      : 'Customer provides all ingredients'}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Dishes Ordered</h4>
              {selectedBookingForDetail.items && selectedBookingForDetail.items.length > 0 ? (
                <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 text-[11px]">
                      <tr>
                        <th className="p-3">Dish</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3">Dietary Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedBookingForDetail.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-stone-800">{item.dishName}</td>
                          <td className="p-3 text-stone-600">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-stone-600 capitalize">{item.foodType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-stone-50 rounded-xl text-stone-500 text-xs italic">
                  Custom chef consultation menu
                </div>
              )}
            </div>

            {/* Chef Quotation Notes */}
            {selectedBookingForDetail.chefQuotationNotes && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-bold block">Chef Quotation Message:</span>
                <p>{selectedBookingForDetail.chefQuotationNotes}</p>
              </div>
            )}

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px] block">
                Billing & Payment Breakdown
              </span>
              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Chef Professional Cooking Fee:</span>
                  <span className="font-semibold text-stone-900">{formatINR(selectedBookingForDetail.chefServiceFee)}</span>
                </div>
                {selectedBookingForDetail.ingredientFee > 0 && (
                  <div className="flex justify-between">
                    <span>Ingredient arrangement:</span>
                    <span className="font-semibold text-stone-900">{formatINR(selectedBookingForDetail.ingredientFee)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Platform Service & Safety Fee:</span>
                  <span className="font-semibold text-stone-900">{formatINR(selectedBookingForDetail.platformFee)}</span>
                </div>
                {selectedBookingForDetail.additionalCharges > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Additional charges ({selectedBookingForDetail.additionalChargesNotes || 'Custom'}):</span>
                    <span className="font-semibold">+{formatINR(selectedBookingForDetail.additionalCharges)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black text-[#173D2E]">
                  <span>Total Booking Amount:</span>
                  <span>{formatINR(selectedBookingForDetail.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>Advance Deposit ({selectedBookingForDetail.paymentStatus === 'paid' ? 'Paid' : 'Required'}):</span>
                  <span className="font-bold text-emerald-700">{formatINR(selectedBookingForDetail.advanceDepositRequired)}</span>
                </div>
              </div>
            </div>

            {/* Cancelled Info */}
            {selectedBookingForDetail.status === 'cancelled' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                <span className="font-bold text-rose-800 block">Cancellation Notice</span>
                <p className="text-stone-700">
                  <strong>Reason:</strong> {selectedBookingForDetail.cancellationReason || 'No reason provided'}
                </p>
                {selectedBookingForDetail.cancelledAt && (
                  <p className="text-stone-500 text-[10px]">
                    Cancelled at: {new Date(selectedBookingForDetail.cancelledAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Payment Verification Status Notice */}
            {selectedBookingForDetail.paymentStatus === 'payment_verification_pending' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Manual Bank Verification Pending</span>
                </div>
                <p className="text-stone-700">
                  Your advance payment submission is being cross-checked against BookMyChef merchant bank account credits. Booking confirmation will activate automatically once verified by Admin.
                </p>
              </div>
            )}
            {selectedBookingForDetail.paymentStatus === 'rejected' && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                <div className="font-bold text-rose-800 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Payment Reference Rejected</span>
                </div>
                <p className="text-stone-700">
                  The submitted transaction reference could not be verified on the merchant bank statement. Please review and resubmit your payment details.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-wrap gap-2 justify-end border-t border-stone-100">
              {selectedBookingForDetail.status === 'accepted' && (
                selectedBookingForDetail.paymentStatus === 'payment_verification_pending' ? (
                  <span className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center space-x-1.5 border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Verification in Progress</span>
                  </span>
                ) : selectedBookingForDetail.paymentStatus === 'rejected' ? (
                  <button
                    onClick={() => {
                      const b = selectedBookingForDetail;
                      setSelectedBookingForDetail(null);
                      onPayBooking(b);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                  >
                    Resubmit Payment
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const b = selectedBookingForDetail;
                      setSelectedBookingForDetail(null);
                      onPayBooking(b);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e]"
                  >
                    Pay Advance ({formatINR(selectedBookingForDetail.advanceDepositRequired)})
                  </button>
                )
              )}
              {['pending', 'accepted', 'confirmed'].includes(selectedBookingForDetail.status) && (
                <button
                  onClick={() => {
                    const b = selectedBookingForDetail;
                    setSelectedBookingForDetail(null);
                    setCancelModalBooking(b);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                >
                  Cancel Booking
                </button>
              )}
              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Logout Confirmation */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#173D2E]">Sign Out of bookmychef.com?</h3>
              <p className="text-xs text-stone-500 mt-1">
                You can log back in anytime as a Customer, Chef, or Administrator.
              </p>
            </div>
            <div className="pt-2 flex justify-center space-x-3 text-xs">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
              >
                Stay Logged In
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  appStore.logout();
                  if (onLogout) onLogout();
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
