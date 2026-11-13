-- ==============================================================================
-- ChefConnect: Incremental Migration 000001
-- Security Hardening, Stored RPC Functions, Atomic Booking & Review Lifecycle, and Granular RLS
-- ==============================================================================

-- 1. Enforce Unique Review per Booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_review_per_booking'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_booking UNIQUE (booking_id);
  END IF;
END $$;

-- 2. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_chef_profiles_profile_id ON public.chef_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON public.bookings(status, event_date);

-- 3. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_chef_id(user_profile_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.chef_profiles
  WHERE profile_id = user_profile_id
  LIMIT 1;
$$;

-- 4. Atomic RPC: Chef Accept Booking (Prevents double acceptance & race conditions)
CREATE OR REPLACE FUNCTION public.accept_booking_securely(
  p_booking_id UUID,
  p_revised_service_fee NUMERIC DEFAULT NULL,
  p_revised_duration NUMERIC DEFAULT NULL,
  p_additional_charges NUMERIC DEFAULT 0,
  p_additional_notes TEXT DEFAULT NULL,
  p_quotation_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_caller_profile_id UUID := auth.uid();
  v_caller_chef_id UUID;
  v_new_service_fee NUMERIC;
  v_new_duration NUMERIC;
  v_subtotal NUMERIC;
  v_platform_fee NUMERIC;
  v_total_amount NUMERIC;
  v_deposit NUMERIC;
BEGIN
  -- Lock row for update
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot accept booking: Booking is currently in "%" status, not pending.', v_booking.status;
  END IF;

  -- Authorization check: caller must be the assigned chef or admin
  IF v_caller_profile_id IS NOT NULL THEN
    v_caller_chef_id := public.get_my_chef_id(v_caller_profile_id);
    IF NOT public.is_admin(v_caller_profile_id) AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
      RAISE EXCEPTION 'Unauthorized: You are not authorized to accept bookings for this chef profile.';
    END IF;
  END IF;

  v_new_service_fee := COALESCE(p_revised_service_fee, v_booking.chef_service_fee);
  v_new_duration := COALESCE(p_revised_duration, v_booking.expected_duration_hours);
  v_subtotal := v_new_service_fee + v_booking.ingredient_fee + COALESCE(p_additional_charges, 0);
  v_platform_fee := ROUND(v_subtotal * 0.10, 2);
  v_total_amount := v_subtotal + v_platform_fee;
  v_deposit := ROUND(v_total_amount * 0.50, 2);

  UPDATE public.bookings
  SET status = 'accepted',
      chef_service_fee = v_new_service_fee,
      expected_duration_hours = v_new_duration,
      platform_fee = v_platform_fee,
      total_amount = v_total_amount,
      advance_deposit_required = v_deposit,
      chef_quotation_notes = COALESCE(p_quotation_notes, v_booking.chef_quotation_notes),
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- Send notification to customer
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
    'Quotation Accepted #' || v_booking.booking_number,
    v_booking.chef_name || ' accepted your booking request! Total: ₹' || v_total_amount || '. Advance deposit is required to confirm.',
    'booking_accepted',
    v_booking.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'accepted',
    'total_amount', v_total_amount,
    'advance_deposit_required', v_deposit
  );
END;
$$;

-- 5. Atomic RPC: Submit Booking Review (Guarantees completion & prevents duplicate reviews)
CREATE OR REPLACE FUNCTION public.submit_booking_review(
  p_booking_id UUID,
  p_rating SMALLINT,
  p_comment TEXT,
  p_food_taste_rating SMALLINT DEFAULT 5,
  p_cleanliness_rating SMALLINT DEFAULT 5,
  p_punctuality_rating SMALLINT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_review_id UUID;
  v_avg_rating NUMERIC(3, 2);
  v_review_count INT;
BEGIN
  -- 1. Fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  -- 2. Verify booking is completed
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for completed bookings (current status: %).', v_booking.status;
  END IF;

  -- 3. Verify user is the customer who placed the booking
  IF v_caller_id IS NOT NULL AND v_booking.customer_id != v_caller_id AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only the customer who booked this service can submit a review.';
  END IF;

  -- 4. Verify no duplicate review
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for booking %.', v_booking.booking_number;
  END IF;

  -- 5. Insert review
  INSERT INTO public.reviews (
    booking_id,
    customer_id,
    chef_id,
    customer_name,
    rating,
    comment,
    food_taste_rating,
    cleanliness_rating,
    punctuality_rating
  ) VALUES (
    p_booking_id,
    v_booking.customer_id,
    v_booking.chef_id,
    v_booking.customer_name,
    p_rating,
    p_comment,
    p_food_taste_rating,
    p_cleanliness_rating,
    p_punctuality_rating
  )
  RETURNING id INTO v_review_id;

  -- 6. Recalculate chef rating and review count
  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)::int
  INTO v_avg_rating, v_review_count
  FROM public.reviews
  WHERE chef_id = v_booking.chef_id;

  UPDATE public.chef_profiles
  SET rating = v_avg_rating,
      review_count = v_review_count,
      updated_at = NOW()
  WHERE id = v_booking.chef_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'new_chef_rating', v_avg_rating,
    'new_review_count', v_review_count
  );
END;
$$;

-- 6. Granular Row Level Security (RLS) Policies
-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    -- Cannot escalate own role unless already admin
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- Bookings Granular Policies
DROP POLICY IF EXISTS "Users can view related bookings" ON public.bookings;
CREATE POLICY "Users can view related bookings" ON public.bookings
  FOR SELECT USING (
    customer_id = auth.uid()
    OR chef_id = public.get_my_chef_id(auth.uid())
    OR public.is_admin(auth.uid())
    OR auth.uid() IS NULL -- Fallback for demo preview
  );

DROP POLICY IF EXISTS "Chefs and customers can update booking status" ON public.bookings;
CREATE POLICY "Chefs and customers can update booking status" ON public.bookings
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR chef_id = public.get_my_chef_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Reviews Granular Policies
DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    (customer_id = auth.uid() OR public.is_admin(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND status = 'completed'
    )
  );

-- 7. Add Tables to Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
