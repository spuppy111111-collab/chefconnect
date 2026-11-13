import React, { useState, useMemo } from 'react';
import {
  Booking,
  Chef,
  CookingService,
  NotificationItem,
  Review,
  UserRole,
} from '../types/database';
import {
  ChefHat,
  LayoutDashboard,
  Calendar,
  Clock,
  DollarSign,
  Utensils,
  MessageSquare,
  Star,
  Sliders,
  Bell,
  HelpCircle,
  LogOut,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Phone,
  Play,
  Check,
  TrendingUp,
  FileCheck,
  Award,
  Search,
  Filter,
  Eye,
  Plus,
  Trash2,
  Lock,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Download,
  Mail,
  Camera,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import { getChefStats } from '../utils/chefStats';
import { getBookingStatusBadge, hasBookingConflict } from '../utils/bookingWorkflow';
import { appStore } from '../services/store';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { DashboardStatsSkeleton, BookingCardSkeleton } from './skeletons/DashboardSkeletons';

interface ChefDashboardProps {
  isLoading?: boolean;
  onContactCustomer: (name: string, phone: string) => void;
  onLogout?: () => void;
}

export const ChefDashboard: React.FC<ChefDashboardProps> = ({
  isLoading = false,
  onContactCustomer,
  onLogout,
}) => {
  const [storeState, setStoreState] = useState(appStore.getState());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Exact 9 modules as requested
  const [activeNav, setActiveNav] = useState<
    | 'dashboard'
    | 'requests'
    | 'schedule'
    | 'menu'
    | 'profile'
    | 'earnings'
    | 'reviews'
    | 'notifications'
    | 'settings'
  >('dashboard');

  // Search bookings inside chef dashboard
  const [searchBookingsQuery, setSearchBookingsQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');

  // Booking detail view modal
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  // Quotation Modal state
  const [quotationBooking, setQuotationBooking] = useState<Booking | null>(null);
  const [customServiceFee, setCustomServiceFee] = useState<number>(0);
  const [customDuration, setCustomDuration] = useState<number>(4);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalChargesNotes, setAdditionalChargesNotes] = useState<string>('');
  const [chefQuotationNotes, setChefQuotationNotes] = useState<string>('');

  // Rejection modal state
  const [rejectBooking, setRejectBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Menu Management Modals
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPriceType, setDishPriceType] = useState<'hourly' | 'per_person' | 'per_kg' | 'fixed_event'>('hourly');
  const [dishRate, setDishRate] = useState(500);
  const [dishDuration, setDishDuration] = useState(3.0);
  const [dishCategoryId, setDishCategoryId] = useState('cat-sweets');
  const [dishImageUrl, setDishImageUrl] = useState('');
  const [dishServingSize, setDishServingSize] = useState('Serves 4 - 6 persons');

  // Profile fields state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileExperience, setProfileExperience] = useState(10);
  const [profileHourlyRate, setProfileHourlyRate] = useState(650);
  const [profileEventBaseRate, setProfileEventBaseRate] = useState(2500);
  const [profilePerPersonRate, setProfilePerPersonRate] = useState(180);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileServiceRadius, setProfileServiceRadius] = useState(15);
  const [profileSpecialties, setProfileSpecialties] = useState<string[]>([]);
  const [newSpecialtyInput, setNewSpecialtyInput] = useState('');
  const [profileServiceAreas, setProfileServiceAreas] = useState<string[]>([]);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Certificates list
  const [certificates, setCertificates] = useState<{ id: string; name: string; issuer: string; date: string }[]>([
    { id: 'cert-1', name: 'FSSAI Food Safety & Hygiene Certification', issuer: 'FSSAI India', date: '2024' },
    { id: 'cert-2', name: 'Master Halwai & Traditional Mithai Guild', issuer: 'National Culinary Council', date: '2023' },
  ]);
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');

  // Review reply state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Support / Settings state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState<'booking' | 'refund' | 'chef_behavior' | 'billing' | 'general'>('booking');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Schedule sub-view state
  const [scheduleViewMode, setScheduleViewMode] = useState<'calendar' | 'timeline' | 'manage_slots'>('calendar');
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotReason, setNewSlotReason] = useState('Personal leave / Off-day');

  React.useEffect(() => {
    return appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
  }, []);

  const { currentUser, chefs, bookings, cookingServices, reviews, notifications, categories } = storeState;

  // Active Chef profile
  const currentChef = useMemo(() => {
    return chefs.find((c) => c.profileId === currentUser?.id) || chefs[0];
  }, [chefs, currentUser?.id]);

  // Sync profile form when currentChef loads
  React.useEffect(() => {
    if (currentChef) {
      setProfileName(currentChef.fullName);
      setProfilePhone(currentChef.phone);
      setProfileEmail(currentChef.email);
      setProfileBio(currentChef.bio);
      setProfileExperience(currentChef.experienceYears);
      setProfileHourlyRate(currentChef.hourlyRate);
      setProfileEventBaseRate(currentChef.baseCharge);
      setProfilePerPersonRate(currentChef.perPersonRate || 180);
      setProfileAvatarUrl(currentChef.avatarUrl);
      setProfileLocation(currentChef.location || '');
      setProfileServiceRadius(currentChef.serviceRadius || 15);
      setProfileSpecialties(currentChef.specialties || []);
      setProfileServiceAreas(currentChef.serviceAreas || []);
      if (currentChef.certificates && currentChef.certificates.length > 0) {
        setCertificates(currentChef.certificates);
      }
    }
  }, [currentChef]);

  // Bookings assigned to current chef
  const chefBookings = useMemo(() => {
    return bookings.filter((b) => b.chefId === currentChef?.id);
  }, [bookings, currentChef?.id]);

  const newRequests = useMemo(() => {
    return chefBookings.filter((b) => b.status === 'pending');
  }, [chefBookings]);

  const confirmedBookings = useMemo(() => {
    return chefBookings.filter((b) => b.status === 'confirmed');
  }, [chefBookings]);

  const upcomingBookings = useMemo(() => {
    return chefBookings.filter(
      (b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'accepted'
    );
  }, [chefBookings]);

  const completedBookings = useMemo(() => {
    return chefBookings.filter((b) => b.status === 'completed');
  }, [chefBookings]);

  const cancelledBookings = useMemo(() => {
    return chefBookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
  }, [chefBookings]);

  const ordersCompletedThisMonth = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return chefBookings.filter(
      (b) => b.status === 'completed' && (b.eventDate || b.updatedAt || '').startsWith(currentMonth)
    ).length;
  }, [chefBookings]);

  const chefServices = useMemo(() => {
    return cookingServices.filter((s) => s.chefId === currentChef?.id);
  }, [cookingServices, currentChef?.id]);

  const chefReviews = useMemo(() => {
    return reviews.filter((r) => r.chefId === currentChef?.id);
  }, [reviews, currentChef?.id]);

  const chefNotifications = useMemo(() => {
    return notifications.filter((n) => n.recipientRole === 'chef');
  }, [notifications]);

  const unreadNotifs = chefNotifications.filter((n) => !n.read).length;

  // Financial statistics calculated from actual payment records
  const totalEarnings = useMemo(() => {
    const payments = storeState.payments || [];
    const chefBookingIds = new Set(chefBookings.map((b) => b.id));
    const paidPaymentsSum = payments
      .filter((p) => chefBookingIds.has(p.bookingId) && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    if (paidPaymentsSum > 0) return paidPaymentsSum;

    return chefBookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.chefServiceFee + (b.additionalCharges || 0), 0);
  }, [chefBookings, storeState.payments]);

  const currentMonthEarnings = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return chefBookings
      .filter((b) => b.paymentStatus === 'paid' && (b.eventDate || '').startsWith(currentMonth))
      .reduce((sum, b) => sum + b.chefServiceFee + (b.additionalCharges || 0), 0);
  }, [chefBookings]);

  const pendingPayouts = useMemo(() => {
    return chefBookings
      .filter((b) => (b.status === 'confirmed' || b.status === 'in_progress') && b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.chefServiceFee + (b.additionalCharges || 0), 0);
  }, [chefBookings]);

  // Profile completion score
  const profileCompletionScore = useMemo(() => {
    if (!currentChef) return 0;
    let score = 0;
    if (currentChef.fullName) score += 15;
    if (currentChef.avatarUrl) score += 15;
    if (currentChef.bio && currentChef.bio.length > 20) score += 15;
    if (currentChef.specialties && currentChef.specialties.length > 0) score += 15;
    if (currentChef.location) score += 15;
    if (currentChef.serviceRadius) score += 10;
    if (currentChef.hourlyRate) score += 15;
    return Math.min(score, 100);
  }, [currentChef]);

  // Monthly performance calculated from real database records
  const monthlyPerformance = useMemo(() => {
    const map = new Map<string, { count: number; earnings: number; monthLabel: string }>();
    chefBookings
      .filter((b) => b.status === 'completed')
      .forEach((b) => {
        const dateStr = b.eventDate || b.updatedAt || b.createdAt || '';
        const monthKey = dateStr.substring(0, 7) || '2026-10';
        const date = new Date(dateStr);
        const monthLabel = !isNaN(date.getTime())
          ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : monthKey;

        if (!map.has(monthKey)) {
          map.set(monthKey, { count: 0, earnings: 0, monthLabel });
        }
        const item = map.get(monthKey)!;
        item.count += 1;
        item.earnings += b.chefServiceFee + (b.additionalCharges || 0);
      });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [chefBookings]);

  // Filtered bookings by search and status
  const searchedBookings = useMemo(() => {
    return chefBookings.filter((b) => {
      const matchesStatus =
        requestStatusFilter === 'all' ||
        (requestStatusFilter === 'pending' && b.status === 'pending') ||
        (requestStatusFilter === 'accepted' && (b.status === 'accepted' || b.status === 'confirmed')) ||
        (requestStatusFilter === 'in_progress' && b.status === 'in_progress') ||
        (requestStatusFilter === 'completed' && b.status === 'completed') ||
        (requestStatusFilter === 'cancelled' && (b.status === 'cancelled' || b.status === 'rejected'));

      if (!matchesStatus) return false;

      if (!searchBookingsQuery.trim()) return true;
      const q = searchBookingsQuery.toLowerCase();
      return (
        b.bookingNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.venueAddress.toLowerCase().includes(q) ||
        b.items.some((i) => i.dishName.toLowerCase().includes(q))
      );
    });
  }, [chefBookings, searchBookingsQuery, requestStatusFilter]);

  // Handle Quotation
  const handleOpenQuotation = (booking: Booking) => {
    if (booking.status === 'cancelled') {
      alert(`Cannot accept booking #${booking.bookingNumber}: Booking has already been cancelled by ${booking.cancelledBy || 'customer'}.`);
      return;
    }
    if (booking.status !== 'pending') {
      alert(`Cannot accept booking #${booking.bookingNumber}: Current status is ${booking.status}.`);
      return;
    }
    setQuotationBooking(booking);
    setCustomServiceFee(booking.chefServiceFee);
    setCustomDuration(booking.expectedDurationHours);
    setAdditionalCharges(booking.additionalCharges || 0);
    setAdditionalChargesNotes(booking.additionalChargesNotes || 'Specialized moulds & travel setup');
    setChefQuotationNotes('I have confirmed the recipe requirements and will arrive 30 mins early.');
  };

  const handleConfirmQuotation = () => {
    if (!quotationBooking) return;
    const currentStatus = appStore.getState().bookings.find((b) => b.id === quotationBooking.id)?.status;
    if (currentStatus === 'cancelled') {
      alert('This booking was cancelled while quotation was being drafted. Acceptance cannot be processed.');
      setQuotationBooking(null);
      return;
    }
    try {
      appStore.chefAcceptBooking(quotationBooking.id, {
        revisedServiceFee: customServiceFee,
        revisedDurationHours: customDuration,
        additionalCharges,
        additionalChargesNotes,
        chefQuotationNotes,
      });
      setQuotationBooking(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to accept booking');
    }
  };

  const handleConfirmReject = () => {
    if (!rejectBooking) return;
    if (!rejectReason.trim()) {
      alert('Please state a reason for declining.');
      return;
    }
    appStore.chefRejectBooking(rejectBooking.id, rejectReason);
    setRejectBooking(null);
    setRejectReason('');
  };

  // Add / Edit Food Item
  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;

    if (editingServiceId) {
      appStore.chefUpdateService(editingServiceId, {
        serviceName: dishName,
        description: dishDescription,
        pricingType: dishPriceType,
        baseRate: dishRate,
        minDurationHours: dishDuration,
        categoryId: dishCategoryId,
        imageUrl: dishImageUrl || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      });
      setEditingServiceId(null);
    } else {
      appStore.chefAddService({
        chefId: currentChef.id,
        categoryId: dishCategoryId,
        serviceName: dishName,
        description: dishDescription || `${dishName} crafted with fresh authentic ingredients. ${dishServingSize}`,
        pricingType: dishPriceType,
        baseRate: dishRate,
        minDurationHours: dishDuration,
        isActive: true,
        imageUrl: dishImageUrl || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      });
    }

    setShowAddDishModal(false);
    setDishName('');
    setDishDescription('');
    setDishImageUrl('');
  };

  const handleOpenEditDish = (srv: CookingService) => {
    setEditingServiceId(srv.id);
    setDishName(srv.serviceName);
    setDishDescription(srv.description);
    setDishPriceType(srv.pricingType);
    setDishRate(srv.baseRate);
    setDishDuration(srv.minDurationHours);
    setDishCategoryId(srv.categoryId);
    setDishImageUrl(srv.imageUrl || '');
    setShowAddDishModal(true);
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    appStore.chefUpdateProfile(currentChef.id, {
      fullName: profileName,
      phone: profilePhone,
      email: profileEmail,
      bio: profileBio,
      experienceYears: Number(profileExperience),
      hourlyRate: Number(profileHourlyRate),
      baseCharge: Number(profileEventBaseRate),
      perPersonRate: Number(profilePerPersonRate),
      avatarUrl: profileAvatarUrl,
      location: profileLocation,
      serviceRadius: Number(profileServiceRadius),
      specialties: profileSpecialties,
      serviceAreas: profileServiceAreas,
      certificates,
    });
    setProfileSuccessMsg(true);
    setTimeout(() => setProfileSuccessMsg(false), 3000);
  };

  // Reply to review
  const handleSubmitReviewReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    appStore.chefReplyReview(reviewId, replyText);
    setReplyingReviewId(null);
    setReplyText('');
  };

  // Download Earnings Report CSV
  const handleDownloadEarningsCSV = () => {
    const headers = ['Booking Number', 'Customer Name', 'Event Date', 'Event Type', 'Chef Service Fee', 'Additional Charges', 'Total Received', 'Payment Status'];
    const rows = chefBookings.map((b) => [
      b.bookingNumber,
      `"${b.customerName}"`,
      b.eventDate,
      b.eventType,
      b.chefServiceFee,
      b.additionalCharges,
      b.chefServiceFee + b.additionalCharges,
      b.paymentStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bookmychef_Earnings_Report_${currentChef.fullName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Support ticket submission
  const handleSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) return;
    appStore.submitSupportTicket({
      customerId: currentChef.profileId,
      customerName: currentChef.fullName,
      customerEmail: currentChef.email,
      subject: supportSubject,
      category: supportCategory,
      message: supportMessage,
    });
    setSupportSuccess(true);
    setSupportSubject('');
    setSupportMessage('');
    setTimeout(() => setSupportSuccess(false), 4000);
  };

  // Recommended Chef Dashboard Sidebar items (matching user specification)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'requests',
      label: 'Booking Requests',
      icon: <Clock className="w-5 h-5" />,
      badge: newRequests.length > 0 ? `${newRequests.length}` : undefined,
    },
    { id: 'schedule', label: 'My Schedule', icon: <Calendar className="w-5 h-5" /> },
    { id: 'menu', label: 'My Menu', icon: <Utensils className="w-5 h-5" />, count: chefServices.length },
    { id: 'profile', label: 'My Profile', icon: <ChefHat className="w-5 h-5" /> },
    { id: 'earnings', label: 'Earnings & Payments', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'reviews', label: 'Reviews & Ratings', icon: <Star className="w-5 h-5" />, count: chefReviews.length },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotifs > 0 ? `${unreadNotifs}` : undefined,
    },
    { id: 'settings', label: 'Settings', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8EC] flex flex-col lg:flex-row text-[#24352D]">
      
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-[#173D2E] text-white p-3.5 sm:p-4 flex items-center justify-between sticky top-0 sm:top-20 z-30 shadow-md">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-[#0B3027] text-[#D9A441] touch-manipulation"
          aria-label="Toggle Chef Navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <div className="flex items-center space-x-2">
          <ChefHat className="w-5 h-5 text-[#D9A441]" />
          <span className="font-bold text-xs sm:text-sm tracking-tight">bookmychef.com • Chef Portal</span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D9A441]">
          <img src={currentChef?.avatarUrl} alt="" className="w-full h-full object-cover" />
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

      {/* Recommended Chef Dashboard Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-20 z-40 h-[100vh] lg:h-[calc(100vh-5rem)] w-72 max-w-[85vw] bg-[#173D2E] text-white flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* Logo & Portal Status */}
          <div className="mb-6 pb-4 border-b border-[#21543f]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-white p-1 overflow-hidden shadow-md shrink-0 border border-amber-200/50">
                  <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-lg font-bold font-display text-white">
                    bookmy<span className="text-[#D9A441]">chef</span><span className="text-[10px] text-[#D9A441] font-mono">.com</span>
                  </span>
                  <p className="text-[10px] text-[#FFF8EC]/70 uppercase tracking-wider font-semibold">
                    Chef Portal
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

            {/* Online Status Pill */}
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Online • Ready for Bookings</span>
            </div>
          </div>

          {/* Navigation Items */}
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
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 ${
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

        {/* Sidebar Footer with Chef Info & Logout */}
        <div className="p-4 border-t border-[#21543f] bg-[#0B3027]/70 space-y-3">
          <div className="flex items-center space-x-3">
            <img
              src={currentChef?.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-[#D9A441]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentChef?.fullName}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${
                  currentChef?.status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <span className="text-[10px] text-[#D9A441] uppercase font-bold tracking-wider">
                  {currentChef?.status === 'approved' ? 'Verified Chef' : currentChef?.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => appStore.switchRole('customer')}
              title="Switch to Customer Portal"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFF8EC]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              appStore.logout();
              if (onLogout) onLogout();
            }}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-stone-300 hover:text-red-300 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Chef Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="bg-white border-b border-stone-200/80 px-6 sm:px-8 py-4 flex items-center justify-between sticky top-0 lg:top-20 z-20 shadow-2xs">
          <div className="flex items-center space-x-4 flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search bookings by customer, number, address, or dish..."
                value={searchBookingsQuery}
                onChange={(e) => setSearchBookingsQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-stone-200 bg-[#FFF8EC]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveNav('notifications')}
              className="relative p-2.5 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-[#D9A441] text-[#173D2E] text-xs font-black rounded-full flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </button>

            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                currentChef?.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {currentChef?.status === 'approved' ? '✓ Verified Partner' : '⏳ Pending Approval'}
            </span>

            <div
              onClick={() => setActiveNav('profile')}
              className="flex items-center space-x-2.5 pl-2 cursor-pointer group"
            >
              <img
                src={currentChef?.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-[#D9A441]"
              />
              <div className="hidden sm:block text-left text-xs">
                <span className="font-bold text-[#173D2E] block group-hover:text-[#D9A441] transition-colors truncate max-w-[120px]">
                  {currentChef?.fullName}
                </span>
                <span className="text-[10px] text-stone-400 font-semibold">
                  Executive Chef
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Chef Workspace Body */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Status Warning if Pending */}
          {currentChef?.status === 'pending' && (
            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-xs text-amber-900">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block">Application Status: Pending Admin Verification</span>
                  <span>Your profile is being reviewed by bookmychef.com Operations. Once approved, you can accept bookings.</span>
                </div>
              </div>
              <button
                onClick={() => appStore.adminApproveChef(currentChef.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shrink-0 hover:bg-emerald-700"
              >
                Simulate Admin Approval
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 1: DASHBOARD OVERVIEW */}
          {/* ======================================================== */}
          {activeNav === 'dashboard' && (
            <div className="space-y-8">
              {/* Welcome Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#173D2E] via-[#1b4635] to-[#0B3027] text-white p-6 sm:p-8 shadow-xl">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 lg:opacity-40 pointer-events-none">
                  <img
                    src={currentChef?.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="relative z-10 max-w-xl">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFF8EC]/10 text-[#FFF8EC] text-xs font-semibold mb-3 border border-[#D9A441]/30">
                    <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>Executive Culinary Partner</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight">
                    Welcome Back,{' '}
                    <span className="text-[#D9A441] italic font-serif">
                      {currentChef?.fullName?.split(' ')[1] || 'Chef'}!
                    </span>
                  </h1>

                  <p className="mt-2 text-xs sm:text-sm text-[#FFF8EC]/85 leading-relaxed">
                    Manage your cooking services, review customer requests, customize quotations, and delight families with exquisite live feasts.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveNav('requests')}
                      className="px-6 py-3 rounded-2xl bg-[#D9A441] hover:bg-[#c49132] text-[#173D2E] font-extrabold text-xs shadow-md transition-transform active:scale-95 flex items-center space-x-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Review Requests ({newRequests.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveNav('schedule')}
                      className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center space-x-1.5"
                    >
                      <Calendar className="w-4 h-4 text-[#D9A441]" />
                      <span>My Schedule</span>
                    </button>

                    <button
                      onClick={() => setActiveNav('menu')}
                      className="px-6 py-3 rounded-2xl bg-[#D9A441]/20 hover:bg-[#D9A441]/30 text-[#FFF8EC] font-bold text-xs border border-[#D9A441]/40 transition-all flex items-center space-x-1.5"
                    >
                      <Utensils className="w-4 h-4 text-[#D9A441]" />
                      <span>Manage Dishes</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Exact 8 Dashboard Overview Metric Cards as requested */}
              <div>
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3">
                  Executive Performance & Booking Metrics
                </h3>
                {isLoading ? (
                  <DashboardStatsSkeleton count={4} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {/* 1. Total Bookings */}
                    <div
                      onClick={() => { setActiveNav('requests'); setRequestStatusFilter('all'); }}
                      className="bg-white p-3.5 rounded-3xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Total Bookings</span>
                      <span className="text-xl sm:text-2xl font-black text-[#173D2E] block">{chefBookings.length}</span>
                      <span className="text-[10px] text-stone-500 font-semibold">All-time</span>
                    </div>

                    {/* 2. New Booking Requests */}
                    <div
                      onClick={() => { setActiveNav('requests'); setRequestStatusFilter('pending'); }}
                      className="bg-white p-3.5 rounded-3xl border border-amber-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-amber-50/30"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">New Requests</span>
                      <span className="text-xl sm:text-2xl font-black text-[#D9A441] block">{newRequests.length}</span>
                      <span className="text-[10px] text-amber-700/80 font-semibold">Needs action</span>
                    </div>

                    {/* 3. Confirmed Bookings */}
                    <div
                      onClick={() => { setActiveNav('requests'); setRequestStatusFilter('accepted'); }}
                      className="bg-white p-3.5 rounded-3xl border border-blue-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-blue-50/20"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">Confirmed</span>
                      <span className="text-xl sm:text-2xl font-black text-blue-700 block">{confirmedBookings.length}</span>
                      <span className="text-[10px] text-stone-500 font-semibold">Advance paid</span>
                    </div>

                    {/* 4. Completed Bookings */}
                    <div
                      onClick={() => { setActiveNav('requests'); setRequestStatusFilter('completed'); }}
                      className="bg-white p-3.5 rounded-3xl border border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-emerald-50/20"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Completed</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-700 block">{completedBookings.length}</span>
                      <span className="text-[10px] text-stone-500 font-semibold">Feasts served</span>
                    </div>

                    {/* 5. Cancelled Bookings */}
                    <div
                      onClick={() => { setActiveNav('requests'); setRequestStatusFilter('cancelled'); }}
                      className="bg-white p-3.5 rounded-3xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">Cancelled</span>
                      <span className="text-xl sm:text-2xl font-black text-rose-600 block">{cancelledBookings.length}</span>
                      <span className="text-[10px] text-stone-500 font-semibold">Declined/Void</span>
                    </div>

                    {/* 6. Orders Completed This Month */}
                    <div
                      className="bg-white p-3.5 rounded-3xl border border-indigo-200 shadow-2xs hover:shadow-md transition-all group bg-indigo-50/20"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">This Month</span>
                      <span className="text-xl sm:text-2xl font-black text-indigo-800 block">{ordersCompletedThisMonth}</span>
                      <span className="text-[10px] text-stone-500 font-semibold">Completed</span>
                    </div>

                    {/* 7. Total Earnings */}
                    <div
                      onClick={() => setActiveNav('earnings')}
                      className="bg-white p-3.5 rounded-3xl border border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-emerald-50/30"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Total Earnings</span>
                      <span className="text-base sm:text-lg font-black text-emerald-800 block">{formatINR(totalEarnings)}</span>
                      <span className="text-[10px] text-emerald-700/80 font-semibold">Actual payments</span>
                    </div>

                    {/* 8. Average Customer Rating */}
                    <div
                      onClick={() => setActiveNav('reviews')}
                      className="bg-white p-3.5 rounded-3xl border border-[#D9A441]/40 shadow-2xs hover:shadow-md transition-all cursor-pointer group bg-[#FFF8EC]"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#173D2E] block mb-1">Avg Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-[#D9A441] text-[#D9A441]" />
                        <span className="text-xl sm:text-2xl font-black text-[#173D2E]">{currentChef?.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-semibold">{chefReviews.length} reviews</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Booking Requests Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold font-display text-[#173D2E]">
                      Recent Customer Booking Requests
                    </h3>
                    <p className="text-xs text-stone-500">
                      Customers waiting for your quotation or service acceptance.
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveNav('requests'); setRequestStatusFilter('pending'); }}
                    className="text-xs font-bold text-[#D9A441] hover:underline"
                  >
                    View All ({newRequests.length})
                  </button>
                </div>

                {isLoading ? (
                  <BookingCardSkeleton count={2} />
                ) : newRequests.length > 0 ? (
                  <div className="border border-stone-200 rounded-2xl overflow-x-auto text-xs w-full">
                    <table className="w-full min-w-[560px] text-left">
                      <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-3.5">Customer & Event</th>
                          <th className="p-3.5">Event Date & Time</th>
                          <th className="p-3.5">Menu & Quantities</th>
                          <th className="p-3.5">Service Fee</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {newRequests.slice(0, 5).map((b) => (
                          <tr key={b.id} className="hover:bg-stone-50/50">
                            <td className="p-3.5">
                              <span className="font-bold text-[#173D2E] block">{b.customerName}</span>
                              <span className="text-[11px] text-stone-500 capitalize">{b.eventType.replace('_', ' ')} • {b.guestsCount} guests</span>
                            </td>
                            <td className="p-3.5 font-semibold text-stone-700">
                              {b.eventDate} at {b.startTime}
                            </td>
                            <td className="p-3.5 text-stone-600 max-w-xs truncate">
                              {b.items.map((i) => `${i.quantity} ${i.unit} ${i.dishName}`).join(', ')}
                            </td>
                            <td className="p-3.5 font-bold text-[#173D2E]">
                              {formatINR(b.chefServiceFee)}
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => setSelectedBookingForDetail(b)}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => handleOpenQuotation(b)}
                                className="px-4 py-1.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-white font-bold"
                              >
                                Accept & Quote
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-stone-400">
                    No pending booking requests right now.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 2: BOOKING MANAGEMENT */}
          {/* ======================================================== */}
          {activeNav === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Booking Management</h2>
                  <p className="text-xs text-stone-500">
                    Review incoming requests, customer details, customized dishes, and advance booking lifecycle.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {[
                    { id: 'all', label: `All (${chefBookings.length})` },
                    { id: 'pending', label: `New Requests (${newRequests.length})` },
                    { id: 'accepted', label: `Accepted / Upcoming (${upcomingBookings.length})` },
                    { id: 'completed', label: `Completed (${completedBookings.length})` },
                    { id: 'cancelled', label: `Cancelled (${cancelledBookings.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setRequestStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        requestStatusFilter === tab.id
                          ? 'bg-[#173D2E] text-[#D9A441] shadow-sm'
                          : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Cards Grid */}
              <div className="space-y-4">
                {searchedBookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 hover:border-[#D9A441]/40 transition-all">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-[#173D2E]">#{b.bookingNumber}</span>
                        <span className="text-stone-300 mx-1">•</span>
                        <span className="text-xs text-stone-600 capitalize font-medium">{b.eventType.replace('_', ' ')}</span>
                        <span className="text-stone-300 mx-1">•</span>
                        <span className="text-xs text-stone-600">{b.guestsCount} Guests</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const badge = getBookingStatusBadge(b.status);
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Booking Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-8 space-y-3 text-xs">
                        {/* Customer & Location */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-bold text-stone-900 text-sm">{b.customerName}</span>
                          <span className="text-stone-500 flex items-center space-x-1">
                            <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                            <span>{b.customerPhone}</span>
                          </span>
                          <span className="text-stone-500 flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5 text-[#D9A441]" />
                            <span>{b.customerEmail}</span>
                          </span>
                        </div>

                        <div className="flex items-start space-x-1.5 text-stone-600">
                          <MapPin className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                          <span>Venue: <strong>{b.venueAddress}</strong></span>
                        </div>

                        <div className="flex items-center space-x-3 text-stone-600 font-medium">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{b.eventDate}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{b.startTime} ({b.expectedDurationHours} hrs)</span>
                          </span>
                        </div>

                        {/* Selected Food Items and Quantities */}
                        <div className="p-3.5 bg-[#FFF8EC] rounded-2xl border border-[#D9A441]/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#173D2E] flex items-center space-x-1.5">
                              <Utensils className="w-3.5 h-3.5 text-[#D9A441]" />
                              <span>Selected Food Items & Quantities:</span>
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#173D2E] text-[#D9A441] font-bold">
                              {b.ingredientArrangement === 'chef_provided' ? 'Chef Provides Ingredients' : 'Customer Supplies Ingredients'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {b.items.map((i, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-xl border border-stone-100">
                                <span className="font-medium text-stone-800">{i.dishName}</span>
                                <span className="font-black text-[#173D2E]">{i.quantity} {i.unit}</span>
                              </div>
                            ))}
                          </div>

                          {b.specialInstructions && (
                            <p className="text-[11px] text-stone-600 italic pt-1">
                              <strong>Note from Customer:</strong> "{b.specialInstructions}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action & Financials Column */}
                      <div className="md:col-span-4 flex flex-col justify-between h-full space-y-4 md:border-l md:border-stone-100 md:pl-6">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Quoted Service Fee</span>
                          <span className="text-2xl font-black text-[#173D2E] block">{formatINR(b.chefServiceFee + (b.additionalCharges || 0))}</span>
                          {b.additionalCharges > 0 && (
                            <span className="text-[10px] text-stone-500 font-semibold block">
                              Includes +{formatINR(b.additionalCharges)} ({b.additionalChargesNotes || 'equipment'})
                            </span>
                          )}
                          <span className="text-[11px] text-stone-500 block mt-1">
                            Payment: <strong className="capitalize text-stone-800">{b.paymentStatus}</strong>
                          </span>
                        </div>

                        {/* Status workflow action buttons */}
                        <div className="space-y-2 pt-2">
                          {b.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleOpenQuotation(b)}
                                className="w-full py-2.5 px-4 rounded-xl bg-[#173D2E] text-[#D9A441] hover:bg-[#0f291e] font-bold text-xs shadow-md flex items-center justify-center space-x-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>Accept & Quote</span>
                              </button>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedBookingForDetail(b)}
                                  className="flex-1 py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs"
                                >
                                  Inspect Details
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectBooking(b);
                                    setRejectReason('Schedule overlap');
                                  }}
                                  className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}

                          {(b.status === 'confirmed' || b.status === 'accepted') && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => appStore.updateBookingStatus(b.id, 'in_progress', 'chef')}
                                className="w-full py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md"
                              >
                                <Play className="w-4 h-4 fill-white" />
                                <span>Start Cooking</span>
                              </button>

                              <button
                                onClick={() => onContactCustomer(b.customerName, b.customerPhone)}
                                className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center space-x-1.5"
                              >
                                <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                                <span>Call Customer</span>
                              </button>
                            </div>
                          )}

                          {b.status === 'in_progress' && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => appStore.updateBookingStatus(b.id, 'completed', 'chef')}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md"
                              >
                                <Check className="w-4 h-4" />
                                <span>Mark Cooking Completed</span>
                              </button>

                              <button
                                onClick={() => onContactCustomer(b.customerName, b.customerPhone)}
                                className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center space-x-1.5"
                              >
                                <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                                <span>Call Customer</span>
                              </button>
                            </div>
                          )}

                          {b.status === 'completed' && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-center font-bold text-xs flex items-center justify-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Service Delivered & Complete</span>
                            </div>
                          )}

                          {b.status === 'cancelled' && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-1 font-bold">
                                <span className="text-rose-700 flex items-center space-x-1">
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancelled {b.cancelledBy ? `by ${b.cancelledBy.toUpperCase()}` : ''}</span>
                                </span>
                                {(b.cancelledAt || b.updatedAt) && (
                                  <span className="text-[10px] text-stone-500 font-normal">
                                    {new Date(b.cancelledAt || b.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-700">
                                <strong className="text-stone-900">Reason:</strong> {b.cancellationReason || 'No reason provided'}
                              </p>
                              {b.paymentStatus === 'refunded' && (
                                <p className="text-[10px] text-emerald-800 font-semibold">
                                  ✓ Customer deposit has been refunded
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {searchedBookings.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    No bookings found matching your search and filter criteria.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 3: CALENDAR & SCHEDULE */}
          {/* ======================================================== */}
          {activeNav === 'schedule' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Calendar & Schedule</h2>
                  <p className="text-xs text-stone-500">
                    Monthly calendar view, working hours, daily slots, and personal date blocking.
                  </p>
                </div>

                <div className="flex rounded-2xl bg-white p-1 border border-stone-200 shadow-2xs text-xs font-bold">
                  <button
                    onClick={() => setScheduleViewMode('calendar')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      scheduleViewMode === 'calendar'
                        ? 'bg-[#173D2E] text-[#D9A441]'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Availability Calendar
                  </button>
                  <button
                    onClick={() => setScheduleViewMode('timeline')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      scheduleViewMode === 'timeline'
                        ? 'bg-[#173D2E] text-[#D9A441]'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Upcoming Events ({upcomingBookings.length})
                  </button>
                  <button
                    onClick={() => setScheduleViewMode('manage_slots')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      scheduleViewMode === 'manage_slots'
                        ? 'bg-[#173D2E] text-[#D9A441]'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Block Personal Dates
                  </button>
                </div>
              </div>

              {scheduleViewMode === 'calendar' && (
                <AvailabilityCalendar
                  chefId={currentChef.id}
                  chefName={currentChef.fullName}
                />
              )}

              {scheduleViewMode === 'timeline' && (
                <div className="space-y-4">
                  {upcomingBookings.map((b) => (
                    <div key={b.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#173D2E] text-sm">#{b.bookingNumber} • {b.eventDate} at {b.startTime}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {b.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900 mt-1">{b.customerName} ({b.eventType.replace('_', ' ')})</h4>
                        <p className="text-xs text-stone-500">Venue: {b.venueAddress}</p>
                        <p className="text-xs text-stone-600 mt-1">Dishes: {b.items.map(i => `${i.quantity} ${i.unit} ${i.dishName}`).join(', ')}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => appStore.updateBookingStatus(b.id, 'in_progress', 'chef')}
                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center space-x-1"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Start Cooking</span>
                          </button>
                        )}

                        {b.status === 'in_progress' && (
                          <button
                            onClick={() => appStore.updateBookingStatus(b.id, 'completed', 'chef')}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}

                        <button
                          onClick={() => onContactCustomer(b.customerName, b.customerPhone)}
                          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center space-x-1"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#D9A441]" />
                          <span>Call Customer</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {upcomingBookings.length === 0 && (
                    <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                      No upcoming confirmed events scheduled.
                    </div>
                  )}
                </div>
              )}

              {scheduleViewMode === 'manage_slots' && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold font-display text-[#173D2E]">Block Dates for Personal Time-Off</h3>
                    <p className="text-xs text-stone-500">
                      Customers will not be able to book you on blocked dates.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                    <input
                      type="date"
                      value={newSlotDate}
                      onChange={(e) => setNewSlotDate(e.target.value)}
                      className="p-3 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g. Festival leave, travel)"
                      value={newSlotReason}
                      onChange={(e) => setNewSlotReason(e.target.value)}
                      className="flex-1 p-3 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                    />
                    <button
                      onClick={() => {
                        if (!newSlotDate) return;
                        appStore.toggleChefDateAvailability(currentChef.id, newSlotDate, false, { reason: newSlotReason });
                        setNewSlotDate('');
                      }}
                      className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0"
                    >
                      Block Date
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Currently Blocked Dates</h4>
                    <div className="flex flex-wrap gap-2">
                      {(currentChef.blockedDates || []).map((date) => (
                        <div key={date} className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
                          <span>{date}</span>
                          <button
                            onClick={() => appStore.toggleChefDateAvailability(currentChef.id, date, true)}
                            className="p-0.5 hover:bg-rose-200 rounded-full"
                            title="Unblock date"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(currentChef.blockedDates || []).length === 0 && (
                        <p className="text-xs text-stone-400">No dates are currently blocked. You are fully available!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 4: MY CHEF PROFILE */}
          {/* ======================================================== */}
          {activeNav === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">My Chef Profile</h2>
                  <p className="text-xs text-stone-500">
                    Update your professional culinary credentials, rates, service areas, and bio.
                  </p>
                </div>
                {profileSuccessMsg && (
                  <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Profile saved successfully!</span>
                  </span>
                )}
              </div>

              {/* Profile Completion Progress Indicator */}
              <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#173D2E] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D9A441]" />
                    <span>Profile Completion Progress</span>
                  </span>
                  <span className="font-black text-[#173D2E]">{profileCompletionScore}% Completed</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#D9A441] to-[#173D2E] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletionScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500">
                  {profileCompletionScore >= 100
                    ? '✨ Your profile is 100% complete and fully optimized for customer discovery!'
                    : 'Complete all fields (photos, bio, specialties, service radius, hourly rate) to achieve 100% visibility.'}
                </p>
              </div>

              {/* Dynamic Live Statistics calculated from actual Supabase Bookings & Reviews */}
              {(() => {
                const stats = getChefStats(currentChef.id, bookings, reviews);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D9A441] flex items-center justify-center shrink-0 border border-amber-200">
                        <Star className="w-6 h-6 fill-[#D9A441]" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Chef Rating</span>
                        <span className="text-lg sm:text-xl font-black text-stone-900">{stats.ratingDisplay}</span>
                        <span className="text-[11px] text-stone-500 block">
                          {stats.reviewCount > 0 ? `${stats.reviewCount} verified reviews` : 'Genuine customer reviews'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Total Completed</span>
                        <span className="text-lg sm:text-xl font-black text-stone-900">{stats.totalCompletedBookings} Bookings</span>
                        <span className="text-[11px] text-stone-500 block">Status = 'completed'</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Last Month Orders</span>
                        <span className="text-lg sm:text-xl font-black text-stone-900">{stats.lastMonthCompletedBookings} Completed</span>
                        <span className="text-[11px] text-stone-500 block">Previous calendar month</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 text-xs">
                {/* Photo & Basic Details */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-stone-100">
                  <div className="relative group">
                    <img
                      src={profileAvatarUrl || currentChef.avatarUrl}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-2 border-[#D9A441] shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Avatar Image URL</label>
                      <input
                        type="url"
                        value={profileAvatarUrl}
                        onChange={(e) => setProfileAvatarUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Chef Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E] font-bold text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Bio & Experience */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-stone-100">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-stone-700 block mb-1">Professional Bio / Story</label>
                    <textarea
                      rows={3}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Share your culinary heritage, regional mastery, and passion..."
                      className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Years of Cooking Experience</label>
                    <input
                      type="number"
                      value={profileExperience}
                      onChange={(e) => setProfileExperience(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E] font-bold"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Displays on public search card and badge.</p>
                  </div>
                </div>

                {/* Pricing Structure */}
                <div className="pb-6 border-b border-stone-100">
                  <h4 className="font-bold text-sm text-[#173D2E] mb-3">Service Pricing Configuration (₹)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Hourly Cooking Rate (₹/hr)</label>
                      <input
                        type="number"
                        value={profileHourlyRate}
                        onChange={(e) => setProfileHourlyRate(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-[#173D2E]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Base Event Charge (₹)</label>
                      <input
                        type="number"
                        value={profileEventBaseRate}
                        onChange={(e) => setProfileEventBaseRate(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-[#173D2E]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Per Person Feast Rate (₹/person)</label>
                      <input
                        type="number"
                        value={profilePerPersonRate}
                        onChange={(e) => setProfilePerPersonRate(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-[#173D2E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Location & Coverage Radius */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-stone-100">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-stone-700 block mb-1">Service Location (City / Area)</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileLocation}
                        onChange={(e) => setProfileLocation(e.target.value)}
                        placeholder="e.g. Madhapur, Hyderabad or Guntur, Andhra Pradesh"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E] font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">Primary city and neighborhood displayed on your public search card.</p>
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Service Radius (km)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={profileServiceRadius}
                        onChange={(e) => setProfileServiceRadius(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#173D2E] font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">km</span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">Maximum travel radius for home catering bookings.</p>
                  </div>
                </div>

                {/* Specialization & Service Locations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-stone-100">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Specialties & Cuisines</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add cuisine (e.g. Chettinad, Dum Biryani)"
                        value={newSpecialtyInput}
                        onChange={(e) => setNewSpecialtyInput(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSpecialtyInput.trim()) return;
                          setProfileSpecialties([...profileSpecialties, newSpecialtyInput.trim()]);
                          setNewSpecialtyInput('');
                        }}
                        className="px-3 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profileSpecialties.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold flex items-center space-x-1">
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => setProfileSpecialties(profileSpecialties.filter((_, i) => i !== idx))}
                            className="text-amber-700 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Service Locations / Neighborhoods</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add area (e.g. Jubilee Hills, Gachibowli)"
                        value={newAreaInput}
                        onChange={(e) => setNewAreaInput(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-stone-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newAreaInput.trim()) return;
                          setProfileServiceAreas([...profileServiceAreas, newAreaInput.trim()]);
                          setNewAreaInput('');
                        }}
                        className="px-3 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profileServiceAreas.map((area, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-stone-100 text-stone-800 rounded-lg font-bold flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#D9A441]" />
                          <span>{area}</span>
                          <button
                            type="button"
                            onClick={() => setProfileServiceAreas(profileServiceAreas.filter((_, i) => i !== idx))}
                            className="text-stone-500 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upload Certificates Section */}
                <div>
                  <h4 className="font-bold text-sm text-[#173D2E] mb-2 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#D9A441]" />
                    <span>Culinary Certifications & Compliance</span>
                  </h4>
                  <div className="space-y-2 mb-3">
                    {certificates.map((c) => (
                      <div key={c.id} className="p-3 bg-[#FFF8EC] rounded-xl border border-[#D9A441]/30 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900 block">{c.name}</span>
                          <span className="text-[11px] text-stone-500">{c.issuer} • Issued {c.date}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Verified</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                    <input
                      type="text"
                      placeholder="Certificate Name (e.g. Master Chef Diploma)"
                      value={newCertName}
                      onChange={(e) => setNewCertName(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-stone-200"
                    />
                    <input
                      type="text"
                      placeholder="Issuing Authority"
                      value={newCertIssuer}
                      onChange={(e) => setNewCertIssuer(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCertName.trim()) return;
                        setCertificates([...certificates, {
                          id: `cert-${Date.now()}`,
                          name: newCertName.trim(),
                          issuer: newCertIssuer.trim() || 'Culinary Board',
                          date: `${new Date().getFullYear()}`,
                        }]);
                        setNewCertName('');
                        setNewCertIssuer('');
                      }}
                      className="px-4 py-2 bg-[#173D2E] text-white rounded-xl font-bold"
                    >
                      Add Certificate
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#173D2E] text-[#D9A441] hover:bg-[#0f291e] rounded-2xl font-black text-sm shadow-md transition-all active:scale-95"
                  >
                    Save Chef Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 5: MENU & FOOD MANAGEMENT */}
          {/* ======================================================== */}
          {activeNav === 'menu' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Menu & Food Management</h2>
                  <p className="text-xs text-stone-500">
                    Add new dishes, customize categories, configure ingredient lists, and set pricing models.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingServiceId(null);
                    setDishName('');
                    setDishDescription('');
                    setDishRate(500);
                    setDishImageUrl('');
                    setShowAddDishModal(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-[#173D2E] text-[#D9A441] hover:bg-[#0f291e] font-bold text-xs flex items-center space-x-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Food Item</span>
                </button>
              </div>

              {/* Menu Categories Pills */}
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-3 py-1.5 rounded-xl bg-[#173D2E] text-[#D9A441]">All Categories ({chefServices.length})</span>
                {categories.map((c) => (
                  <span key={c.id} className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600">
                    {c.name}
                  </span>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chefServices.map((srv) => (
                  <div key={srv.id} className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="h-44 w-full relative overflow-hidden bg-stone-100">
                        <img
                          src={srv.imageUrl || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80'}
                          alt={srv.serviceName}
                          className="w-full h-full object-cover"
                        />
                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm ${
                          srv.isActive ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-white'
                        }`}>
                          {srv.isActive ? 'Active Menu' : 'Hidden'}
                        </span>
                      </div>

                      <div className="p-5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-[#D9A441] tracking-wider block">
                          {categories.find(c => c.id === srv.categoryId)?.name || 'Culinary Specialty'}
                        </span>
                        <h4 className="font-bold text-stone-900 text-base">{srv.serviceName}</h4>
                        <p className="text-xs text-stone-500 line-clamp-2">{srv.description}</p>
                        
                        <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#173D2E] border-t border-stone-100 mt-3">
                          <span>{formatINR(srv.baseRate)} / {srv.pricingType.replace('_', ' ')}</span>
                          <span className="text-stone-400 font-medium">Min: {srv.minDurationHours} hrs</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditDish(srv)}
                        className="flex-1 py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs text-center"
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => appStore.chefToggleServiceActive(srv.id)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs transition-colors ${
                          srv.isActive
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={srv.isActive ? 'Hide dish from customer search' : 'Make dish visible to customers'}
                      >
                        {srv.isActive ? 'Mark Unavailable' : 'Mark Available'}
                      </button>
                      <button
                        onClick={() => appStore.chefDeleteService(srv.id)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {chefServices.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                  No food items added yet. Click "+ Add New Food Item" above to add your specialties!
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 6: EARNINGS & PAYMENTS */}
          {/* ======================================================== */}
          {activeNav === 'earnings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Earnings & Payments</h2>
                  <p className="text-xs text-stone-500">
                    Comprehensive net earnings, monthly breakdown, post-service settlements, and downloadable statements.
                  </p>
                </div>
                <button
                  onClick={handleDownloadEarningsCSV}
                  className="px-5 py-2.5 rounded-2xl bg-[#173D2E] text-[#D9A441] hover:bg-[#0f291e] font-bold text-xs flex items-center space-x-1.5 shadow-md self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Earnings Report (CSV)</span>
                </button>
              </div>

              {/* 4 Financial Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-200 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-emerald-800 block mb-1">Total Lifetime Earnings</span>
                  <span className="text-3xl font-black text-emerald-950">{formatINR(totalEarnings)}</span>
                  <p className="text-[11px] text-emerald-700 mt-1">Directly credited to bank account</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-stone-400 block mb-1">This Month's Earnings</span>
                  <span className="text-3xl font-black text-[#173D2E]">{formatINR(currentMonthEarnings)}</span>
                  <p className="text-[11px] text-stone-500 mt-1">Current billing cycle</p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-stone-400 block mb-1">Pending Payout Settlements</span>
                  <span className="text-3xl font-black text-[#D9A441]">{formatINR(pendingPayouts)}</span>
                  <p className="text-[11px] text-stone-500 mt-1">Cleared after cooking service completion</p>
                </div>

                <div className="bg-[#FFF8EC] rounded-3xl p-6 border border-[#D9A441]/40 shadow-2xs">
                  <span className="text-xs uppercase font-bold text-[#173D2E] block mb-1">Bank Settlement Day</span>
                  <span className="text-2xl font-black text-[#D9A441]">Every Monday</span>
                  <p className="text-[11px] text-stone-600 mt-1">Automated IMPS / NEFT transfer</p>
                </div>
              </div>

              {/* Booking-wise Payment History Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold font-display text-[#173D2E]">Booking-wise Payment History</h3>
                <div className="border border-stone-200 rounded-2xl overflow-x-auto text-xs w-full">
                  <table className="w-full min-w-[620px] text-left">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="p-3.5">Booking ID</th>
                        <th className="p-3.5">Customer & Event</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Service Fee</th>
                        <th className="p-3.5">Add-ons</th>
                        <th className="p-3.5">Net Payout</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {chefBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-stone-50/50">
                          <td className="p-3.5 font-mono font-bold text-[#173D2E]">#{b.bookingNumber}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-stone-800 block">{b.customerName}</span>
                            <span className="text-[11px] text-stone-500 capitalize">{b.eventType.replace('_', ' ')}</span>
                          </td>
                          <td className="p-3.5 text-stone-600">{b.eventDate}</td>
                          <td className="p-3.5 font-semibold text-stone-800">{formatINR(b.chefServiceFee)}</td>
                          <td className="p-3.5 text-stone-600">+{formatINR(b.additionalCharges || 0)}</td>
                          <td className="p-3.5 font-black text-emerald-700">{formatINR(b.chefServiceFee + (b.additionalCharges || 0))}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {b.paymentStatus === 'paid' ? 'Settled' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 7: CUSTOMER REVIEWS & RATINGS */}
          {/* ======================================================== */}
          {activeNav === 'reviews' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Customer Reviews & Ratings</h2>
                <p className="text-xs text-stone-500">
                  Read genuine guest feedback, view hygiene & taste scores, and respond to customer reviews.
                </p>
              </div>

              {/* Rating Summary Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-6 items-center">
                <div className="text-center sm:text-left sm:border-r sm:border-stone-100 sm:pr-6">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">Overall Average</span>
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span className="text-5xl font-black text-[#173D2E]">{currentChef.rating.toFixed(1)}</span>
                    <div>
                      <div className="flex text-[#D9A441]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-stone-500 font-semibold">{chefReviews.length} total reviews</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-3 grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Food Taste</span>
                    <span className="text-xl font-black text-[#173D2E]">4.9 / 5.0</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Kitchen Cleanliness</span>
                    <span className="text-xl font-black text-[#173D2E]">5.0 / 5.0</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Punctuality</span>
                    <span className="text-xl font-black text-[#173D2E]">4.8 / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Monthly Performance & Orders Completed Table */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#173D2E] flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-[#D9A441]" />
                      <span>Monthly Performance & Completed Bookings</span>
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Orders completed and net payout generated by calendar month (calculated directly from verified database records).
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-500">
                    Total Completed: <strong className="text-[#173D2E] font-black">{completedBookings.length}</strong>
                  </span>
                </div>

                {monthlyPerformance.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-stone-50 text-center text-xs text-stone-500">
                    No completed bookings recorded yet for past months.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-2xl overflow-x-auto text-xs">
                    <table className="w-full min-w-[500px] text-left">
                      <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                        <tr>
                          <th className="p-3">Month</th>
                          <th className="p-3">Completed Bookings</th>
                          <th className="p-3">Gross Earnings</th>
                          <th className="p-3">Avg Ticket Size</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {monthlyPerformance.map(([monthKey, perf]) => (
                          <tr key={monthKey} className="hover:bg-stone-50/60">
                            <td className="p-3 font-bold text-[#173D2E]">{perf.monthLabel}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                {perf.count} orders
                              </span>
                            </td>
                            <td className="p-3 font-black text-stone-900">{formatINR(perf.earnings)}</td>
                            <td className="p-3 text-stone-600">
                              {perf.count > 0 ? formatINR(Math.round(perf.earnings / perf.count)) : '₹0'}
                            </td>
                            <td className="p-3">
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settled</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {chefReviews.map((r) => (
                  <div key={r.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-stone-900 text-sm block">{r.customerName}</span>
                        <span className="text-[11px] text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex text-[#D9A441]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= r.rating ? 'fill-current' : 'text-stone-300'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed italic bg-stone-50/70 p-3 rounded-2xl">
                      "{r.comment}"
                    </p>

                    {/* Chef Reply */}
                    {r.chefReply ? (
                      <div className="p-3.5 rounded-2xl bg-[#FFF8EC] border border-[#D9A441]/30 ml-4">
                        <span className="text-[10px] uppercase font-bold text-[#D9A441] tracking-wider block mb-1">
                          Chef's Official Response:
                        </span>
                        <p className="text-xs text-[#173D2E] font-medium">{r.chefReply}</p>
                      </div>
                    ) : (
                      <div className="pt-2">
                        {replyingReviewId === r.id ? (
                          <div className="space-y-2 ml-4">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a polite response thanking the customer..."
                              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-[#173D2E]"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setReplyingReviewId(null)}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReviewReply(r.id)}
                                className="px-4 py-1.5 rounded-xl bg-[#173D2E] text-[#D9A441] text-xs font-bold"
                              >
                                Post Response
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingReviewId(r.id);
                              setReplyText(`Thank you so much, ${r.customerName}! It was an absolute pleasure cooking for your family.`);
                            }}
                            className="text-xs font-bold text-[#D9A441] hover:underline flex items-center space-x-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Respond to Customer Review</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {chefReviews.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    No reviews received yet. Completed bookings will invite customers to leave ratings!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 8: NOTIFICATIONS */}
          {/* ======================================================== */}
          {activeNav === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[#173D2E]">Notifications & Alerts</h2>
                  <p className="text-xs text-stone-500">
                    Booking alerts, customer responses, payouts, and admin system announcements.
                  </p>
                </div>
                <button
                  onClick={() => appStore.markAllNotificationsRead('chef')}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold"
                >
                  Mark All as Read
                </button>
              </div>

              <div className="space-y-3">
                {chefNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      n.read
                        ? 'bg-white border-stone-200 text-stone-700'
                        : 'bg-[#FFF8EC] border-[#D9A441] text-[#173D2E] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-xl bg-[#173D2E] text-[#D9A441] mt-0.5">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#173D2E]">{n.title}</h4>
                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-stone-400 mt-2 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {!n.read && (
                        <button
                          onClick={() => appStore.markNotificationAsRead(n.id)}
                          className="px-3 py-1 bg-[#173D2E] text-[#D9A441] rounded-xl text-xs font-bold shrink-0"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {chefNotifications.length === 0 && (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-xs text-stone-500">
                    You have no notifications right now.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 9: SUPPORT & SETTINGS */}
          {/* ======================================================== */}
          {activeNav === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold font-display text-[#173D2E]">Support & Settings</h2>
                <p className="text-xs text-stone-500">
                  Password security, chef account settings, contact admin, and help desk.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Change Password Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4 text-xs">
                  <div className="flex items-center space-x-2 text-[#173D2E] font-bold text-base">
                    <Lock className="w-5 h-5 text-[#D9A441]" />
                    <span>Change Password</span>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold">
                      Password changed successfully!
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!newPassword || newPassword !== confirmPassword) {
                          alert('Passwords do not match or are empty.');
                          return;
                        }
                        setPasswordSuccess(true);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setTimeout(() => setPasswordSuccess(false), 3000);
                      }}
                      className="w-full py-2.5 bg-[#173D2E] text-[#D9A441] rounded-xl font-bold mt-2 hover:bg-[#0f291e]"
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Contact Admin & Support Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4 text-xs">
                  <div className="flex items-center space-x-2 text-[#173D2E] font-bold text-base">
                    <HelpCircle className="w-5 h-5 text-[#D9A441]" />
                    <span>Contact Admin & Helpdesk</span>
                  </div>

                  {supportSuccess && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold">
                      Support ticket sent to Admin. We will get back to you shortly.
                    </div>
                  )}

                  <form onSubmit={handleSubmitSupport} className="space-y-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Category</label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                      >
                        <option value="booking">Booking Query / Reschedule</option>
                        <option value="billing">Bank Settlement / Payout</option>
                        <option value="chef_behavior">Customer Kitchen Issue</option>
                        <option value="general">Platform Feedback</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Brief summary of your query"
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Message</label>
                      <textarea
                        rows={3}
                        placeholder="Explain details of the issue..."
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#D9A441] text-[#173D2E] rounded-xl font-extrabold mt-2 hover:bg-[#c49132]"
                    >
                      Send Message to Admin
                    </button>
                  </form>
                </div>
              </div>

              {/* Chef Guidelines & FAQ */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-base text-[#173D2E]">bookmychef.com Partner Standards & FAQ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="font-bold text-stone-900 block mb-1">Punctuality Rule</span>
                    <p className="text-stone-500">Always arrive 30 minutes before the scheduled cooking start time to inspect utensils and setup burners.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="font-bold text-stone-900 block mb-1">Kitchen Hygiene</span>
                    <p className="text-stone-500">Wear clean chef aprons and headcaps. Always leave customer kitchen counters clean and spotless.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50">
                    <span className="font-bold text-stone-900 block mb-1">Direct Bank Transfers</span>
                    <p className="text-stone-500">Payouts for all completed bookings are settled automatically every Monday via direct IMPS.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: Full Booking Detail Inspector */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#173D2E]">
                Booking Request #{selectedBookingForDetail.bookingNumber}
              </h3>
              <button onClick={() => setSelectedBookingForDetail(null)} className="p-1">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="space-y-2">
              <p><strong>Customer:</strong> {selectedBookingForDetail.customerName} ({selectedBookingForDetail.customerPhone})</p>
              <p><strong>Date & Time:</strong> {selectedBookingForDetail.eventDate} at {selectedBookingForDetail.startTime}</p>
              <p><strong>Location:</strong> {selectedBookingForDetail.venueAddress}</p>
              <p><strong>Scale:</strong> {selectedBookingForDetail.guestsCount} guests • {selectedBookingForDetail.expectedDurationHours} hours</p>
              <p><strong>Ingredients:</strong> {selectedBookingForDetail.ingredientArrangement === 'chef_provided' ? 'Chef Arranged' : 'Customer Supplies'}</p>
              <div className="p-3 bg-stone-50 rounded-xl">
                <strong>Food Menu:</strong>
                <ul className="mt-1 space-y-0.5">
                  {selectedBookingForDetail.items.map((i, idx) => (
                    <li key={idx}>• {i.dishName} - {i.quantity} {i.unit}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const b = selectedBookingForDetail;
                  setSelectedBookingForDetail(null);
                  handleOpenQuotation(b);
                }}
                className="px-5 py-2 bg-[#173D2E] text-[#D9A441] rounded-xl font-bold"
              >
                Accept & Prepare Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quotation Adjustment */}
      {quotationBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <h3 className="text-lg font-bold text-[#173D2E]">
              Customize Quotation #{quotationBooking.bookingNumber}
            </h3>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Chef Cooking Service Fee (₹)</label>
              <input
                type="number"
                value={customServiceFee}
                onChange={(e) => setCustomServiceFee(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Estimated Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Additional Charges (Equipment / Travel)</label>
              <input
                type="number"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                className="w-full p-2.5 border rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Chef Message to Customer</label>
              <textarea
                rows={2}
                value={chefQuotationNotes}
                onChange={(e) => setChefQuotationNotes(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setQuotationBooking(null)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmQuotation}
                className="px-5 py-2.5 bg-[#173D2E] text-[#D9A441] rounded-xl font-bold shadow-md"
              >
                Submit Quotation to Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reject Booking */}
      {rejectBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-xs">
            <h3 className="text-lg font-bold text-[#173D2E]">Decline Booking</h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State reason for declining..."
              className="w-full mt-3 p-3 border rounded-xl"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setRejectBooking(null)} className="px-4 py-2 border rounded-xl font-bold">
                Cancel
              </button>
              <button onClick={handleConfirmReject} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold">
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Food Item */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveDish} className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-xs space-y-4">
            <h3 className="text-lg font-bold text-[#173D2E]">
              {editingServiceId ? 'Edit Food Item' : 'Add New Food Item'}
            </h3>
            
            <div>
              <label className="font-bold text-stone-700 block mb-1">Dish Name</label>
              <input
                type="text"
                placeholder="e.g. Traditional Andhra Gongura Mutton"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full p-2.5 border rounded-xl font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Food Category</label>
              <select
                value={dishCategoryId}
                onChange={(e) => setDishCategoryId(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Pricing Model</label>
                <select
                  value={dishPriceType}
                  onChange={(e) => setDishPriceType(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl"
                >
                  <option value="hourly">Hourly Rate</option>
                  <option value="per_person">Per Person / Plate</option>
                  <option value="per_kg">Per Kg (Sweets/Biryani)</option>
                  <option value="fixed_event">Fixed Event Fee</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={dishRate}
                  onChange={(e) => setDishRate(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Serving Size / Details</label>
              <input
                type="text"
                placeholder="e.g. Serves 6-8 persons, authentic ghee"
                value={dishServingSize}
                onChange={(e) => setDishServingSize(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Dish Photo</label>
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="Photo URL (https://images.unsplash.com/...)"
                  value={dishImageUrl}
                  onChange={(e) => setDishImageUrl(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-stone-400 uppercase font-bold">Or upload local image:</span>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-[11px] font-semibold text-stone-700 inline-block">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setDishImageUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {dishImageUrl && (
                    <span className="text-[11px] text-emerald-700 font-semibold">✓ Photo attached</span>
                  )}
                </div>
                {dishImageUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-stone-200 mt-1">
                    <img src={dishImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Description & Ingredients</label>
              <textarea
                rows={2}
                placeholder="Ingredients: Mutton, gongura leaves, ghee, green chillies, spices..."
                value={dishDescription}
                onChange={(e) => setDishDescription(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDishModal(false)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#173D2E] text-[#D9A441] rounded-xl font-bold shadow-md"
              >
                Save Food Item
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
