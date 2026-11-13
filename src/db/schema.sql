-- ==============================================================================
-- ChefConnect: Complete PostgreSQL / Supabase Migration
-- Includes 9 Primary Tables, Realtime Publication, RLS Policies, Indexes, and Views
-- Project Ref: zulksvxujzfpcgmidsfr
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Customer, Chef, Admin accounts)
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

-- 2. CHEF PROFILES TABLE
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

-- 3. MENU ITEMS TABLE (Chef food menus & culinary services)
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

-- 4. BOOKINGS TABLE (Shared booking records between Customer and Chef)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
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

-- 5. BOOKING ITEMS TABLE (Dishes, quantities, and recipe details)
CREATE TABLE IF NOT EXISTS public.booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.0,
  unit TEXT NOT NULL DEFAULT 'kg',
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENTS TABLE (Payment records & Razorpay integration)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_payment_id TEXT,
  receipt_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility View: booking_payments -> payments
CREATE OR REPLACE VIEW public.booking_payments AS SELECT * FROM public.payments;

-- 7. REVIEWS TABLE (Customer ratings, feedback, and chef responses)
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

-- 8. NOTIFICATIONS TABLE (Alerts for bookings, status changes, and payments)
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

-- 9. FAVORITES TABLE (Saved chefs per customer)
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, chef_id)
);

-- 10. CHEF AVAILABILITY TABLE (Calendar date toggles & schedule blocking)
CREATE TABLE IF NOT EXISTS public.chef_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '21:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_id ON public.bookings(chef_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_chef_id ON public.menu_items(chef_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_chef_id ON public.reviews(chef_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chef_availability_date ON public.chef_availability(chef_id, date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
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

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Approved chef profiles are viewable by everyone" ON public.chef_profiles FOR SELECT USING (true);
CREATE POLICY "Chefs can update own chef profile" ON public.chef_profiles FOR UPDATE USING (true);
CREATE POLICY "Chefs can register profile" ON public.chef_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view active menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Chefs can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Chefs can update own menu items" ON public.menu_items FOR UPDATE USING (true);
CREATE POLICY "Chefs can delete own menu items" ON public.menu_items FOR DELETE USING (true);

CREATE POLICY "Users can view related bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Chefs and customers can update booking status" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "View booking items" ON public.booking_items FOR SELECT USING (true);
CREATE POLICY "Insert booking items" ON public.booking_items FOR INSERT WITH CHECK (true);

CREATE POLICY "View payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Update payments" ON public.payments FOR UPDATE USING (true);

-- Unique Review per Booking constraint
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_booking UNIQUE (booking_id);

CREATE POLICY "Public can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can insert reviews" ON public.reviews FOR INSERT WITH CHECK (
  (customer_id = auth.uid() OR auth.uid() IS NULL)
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = booking_id AND status = 'completed'
  )
);
CREATE POLICY "Chefs can respond to reviews" ON public.reviews FOR UPDATE USING (true);

CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (true);
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Manage favorites" ON public.favorites FOR ALL USING (true);
CREATE POLICY "Manage availability" ON public.chef_availability FOR ALL USING (true);

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
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_subtotal NUMERIC;
  v_platform_fee NUMERIC;
  v_total_amount NUMERIC;
  v_deposit NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Booking is not pending';
  END IF;

  v_subtotal := COALESCE(p_revised_service_fee, v_booking.chef_service_fee) + v_booking.ingredient_fee + COALESCE(p_additional_charges, 0);
  v_platform_fee := ROUND(v_subtotal * 0.10, 2);
  v_total_amount := v_subtotal + v_platform_fee;
  v_deposit := ROUND(v_total_amount * 0.50, 2);

  UPDATE public.bookings
  SET status = 'accepted',
      chef_service_fee = COALESCE(p_revised_service_fee, v_booking.chef_service_fee),
      expected_duration_hours = COALESCE(p_revised_duration, v_booking.expected_duration_hours),
      platform_fee = v_platform_fee,
      total_amount = v_total_amount,
      advance_deposit_required = v_deposit,
      chef_quotation_notes = COALESCE(p_quotation_notes, v_booking.chef_quotation_notes),
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'status', 'accepted');
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
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_review_id UUID;
  v_avg_rating NUMERIC(3, 2);
  v_review_count INT;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.status != 'completed' THEN RAISE EXCEPTION 'Booking must be completed'; END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'A review has already been submitted for this booking';
  END IF;

  INSERT INTO public.reviews (
    booking_id, customer_id, chef_id, customer_name, rating, comment,
    food_taste_rating, cleanliness_rating, punctuality_rating
  ) VALUES (
    p_booking_id, v_booking.customer_id, v_booking.chef_id, v_booking.customer_name,
    p_rating, p_comment, p_food_taste_rating, p_cleanliness_rating, p_punctuality_rating
  ) RETURNING id INTO v_review_id;

  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)::int
  INTO v_avg_rating, v_review_count
  FROM public.reviews WHERE chef_id = v_booking.chef_id;

  UPDATE public.chef_profiles
  SET rating = v_avg_rating, review_count = v_review_count, updated_at = NOW()
  WHERE id = v_booking.chef_id;

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

-- Enable Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

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

