import { supabase, isSupabaseConfigured, SUPABASE_CONFIG } from '../lib/supabaseClient';
import {
  Booking,
  BookingPayment,
  BookingStatus,
  Chef,
  CookingService,
  NotificationItem,
  PaymentStatus,
  Profile,
  Review,
  UserRole,
} from '../types/database';

export interface SupabaseSyncState {
  isConfigured: boolean;
  isConnected: boolean;
  hasRemoteSchema: boolean;
  realtimeActive: boolean;
  lastSyncedAt: string | null;
  remoteError: string | null;
}

class SupabaseService {
  private syncState: SupabaseSyncState = {
    isConfigured: isSupabaseConfigured,
    isConnected: false,
    hasRemoteSchema: false,
    realtimeActive: false,
    lastSyncedAt: null,
    remoteError: null,
  };

  private realtimeChannel: any = null;
  private changeListeners: Array<(payload: any) => void> = [];

  constructor() {
    this.checkConnection();
  }

  public getSyncState(): SupabaseSyncState {
    return { ...this.syncState };
  }

  public async checkConnection(): Promise<boolean> {
    if (!supabase) {
      this.syncState.isConnected = false;
      return false;
    }

    try {
      // Probe connectivity with profiles check
      const { data, error } = await supabase.from('profiles').select('id').limit(1);

      this.syncState.isConnected = true;
      if (error && error.code === 'PGRST205') {
        // Connected to Supabase, but schema migration hasn't been executed in SQL Editor yet
        this.syncState.hasRemoteSchema = false;
        this.syncState.remoteError = 'Remote schema pending creation in Supabase SQL editor.';
      } else if (error) {
        this.syncState.remoteError = error.message;
      } else {
        this.syncState.hasRemoteSchema = true;
        this.syncState.remoteError = null;
        this.syncState.lastSyncedAt = new Date().toISOString();
      }

      return this.syncState.isConnected;
    } catch (err: any) {
      this.syncState.isConnected = false;
      this.syncState.remoteError = err?.message || 'Network error';
      return false;
    }
  }

  // --- Supabase Authentication ---

