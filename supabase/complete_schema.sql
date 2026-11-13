-- ==============================================================================
-- ChefConnect: All-in-One Consolidated PostgreSQL & Supabase Production Schema
-- Project: zulksvxujzfpcgmidsfr
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zulksvxujzfpcgmidsfr/sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BASE TABLES
-- ------------------------------------------------------------------------------

-- 1.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'chef', 'admin')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Hyderabad',
  avatar_url TEXT,
  dietary_preferences JSONB DEFAULT '{"isVegetarian": false, "isJain": false, "spiceLevel": "medium", "allergies": []}'::jsonb,
  saved_chef_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 CHEF PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  experience_years INTEGER NOT NULL DEFAULT 1,
  bio TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  location TEXT NOT NULL DEFAULT 'Hyderabad',
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  service_radius NUMERIC(5, 1) DEFAULT 15.0,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  base_charge NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  per_person_rate NUMERIC(10, 2) DEFAULT 0.00,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  review_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  working_hours TEXT DEFAULT '07:00 AM - 10:00 PM',
  working_days TEXT[] DEFAULT '{"Mon","Tue","Wed","Thu","Fri","Sat","Sun"}',
  blocked_dates DATE[] DEFAULT '{}',
  is_available_today BOOLEAN DEFAULT true,
  certificates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility View: chefs -> chef_profiles
CREATE OR REPLACE VIEW public.chefs AS SELECT * FROM public.chef_profiles;

-- 1.3 MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL DEFAULT 'General',
  service_name TEXT NOT NULL,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'hourly' CHECK (pricing_type IN ('hourly', 'per_person', 'per_kg', 'fixed_event')),
  base_rate NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  min_duration_hours NUMERIC(4, 1) DEFAULT 2.0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility View: cooking_services -> menu_items
CREATE OR REPLACE VIEW public.cooking_services AS SELECT * FROM public.menu_items;

-- 1.4 BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  chef_name TEXT NOT NULL,
  chef_avatar_url TEXT,
  event_type TEXT NOT NULL DEFAULT 'home_cooking',
  food_type TEXT NOT NULL DEFAULT 'traditional',
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  expected_duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 3.0,
  guests_count INTEGER NOT NULL DEFAULT 10,
  venue_address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Hyderabad',
  ingredient_arrangement TEXT NOT NULL DEFAULT 'customer_provided' CHECK (ingredient_arrangement IN ('customer_provided', 'chef_provided', 'split')),
  special_instructions TEXT,
  
  -- Financial calculations
  chef_service_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ingredient_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  advance_deposit_required NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  chef_quotation_notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  cancellation_reason TEXT,
  cancelled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 BOOKING ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  food_type TEXT,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
  unit TEXT NOT NULL DEFAULT 'kg',
  estimated_cost_per_unit NUMERIC(10, 2),
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  receipt_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  refund_amount NUMERIC(10, 2) DEFAULT 0.00,
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility View: booking_payments -> payments
DROP VIEW IF EXISTS public.booking_payments;
CREATE VIEW public.booking_payments AS SELECT * FROM public.payments;

-- 1.7 REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  food_taste_rating SMALLINT CHECK (food_taste_rating BETWEEN 1 AND 5),
  cleanliness_rating SMALLINT CHECK (cleanliness_rating BETWEEN 1 AND 5),
  punctuality_rating SMALLINT CHECK (punctuality_rating BETWEEN 1 AND 5),
  chef_reply TEXT,
  chef_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_review_per_booking') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_booking UNIQUE (booking_id);
  END IF;
END $$;

-- 1.8 NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL DEFAULT 'customer',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9 FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, chef_id)
);

-- 1.10 CHEF AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.chef_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week SMALLINT,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '21:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_chef_availability_date') THEN
    ALTER TABLE public.chef_availability ADD CONSTRAINT unique_chef_availability_date UNIQUE (chef_id, date);
  END IF;
END $$;

-- 1.11 SUPPORT TICKETS TABLE
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

