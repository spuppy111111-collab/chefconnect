import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Database,
  Sparkles,
  Info,
  RefreshCw,
  Sliders,
  Check,
  CalendarCheck2,
  CalendarX2,
  CalendarDays,
  ShieldCheck,
  User,
  Utensils,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { appStore } from '../services/store';
import { ChefAvailability, Booking } from '../types/database';
import { formatINR } from '../utils/pricing';

interface AvailabilityCalendarProps {
  chefId: string;
  chefName?: string;
  onAvailabilityChange?: (date: string, isAvailable: boolean) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  chefId,
  chefName,
  onAvailabilityChange,
}) => {
  const [storeState, setStoreState] = useState(appStore.getState());
  
  // Current view month & year
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Selected date in grid
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Supabase records cache & local overrides, initialized with appStore state for persistence
  const [supabaseRecords, setSupabaseRecords] = useState<Record<string, ChefAvailability>>(() => {
    const map: Record<string, ChefAvailability> = {};
    const state = appStore.getState();
    if (state.chefAvailability && Array.isArray(state.chefAvailability)) {
      state.chefAvailability
        .filter((r) => r.chefId === chefId)
        .forEach((r) => {
          if (r.date) map[r.date] = r;
        });
    }
    return map;
  });

  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Inspector form states for selected date
  const [slotStartTime, setSlotStartTime] = useState('08:00');
  const [slotEndTime, setSlotEndTime] = useState('21:00');
  const [blockReason, setBlockReason] = useState('Personal leave');

  // Subscribe to appStore changes (bookings, chef blockedDates)
  useEffect(() => {
    return appStore.subscribe(() => {
      setStoreState({ ...appStore.getState() });
    });
  }, []);

  const { chefs, bookings, currentUser } = storeState;
  const currentChef = useMemo(() => {
    return chefs.find((c) => c.id === chefId) || chefs[0];
  }, [chefs, chefId]);

  // Authorization: Only admin or the chef himself can modify availability
  const isAuthorizedToEdit = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'chef' && currentUser.id === currentChef?.profileId) return true;
    return false;
  }, [currentUser, currentChef?.profileId]);

  // Network online/offline event listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchSupabaseAvailability();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync selected date inputs from records
  useEffect(() => {
    const record = supabaseRecords[selectedDateStr];
    if (record) {
      if (record.startTime) setSlotStartTime(record.startTime);
      if (record.endTime) setSlotEndTime(record.endTime);
      if (record.reason) setBlockReason(record.reason);
    }
  }, [selectedDateStr, supabaseRecords]);

  // Chef bookings for this chef
  const chefBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.chefId === currentChef?.id && b.status !== 'cancelled' && b.status !== 'rejected'
    );
  }, [bookings, currentChef?.id]);

  // Fetch from Supabase 'chef_availability' table
  const fetchSupabaseAvailability = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentChef?.id) {
      return;
    }

    setLoadingSupabase(true);
    try {
      const { data, error } = await supabase
        .from('chef_availability')
        .select('*')
        .eq('chef_id', currentChef.id);

      if (error) {
        console.warn('Could not query chef_availability from Supabase:', error.message);
      } else if (data && Array.isArray(data)) {
        const recordMap: Record<string, ChefAvailability> = {};
        data.forEach((row: any) => {
          if (row.date) {
            recordMap[row.date] = {
              id: row.id,
              chefId: row.chef_id,
              date: row.date,
              dayOfWeek: row.day_of_week,
              startTime: row.start_time || '08:00',
              endTime: row.end_time || '21:00',
              isAvailable: row.is_available,
              reason: row.reason,
              createdAt: row.created_at,
            };
          }
        });
        setSupabaseRecords(recordMap);
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    } finally {
      setLoadingSupabase(false);
    }
  }, [currentChef?.id]);

  useEffect(() => {
    fetchSupabaseAvailability();
  }, [fetchSupabaseAvailability]);

  // Check whether a specific date string (YYYY-MM-DD) is available
  const getDateStatus = useCallback(
    (dateStr: string): {
      isPast: boolean;
      isToday: boolean;
      isBooked: boolean;
      bookingDetails?: Booking;
      isAvailable: boolean;
      reason?: string;
    } => {
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;

      // Check if there is an active booking on this date
      const bookingOnDate = chefBookings.find((b) => b.eventDate === dateStr);
      const isBooked = Boolean(bookingOnDate);

      // Check Supabase records first, then fall back to currentChef.blockedDates
      let isAvailable = true;
      let reason: string | undefined;

      if (supabaseRecords[dateStr]) {
        isAvailable = supabaseRecords[dateStr].isAvailable;
        reason = supabaseRecords[dateStr].reason;
      } else if (currentChef?.blockedDates?.includes(dateStr)) {
        isAvailable = false;
        reason = 'Blocked by Chef';
      }

      return {
        isPast,
        isToday,
        isBooked,
        bookingDetails: bookingOnDate,
        isAvailable,
        reason,
      };
    },
    [chefBookings, supabaseRecords, currentChef?.blockedDates]
  );

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Toggle availability for a date
  const handleToggleDate = async (dateStr: string, forceStatus?: boolean) => {
    const status = getDateStatus(dateStr);
    if (status.isPast || status.isBooked) {
      return; // Cannot toggle past dates or confirmed customer booking dates
    }

    const newIsAvailable = forceStatus !== undefined ? forceStatus : !status.isAvailable;
    if (!isAuthorizedToEdit) {
      alert("Unauthorized: Only Chef " + currentChef.fullName + " or an administrator can modify availability.");
      return;
    }
    setSyncStatus('saving');

    // 1. Update local store immediately with full working hours and reason
    try {
      appStore.toggleChefDateAvailability(currentChef.id, dateStr, newIsAvailable, {
        startTime: slotStartTime,
        endTime: slotEndTime,
        reason: blockReason,
      });
    } catch (err: any) {
      alert(err.message || 'Could not update availability');
      setSyncStatus('error');
      return;
    }

    // 2. Update local state cache
    setSupabaseRecords((prev) => ({
      ...prev,
      [dateStr]: {
        id: prev[dateStr]?.id || `avail-${Date.now()}`,
        chefId: currentChef.id,
        date: dateStr,
        dayOfWeek: new Date(dateStr).getDay(),
        startTime: slotStartTime,
        endTime: slotEndTime,
        isAvailable: newIsAvailable,
        reason: newIsAvailable ? undefined : blockReason,
      },
    }));

    // 3. Connect and persist to Supabase 'chef_availability' table
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('chef_availability').upsert(
          {
            chef_id: currentChef.id,
            date: dateStr,
            day_of_week: new Date(dateStr).getDay(),
            start_time: slotStartTime,
            end_time: slotEndTime,
            is_available: newIsAvailable,
            reason: newIsAvailable ? null : blockReason,
          },
          { onConflict: 'chef_id,date' }
        );

        if (error) {
          // If upsert on conflict isn't supported by constraint, try select & update/insert
          const { data: existing } = await supabase
            .from('chef_availability')
            .select('id')
            .eq('chef_id', currentChef.id)
            .eq('date', dateStr)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('chef_availability')
              .update({
                is_available: newIsAvailable,
                start_time: slotStartTime,
                end_time: slotEndTime,
                reason: newIsAvailable ? null : blockReason,
              })
              .eq('id', existing.id);
          } else {
            await supabase.from('chef_availability').insert({
              chef_id: currentChef.id,
              date: dateStr,
              day_of_week: new Date(dateStr).getDay(),
              start_time: slotStartTime,
              end_time: slotEndTime,
              is_available: newIsAvailable,
              reason: newIsAvailable ? null : blockReason,
            });
          }
        }
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.warn('Failed to sync to Supabase chef_availability:', err);
        setSyncStatus('error');
      }
    } else {
      // In demo/offline mode, state is saved to appStore and localStorage
      setSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    onAvailabilityChange?.(dateStr, newIsAvailable);
  };

  // Batch actions
  const handleMakeMonthAvailable = async () => {
    if (!isAuthorizedToEdit) {
      alert("Unauthorized: Only Chef " + currentChef.fullName + " or an administrator can modify availability.");
      return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const datesToUnblock: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if (dStr >= todayStr) {
        datesToUnblock.push(dStr);
      }
    }

    setSyncStatus('saving');
    try {
      appStore.batchSetChefAvailability(currentChef.id, datesToUnblock, true);
    } catch (err: any) {
      alert(err.message || 'Could not update availability');
      setSyncStatus('error');
      return;
    }

    const updated = { ...supabaseRecords };
    datesToUnblock.forEach((d) => {
      updated[d] = {
        id: updated[d]?.id || `avail-${Date.now()}`,
        chefId: currentChef.id,
        date: d,
        startTime: slotStartTime,
        endTime: slotEndTime,
        isAvailable: true,
      };
    });
    setSupabaseRecords(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const rows = datesToUnblock.map((d) => ({
          chef_id: currentChef.id,
          date: d,
          is_available: true,
        }));
        await supabase.from('chef_availability').upsert(rows, { onConflict: 'chef_id,date' });
      } catch (e) {
        console.warn('Supabase batch error:', e);
      }
    }

    setSyncStatus('synced');
    setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleBlockWeekends = async () => {
    if (!isAuthorizedToEdit) {
      alert("Unauthorized: Only Chef " + currentChef.fullName + " or an administrator can modify availability.");
      return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const weekendDates: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const day = d.getDay();
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if ((day === 0 || day === 6) && dStr >= todayStr) {
        weekendDates.push(dStr);
      }
    }

    setSyncStatus('saving');
    try {
      appStore.batchSetChefAvailability(currentChef.id, weekendDates, false, 'Weekend Off');
    } catch (err: any) {
      alert(err.message || 'Could not update availability');
      setSyncStatus('error');
      return;
    }

    const updated = { ...supabaseRecords };
    weekendDates.forEach((d) => {
      updated[d] = {
        id: updated[d]?.id || `avail-${Date.now()}`,
        chefId: currentChef.id,
        date: d,
        startTime: slotStartTime,
        endTime: slotEndTime,
        isAvailable: false,
        reason: 'Weekend Off',
      };
    });
    setSupabaseRecords(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        const rows = weekendDates.map((d) => ({
          chef_id: currentChef.id,
          date: d,
          is_available: false,
          reason: 'Weekend Off',
        }));
        await supabase.from('chef_availability').upsert(rows, { onConflict: 'chef_id,date' });
      } catch (e) {
        console.warn('Supabase batch error:', e);
      }
    }

    setSyncStatus('synced');
    setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Selected date status
  const selectedStatus = useMemo(() => {
    return getDateStatus(selectedDateStr);
  }, [selectedDateStr, getDateStatus]);

  // Monthly metrics
  const monthlyStats = useMemo(() => {
    let availableCount = 0;
    let blockedCount = 0;
    let bookedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = getDateStatus(dStr);
      if (status.isBooked) bookedCount++;
      else if (!status.isAvailable) blockedCount++;
      else availableCount++;
    }

    return { availableCount, blockedCount, bookedCount };
  }, [year, month, daysInMonth, getDateStatus]);

  return (
    <div className="space-y-6">
      {/* Header & Supabase Connection Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#173D2E] text-[#FFF8EC] flex items-center space-x-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Chef Availability Management</span>
            </span>
            <span className="text-xs text-stone-500 font-semibold">• Grid View</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-[#173D2E] mt-1">
            Availability Calendar
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage your open dates, block leave, and synchronize schedule with customer bookings.
          </p>
        </div>

        {/* Supabase status indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
            <Database className="w-3.5 h-3.5 text-[#173D2E]" />
            <span className="font-semibold text-stone-700">Supabase Table:</span>
            <code className="px-1.5 py-0.5 rounded bg-stone-200/70 font-mono text-[11px] text-[#173D2E] font-bold">
              chef_availability
            </code>
            {isSupabaseConfigured ? (
              <span className="flex items-center text-emerald-700 font-bold ml-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center text-amber-700 font-bold ml-1" title="Running in persistent appStore memory with Supabase schema compatibility">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
                Local Mode
              </span>
            )}
          </div>

          {!isOnline && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center space-x-1">
              <span>⚠️ Offline Mode (Local Cache)</span>
            </span>
          )}

          {!isAuthorizedToEdit && (
            <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold flex items-center space-x-1" title="Customers and unauthorized users cannot edit chef schedules">
              <span>🔒 Read Only</span>
            </span>
          )}

          {syncStatus === 'saving' && (
            <span className="text-xs text-stone-500 flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin text-[#D9A441]" />
              <span>Syncing...</span>
            </span>
          )}
          {syncStatus === 'synced' && (
            <span className="text-xs text-emerald-600 flex items-center space-x-1 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Synced {lastSyncedTime}</span>
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-stone-400 block">Total Days</span>
            <span className="text-2xl font-black text-stone-900">{daysInMonth}</span>
            <span className="text-[10px] text-stone-500 block">{monthName} {year}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-emerald-800 block">Available Days</span>
            <span className="text-2xl font-black text-emerald-950">{monthlyStats.availableCount}</span>
            <span className="text-[10px] text-emerald-700 block">Open for customer booking</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-200/70 flex items-center justify-center text-emerald-800">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-rose-800 block">Blocked / Leave</span>
            <span className="text-2xl font-black text-rose-950">{monthlyStats.blockedCount}</span>
            <span className="text-[10px] text-rose-700 block">Rest & personal leave</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-200/70 flex items-center justify-center text-rose-800">
            <CalendarX2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FFF8EC] p-4 rounded-2xl border border-[#D9A441]/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-[#173D2E] block">Confirmed Events</span>
            <span className="text-2xl font-black text-[#D9A441]">{monthlyStats.bookedCount}</span>
            <span className="text-[10px] text-stone-600 block">Live at-home cooking</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center text-[#173D2E]">
            <Utensils className="w-5 h-5 text-[#173D2E]" />
          </div>
        </div>
      </div>

      {/* Main Grid & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold font-display text-[#173D2E]">
                {monthName} {year}
              </h3>
              <button
                onClick={jumpToToday}
                className="px-3 py-1 rounded-xl bg-[#FFF8EC] border border-[#D9A441]/30 hover:bg-[#D9A441]/20 text-xs font-bold text-[#173D2E] transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Batch Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-stone-500 mr-1 flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Quick Actions:</span>
            </span>
            <button
              onClick={handleMakeMonthAvailable}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition-colors"
            >
              Make Month Available
            </button>
            <button
              onClick={handleBlockWeekends}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold border border-rose-200 transition-colors"
            >
              Block All Weekends
            </button>
            <button
              onClick={fetchSupabaseAvailability}
              disabled={loadingSupabase}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold border border-stone-200 transition-colors flex items-center space-x-1 ml-auto"
            >
              <RefreshCw className={`w-3 h-3 ${loadingSupabase ? 'animate-spin' : ''}`} />
              <span>Reload DB</span>
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-stone-500 uppercase tracking-wider py-1 border-b border-stone-100">
            <span className="text-rose-600">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-rose-600">Sat</span>
          </div>

          {/* 7-column Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Previous month trailing days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthLastDay - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="min-h-[85px] sm:min-h-[95px] p-2 rounded-2xl bg-stone-50/50 border border-stone-100 text-stone-300 select-none flex flex-col justify-between"
                >
                  <span className="text-xs font-semibold">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const { isPast, isToday, isBooked, bookingDetails, isAvailable, reason } = getDateStatus(dateStr);
              const isSelected = selectedDateStr === dateStr;

              // Cell color styling
              let cellBg = 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:border-emerald-400 hover:shadow-sm';
              if (isPast) {
                cellBg = 'bg-stone-100/70 border-stone-200 text-stone-400 cursor-not-allowed';
              } else if (isBooked) {
                cellBg = 'bg-[#FFF8EC] border-[#D9A441] ring-1 ring-[#D9A441]/50 text-amber-950 shadow-sm';
              } else if (!isAvailable) {
                cellBg = 'bg-rose-50/80 border-rose-200 text-rose-950 hover:border-rose-400 hover:shadow-sm';
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDateStr(dateStr);
                    if (!isPast && !isBooked) {
                      handleToggleDate(dateStr);
                    }
                  }}
                  className={`min-h-[85px] sm:min-h-[95px] p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${cellBg} ${
                    isSelected ? 'ring-2 ring-[#173D2E] scale-[1.02] shadow-md z-10' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${dateStr}: ${isBooked ? 'Booked' : isAvailable ? 'Available' : 'Unavailable'}`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? 'px-1.5 py-0.5 rounded-md bg-[#173D2E] text-white' : ''}`}>
                      {dayNum}
                    </span>

                    {isBooked ? (
                      <span className="w-2 h-2 rounded-full bg-[#D9A441] ring-2 ring-amber-200" title="Confirmed Event" />
                    ) : isAvailable && !isPast ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Available" />
                    ) : !isAvailable && !isPast ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Blocked" />
                    ) : null}
                  </div>

                  {/* Cell badge content */}
                  <div className="mt-1">
                    {isBooked ? (
                      <div className="space-y-0.5">
                        <span className="block px-1.5 py-0.5 rounded bg-[#D9A441] text-[#173D2E] font-black text-[9px] truncate">
                          {bookingDetails?.eventType.replace('_', ' ')}
                        </span>
                        <span className="block text-[9px] font-semibold text-stone-700 truncate">
                          {bookingDetails?.startTime} ({bookingDetails?.expectedDurationHours}h)
                        </span>
                      </div>
                    ) : isPast ? (
                      <span className="text-[10px] text-stone-400 font-medium italic">Past</span>
                    ) : isAvailable ? (
                      <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                        Available
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[9px]">
                          Blocked
                        </span>
                        {reason && (
                          <span className="block text-[8px] text-rose-700 truncate font-semibold">
                            {reason}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Toggle hint */}
                  {!isPast && !isBooked && (
                    <span className="text-[8px] text-stone-400 opacity-0 hover:opacity-100 transition-opacity">
                      Click to toggle
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100 text-xs text-stone-600">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Available (Open)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span>Blocked / Leave</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-[#D9A441]"></span>
                <span>Confirmed Booking</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-stone-300"></span>
                <span>Past Date</span>
              </span>
            </div>

            <span className="text-stone-400 text-[11px]">
              Click any date in the grid to immediately toggle availability
            </span>
          </div>
        </div>

        {/* Selected Date Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Selected Date Inspector
            </span>
            <h4 className="text-lg font-bold font-display text-[#173D2E] mt-0.5">
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </h4>
          </div>

          {/* Current Status Badge */}
          <div className="p-4 rounded-2xl border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600">Current Status:</span>
              {selectedStatus.isBooked ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />
                  <span>Confirmed Booking</span>
                </span>
              ) : selectedStatus.isPast ? (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-bold">
                  Past Date
                </span>
              ) : selectedStatus.isAvailable ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Available for Bookings</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Blocked / Unavailable</span>
                </span>
              )}
            </div>

            {/* Toggle Switch */}
            {!selectedStatus.isPast && !selectedStatus.isBooked && (
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">Toggle Availability</span>
                  <span className="text-[11px] text-stone-500">
                    {isAuthorizedToEdit ? 'Instant Supabase sync' : 'Read-only view'}
                  </span>
                </div>
                {isAuthorizedToEdit ? (
                  <button
                    onClick={() => handleToggleDate(selectedDateStr)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                      selectedStatus.isAvailable
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC]'
                    }`}
                  >
                    {selectedStatus.isAvailable ? 'Block This Date' : 'Mark Available'}
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-stone-400 italic">
                    Chef / Admin Only
                  </span>
                )}
              </div>
            )}
          </div>

          {/* If Booked: show full customer booking summary */}
          {selectedStatus.isBooked && selectedStatus.bookingDetails && (
            <div className="bg-[#FFF8EC] rounded-2xl p-4 border border-[#D9A441]/40 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9A441]/30">
                <span className="font-mono font-bold text-[#173D2E]">
                  #{selectedStatus.bookingDetails.bookingNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                  {selectedStatus.bookingDetails.status}
                </span>
              </div>
              <div>
                <span className="font-bold text-stone-800 block">Customer:</span>
                <span>{selectedStatus.bookingDetails.customerName} ({selectedStatus.bookingDetails.customerPhone})</span>
              </div>
              <div>
                <span className="font-bold text-stone-800 block">Event & Time:</span>
                <span className="capitalize">{selectedStatus.bookingDetails.eventType.replace('_', ' ')} • {selectedStatus.bookingDetails.startTime} ({selectedStatus.bookingDetails.expectedDurationHours}h)</span>
              </div>
              <div>
                <span className="font-bold text-stone-800 block">Venue:</span>
                <span className="text-stone-600">{selectedStatus.bookingDetails.venueAddress}</span>
              </div>
              <div>
                <span className="font-bold text-stone-800 block">Menu Items:</span>
                <span className="text-stone-600">
                  {selectedStatus.bookingDetails.items.map((i) => `${i.quantity} ${i.unit} ${i.dishName}`).join(', ')}
                </span>
              </div>
              <div className="pt-2 border-t border-[#D9A441]/30 flex justify-between font-bold text-[#173D2E]">
                <span>Cooking Service Fee:</span>
                <span>{formatINR(selectedStatus.bookingDetails.chefServiceFee)}</span>
              </div>
            </div>
          )}

          {/* Time & Slot Configuration for Date */}
          {!selectedStatus.isPast && !selectedStatus.isBooked && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Standard Cooking Service Hours
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block mb-0.5">Start Time</span>
                    <input
                      type="time"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      className="w-full p-2 border border-stone-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#173D2E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block mb-0.5">End Time</span>
                    <input
                      type="time"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      className="w-full p-2 border border-stone-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#173D2E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {!selectedStatus.isAvailable && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Reason for Unavailability (Leave / Offline)
                  </label>
                  <select
                    value={blockReason}
                    onChange={(e) => {
                      setBlockReason(e.target.value);
                      handleToggleDate(selectedDateStr, false);
                    }}
                    className="w-full p-2.5 border border-stone-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#173D2E] focus:outline-none font-medium"
                  >
                    <option value="Personal leave">Personal Leave / Family Event</option>
                    <option value="Rest Day">Weekly Rest / Recuperation</option>
                    <option value="Offline Event">Offline Wedding / Private Banquet</option>
                    <option value="Festival Pooja">Religious Pooja & Fasting</option>
                    <option value="Kitchen Maintenance">Utensil & Equipment Seasoning</option>
                  </select>
                </div>
              )}

              {/* Supabase Persistence Note */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-[#173D2E]">
                  <ShieldCheck className="w-4 h-4 text-[#D9A441]" />
                  <span>Supabase Direct Sync</span>
                </div>
                <p>
                  Updates to this date sync to the <code className="font-mono text-[#173D2E]">chef_availability</code> table. Customers searching for this date will be automatically restricted if marked blocked.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