  public async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }): Promise<{ user: any; error: any }> {
    if (!supabase) {
      return { user: null, error: new Error('Supabase client is not configured') };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
            role: params.role,
            phone: params.phone,
          },
        },
      });

      if (error) return { user: null, error };

      // If remote profiles table is available, insert user profile
      if (data.user && this.syncState.hasRemoteSchema) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: params.email,
          full_name: params.fullName,
          role: params.role,
          phone: params.phone,
        });
      }

      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  }

  public async signIn(email: string, password: string): Promise<{ session: any; error: any }> {
    if (!supabase) {
      return { session: null, error: new Error('Supabase client is not configured') };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { session: null, error };
      return { session: data.session, error: null };
    } catch (err: any) {
      return { session: null, error: err };
    }
  }

  public async signOut(): Promise<{ error: any }> {
    if (!supabase) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }

  public async getSession(): Promise<any> {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  // --- Real-time Booking Synchronization ---

  public async syncBookingToSupabase(booking: Booking): Promise<boolean> {
    if (!supabase) return false;

    try {
      // 1. Insert into bookings
      const { error: bookingErr } = await supabase.from('bookings').upsert({
        booking_number: booking.bookingNumber,
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        chef_name: booking.chefName,
        chef_avatar_url: booking.chefAvatarUrl,
        event_type: booking.eventType,
        food_type: booking.foodType,
        event_date: booking.eventDate,
        start_time: booking.startTime,
        expected_duration_hours: booking.expectedDurationHours,
        guests_count: booking.guestsCount,
        venue_address: booking.venueAddress,
        city: booking.city,
        ingredient_arrangement: booking.ingredientArrangement,
        special_instructions: booking.specialInstructions,
        chef_service_fee: booking.chefServiceFee,
        ingredient_fee: booking.ingredientFee,
        platform_fee: booking.platformFee,
        total_amount: booking.totalAmount,
        advance_deposit_required: booking.advanceDepositRequired,
        status: booking.status,
        payment_status: booking.paymentStatus,
      }, { onConflict: 'booking_number' });

      if (bookingErr) {
        console.warn('Supabase booking sync warning:', bookingErr.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase booking sync exception:', err?.message);
      return false;
    }
  }

  public async fetchBookings(): Promise<Booking[]> {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchBookings warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): Booking => ({
        id: row.id,
        bookingNumber: row.booking_number,
        customerId: row.customer_id || '',
        customerName: row.customer_name,
        customerPhone: row.customer_phone || '',
        customerEmail: row.customer_email || '',
        chefId: row.chef_id || '',
        chefName: row.chef_name,
        chefAvatarUrl: row.chef_avatar_url || '',
        eventType: row.event_type,
        foodType: row.food_type,
        eventDate: row.event_date,
        startTime: row.start_time,
        expectedDurationHours: Number(row.expected_duration_hours || 3),
        guestsCount: Number(row.guests_count || 10),
        venueAddress: row.venue_address,
        city: row.city || 'Hyderabad',
        items: [],
        ingredientArrangement: row.ingredient_arrangement,
        utensilsProvidedByCustomer: true,
        specialInstructions: row.special_instructions,
        chefServiceFee: Number(row.chef_service_fee || 0),
        ingredientFee: Number(row.ingredient_fee || 0),
        platformFee: Number(row.platform_fee || 0),
        additionalCharges: 0,
        totalAmount: Number(row.total_amount || 0),
        advanceDepositRequired: Number(row.advance_deposit_required || 0),
        status: row.status,
        chefQuotationNotes: row.chef_quotation_notes,
        paymentStatus: row.payment_status || 'pending',
        cancellationReason: row.cancellation_reason,
        cancelledBy: row.cancelled_by,
        cancelledAt: row.cancelled_at || (row.status === 'cancelled' ? row.updated_at : undefined),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('Supabase fetchBookings exception:', err);
      return [];
    }
  }

  public async syncBookingStatusToSupabase(
    bookingNumberOrId: string,
    newStatus: BookingStatus,
    notes?: string
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      // 1. Try atomic RPC update_booking_status_securely if UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingNumberOrId);
      if (isUuid) {
        const { error: rpcError } = await supabase.rpc('update_booking_status_securely', {
          p_booking_id: bookingNumberOrId,
          p_target_status: newStatus,
          p_notes: notes || null,
        });

        if (!rpcError) {
          this.syncState.lastSyncedAt = new Date().toISOString();
          return true;
        }
      }

      // 2. Direct update fallback
      const updatePayload: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (notes) {
        updatePayload.chef_quotation_notes = notes;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updatePayload)
        .or(`id.eq.${bookingNumberOrId},booking_number.eq.${bookingNumberOrId}`);

      if (error) {
        console.warn('Supabase status update warning:', error.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase status update exception:', err?.message);
      return false;
    }
  }

  public async cancelBookingInSupabase(
    bookingId: string,
    bookingNumber: string,
    reason: string = '',
    cancelledBy: 'customer' | 'chef' | 'admin' = 'customer'
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      // 1. Try atomic RPC function first
      const { data, error } = await supabase.rpc('cancel_booking_securely', {
        p_booking_id: bookingId,
        p_reason: reason || `Cancelled by ${cancelledBy}`,
      });

      if (!error) {
        this.syncState.lastSyncedAt = new Date().toISOString();
        return true;
      }

      console.warn('Supabase cancel_booking_securely RPC note:', error.message);

      // 2. Direct conditional update fallback
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_by: cancelledBy,
          cancelled_at: nowIso,
          cancellation_reason: reason || `Cancelled by ${cancelledBy}`,
          updated_at: nowIso,
        })
        .or(`id.eq.${bookingId},booking_number.eq.${bookingNumber}`)
        .in('status', ['pending', 'accepted', 'confirmed']);

      if (updateError) {
        console.warn('Supabase cancel booking fallback error:', updateError.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase cancel booking exception:', err?.message);
      return false;
    }
  }

  public async acceptBookingInSupabase(
    bookingId: string,
    quotation: {
      revisedServiceFee?: number;
      revisedDurationHours?: number;
      additionalCharges?: number;
      additionalChargesNotes?: string;
      chefQuotationNotes?: string;
    }
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      // Try atomic RPC function first
      const { data, error } = await supabase.rpc('accept_booking_securely', {
        p_booking_id: bookingId,
        p_revised_service_fee: quotation.revisedServiceFee,
        p_revised_duration: quotation.revisedDurationHours,
        p_additional_charges: quotation.additionalCharges || 0,
        p_additional_notes: quotation.additionalChargesNotes,
        p_quotation_notes: quotation.chefQuotationNotes,
      });

      if (!error) {
        this.syncState.lastSyncedAt = new Date().toISOString();
        return true;
      }

      // Fallback: conditional atomic update where status = 'pending'
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'accepted',
          chef_service_fee: quotation.revisedServiceFee,
          expected_duration_hours: quotation.revisedDurationHours,
          chef_quotation_notes: quotation.chefQuotationNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'pending');

      if (updateError) {
        console.warn('Supabase accept booking fallback warning:', updateError.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase accept booking exception:', err?.message);
      return false;
    }
  }

  // --- Reviews Synchronization ---

  public async fetchReviews(): Promise<Review[]> {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchReviews warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): Review => ({
        id: row.id,
        bookingId: row.booking_id,
        customerId: row.customer_id || '',
        customerName: row.customer_name,
        chefId: row.chef_id,
        rating: row.rating,
        comment: row.comment || '',
        foodTasteRating: row.food_taste_rating || 5,
        cleanlinessRating: row.cleanliness_rating || 5,
        punctualityRating: row.punctuality_rating || 5,
        chefReply: row.chef_reply,
        chefReplyAt: row.chef_reply_at,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('Supabase fetchReviews exception:', err);
      return [];
    }
  }

  public async submitReviewToSupabase(review: Review): Promise<boolean> {
    if (!supabase) return false;

    try {
      // 1. Try atomic stored RPC
      const { data, error: rpcError } = await supabase.rpc('submit_booking_review', {
        p_booking_id: review.bookingId,
        p_rating: review.rating,
        p_comment: review.comment,
        p_food_taste_rating: review.foodTasteRating || 5,
        p_cleanliness_rating: review.cleanlinessRating || 5,
        p_punctuality_rating: review.punctualityRating || 5,
      });

      if (!rpcError) {
        this.syncState.lastSyncedAt = new Date().toISOString();
        return true;
      }

      // 2. Direct insert fallback
      const { error: insertError } = await supabase.from('reviews').insert({
        booking_id: review.bookingId,
        customer_id: review.customerId,
        chef_id: review.chefId,
        customer_name: review.customerName,
        rating: review.rating,
        comment: review.comment,
        food_taste_rating: review.foodTasteRating,
        cleanliness_rating: review.cleanlinessRating,
        punctuality_rating: review.punctualityRating,
      });

      if (insertError) {
        console.warn('Supabase submitReview warning:', insertError.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase submitReview exception:', err?.message);
      return false;
    }
  }

  public async replyReviewInSupabase(reviewId: string, reply: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          chef_reply: reply,
          chef_reply_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) {
        console.warn('Supabase replyReview warning:', error.message);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // --- Admin Authorization Verification ---

  public async verifyAdminAuthorization(userId: string): Promise<boolean> {
    if (!supabase || !userId) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return false;
      return data.role === 'admin';
    } catch {
      return false;
    }
  }

  // --- Notifications Synchronization ---

  public async fetchNotifications(recipientId?: string): Promise<NotificationItem[]> {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Supabase fetchNotifications warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): NotificationItem => ({
        id: row.id,
        recipientId: row.recipient_id,
        recipientRole: row.recipient_role || 'customer',
        title: row.title,
        message: row.message,
        type: row.type || 'system',
        bookingId: row.booking_id,
        read: Boolean(row.read),
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('Supabase fetchNotifications exception:', err);
      return [];
    }
  }

  public async createNotificationInSupabase(
    notification: Omit<NotificationItem, 'id' | 'createdAt'>
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('notifications').insert({
        recipient_id: notification.recipientId,
        recipient_role: notification.recipientRole,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        booking_id: notification.bookingId || null,
        read: notification.read ?? false,
      });

      if (error) {
        console.warn('Supabase createNotification warning:', error.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase createNotification exception:', err?.message);
      return false;
    }
  }

  public async markNotificationReadInSupabase(notificationId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.warn('Supabase markNotificationRead warning:', error.message);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  public async markAllNotificationsReadInSupabase(recipientId?: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      let query = supabase.from('notifications').update({ read: true }).eq('read', false);

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      }

      const { error } = await query;
      if (error) {
        console.warn('Supabase markAllNotificationsRead warning:', error.message);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // --- Real-time Subscriptions (Bookings & Reviews) ---

  public subscribeToBookingChanges(callback: (payload: any) => void): () => void {
    this.changeListeners.push(callback);

    if (supabase && !this.realtimeChannel) {
      try {
        this.realtimeChannel = supabase
          .channel('public:chefconnect_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            (payload) => {
              this.syncState.lastSyncedAt = new Date().toISOString();
              this.changeListeners.forEach((listener) => {
                try {
                  listener({ type: 'booking', ...payload });
                } catch (e) {
                  console.error('Realtime callback listener error:', e);
                }
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reviews' },
            (payload) => {
              this.syncState.lastSyncedAt = new Date().toISOString();
              this.changeListeners.forEach((listener) => {
                try {
                  listener({ type: 'review', ...payload });
                } catch (e) {
                  console.error('Realtime callback listener error:', e);
                }
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'chef_profiles' },
            (payload) => {
              this.syncState.lastSyncedAt = new Date().toISOString();
              this.changeListeners.forEach((listener) => {
                try {
                  listener({ type: 'chef_profile', ...payload });
                } catch (e) {
                  console.error('Realtime callback listener error:', e);
                }
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            (payload) => {
              this.syncState.lastSyncedAt = new Date().toISOString();
              this.changeListeners.forEach((listener) => {
                try {
                  listener({ type: 'notification', ...payload });
                } catch (e) {
                  console.error('Realtime callback listener error:', e);
                }
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'menu_items' },
            (payload) => {
              this.syncState.lastSyncedAt = new Date().toISOString();
              this.changeListeners.forEach((listener) => {
                try {
                  listener({ type: 'menu_item', ...payload });
                } catch (e) {
                  console.error('Realtime callback listener error:', e);
                }
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.syncState.realtimeActive = true;
            }
          });
      } catch (e) {
        console.warn('Failed to start Supabase realtime channel:', e);
      }
    }

    return () => {
      this.changeListeners = this.changeListeners.filter((cb) => cb !== callback);
      if (this.changeListeners.length === 0 && this.realtimeChannel && supabase) {
        try {
          supabase.removeChannel(this.realtimeChannel);
        } catch {}
        this.realtimeChannel = null;
        this.syncState.realtimeActive = false;
      }
    };
  }

  public teardown(): void {
    if (this.realtimeChannel && supabase) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
      this.realtimeChannel = null;
    }
    if (supabase) {
      try {
        (supabase as any).realtime?.disconnect?.();
      } catch {}
    }
    this.changeListeners = [];
    this.syncState.realtimeActive = false;
  }

  // --- Real-time Availability Sync ---
  public async syncAvailabilityToSupabase(
    chefId: string,
    date: string,
    isAvailable: boolean,
    reason?: string
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('chef_availability').upsert(
        {
          date,
          is_available: isAvailable,
          reason: reason || (isAvailable ? 'Available' : 'Personal leave'),
        },
        { onConflict: 'date' }
      );

      if (error) {
        console.warn('Supabase availability sync warning:', error.message);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }


  // --- Chef Profiles Synchronization ---

  public async fetchChefs(): Promise<Chef[]> {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];
    try {
      const { data, error } = await supabase
        .from('chef_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchChefs warning:', error.message);
        return [];
      }

      return (data || []).map((row: any): Chef => ({
        id: row.id,
        profileId: row.profile_id || '',
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        avatarUrl: row.avatar_url || '',
        experienceYears: Number(row.experience_years || 1),
        bio: row.bio || '',
        specialties: row.specialties || [],
        supportedEvents: ['home_cooking', 'family_function', 'birthday', 'festival', 'wedding'],
        location: row.location || 'Hyderabad',
        serviceAreas: row.service_areas || [],
        serviceRadius: Number(row.service_radius || 15),
        hourlyRate: Number(row.hourly_rate || 500),
        baseCharge: Number(row.base_charge || 500),
        perPersonRate: Number(row.per_person_rate || 100),
        rating: Number(row.rating || 5),
        reviewCount: Number(row.review_count || 0),
        status: row.status || 'pending',
        rejectionReason: row.rejection_reason,
        workingHours: row.working_hours || '07:00 AM - 10:00 PM',
        workingDays: row.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        blockedDates: (row.blocked_dates || []).map((d: any) => String(d)),
        equipmentArrangement: 'brings_own_knives_spices',
        isAvailableToday: row.is_available_today ?? true,
        featuredDishes: [],
        certificates: row.certificates || [],
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('Supabase fetchChefs exception:', err);
      return [];
    }
  }

  public async syncChefProfileToSupabase(
    chefIdOrProfileId: string,
    updates: Partial<Chef>
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) payload.bio = updates.bio;
      if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
      if (updates.specialties !== undefined) payload.specialties = updates.specialties;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.serviceAreas !== undefined) payload.service_areas = updates.serviceAreas;
      if (updates.serviceRadius !== undefined) payload.service_radius = updates.serviceRadius;
      if (updates.hourlyRate !== undefined) payload.hourly_rate = updates.hourlyRate;
      if (updates.baseCharge !== undefined) payload.base_charge = updates.baseCharge;
      if (updates.perPersonRate !== undefined) payload.per_person_rate = updates.perPersonRate;
      if (updates.isAvailableToday !== undefined) payload.is_available_today = updates.isAvailableToday;
      if (updates.workingHours !== undefined) payload.working_hours = updates.workingHours;
      if (updates.workingDays !== undefined) payload.working_days = updates.workingDays;
      if (updates.blockedDates !== undefined) payload.blocked_dates = updates.blockedDates;
      if (updates.certificates !== undefined) payload.certificates = updates.certificates;

      const { error } = await supabase
        .from('chef_profiles')
        .update(payload)
        .or(`id.eq.${chefIdOrProfileId},profile_id.eq.${chefIdOrProfileId}`);

      if (error) {
        console.warn('Supabase syncChefProfile warning:', error.message);
        return false;
      }

      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      console.warn('Supabase syncChefProfile exception:', err?.message);
      return false;
    }
  }

  public async syncUserProfile(
    profileId: string,
    updates: Partial<Profile>
  ): Promise<boolean> {
    if (!supabase) return false;

    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.city !== undefined) payload.city = updates.city;
      if (updates.dietaryPreferences !== undefined) payload.dietary_preferences = updates.dietaryPreferences;
      if (updates.savedChefIds !== undefined) payload.saved_chef_ids = updates.savedChefIds;

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profileId);

      if (error) {
        console.warn('Supabase syncUserProfile warning:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase syncUserProfile exception:', err?.message);
      return false;
    }
  }

  // --- Dynamic Chef Food Items & Menu API ---

  public async fetchDistinctChefFoodItems(): Promise<
    Array<{
      id: string;
      name: string;
      category: string;
      chefIds: string[];
      chefCount: number;
    }>
  > {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];

    try {
      // 1. Attempt database RPC function first
      const { data, error: rpcError } = await supabase.rpc('get_distinct_available_food_items');
      if (!rpcError && data && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          category: row.category,
          chefIds: row.chef_ids || [],
          chefCount: Number(row.chef_count || 1),
        }));
      }

      // 2. Fallback query: join menu_items with approved chef_profiles
      const { data: menuData, error: queryError } = await supabase
        .from('menu_items')
        .select(`
          id,
          service_name,
          category_name,
          chef_id,
          is_active,
          chef:chef_profiles!inner(id, status, is_available_today)
        `)
        .eq('is_active', true)
        .eq('chef.status', 'approved');

      if (queryError || !menuData) {
        console.warn('Supabase fetchDistinctChefFoodItems fallback note:', queryError?.message);
        return [];
      }

      // Group distinct food items by trimmed name
      const itemMap = new Map<string, { id: string; name: string; category: string; chefIds: Set<string> }>();
      menuData.forEach((row: any) => {
        const name = (row.service_name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            id: row.id,
            name,
            category: row.category_name || 'General',
            chefIds: new Set([row.chef_id]),
          });
        } else {
          itemMap.get(key)!.chefIds.add(row.chef_id);
        }
      });

      return Array.from(itemMap.values()).map((entry) => ({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        chefIds: Array.from(entry.chefIds),
        chefCount: entry.chefIds.size,
      }));
    } catch (err: any) {
      console.warn('Supabase fetchDistinctChefFoodItems exception:', err?.message);
      return [];
    }
  }

  public async fetchChefMenuItems(chefId?: string): Promise<CookingService[]> {
    if (!supabase || !this.syncState.hasRemoteSchema) return [];

    try {
      let query = supabase.from('menu_items').select('*').eq('is_active', true);
      if (chefId) {
        query = query.eq('chef_id', chefId);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((row: any): CookingService => ({
        id: row.id,
        chefId: row.chef_id,
        categoryId: row.category_name || 'General',
        serviceName: row.service_name,
        description: row.description || '',
        pricingType: row.pricing_type || 'hourly',
        baseRate: Number(row.base_rate || 500),
        minDurationHours: Number(row.min_duration_hours || 2),
        imageUrl: row.image_url,
        isActive: row.is_active ?? true,
      }));
    } catch {
      return [];
    }
  }

  public async addChefMenuItem(service: Omit<CookingService, 'id'> & { id?: string }): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('menu_items').insert({
        chef_id: service.chefId,
        category_name: service.categoryId,
        service_name: service.serviceName,
        description: service.description,
        pricing_type: service.pricingType,
        base_rate: service.baseRate,
        min_duration_hours: service.minDurationHours || 2,
        image_url: service.imageUrl,
        is_active: service.isActive ?? true,
      });

      if (error) {
        console.warn('Supabase addChefMenuItem warning:', error.message);
        return false;
      }
      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch {
      return false;
    }
  }

  public async updateChefMenuItem(itemId: string, updates: Partial<CookingService>): Promise<boolean> {
    if (!supabase) return false;

    try {
      const payload: Record<string, any> = {};
      if (updates.serviceName !== undefined) payload.service_name = updates.serviceName;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.categoryId !== undefined) payload.category_name = updates.categoryId;
      if (updates.pricingType !== undefined) payload.pricing_type = updates.pricingType;
      if (updates.baseRate !== undefined) payload.base_rate = updates.baseRate;
      if (updates.minDurationHours !== undefined) payload.min_duration_hours = updates.minDurationHours;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { error } = await supabase.from('menu_items').update(payload).eq('id', itemId);
      if (error) {
        console.warn('Supabase updateChefMenuItem warning:', error.message);
        return false;
      }
      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch {
      return false;
    }
  }

  public async deleteChefMenuItem(itemId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) {
        console.warn('Supabase deleteChefMenuItem warning:', error.message);
        return false;
      }
      this.syncState.lastSyncedAt = new Date().toISOString();
      return true;
    } catch {
      return false;
    }
  }

  // --- UPI QR Payment Operations ---

  public async recordUpiPaymentSubmission(payment: BookingPayment): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error: rpcErr } = await supabase.rpc('submit_upi_payment_securely', {
        p_booking_id: payment.bookingId,
        p_payment_reference: payment.paymentReference,
        p_receipt_path: payment.receiptUrl || null,
        p_customer_notes: payment.notes || null,
      });
      if (!rpcErr) return true;

      const payload: Record<string, any> = {
        booking_id: payment.bookingId,
        customer_id: payment.customerId,
        chef_id: payment.chefId,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        payment_method: 'upi_qr',
        payment_reference: payment.paymentReference,
        status: payment.status || 'payment_verification_pending',
        receipt_number: payment.receiptNumber || `RCPT-${Date.now()}`,
        receipt_path: payment.receiptUrl,
        notes: payment.notes,
        created_at: payment.submittedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('payments').upsert(payload, { onConflict: 'booking_id' });
      if (error) {
        console.warn('Supabase recordUpiPaymentSubmission warning:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Supabase recordUpiPaymentSubmission exception:', err?.message);
      return false;
    }
  }

  public async adminVerifyPaymentInSupabase(paymentId: string, adminId?: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('verify_upi_payment_securely', {
        p_payment_id: paymentId,
      });
      if (!error) return true;

      const { error: directErr } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          verified_by: adminId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      return !directErr;
    } catch {
      return false;
    }
  }

  public async adminRejectPaymentInSupabase(paymentId: string, rejectionReason: string, adminId?: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('reject_upi_payment_securely', {
        p_payment_id: paymentId,
        p_rejection_reason: rejectionReason,
      });
      if (!error) return true;

      const { error: directErr } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          verified_by: adminId,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      return !directErr;
    } catch {
      return false;
    }
  }

  public async adminRecordSettlementPayoutInSupabase(
    settlementId: string,
    payoutReference: string,
    adminId?: string
  ): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.rpc('record_chef_settlement_payout_securely', {
        p_settlement_id: settlementId,
        p_payout_reference: payoutReference,
      });
      if (!error) return true;

      const { error: directErr } = await supabase
        .from('chef_settlements')
        .update({
          settlement_status: 'settled',
          payout_reference: payoutReference,
          payout_date: new Date().toISOString(),
          verified_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settlementId);
      return !directErr;
    } catch {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();

