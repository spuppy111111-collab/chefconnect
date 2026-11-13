-- ==============================================================================
-- ChefConnect Migration: 20261112000001_booking_management_and_notifications.sql
-- Description: Complete Booking Management & Notification System
-- - Server-side validation of booking status transitions & prevention of duplicate acceptance
-- - Automated server-side notification generation on booking status changes
-- - Atomic update_booking_status_securely RPC function with row locking and RBAC
-- - Hardened RLS policies for notifications and bookings
-- - Realtime publication verified for bookings and notifications
-- ==============================================================================

-- 1. SERVER-SIDE STATUS TRANSITION VALIDATION TRIGGER
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If status is not changing, permit update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 1. Prevent modification of terminal states
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invalid transition: Booking #% is already cancelled and cannot be transitioned to "%".', OLD.booking_number, NEW.status;
  END IF;

  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Invalid transition: Completed booking #% cannot be transitioned to "%".', OLD.booking_number, NEW.status;
  END IF;

  IF OLD.status = 'rejected' THEN
    RAISE EXCEPTION 'Invalid transition: Rejected booking #% cannot be transitioned to "%".', OLD.booking_number, NEW.status;
  END IF;

  -- 2. Prevent duplicate acceptance
  IF NEW.status = 'accepted' AND OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Duplicate acceptance: Booking #% is already in "%" state and cannot be accepted.', OLD.booking_number, OLD.status;
  END IF;

  -- 3. Validate allowable lifecycle state transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('accepted', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Pending booking #% cannot transition directly to "%".', OLD.booking_number, NEW.status;
      END IF;

    WHEN 'accepted' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Accepted booking #% cannot transition directly to "%".', OLD.booking_number, NEW.status;
      END IF;

    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: Confirmed booking #% cannot transition directly to "%".', OLD.booking_number, NEW.status;
      END IF;

    WHEN 'in_progress' THEN
      IF NEW.status != 'completed' THEN
        RAISE EXCEPTION 'Invalid transition: In-progress booking #% can only transition to "completed" (attempted: "%").', OLD.booking_number, NEW.status;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown booking status: "%".', OLD.status;
  END CASE;

  -- Refresh updated timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_status ON public.bookings;
CREATE TRIGGER trg_validate_booking_status
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_status_transition();

-- 2. AUTOMATED NOTIFICATION DISPATCH TRIGGER
CREATE OR REPLACE FUNCTION public.dispatch_booking_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_chef_profile_id UUID;
BEGIN
  -- Only execute when status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Look up chef profile_id for chef notifications
  SELECT profile_id INTO v_chef_profile_id
  FROM public.chef_profiles
  WHERE id = NEW.chef_id;

  CASE NEW.status
    WHEN 'accepted' THEN
      -- Notify Customer
      INSERT INTO public.notifications (
        recipient_id,
        recipient_role,
        title,
        message,
        type,
        booking_id
      ) VALUES (
        NEW.customer_id,
        'customer',
        'Quotation Accepted #' || NEW.booking_number,
        NEW.chef_name || ' accepted your booking request! Total: ₹' || NEW.total_amount || '. Please pay the advance deposit to confirm.',
        'booking_accepted',
        NEW.id
      );

    WHEN 'rejected' THEN
      -- Notify Customer
      INSERT INTO public.notifications (
        recipient_id,
        recipient_role,
        title,
        message,
        type,
        booking_id
      ) VALUES (
        NEW.customer_id,
        'customer',
        'Booking Declined #' || NEW.booking_number,
        NEW.chef_name || ' was unable to accept your request. Reason: ' || COALESCE(NEW.cancellation_reason, 'Schedule conflict') || '.',
        'booking_rejected',
        NEW.id
      );

    WHEN 'confirmed' THEN
      -- Notify Assigned Chef
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
          'Booking Confirmed #' || NEW.booking_number,
          'Customer ' || NEW.customer_name || ' paid the advance deposit for ' || NEW.event_date || ' at ' || NEW.start_time || '. The booking is confirmed!',
          'payment_received',
          NEW.id
        );
      END IF;

    WHEN 'in_progress' THEN
      -- Notify Customer
      INSERT INTO public.notifications (
        recipient_id,
        recipient_role,
        title,
        message,
        type,
        booking_id
      ) VALUES (
        NEW.customer_id,
        'customer',
        'Chef Arrived #' || NEW.booking_number,
        NEW.chef_name || ' has arrived and cooking service has started at your venue!',
        'status_update',
        NEW.id
      );

    WHEN 'completed' THEN
      -- Notify Customer
      INSERT INTO public.notifications (
        recipient_id,
        recipient_role,
        title,
        message,
        type,
        booking_id
      ) VALUES (
        NEW.customer_id,
        'customer',
        'Service Completed #' || NEW.booking_number,
        NEW.chef_name || ' has completed your cooking service. Please take a moment to rate and review your experience!',
        'status_update',
        NEW.id
      );

    ELSE
      -- Cancelled is handled specifically with custom reasons in cancel_booking_securely
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_booking_notification ON public.bookings;
CREATE TRIGGER trg_dispatch_booking_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_booking_status_notification();

-- 3. SECURE ATOMIC RPC: UPDATE BOOKING STATUS SECURELY
CREATE OR REPLACE FUNCTION public.update_booking_status_securely(
  p_booking_id UUID,
  p_target_status TEXT,
  p_notes TEXT DEFAULT NULL
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
BEGIN
  -- 1. Strict Authentication Check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  -- 2. Fetch and lock booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  v_is_admin := public.is_admin(v_caller_id);
  v_caller_chef_id := public.get_my_chef_id(v_caller_id);

  -- 3. Authorization Checks per Target Status
  CASE p_target_status
    WHEN 'in_progress', 'completed' THEN
      IF NOT v_is_admin AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned chef or platform admin can transition booking to "%".', p_target_status;
      END IF;

    WHEN 'rejected' THEN
      IF NOT v_is_admin AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned chef or platform admin can reject this booking.';
      END IF;

    WHEN 'confirmed' THEN
      IF NOT v_is_admin AND v_booking.customer_id != v_caller_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the customer or platform admin can confirm this booking.';
      END IF;

    WHEN 'cancelled' THEN
      IF NOT v_is_admin AND v_booking.customer_id != v_caller_id AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
        RAISE EXCEPTION 'Unauthorized: You are not authorized to cancel this booking.';
      END IF;

    ELSE
      IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Unknown or restricted status transition to "%".', p_target_status;
      END IF;
  END CASE;

  -- 4. Apply status update (trigger will validate transition rules)
  UPDATE public.bookings
  SET status = p_target_status,
      cancellation_reason = CASE WHEN p_target_status = 'rejected' THEN COALESCE(p_notes, cancellation_reason) ELSE cancellation_reason END,
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'booking_number', v_booking.booking_number,
    'previous_status', v_booking.status,
    'status', p_target_status
  );
END;
$$;

-- 4. GRANTS & PERMISSIONS
REVOKE ALL ON FUNCTION public.update_booking_status_securely(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking_status_securely(UUID, TEXT, TEXT) TO authenticated;

-- 5. HARDEN NOTIFICATIONS RLS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    recipient_id = (SELECT auth.uid())
    OR public.is_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 6. REALTIME PUBLICATION VERIFICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