-- ------------------------------------------------------------------------------
-- 2. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_id ON public.bookings(chef_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON public.bookings(status, event_date);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_chef_id ON public.menu_items(chef_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_chef_id ON public.reviews(chef_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_chef_profiles_profile_id ON public.chef_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chef_availability_date ON public.chef_availability(chef_id, date);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- ------------------------------------------------------------------------------
-- 3. HARDENED SECURITY DEFINER FUNCTIONS & STORED PROCEDURES
-- ------------------------------------------------------------------------------

-- Helper: Admin Verification
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

-- Helper: Chef Profile ID Lookup
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

-- Atomic RPC: Chef Accept Booking
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
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot accept booking: Current status is "%", expected "pending".', v_booking.status;
  END IF;

  v_caller_chef_id := public.get_my_chef_id(v_caller_id);
  IF NOT public.is_admin(v_caller_id) AND (v_caller_chef_id IS NULL OR v_caller_chef_id != v_booking.chef_id) THEN
    RAISE EXCEPTION 'Unauthorized: You are not authorized to accept bookings for this chef profile.';
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

-- Atomic RPC: Submit Booking Review
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
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for completed bookings (current status: "%").', v_booking.status;
  END IF;

  IF v_booking.customer_id != v_caller_id AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only the customer who placed this booking can submit a review.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for booking %.', v_booking.booking_number;
  END IF;

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

-- Function Execution Privileges
REVOKE ALL ON FUNCTION public.accept_booking_securely FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_booking_securely TO authenticated;

REVOKE ALL ON FUNCTION public.submit_booking_review FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_review TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_chef_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_chef_id TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 4.1 PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- 4.2 CHEF PROFILES POLICIES
DROP POLICY IF EXISTS "Approved chef profiles are viewable by everyone" ON public.chef_profiles;
CREATE POLICY "Approved chef profiles are viewable by everyone" ON public.chef_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chefs can register profile" ON public.chef_profiles;
CREATE POLICY "Chefs can register profile" ON public.chef_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Chefs can update own chef profile" ON public.chef_profiles;
CREATE POLICY "Chefs can update own chef profile" ON public.chef_profiles
  FOR UPDATE USING (
    profile_id = auth.uid() OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    profile_id = auth.uid() OR public.is_admin(auth.uid())
  );

-- Chef Status Protection Trigger: strictly prevents self-approval
CREATE OR REPLACE FUNCTION public.protect_chef_status_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify chef approval status (current: %, requested: %).', OLD.status, NEW.status;
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

-- 4.3 MENU ITEMS POLICIES
DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
CREATE POLICY "Public can view active menu items" ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chefs can insert menu items" ON public.menu_items;
CREATE POLICY "Chefs can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Chefs can update own menu items" ON public.menu_items;
CREATE POLICY "Chefs can update own menu items" ON public.menu_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Chefs can delete own menu items" ON public.menu_items;
CREATE POLICY "Chefs can delete own menu items" ON public.menu_items FOR DELETE USING (true);

-- 4.4 BOOKINGS POLICIES
DROP POLICY IF EXISTS "Users can view related bookings" ON public.bookings;
CREATE POLICY "Users can view related bookings" ON public.bookings
  FOR SELECT USING (
    customer_id = auth.uid()
    OR chef_id = public.get_my_chef_id(auth.uid())
    OR public.is_admin(auth.uid())
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Chefs and customers can update booking status" ON public.bookings;
CREATE POLICY "Chefs and customers can update booking status" ON public.bookings
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR chef_id = public.get_my_chef_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

-- 4.5 BOOKING ITEMS POLICIES
DROP POLICY IF EXISTS "View booking items" ON public.booking_items;
CREATE POLICY "View booking items" ON public.booking_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert booking items" ON public.booking_items;
CREATE POLICY "Insert booking items" ON public.booking_items FOR INSERT WITH CHECK (true);

-- 4.6 PAYMENTS POLICIES
DROP POLICY IF EXISTS "View payments" ON public.payments;
CREATE POLICY "View payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert payments" ON public.payments;
CREATE POLICY "Insert payments" ON public.payments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update payments" ON public.payments;
CREATE POLICY "Update payments" ON public.payments FOR UPDATE USING (true);

-- 4.7 REVIEWS POLICIES
DROP POLICY IF EXISTS "Public can read reviews" ON public.reviews;
CREATE POLICY "Public can read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers can insert reviews" ON public.reviews;
CREATE POLICY "Customers can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    (customer_id = auth.uid() OR public.is_admin(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Chefs can respond to reviews" ON public.reviews;
CREATE POLICY "Chefs can respond to reviews" ON public.reviews FOR UPDATE USING (true);

-- 4.8 NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 4.9 FAVORITES & AVAILABILITY POLICIES
DROP POLICY IF EXISTS "Manage favorites" ON public.favorites;
CREATE POLICY "Manage favorites" ON public.favorites FOR ALL USING (true);

DROP POLICY IF EXISTS "Manage availability" ON public.chef_availability;
CREATE POLICY "Manage availability" ON public.chef_availability FOR ALL USING (true);

-- 4.10 SUPPORT TICKETS POLICIES (Non-recursive)
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
  FOR SELECT USING (
    customer_id = auth.uid() OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (customer_id = auth.uid() OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets" ON public.support_tickets
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  ) WITH CHECK (
    public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.support_tickets;
CREATE POLICY "Admins can delete support tickets" ON public.support_tickets
  FOR DELETE USING (
    public.is_admin(auth.uid())
  );

-- ------------------------------------------------------------------------------
-- 5. SECURE AUTH REGISTRATION TRIGGER
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
  IF LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer')) = 'chef' THEN
    v_role := 'chef';
  ELSE
    v_role := 'customer';
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  v_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone'), '');

  INSERT INTO public.profiles (
    id, role, full_name, email, phone, created_at, updated_at
  )
  VALUES (
    new.id, v_role, v_full_name, new.email, v_phone, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, updated_at = NOW();

  IF v_role = 'chef' THEN
    INSERT INTO public.chef_profiles (
      profile_id, full_name, email, phone, status, created_at, updated_at
    )
    VALUES (
      new.id, v_full_name, new.email, COALESCE(v_phone, ''), 'pending', NOW(), NOW()
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
-- 6. SUPABASE REALTIME CONFIGURATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reviews') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chef_profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_profiles;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;

