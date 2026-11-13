-- ==============================================================================
-- ChefConnect Migration: 20261112000000_customer_booking_cancellation.sql
-- Description: Complete Customer Booking Cancellation Feature
-- - Adds cancelled_at, cancelled_by, cancellation_reason columns to bookings
-- - Adds atomic cancel_booking_securely RPC with row-level locking & ownership checks
-- - Handles automatic payment refunding, chef availability restoration & notifications
-- - RLS policy hardening for secure customer cancellation
-- ==============================================================================

-- 1. ADD CANCELLATION METADATA COLUMNS
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. PERFORMANCE INDEXES FOR CANCELLATION QUERIES
CREATE INDEX IF NOT EXISTS idx_bookings_status_cancelled 
ON public.bookings(status, cancelled_at) 
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_customer_status 
ON public.bookings(customer_id, status);

-- 3. SECURE ATOMIC RPC: CANCEL BOOKING SECURELY
CREATE OR REPLACE FUNCTION public.cancel_booking_securely(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_caller_chef_id UUID;
  v_is_admin BOOLEAN := false;
  v_cancelled_by TEXT;
  v_clean_reason TEXT;
  v_chef_profile_id UUID;
  v_refund_amount NUMERIC := 0;
BEGIN
  -- 1. Strict Authentication Check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  -- 2. Fetch and lock booking row exclusively (FOR UPDATE prevents race conditions)
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  -- 3. Verify Ownership & Authorization
  v_is_admin := public.is_admin(v_caller_id);
  v_caller_chef_id := public.get_my_chef_id(v_caller_id);

  IF NOT v_is_admin AND v_booking.customer_id != v_caller_id AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
    RAISE EXCEPTION 'Unauthorized: You do not have permission to cancel booking #%.', v_booking.booking_number;
  END IF;

  -- 4. Determine Cancelled By Role
  IF v_is_admin THEN
    v_cancelled_by := 'admin';
  ELSIF v_caller_chef_id IS NOT NULL AND v_caller_chef_id = v_booking.chef_id THEN
    v_cancelled_by := 'chef';
  ELSE
    v_cancelled_by := 'customer';
  END IF;

  -- 5. Prevent Duplicate Cancellation
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking #% is already cancelled.', v_booking.booking_number;
  END IF;

  -- 6. Restrict In Progress and Completed Bookings
  IF v_booking.status IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Cannot cancel booking #%: Chef service is currently "%" and cannot be cancelled.', v_booking.booking_number, v_booking.status;
  END IF;

  -- 7. Validate Status Eligibility (pending, accepted, confirmed)
  IF v_booking.status NOT IN ('pending', 'accepted', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel booking #%: Status "%" is not eligible for cancellation.', v_booking.booking_number, v_booking.status;
  END IF;

  v_clean_reason := COALESCE(NULLIF(TRIM(p_reason), ''), 'Cancelled by ' || v_cancelled_by);

  -- 8. Update Booking Record (Never delete)
  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_by = v_cancelled_by,
      cancelled_at = NOW(),
      cancellation_reason = v_clean_reason,
      payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- 9. Handle Payment Refund if Advance/Total Was Paid
  IF v_booking.payment_status = 'paid' THEN
    UPDATE public.payments
    SET status = 'refunded'
    WHERE booking_id = p_booking_id AND status = 'paid';
    
    v_refund_amount := v_booking.total_amount;
  END IF;

  -- 10. Restore Chef Availability where applicable
  -- If no other active booking exists on that date for this chef, unblock date
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE chef_id = v_booking.chef_id
      AND event_date = v_booking.event_date
      AND status NOT IN ('cancelled', 'rejected')
      AND id != p_booking_id
  ) THEN
    UPDATE public.chef_availability
    SET is_available = true,
        reason = NULL
    WHERE chef_id = v_booking.chef_id
      AND date = v_booking.event_date
      AND (reason ILIKE '%booking%' OR is_available = false);
  END IF;

  -- 11. Send Realtime Notification to Counterpart
  IF v_cancelled_by = 'customer' THEN
    -- Notify the Assigned Chef
    SELECT profile_id INTO v_chef_profile_id
    FROM public.chef_profiles
    WHERE id = v_booking.chef_id;

    IF v_chef_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        recipient_id,
        recipient_role,
        title,
        message,
        type,
        booking_id
      ) VALUES (
        v_chef_profile_id,
        'chef',
        'Booking #' || v_booking.booking_number || ' Cancelled',
        'Customer ' || v_booking.customer_name || ' cancelled their booking for ' || v_booking.event_date || '. Reason: ' || v_clean_reason,
        'status_update',
        v_booking.id
      );
    END IF;
  ELSE
    -- Notify Customer if cancelled by Chef or Admin
    INSERT INTO public.notifications (
      recipient_id,
      recipient_role,
      title,
      message,
      type,
      booking_id
    ) VALUES (
      v_booking.customer_id,
      'customer',
      'Booking #' || v_booking.booking_number || ' Cancelled',
      'Your booking #' || v_booking.booking_number || ' with ' || v_booking.chef_name || ' on ' || v_booking.event_date || ' was cancelled (' || v_cancelled_by || '). Reason: ' || v_clean_reason,
      'status_update',
      v_booking.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'booking_number', v_booking.booking_number,
    'status', 'cancelled',
    'cancelled_by', v_cancelled_by,
    'cancelled_at', NOW(),
    'cancellation_reason', v_clean_reason,
    'refund_status', CASE WHEN v_booking.payment_status = 'paid' THEN 'refunded' ELSE 'no_payment' END,
    'refund_amount', v_refund_amount
  );
END;
$$;

-- 4. FUNCTION EXECUTION GRANTS
REVOKE ALL ON FUNCTION public.cancel_booking_securely(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_securely(UUID, TEXT) TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS) POLICY HARDENING
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chefs and customers can update booking status" ON public.bookings;
CREATE POLICY "Chefs and customers can update booking status" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR chef_id = public.get_my_chef_id((SELECT auth.uid()))
    OR public.is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    OR chef_id = public.get_my_chef_id((SELECT auth.uid()))
    OR public.is_admin((SELECT auth.uid()))
  );

