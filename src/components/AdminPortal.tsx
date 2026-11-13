import React, { useState } from 'react';
import { Chef, Booking, BookingPayment, Profile, CookingCategory, ChefSettlement } from '../types/database';
import {
  Shield,
  Users,
  ChefHat,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  FileCode,
  Download,
  Copy,
  Check,
  TrendingUp,
  Search,
  Eye,
  Filter,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  LogOut,
  QrCode,
  Receipt,
  ExternalLink,
  FileText,
  CheckCheck,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import { getBookingStatusBadge, getPaymentStatusBadge } from '../utils/bookingWorkflow';
import { appStore } from '../services/store';

import { supabaseService, SupabaseSyncState } from '../services/supabaseService';
import { isSupabaseConfigured, SUPABASE_CONFIG } from '../lib/supabaseClient';
import { DashboardStatsSkeleton, AdminTableSkeleton } from './skeletons/DashboardSkeletons';

interface AdminPortalProps {
  isLoading?: boolean;
  onLogout?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isLoading = false, onLogout }) => {
  const [storeState, setStoreState] = useState(appStore.getState());
  const [adminTab, setAdminTab] = useState<'overview' | 'chefs' | 'bookings' | 'payments' | 'commission' | 'sql_schema'>('overview');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedIncremental, setCopiedIncremental] = useState(false);
  const [selectedChefForReview, setSelectedChefForReview] = useState<Chef | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [syncState, setSyncState] = useState<SupabaseSyncState>(supabaseService.getSyncState());
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // UPI QR Payment & Settlement Management State
  const [paymentSubTab, setPaymentSubTab] = useState<'pending' | 'verified' | 'rejected' | 'settlements' | 'all'>('pending');
  const [rejectingPayment, setRejectingPayment] = useState<BookingPayment | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [settlingItem, setSettlingItem] = useState<ChefSettlement | null>(null);
  const [settlementUtrInput, setSettlementUtrInput] = useState<string>('');
  const [verifyingPayment, setVerifyingPayment] = useState<BookingPayment | null>(null);
  const [paymentActionFeedback, setPaymentActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  React.useEffect(() => {
    return appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
      setSyncState(supabaseService.getSyncState());
    });
  }, []);

  const { currentUser, profiles, chefs, bookings, payments, platformConfig, chefSettlements = [] } = storeState;

  // Key platform metrics
  const totalCustomers = profiles.filter((p) => p.role === 'customer').length;
  const approvedChefsCount = chefs.filter((c) => c.status === 'approved').length;
  const pendingChefs = chefs.filter((c) => c.status === 'pending');
  const totalBookingsCount = bookings.length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  const cancellationRate = totalBookingsCount > 0 ? Math.round((cancelledBookings.length / totalBookingsCount) * 100) : 0;
  const grossGMV = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCommissionRevenue = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.platformFee, 0);

  // Payment Breakdown
  const pendingPayments = payments.filter((p) => p.status === 'payment_verification_pending');
  const verifiedPayments = payments.filter((p) => p.status === 'paid');
  const rejectedPayments = payments.filter((p) => p.status === 'rejected');
  const pendingSettlements = chefSettlements.filter((s) => s.settlementStatus === 'pending');

  const handleConfirmVerifyPayment = (payment: BookingPayment) => {
    try {
      const linkedBooking = bookings.find((b) => b.id === payment.bookingId);
      appStore.adminVerifyUpiPayment(payment.id, currentUser?.id);
      setPaymentActionFeedback({
        type: 'success',
        message: `Payment verified for receipt #${payment.receiptNumber}. Booking #${linkedBooking?.bookingNumber || ''} is now confirmed and chef settlement record created.`,
      });
      setVerifyingPayment(null);
    } catch (err: any) {
      setPaymentActionFeedback({
        type: 'error',
        message: err.message || 'Failed to verify payment.',
      });
    }
  };

  const handleConfirmRejectPayment = () => {
    if (!rejectingPayment) return;
    try {
      appStore.adminRejectUpiPayment(rejectingPayment.id, rejectionReasonInput, currentUser?.id);
      setPaymentActionFeedback({
        type: 'success',
        message: `Payment marked rejected. Customer notified to resubmit.`,
      });
      setRejectingPayment(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      setPaymentActionFeedback({
        type: 'error',
        message: err.message || 'Failed to reject payment.',
      });
    }
  };

  const handleConfirmSettlement = () => {
    if (!settlingItem) return;
    try {
      appStore.adminRecordChefSettlement(settlingItem.id, settlementUtrInput, currentUser?.id);
      setPaymentActionFeedback({
        type: 'success',
        message: `Chef payout settlement successfully recorded with reference ${settlementUtrInput}.`,
      });
      setSettlingItem(null);
      setSettlementUtrInput('');
    } catch (err: any) {
      setPaymentActionFeedback({
        type: 'error',
        message: err.message || 'Failed to record settlement.',
      });
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    if (selectedStatusFilter === 'all') return true;
    return b.status === selectedStatusFilter;
  });

  const handleCheckConnection = async () => {
    setIsCheckingConnection(true);
    await supabaseService.checkConnection();
    setSyncState(supabaseService.getSyncState());
    setIsCheckingConnection(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(`-- Complete PostgreSQL / Supabase Schema for ChefConnect
-- Includes 10 tables, Views, RLS Policies, Indexes, and Realtime Publications
-- View full file in /src/db/schema.sql`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyIncremental = () => {
    navigator.clipboard.writeText(`-- View /supabase/migrations/20261103000001_security_and_rls_hardening.sql`);
    setCopiedIncremental(true);
    setTimeout(() => setCopiedIncremental(false), 2000);
  };

  return (
    <div className="py-10 bg-[#FFF8EC] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Admin Header */}
        <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-stone-800">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#D9A441] flex items-center justify-center text-[#173D2E] shrink-0 shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
                  Platform Administration Console
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Super Admin
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
                bookmychef.com Operations & Control
              </h1>
              <p className="text-xs text-stone-400 mt-1">
                Logged in as {currentUser?.fullName} ({currentUser?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => appStore.resetToDefaultSeed()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-colors"
            >
              Reset Seed Data
            </button>
            <button
              onClick={() => {
                appStore.logout();
                if (onLogout) onLogout();
              }}
              className="px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Sign Out of Administrator Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex space-x-2 border-b border-stone-200 mb-8 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setAdminTab('overview')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'overview'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Platform Stats</span>
          </button>

          <button
            onClick={() => setAdminTab('chefs')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'chefs'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Chef Approvals ({pendingChefs.length} Pending)</span>
            {pendingChefs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setAdminTab('bookings')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'bookings'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>All Bookings ({bookings.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('payments')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'payments'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>UPI Payments & Settlements</span>
            {pendingPayments.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-stone-900 shadow-xs">
                {pendingPayments.length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('commission')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'commission'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Platform Policy & Fees</span>
          </button>

          <button
            onClick={() => setAdminTab('sql_schema')}
            className={`px-5 py-3 rounded-t-2xl border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
              adminTab === 'sql_schema'
                ? 'border-[#173D2E] text-[#173D2E] bg-white shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-[#D9A441]" />
            <span>Database Migration Schema</span>
          </button>
        </div>

        {/* Tab 1: Platform Overview */}
        {adminTab === 'overview' && (
          <div className="space-y-8">
            {isLoading ? (
              <DashboardStatsSkeleton count={5} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between text-stone-400 mb-2">
                    <span className="text-[11px] uppercase font-bold">Gross Bookings</span>
                    <DollarSign className="w-5 h-5 text-[#D9A441]" />
                  </div>
                  <span className="text-xl font-black text-[#173D2E]">{formatINR(grossGMV)}</span>
                  <p className="text-[10px] text-stone-500 mt-1">{totalBookingsCount} total bookings</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between text-stone-400 mb-2">
                    <span className="text-[11px] uppercase font-bold">Commission Revenue</span>
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xl font-black text-emerald-700">{formatINR(totalCommissionRevenue)}</span>
                  <p className="text-[10px] text-stone-500 mt-1">{platformConfig.commissionPercentage}% platform fee</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between text-stone-400 mb-2">
                    <span className="text-[11px] uppercase font-bold">Cancelled Bookings</span>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <span className="text-xl font-black text-rose-600">{cancelledBookings.length}</span>
                  <p className="text-[10px] text-stone-500 mt-1">{cancellationRate}% cancellation rate</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between text-stone-400 mb-2">
                    <span className="text-[11px] uppercase font-bold">Verified Chefs</span>
                    <ChefHat className="w-5 h-5 text-[#173D2E]" />
                  </div>
                  <span className="text-xl font-black text-[#173D2E]">{approvedChefsCount} Approved</span>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">{pendingChefs.length} pending review</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between text-stone-400 mb-2">
                    <span className="text-[11px] uppercase font-bold">Customers</span>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xl font-black text-[#173D2E]">{totalCustomers} Users</span>
                  <p className="text-[10px] text-stone-500 mt-1">Active platform accounts</p>
                </div>
              </div>
            )}

            {/* Supabase Integration & Audit Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${syncState.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#173D2E] flex items-center space-x-2">
                      <span>Supabase Database & Realtime Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${syncState.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {syncState.isConnected ? 'Connected' : 'Connecting'}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 font-mono">
                      Project: {SUPABASE_CONFIG.projectRef} ({SUPABASE_CONFIG.projectUrl})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCheckConnection}
                    disabled={isCheckingConnection}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isCheckingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={() => setAdminTab('sql_schema')}
                    className="px-4 py-2 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e] transition-colors"
                  >
                    View SQL Migrations
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[#FFF8EC] rounded-2xl border border-amber-200/60">
                  <span className="font-bold text-stone-600 block mb-0.5">Remote Schema Status</span>
                  <span className={`font-black ${syncState.hasRemoteSchema ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {syncState.hasRemoteSchema ? 'Schema Verified & Active' : 'Pending Remote SQL Execution'}
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1">
                    {syncState.hasRemoteSchema ? 'All 10 tables present in schema cache.' : 'Run migrations in Supabase SQL editor to create remote tables.'}
                  </p>
                </div>

                <div className="p-3 bg-[#FFF8EC] rounded-2xl border border-amber-200/60">
                  <span className="font-bold text-stone-600 block mb-0.5">Realtime Channel</span>
                  <span className={`font-black ${syncState.realtimeActive ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {syncState.realtimeActive ? 'Active Subscriptions' : 'Ready (Auto-subscribes)'}
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Listens to bookings and reviews live broadcast.
                  </p>
                </div>

                <div className="p-3 bg-[#FFF8EC] rounded-2xl border border-amber-200/60">
                  <span className="font-bold text-stone-600 block mb-0.5">Last Synced</span>
                  <span className="font-black text-stone-800">
                    {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : 'Ready to sync'}
                  </span>
                  <p className="text-[10px] text-stone-500 mt-1">
                    All operations synchronized safely.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Pending Chefs Alert Box */}
            {pendingChefs.length > 0 && (
              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm">
                      {pendingChefs.length} Chef Registration{pendingChefs.length > 1 ? 's' : ''} Awaiting Review
                    </h3>
                    <p className="text-xs text-amber-800">
                      New chefs like {pendingChefs.map(c => c.fullName).join(', ')} cannot receive bookings until approved.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setAdminTab('chefs')}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
                >
                  Review Applications
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Chef Management & Approvals */}
        {adminTab === 'chefs' && (
          <div className="space-y-8">
            {/* Pending Approvals */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-800 mb-4 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                Pending Verification & Onboarding ({pendingChefs.length})
              </h3>

              {isLoading ? (
                <AdminTableSkeleton rows={3} />
              ) : pendingChefs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 text-xs text-stone-500">
                  No pending chef applications right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingChefs.map((chef) => (
                    <div
                      key={chef.id}
                      className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={chef.avatarUrl}
                            alt={chef.fullName}
                            className="w-14 h-14 rounded-2xl object-cover border border-amber-400"
                          />
                          <div>
                            <h4 className="text-base font-bold text-[#173D2E]">{chef.fullName}</h4>
                            <p className="text-xs text-stone-500">{chef.email} • {chef.phone}</p>
                            <span className="text-[11px] font-bold text-amber-700">
                              {chef.experienceYears} Years Experience • {chef.location}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 line-clamp-3">
                          "{chef.bio}"
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {chef.specialties.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => appStore.adminRejectChef(chef.id, 'Experience requirements unverified')}
                          className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => appStore.adminApproveChef(chef.id)}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Activate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved Chefs Directory */}
            <div className="pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
                All Active Platform Chefs ({chefs.length})
              </h3>
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden text-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[560px] text-left">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-4">Chef Name</th>
                      <th className="p-4">Specialties</th>
                      <th className="p-4">Rate</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {chefs.map((c) => (
                      <tr key={c.id}>
                        <td className="p-4 font-bold text-stone-800 flex items-center space-x-2">
                          <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <div>{c.fullName}</div>
                            <div className="text-[10px] text-stone-400 font-normal">{c.location}</div>
                          </div>
                        </td>
                        <td className="p-4 text-stone-600">{c.specialties.slice(0, 2).join(', ')}</td>
                        <td className="p-4 font-bold text-[#173D2E]">{formatINR(c.hourlyRate)}/hr</td>
                        <td className="p-4 font-bold text-[#D9A441]">★ {c.rating.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: All Platform Bookings */}
        {adminTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                Master Booking Registry
              </h3>

              {/* Status Filter */}
              <div className="flex items-center space-x-2 text-xs">
                <Filter className="w-4 h-4 text-stone-400" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-bold"
                >
                  <option value="all">All Statuses ({bookings.length})</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <AdminTableSkeleton rows={5} />
            ) : (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden text-xs">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[560px] text-left">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-4">Booking #</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Chef</th>
                    <th className="p-4">Event Date</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status & Details</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBookings.map((b) => {
                    const badge = getBookingStatusBadge(b.status);
                    const isCancelled = b.status === 'cancelled';
                    return (
                      <tr key={b.id} className={`hover:bg-stone-50/50 ${isCancelled ? 'bg-rose-50/20' : ''}`}>
                        <td className="p-4 font-mono font-bold text-[#173D2E]">#{b.bookingNumber}</td>
                        <td className="p-4 font-semibold text-stone-800">{b.customerName}</td>
                        <td className="p-4 text-stone-700">{b.chefName}</td>
                        <td className="p-4 text-stone-600">{b.eventDate} ({b.startTime})</td>
                        <td className="p-4 font-bold text-stone-900">{formatINR(b.totalAmount)}</td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}>
                              {badge.label}
                            </span>
                            {isCancelled && (
                              <div className="text-[11px] text-stone-600 bg-rose-50/80 p-2 rounded-xl border border-rose-200 mt-1 space-y-0.5">
                                <div className="font-semibold text-rose-900">
                                  Cancelled by <strong className="capitalize">{b.cancelledBy || 'customer'}</strong>
                                </div>
                                <div className="text-stone-700 truncate max-w-xs">
                                  <span className="font-medium">Reason:</span> {b.cancellationReason || 'No reason provided'}
                                </div>
                                {(b.cancelledAt || b.updatedAt) && (
                                  <div className="text-[10px] text-stone-500">
                                    {new Date(b.cancelledAt || b.updatedAt).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedBookingForDetail(b)}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#173D2E] hover:text-white text-stone-700 text-xs font-bold inline-flex items-center space-x-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Tab 4: Payments & Settlements Clearing House */}
        {adminTab === 'payments' && (
          <div className="space-y-6">
            {/* Action Feedback Banner */}
            {paymentActionFeedback && (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                  paymentActionFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {paymentActionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{paymentActionFeedback.message}</span>
                </div>
                <button
                  onClick={() => setPaymentActionFeedback(null)}
                  className="p-1 rounded-lg hover:bg-black/5 text-stone-500 hover:text-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Merchant UPI Configuration & Clearing Info Card */}
            <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-800">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#D9A441] flex items-center justify-center text-[#173D2E] shrink-0 shadow">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#D9A441]">
                        Merchant UPI Settlement Model
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Manual Verification
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-display text-white mt-0.5">
                      BookMyChef Central Merchant Account
                    </h3>
                    <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                      Customers pay directly into the official BookMyChef merchant bank account via static UPI QR. Platform administrators verify the customer-submitted UTR against bank account credit statements before confirming bookings. Chef payouts are settled post-service.
                    </p>
                  </div>
                </div>

                <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 shrink-0 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Official Merchant UPI ID (VPA)
                  </span>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono font-black text-[#D9A441]">6281376739@fam</code>
                    <button
                      onClick={() => handleCopyUtr('6281376739@fam')}
                      className="p-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors"
                      title="Copy Merchant VPA"
                    >
                      {copiedUtr === '6281376739@fam' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-stone-400 block">Bank Account: BookMyChef Current Account</span>
                </div>
              </div>

              {/* Clearing House Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Pending Verification</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-black text-amber-400">{pendingPayments.length}</span>
                    <span className="text-xs text-stone-400">payments</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Verified Inward Volume</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-xl font-black text-emerald-400">
                      {formatINR(verifiedPayments.reduce((s, p) => s + p.amount, 0))}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Rejected Submissions</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-black text-rose-400">{rejectedPayments.length}</span>
                    <span className="text-xs text-stone-400">records</span>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Pending Chef Payouts</span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl font-black text-[#D9A441]">{pendingSettlements.length}</span>
                    <span className="text-xs text-stone-400">settlements</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center space-x-2 border-b border-stone-200 overflow-x-auto pb-2 text-xs font-bold">
              <button
                onClick={() => setPaymentSubTab('pending')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                  paymentSubTab === 'pending'
                    ? 'bg-[#173D2E] text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Verification</span>
                {pendingPayments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-900">
                    {pendingPayments.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setPaymentSubTab('verified')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                  paymentSubTab === 'verified'
                    ? 'bg-[#173D2E] text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Collections ({verifiedPayments.length})</span>
              </button>

              <button
                onClick={() => setPaymentSubTab('rejected')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                  paymentSubTab === 'rejected'
                    ? 'bg-[#173D2E] text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected Submissions ({rejectedPayments.length})</span>
              </button>

              <button
                onClick={() => setPaymentSubTab('settlements')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                  paymentSubTab === 'settlements'
                    ? 'bg-[#173D2E] text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Chef Settlements ({chefSettlements.length})</span>
                {pendingSettlements.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D9A441] text-[#173D2E]">
                    {pendingSettlements.length} Due
                  </span>
                )}
              </button>

              <button
                onClick={() => setPaymentSubTab('all')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shrink-0 ${
                  paymentSubTab === 'all'
                    ? 'bg-[#173D2E] text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>All Transactions ({payments.length})</span>
              </button>
            </div>

            {/* ======================================================== */}
            {/* SUB-TAB 1: PENDING VERIFICATION QUEUE */}
            {/* ======================================================== */}
            {paymentSubTab === 'pending' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                      Pending Customer UPI Submissions ({pendingPayments.length})
                    </h4>
                    <p className="text-xs text-stone-500">
                      Cross-reference the customer-submitted UTR with incoming credits on your merchant bank statement.
                    </p>
                  </div>
                </div>

                {pendingPayments.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h5 className="text-sm font-bold text-stone-800">All UPI Payments Verified</h5>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      There are currently no customer payment submissions waiting for bank statement verification.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pendingPayments.map((p) => {
                      const linkedBooking = bookings.find((b) => b.id === p.bookingId);
                      const customerProfile = profiles.find((pr) => pr.id === p.customerId);
                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-stone-100 px-2.5 py-1 rounded-lg text-stone-800">
                                Receipt #{p.receiptNumber}
                              </span>
                              {linkedBooking && (
                                <button
                                  onClick={() => setSelectedBookingForDetail(linkedBooking)}
                                  className="font-mono text-xs font-bold text-[#173D2E] hover:underline bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg"
                                >
                                  Booking #{linkedBooking.bookingNumber}
                                </button>
                              )}
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                                Verification Pending
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Customer</span>
                                <span className="font-bold text-stone-900 block truncate">
                                  {customerProfile?.fullName || linkedBooking?.customerName || 'Customer'}
                                </span>
                                <span className="text-[11px] text-stone-500 truncate block">
                                  {customerProfile?.phone || linkedBooking?.customerPhone || 'N/A'}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Payable Amount</span>
                                <span className="font-extrabold text-base text-[#173D2E]">
                                  {formatINR(p.amount)}
                                </span>
                                <span className="text-[10px] text-stone-500 block">Advance Deposit</span>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Submitted UTR Reference</span>
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  <code className="font-mono font-black text-sm bg-stone-100 text-stone-900 px-2 py-0.5 rounded border border-stone-300">
                                    {p.paymentReference || 'NO_UTR'}
                                  </code>
                                  {p.paymentReference && (
                                    <button
                                      onClick={() => handleCopyUtr(p.paymentReference!)}
                                      className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-600"
                                      title="Copy UTR to clipboard"
                                    >
                                      {copiedUtr === p.paymentReference ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Additional submission notes or receipt screenshot */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs">
                              <span className="text-stone-500">
                                Submitted on: <strong>{new Date(p.submittedAt || p.createdAt || '').toLocaleString()}</strong>
                              </span>
                              {p.notes && (
                                <span className="text-stone-600 italic bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                  "{p.notes}"
                                </span>
                              )}
                              {p.receiptUrl && (
                                <button
                                  onClick={() => setReceiptPreviewUrl(p.receiptUrl!)}
                                  className="text-xs font-bold text-[#D9A441] hover:underline flex items-center space-x-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>View Uploaded Receipt</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Verification Actions */}
                          <div className="flex lg:flex-col gap-2 shrink-0 justify-end">
                            <button
                              onClick={() => setVerifyingPayment(p)}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              <span>Verify & Confirm</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingPayment(p);
                                setRejectionReasonInput('');
                              }}
                              className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject UTR</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 2: VERIFIED COLLECTIONS */}
            {/* ======================================================== */}
            {paymentSubTab === 'verified' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                    Verified Inward Payments ({verifiedPayments.length})
                  </h4>
                  <span className="text-xs text-stone-500">
                    Total Volume: <strong>{formatINR(verifiedPayments.reduce((s, p) => s + p.amount, 0))}</strong>
                  </span>
                </div>

                <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[620px] text-left">
                      <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-4">Receipt #</th>
                          <th className="p-4">Booking #</th>
                          <th className="p-4">Method / UTR</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Verified At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {verifiedPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-stone-400">
                              No verified payments found.
                            </td>
                          </tr>
                        ) : (
                          verifiedPayments.map((p) => {
                            const linkedBooking = bookings.find((b) => b.id === p.bookingId);
                            return (
                              <tr key={p.id}>
                                <td className="p-4 font-mono font-bold text-[#173D2E]">{p.receiptNumber}</td>
                                <td className="p-4 font-mono text-stone-700">
                                  #{linkedBooking?.bookingNumber || 'N/A'}
                                </td>
                                <td className="p-4">
                                  <div className="font-mono font-semibold text-stone-800">
                                    {p.paymentReference || p.razorpayPaymentId || 'N/A'}
                                  </div>
                                  <span className="text-[10px] text-stone-400 uppercase">
                                    {p.paymentGateway === 'upi_qr' ? 'Static UPI QR' : p.paymentGateway}
                                  </span>
                                </td>
                                <td className="p-4 font-bold text-emerald-700">{formatINR(p.amount)}</td>
                                <td className="p-4">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                                    Paid & Verified
                                  </span>
                                </td>
                                <td className="p-4 text-stone-500">
                                  {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : (p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A')}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 3: REJECTED PAYMENTS */}
            {/* ======================================================== */}
            {paymentSubTab === 'rejected' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-rose-800">
                    Rejected Payment Submissions ({rejectedPayments.length})
                  </h4>
                </div>

                <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[620px] text-left">
                      <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-4">Receipt #</th>
                          <th className="p-4">Booking #</th>
                          <th className="p-4">Submitted UTR</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Rejection Reason</th>
                          <th className="p-4">Rejected At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {rejectedPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-stone-400">
                              No rejected payment records.
                            </td>
                          </tr>
                        ) : (
                          rejectedPayments.map((p) => {
                            const linkedBooking = bookings.find((b) => b.id === p.bookingId);
                            return (
                              <tr key={p.id}>
                                <td className="p-4 font-mono font-bold text-stone-800">{p.receiptNumber}</td>
                                <td className="p-4 font-mono text-stone-700">
                                  #{linkedBooking?.bookingNumber || 'N/A'}
                                </td>
                                <td className="p-4 font-mono text-stone-600">{p.paymentReference || 'N/A'}</td>
                                <td className="p-4 font-bold text-stone-800">{formatINR(p.amount)}</td>
                                <td className="p-4 text-rose-700 font-semibold max-w-xs">
                                  {p.rejectionReason || 'UTR not verified'}
                                </td>
                                <td className="p-4 text-stone-500">
                                  {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : 'N/A'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 4: CHEF SETTLEMENTS LEDGER */}
            {/* ======================================================== */}
            {paymentSubTab === 'settlements' && (
              <div className="space-y-6">
                <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200 text-xs text-stone-700 space-y-1">
                  <h4 className="font-bold text-[#173D2E] text-sm">Chef Post-Service Settlement Policy</h4>
                  <p>
                    BookMyChef collects customer advance payments directly into its central merchant business account. Once the cooking service is performed, chef payouts are remitted directly to the chef's bank account. Net Payout = Eligible Gross Booking Amount (90%) after deducting the confirmed 10% Platform Commission.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                      Platform Chef Payout Ledger ({chefSettlements.length})
                    </h4>
                    <span className="text-xs text-stone-500">
                      Pending Payouts: <strong>{pendingSettlements.length}</strong>
                    </span>
                  </div>

                  <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[700px] text-left">
                        <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                          <tr>
                            <th className="p-4">Settlement ID</th>
                            <th className="p-4">Booking #</th>
                            <th className="p-4">Chef Name</th>
                            <th className="p-4">Gross Amount</th>
                            <th className="p-4">Platform Fee (10%)</th>
                            <th className="p-4">Net Chef Payout</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Bank Ref / Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {chefSettlements.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-stone-400">
                                No chef settlements recorded yet. Confirming customer payments generates automatic settlement records.
                              </td>
                            </tr>
                          ) : (
                            chefSettlements.map((s) => {
                              const chef = chefs.find((c) => c.id === s.chefId);
                              const isSettled = s.settlementStatus === 'settled';
                              return (
                                <tr key={s.id}>
                                  <td className="p-4 font-mono font-bold text-stone-800">
                                    #{s.id.slice(0, 12)}
                                  </td>
                                  <td className="p-4 font-mono text-[#173D2E] font-bold">
                                    #{s.bookingNumber}
                                  </td>
                                  <td className="p-4 font-semibold text-stone-800">
                                    {chef?.fullName || 'Assigned Chef'}
                                  </td>
                                  <td className="p-4 text-stone-700 font-semibold">
                                    {formatINR(s.grossAmount || s.grossBookingAmount || 0)}
                                  </td>
                                  <td className="p-4 text-amber-700 font-semibold">
                                    {formatINR(s.platformCommission)}
                                  </td>
                                  <td className="p-4 font-extrabold text-emerald-800">
                                    {formatINR(s.chefPayableAmount || s.netPayableToChef || 0)}
                                  </td>
                                  <td className="p-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                        isSettled
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {s.settlementStatus}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    {isSettled ? (
                                      <div className="text-[11px] font-mono text-stone-600">
                                        <div>Ref: {s.payoutReference}</div>
                                        <div className="text-[10px] text-stone-400">
                                          {s.payoutDate ? new Date(s.payoutDate).toLocaleDateString() : ''}
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSettlingItem(s);
                                          setSettlementUtrInput('');
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] text-xs font-bold"
                                      >
                                        Record Payout
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* SUB-TAB 5: ALL TRANSACTIONS */}
            {/* ======================================================== */}
            {paymentSubTab === 'all' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                  Complete Transaction History ({payments.length})
                </h4>

                <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[560px] text-left">
                      <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="p-4">Receipt #</th>
                          <th className="p-4">Method / Reference</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {payments.map((p) => {
                          const badge = getPaymentStatusBadge(p.status);
                          return (
                            <tr key={p.id}>
                              <td className="p-4 font-mono font-bold text-[#173D2E]">{p.receiptNumber}</td>
                              <td className="p-4 font-mono text-stone-600">
                                {p.paymentReference || p.razorpayPaymentId || 'N/A'}
                              </td>
                              <td className="p-4 font-bold text-stone-900">{formatINR(p.amount)}</td>
                              <td className="p-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${badge.bgClass} ${badge.textClass}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td className="p-4 text-stone-500">
                                {p.paidAt
                                  ? new Date(p.paidAt).toLocaleDateString()
                                  : (p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'))}
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
          </div>
        )}

        {/* Tab 5: Platform Fees & Commission Policy */}
        {adminTab === 'commission' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 max-w-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Platform Configuration & Commission Take Rate
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Platform Commission Percentage (%)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={platformConfig.commissionPercentage}
                    onChange={(e) => appStore.adminUpdateCommission(Number(e.target.value))}
                    className="p-2.5 border rounded-xl font-bold text-stone-800 w-28"
                  />
                  <span className="text-stone-500">
                    Currently taking {platformConfig.commissionPercentage}% of bookings
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Advance Deposit Required from Customer
                </label>
                <div className="p-3 bg-stone-50 rounded-xl font-semibold text-stone-800">
                  {platformConfig.minAdvancePaymentPercentage}% required upon quotation acceptance
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Cancellation Policy
                </label>
                <div className="p-3 bg-stone-50 rounded-xl text-stone-700">
                  Full refund if cancelled at least {platformConfig.cancellationRefundThresholdHours} hours prior to scheduled start time.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Database Migration Schema */}
        {adminTab === 'sql_schema' && (
          <div className="bg-stone-900 text-stone-200 rounded-3xl p-6 sm:p-8 border border-stone-800 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#D9A441] font-display">
                  PostgreSQL / Supabase Migration Schema
                </h3>
                <p className="text-xs text-stone-400">
                  Includes 10 tables: profiles, chefs, chef_availability, cooking_categories, cooking_services, bookings, booking_items, booking_payments, notifications, reviews, and RLS policies.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center space-x-1.5"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copied Full Schema' : 'Copy Full Schema'}</span>
                </button>
                <button
                  onClick={handleCopyIncremental}
                  className="px-4 py-2 rounded-xl bg-[#D9A441] text-[#173D2E] text-xs font-extrabold flex items-center space-x-1.5 hover:bg-[#c49132]"
                >
                  {copiedIncremental ? <Check className="w-4 h-4 text-emerald-900" /> : <Shield className="w-4 h-4" />}
                  <span>{copiedIncremental ? 'Copied Migration 001' : 'Copy Migration 001 (RPC & RLS)'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/60 rounded-2xl border border-stone-800 font-mono text-[11px] leading-relaxed max-h-96 overflow-y-auto text-emerald-300">
              <pre>{`-- File: /src/db/schema.sql
-- Run this in your Supabase SQL Editor or PostgreSQL instance

CREATE TYPE user_role AS ENUM ('customer', 'chef', 'admin');
CREATE TYPE chef_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- 10 Tables created:
-- 1. profiles (id, role, full_name, email, phone, address, city, avatar_url)
-- 2. chefs (id, profile_id, specialties, hourly_rate, base_charge, rating, status)
-- 3. chef_availability (id, chef_id, day_of_week, start_time, end_time, is_available)
-- 4. cooking_categories (id, name, slug, popular_dishes)
-- 5. cooking_services (id, chef_id, service_name, pricing_type, base_rate)
-- 6. bookings (id, booking_number, customer_id, chef_id, event_date, service_fee, status)
-- 7. booking_items (id, booking_id, dish_name, quantity, unit, estimated_cost)
-- 8. booking_payments (id, booking_id, amount, razorpay_payment_id, receipt_number, status)
-- 9. notifications (id, recipient_id, recipient_role, title, message, read)
-- 10. reviews (id, booking_id, customer_id, chef_id, rating, comment)

-- Row Level Security (RLS) is fully enabled with customer & chef scoped access rules.`}</pre>
            </div>
          </div>
        )}

        {/* MODAL: Inspect Booking & Participants Details */}
        {selectedBookingForDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-lg text-[#173D2E]">
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
                  <p className="text-xs text-stone-500 mt-0.5">
                    Created on {new Date(selectedBookingForDetail.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBookingForDetail(null)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer & Chef Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Details */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                  <div className="flex items-center space-x-2 text-stone-500 text-[10px] uppercase font-bold tracking-wider">
                    <Users className="w-3.5 h-3.5 text-[#173D2E]" />
                    <span>Customer Information</span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">{selectedBookingForDetail.customerName}</h4>
                  <div className="text-xs text-stone-600 space-y-1">
                    {selectedBookingForDetail.customerPhone && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{selectedBookingForDetail.customerPhone}</span>
                      </div>
                    )}
                    {selectedBookingForDetail.customerEmail && (
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        <span className="truncate">{selectedBookingForDetail.customerEmail}</span>
                      </div>
                    )}
                    <div className="flex items-start space-x-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span>{selectedBookingForDetail.venueAddress}, {selectedBookingForDetail.city}</span>
                    </div>
                  </div>
                </div>

                {/* Chef Details */}
                {(() => {
                  const assignedChef = chefs.find((c) => c.id === selectedBookingForDetail.chefId);
                  return (
                    <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                      <div className="flex items-center space-x-2 text-stone-500 text-[10px] uppercase font-bold tracking-wider">
                        <ChefHat className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>Assigned Chef</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <img
                          src={selectedBookingForDetail.chefAvatarUrl || assignedChef?.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-[#D9A441]"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-stone-900">{selectedBookingForDetail.chefName}</h4>
                          <span className="text-[11px] text-stone-500">
                            {assignedChef?.experienceYears || 2}+ yrs exp • ⭐ {assignedChef?.rating || 5}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-stone-600 space-y-1 pt-1">
                        {assignedChef?.phone && (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <span>{assignedChef.phone}</span>
                          </div>
                        )}
                        {assignedChef?.specialties && assignedChef.specialties.length > 0 && (
                          <div className="text-[11px] text-stone-500 truncate">
                            Specialties: {assignedChef.specialties.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Event & Schedule Details */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold text-amber-950">
                  <Calendar className="w-4 h-4 text-[#D9A441]" />
                  <span>Event & Schedule</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Event Type</span>
                    <span className="font-semibold capitalize">{selectedBookingForDetail.eventType.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Event Date</span>
                    <span className="font-semibold">{selectedBookingForDetail.eventDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Time & Duration</span>
                    <span className="font-semibold">{selectedBookingForDetail.startTime} ({selectedBookingForDetail.expectedDurationHours} hrs)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-bold">Guests</span>
                    <span className="font-semibold">{selectedBookingForDetail.guestsCount} people</span>
                  </div>
                </div>
                {selectedBookingForDetail.specialInstructions && (
                  <div className="pt-2 text-stone-600 border-t border-amber-200/60 text-[11px]">
                    <strong>Special Instructions:</strong> {selectedBookingForDetail.specialInstructions}
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Ordered Menu Items</h4>
                {selectedBookingForDetail.items && selectedBookingForDetail.items.length > 0 ? (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-stone-50 text-stone-500 border-b border-stone-200 text-[11px]">
                        <tr>
                          <th className="p-3">Dish Name</th>
                          <th className="p-3">Quantity</th>
                          <th className="p-3">Food Type</th>
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
                  <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-xl">Custom menu as requested with chef</p>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">Financial Summary</h4>
                <div className="space-y-1.5 text-stone-600">
                  <div className="flex justify-between">
                    <span>Chef Service Fee:</span>
                    <span className="font-semibold">{formatINR(selectedBookingForDetail.chefServiceFee)}</span>
                  </div>
                  {selectedBookingForDetail.ingredientFee > 0 && (
                    <div className="flex justify-between">
                      <span>Ingredient Arrangement Fee:</span>
                      <span className="font-semibold">{formatINR(selectedBookingForDetail.ingredientFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Platform Commission & Taxes:</span>
                    <span className="font-semibold">{formatINR(selectedBookingForDetail.platformFee)}</span>
                  </div>
                  {selectedBookingForDetail.additionalCharges > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Additional Charges:</span>
                      <span className="font-semibold">+{formatINR(selectedBookingForDetail.additionalCharges)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-[#173D2E]">
                    <span>Total Amount:</span>
                    <span>{formatINR(selectedBookingForDetail.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Advance Deposit Status:</span>
                    <span className="font-bold uppercase text-emerald-700">{selectedBookingForDetail.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation / Rejection Audit Trail */}
              {(selectedBookingForDetail.status === 'cancelled' || selectedBookingForDetail.status === 'rejected') && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1">
                  <div className="font-bold text-rose-800">
                    {selectedBookingForDetail.status === 'cancelled' ? 'Cancellation Details' : 'Rejection Reason'}
                  </div>
                  <p className="text-stone-700">
                    <strong>Reason:</strong> {selectedBookingForDetail.cancellationReason || 'No reason provided'}
                  </p>
                  {selectedBookingForDetail.cancelledBy && (
                    <p className="text-stone-600 text-[11px]">
                      Initiated by: <strong className="capitalize">{selectedBookingForDetail.cancelledBy}</strong>
                    </p>
                  )}
                  {selectedBookingForDetail.cancelledAt && (
                    <p className="text-stone-500 text-[10px]">
                      Timestamp: {new Date(selectedBookingForDetail.cancelledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedBookingForDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e]"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Confirm UPI Payment Verification */}
        {verifyingPayment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-100">
              <div className="flex items-center space-x-3 text-emerald-700">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Verify & Confirm Customer Payment</h3>
                  <p className="text-xs text-stone-500">Cross-reference with Bank Statement</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-stone-900">{verifyingPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Advance Amount:</span>
                  <span className="font-extrabold text-emerald-800 text-sm">{formatINR(verifyingPayment.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Customer UTR:</span>
                  <code className="font-mono font-black text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300">
                    {verifyingPayment.paymentReference}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Merchant UPI VPA:</span>
                  <span className="font-mono font-bold text-[#D9A441]">6281376739@fam</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                By confirming, you certify that this credit of <strong>{formatINR(verifyingPayment.amount)}</strong> was verified against the official BookMyChef bank statement. The booking will transition to <strong>Confirmed (Paid)</strong> and a post-service chef settlement record will be created.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-stone-100">
                <button
                  onClick={() => setVerifyingPayment(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmVerifyPayment(verifyingPayment)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Verified & Mark Paid</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Reject Customer UPI Payment */}
        {rejectingPayment && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-100">
              <div className="flex items-center space-x-3 text-rose-700">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Reject Payment Submission</h3>
                  <p className="text-xs text-stone-500">Customer will be notified to resubmit</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-rose-700">Submitted UTR:</span>
                  <span className="font-mono font-bold text-stone-900">{rejectingPayment.paymentReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-700">Payable Amount:</span>
                  <span className="font-bold text-stone-900">{formatINR(rejectingPayment.amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 block">
                  Rejection Reason (Required)
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Specify why this payment cannot be verified..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                {/* Quick reason presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'UTR not found in merchant bank credits',
                    'Transferred amount does not match payable advance',
                    'Invalid or duplicate transaction reference',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonInput(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-stone-100">
                <button
                  onClick={() => {
                    setRejectingPayment(null);
                    setRejectionReasonInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={!rejectionReasonInput.trim()}
                  onClick={handleConfirmRejectPayment}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Record Chef Bank Settlement Payout */}
        {settlingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-100">
              <div className="flex items-center space-x-3 text-[#173D2E]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#173D2E]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Record Chef Settlement Payout</h3>
                  <p className="text-xs text-stone-500">Post-service bank remittance to chef</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Booking Number:</span>
                  <span className="font-mono font-bold text-[#173D2E]">#{settlingItem.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Gross Booking Value:</span>
                  <span className="font-semibold text-stone-800">{formatINR(settlingItem.grossAmount || settlingItem.grossBookingAmount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Platform Commission (10%):</span>
                  <span className="font-semibold text-amber-700">-{formatINR(settlingItem.platformCommission)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200">
                  <span className="font-bold text-stone-800">Net Remittance to Chef:</span>
                  <span className="font-extrabold text-base text-emerald-800">{formatINR(settlingItem.chefPayableAmount || settlingItem.netPayableToChef || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Bank Remittance Reference (UTR / IMPS Number) *
                </label>
                <input
                  type="text"
                  value={settlementUtrInput}
                  onChange={(e) => setSettlementUtrInput(e.target.value)}
                  placeholder="e.g. UTR123456789012"
                  className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#173D2E]"
                />
                <span className="text-[10px] text-stone-500 block">
                  Enter the transaction reference from your bank transfer to the chef.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-stone-100">
                <button
                  onClick={() => {
                    setSettlingItem(null);
                    setSettlementUtrInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={!settlementUtrInput.trim()}
                  onClick={handleConfirmSettlement}
                  className="px-5 py-2.5 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Customer Uploaded Receipt Screenshot */}
        {receiptPreviewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-800">Customer Uploaded Payment Receipt</h4>
                <button
                  onClick={() => setReceiptPreviewUrl(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-stone-200 max-h-[70vh] flex items-center justify-center bg-stone-100">
                <img src={receiptPreviewUrl} alt="Payment Receipt" className="max-w-full max-h-[70vh] object-contain" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
