-- ==============================================================================
-- ChefConnect: Migration 000004 - Production App Compatibility & Security Patch
-- Fully idempotent, non-recursive RLS, strict auth checks, zero search_path exposure
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CHEF AVAILABILITY FIXES (Safe Deduplication & Non-Breaking Constraint)
-- ------------------------------------------------------------------------------
-- Add missing day_of_week column required by AvailabilityCalendar.tsx
ALTER TABLE public.chef_availability 
ADD COLUMN IF NOT EXISTS day_of_week SMALLINT;

-- Safely deduplicate any existing conflicting records before creating unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_chef_availability_date'
  ) THEN
    -- If duplicate (chef_id, date) rows exist, retain only the most recently created row
    DELETE FROM public.chef_availability ca1
    WHERE ca1.id NOT IN (
      SELECT DISTINCT ON (ca2.chef_id, ca2.date) ca2.id
      FROM public.chef_availability ca2
      ORDER BY ca2.chef_id, ca2.date, ca2.created_at DESC
    );

    ALTER TABLE public.chef_availability 
    ADD CONSTRAINT unique_chef_availability_date UNIQUE (chef_id, date);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HARDENED SECURITY DEFINER RPCs (Strict Authentication & Safe Search Path)
-- ------------------------------------------------------------------------------

-- Helper: Check if a user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
$$;

-- Helper: Retrieve chef_id linked to user's profile
CREATE OR REPLACE FUNCTION public.get_my_chef_id(user_profile_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.chef_profiles
  WHERE profile_id = user_profile_id
  LIMIT 1;
$$;

-- Atomic RPC: Chef Accept Booking (Strict Auth Guard & Row-Level Lock)
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_caller_chef_id UUID;
  v_new_service_fee NUMERIC;
  v_new_duration NUMERIC;
  v_subtotal NUMERIC;
  v_platform_fee NUMERIC;
  v_total_amount NUMERIC;
  v_deposit NUMERIC;
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

  -- 3. Verify status
  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot accept booking: Current status is "%", expected "pending".', v_booking.status;
  END IF;

  -- 4. Verify Authorization: Must be assigned chef or platform admin
  v_caller_chef_id := public.get_my_chef_id(v_caller_id);
  IF NOT public.is_admin(v_caller_id) AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
    RAISE EXCEPTION 'Unauthorized: You are not authorized to accept bookings for this chef profile.';
  END IF;

  -- 5. Calculate revised financials
  v_new_service_fee := COALESCE(p_revised_service_fee, v_booking.chef_service_fee);
  v_new_duration := COALESCE(p_revised_duration, v_booking.expected_duration_hours);
  v_subtotal := v_new_service_fee + v_booking.ingredient_fee + COALESCE(p_additional_charges, 0);
  v_platform_fee := ROUND(v_subtotal * 0.10, 2);
  v_total_amount := v_subtotal + v_platform_fee;
  v_deposit := ROUND(v_total_amount * 0.50, 2);

  -- 6. Update booking
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

  -- 7. Insert customer notification
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

-- Atomic RPC: Submit Booking Review (Strict Auth & Verification Before Changes)
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_review_id UUID;
  v_avg_rating NUMERIC(3, 2);
  v_review_count INT;
BEGIN
  -- 1. Strict Authentication Check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  -- 2. Fetch booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  -- 3. Verify booking completion
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for completed bookings (current status: "%").', v_booking.status;
  END IF;

  -- 4. Verify Ownership: Must be the customer who booked, or platform admin
  IF v_booking.customer_id != v_caller_id AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only the customer who placed this booking can submit a review.';
  END IF;

  -- 5. Prevent Duplicate Reviews
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for booking %.', v_booking.booking_number;
  END IF;

  -- 6. Insert review
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

  -- 7. Recalculate chef rating and update chef_profiles
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

-- ------------------------------------------------------------------------------
-- 3. FUNCTION EXECUTE PERMISSIONS
-- ------------------------------------------------------------------------------
-- Revoke execution from public/anon for sensitive operations
REVOKE ALL ON FUNCTION public.accept_booking_securely FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_booking_securely TO authenticated;

REVOKE ALL ON FUNCTION public.submit_booking_review FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_review TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_chef_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_chef_id TO authenticated;

-- is_admin can be inspected by both authenticated and client checks
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. SUPPORT TICKETS SCHEMA & NON-RECURSIVE RLS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('booking', 'refund', 'chef_behavior', 'billing', 'general')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- SELECT: Customers and chefs see only their own tickets; admins see all
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- INSERT: Authenticated users can only create tickets under their own identity
DROP POLICY IF EXISTS "Authenticated users can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users create own support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      customer_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  );

-- UPDATE: Exclusively administrators (No self-referencing subqueries; prevents infinite recursion)
DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users and admins update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets" ON public.support_tickets
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  ) WITH CHECK (
    public.is_admin(auth.uid())
  );

-- DELETE: Exclusively administrators
DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins delete support tickets" ON public.support_tickets;
CREATE POLICY "Admins can delete support tickets" ON public.support_tickets
  FOR DELETE USING (
    public.is_admin(auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 5. TRIGGER-BASED CHEF STATUS PROTECTION (NO RLS RECURSION)
-- ------------------------------------------------------------------------------
-- Trigger intercepts any attempt to modify status; raises exception if caller is not admin
CREATE OR REPLACE FUNCTION public.protect_chef_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify chef approval status (current status: %, requested: %).', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_chef_status ON public.chef_profiles;
CREATE TRIGGER trg_protect_chef_status
  BEFORE UPDATE ON public.chef_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_chef_status_escalation();

-- Clean up permissive UPDATE policy from Migration 000000
DROP POLICY IF EXISTS "Chefs can update own chef profile" ON public.chef_profiles;
DROP POLICY IF EXISTS "Chefs update own profile" ON public.chef_profiles;
CREATE POLICY "Chefs can update own chef profile" ON public.chef_profiles
  FOR UPDATE USING (
    profile_id = auth.uid() OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid() OR public.is_admin(auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 6. SECURE AUTH REGISTRATION TRIGGER (ANTI-PRIVILEGE ESCALATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  -- Strict sanitize: Metadata can NEVER grant 'admin' status
  IF LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer')) = 'chef' THEN
    v_role := 'chef';
  ELSE
    v_role := 'customer'; -- Default all others strictly to 'customer'
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  v_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone'), '');

  -- Insert profile record safely
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    email,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_role,
    v_full_name,
    new.email,
    v_phone,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- If registering as chef, auto-create chef_profile with 'pending' status
  IF v_role = 'chef' THEN
    INSERT INTO public.chef_profiles (
      profile_id,
      full_name,
      email,
      phone,
      status, -- Verified column name is 'status'
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      v_full_name,
      new.email,
      COALESCE(v_phone, ''),
      'pending', -- Enforce pending status requiring administrative review
      NOW(),
      NOW()
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 7. REALTIME PUBLICATION CONFIGURATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'chef_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. COMPATIBILITY COLUMNS & SAFE VIEW REFRESH
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE public.booking_items 
ADD COLUMN IF NOT EXISTS food_type TEXT,
ADD COLUMN IF NOT EXISTS estimated_cost_per_unit NUMERIC(10, 2);

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Drop and recreate view to expose new payment columns without column mismatch errors
DROP VIEW IF EXISTS public.booking_payments;
CREATE VIEW public.booking_payments AS 
SELECT * FROM public.payments;

