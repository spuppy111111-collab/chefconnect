-- ==============================================================================
-- ChefConnect / BookMyChef Migration: 20261113000000_upi_qr_payments_and_settlements.sql
-- Description: Static UPI QR Payment System with Secure Manual Admin Verification
-- - Bank / UPI QR payment model: Customers pay BookMyChef merchant VPA (6281376739@fam)
-- - Customers submit UTR / reference number (initial status: payment_verification_pending)
-- - Strictly prohibits duplicate UTR / transaction references across all bookings
-- - Authoritative Admin verification with bank audit trail
-- - Confirmed 10% platform commission and 90% chef payable post-service settlements
-- - Dedicated private payment receipts storage bucket with authenticated RLS
-- - Safe schema migration compatible with existing tables (payments.status & bookings.payment_status)
-- ==============================================================================

-- 1. PAYMENTS TABLE (Fresh creation if absent)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT NOT NULL DEFAULT 'upi_qr' CHECK (payment_method IN ('upi_qr', 'razorpay', 'cash_on_completion')),
  payment_reference TEXT, -- UTR or Bank Reference
  receipt_number TEXT,    -- Optional sequential receipt identifier
  receipt_path TEXT,      -- Optional receipt screenshot storage path
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'payment_verification_pending', 'paid', 'rejected', 'failed', 'refunded', 'cancelled')),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist on public.payments for existing databases
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='chef_id') THEN
    ALTER TABLE public.payments ADD COLUMN chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='payment_method') THEN
    ALTER TABLE public.payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'upi_qr';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='payment_reference') THEN
    ALTER TABLE public.payments ADD COLUMN payment_reference TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='receipt_path') THEN
    ALTER TABLE public.payments ADD COLUMN receipt_path TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='notes') THEN
    ALTER TABLE public.payments ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='verified_by') THEN
    ALTER TABLE public.payments ADD COLUMN verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='verified_at') THEN
    ALTER TABLE public.payments ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='rejection_reason') THEN
    ALTER TABLE public.payments ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='updated_at') THEN
    ALTER TABLE public.payments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  -- If receipt_number was created as NOT NULL without default, relax NOT NULL so UPI payments don't fail
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payments' AND column_name='receipt_number' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN receipt_number DROP NOT NULL;
  END IF;
END $$;

-- 2. WIDEN STATUS CHECK CONSTRAINTS SAFELY
DO $$
BEGIN
  -- 1. payments.status check constraint update
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
  ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
    CHECK (status IN ('pending', 'payment_verification_pending', 'paid', 'rejected', 'failed', 'refunded', 'cancelled'));

  -- 2. bookings.payment_status check constraint update
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check 
    CHECK (payment_status IN ('pending', 'payment_verification_pending', 'paid', 'rejected', 'failed', 'refunded', 'cancelled'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Notice: Error adjusting check constraints: %', SQLERRM;
END $$;

-- 3. UNIQUE INDEX ON PAYMENT_REFERENCE (UTR)
-- Strictly prevents duplicate UTR / transaction references across all bookings
DROP INDEX IF EXISTS public.idx_unique_active_utr;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_payment_reference 
ON public.payments (LOWER(TRIM(payment_reference))) 
WHERE payment_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 4. CHEF SETTLEMENTS TABLE (CONFIRMED 10% PLATFORM COMMISSION)
CREATE TABLE IF NOT EXISTS public.chef_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10, 2) NOT NULL CHECK (gross_amount >= 0),
  commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (commission_amount >= 0),
  platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (platform_commission >= 0),
  chef_payable_amount NUMERIC(10, 2) NOT NULL CHECK (chef_payable_amount >= 0),
  settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'on_hold', 'cancelled')),
  payout_reference TEXT, -- Bank transfer UTR / IMPS reference
  payout_date TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_settlement_per_booking UNIQUE (booking_id)
);

-- Ensure settlement columns exist if table was already created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chef_settlements' AND column_name='commission_percentage') THEN
    ALTER TABLE public.chef_settlements ADD COLUMN commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chef_settlements' AND column_name='commission_amount') THEN
    ALTER TABLE public.chef_settlements ADD COLUMN commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chef_settlements' AND column_name='verified_by') THEN
    ALTER TABLE public.chef_settlements ADD COLUMN verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='chef_settlements' AND constraint_name='unique_settlement_per_booking') THEN
    ALTER TABLE public.chef_settlements ADD CONSTRAINT unique_settlement_per_booking UNIQUE (booking_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settlements_chef_id ON public.chef_settlements(chef_id);
CREATE INDEX IF NOT EXISTS idx_settlements_booking_id ON public.chef_settlements(booking_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.chef_settlements(settlement_status);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_settlements ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own payments
DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = customer_id OR public.is_admin());

-- Customers can submit payment verification request
-- Enforces that status is set to pending verification on insert
DROP POLICY IF EXISTS "Customers can insert own payment verification" ON public.payments;
CREATE POLICY "Customers can insert own payment verification" 
ON public.payments FOR INSERT 
WITH CHECK (
  auth.uid() = customer_id AND 
  status = 'payment_verification_pending'
);

-- Only Admins can update payment records
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
CREATE POLICY "Admins can update payments" 
ON public.payments FOR UPDATE 
USING (public.is_admin());

-- Chefs can view their settlements
DROP POLICY IF EXISTS "Chefs can view own settlements" ON public.chef_settlements;
CREATE POLICY "Chefs can view own settlements" 
ON public.chef_settlements FOR SELECT 
USING (chef_id = public.get_my_chef_id() OR public.is_admin());

-- Only Admins can manage settlements
DROP POLICY IF EXISTS "Admins can manage settlements" ON public.chef_settlements;
CREATE POLICY "Admins can manage settlements" 
ON public.chef_settlements FOR ALL 
USING (public.is_admin());

-- 6. ATOMIC RPC: CUSTOMER SUBMIT UPI PAYMENT SECURELY
-- Validates caller ownership, derives amount strictly from database, locks row, and sets verification pending
CREATE OR REPLACE FUNCTION public.submit_upi_payment_securely(
  p_booking_id UUID,
  p_payment_reference TEXT,
  p_receipt_path TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_payment_id UUID;
  v_payable_amount NUMERIC(10, 2);
  v_clean_utr TEXT;
BEGIN
  -- 1. Authorization check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_clean_utr := LOWER(TRIM(p_payment_reference));
  IF v_clean_utr IS NULL OR LENGTH(v_clean_utr) < 6 THEN
    RAISE EXCEPTION 'A valid UPI reference / UTR number (at least 6 characters) is required.';
  END IF;

  -- 2. Lock and retrieve trusted booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  -- 3. Verify customer owns this booking (or is admin)
  IF v_booking.customer_id != v_caller_id AND NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: You can only submit payments for your own bookings.';
  END IF;

  -- 4. Verify booking is in quotation accepted state awaiting payment
  IF v_booking.status != 'accepted' THEN
    RAISE EXCEPTION 'Payment can only be submitted for bookings in accepted status (current status: %).', v_booking.status;
  END IF;

  -- 5. Check if UTR is already in use by ANY other booking
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE LOWER(TRIM(payment_reference)) = v_clean_utr
      AND booking_id != p_booking_id
  ) THEN
    RAISE EXCEPTION 'This transaction reference (UTR) has already been submitted for another booking.';
  END IF;

  -- 6. Derive trusted payment amount from booking record
  v_payable_amount := CASE 
    WHEN v_booking.advance_deposit_required > 0 THEN v_booking.advance_deposit_required 
    ELSE v_booking.total_amount 
  END;

  -- 7. Upsert payment record with status = 'payment_verification_pending'
  -- Guaranteed: verified_by is NULL, paid_at is NULL, amount is trusted
  INSERT INTO public.payments (
    booking_id,
    customer_id,
    chef_id,
    amount,
    currency,
    payment_method,
    payment_reference,
    receipt_path,
    notes,
    status,
    verified_by,
    verified_at,
    rejection_reason,
    updated_at
  ) VALUES (
    v_booking.id,
    v_booking.customer_id,
    v_booking.chef_id,
    v_payable_amount,
    'INR',
    'upi_qr',
    TRIM(p_payment_reference),
    p_receipt_path,
    p_customer_notes,
    'payment_verification_pending',
    NULL,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    payment_method = 'upi_qr',
    payment_reference = EXCLUDED.payment_reference,
    receipt_path = COALESCE(EXCLUDED.receipt_path, public.payments.receipt_path),
    notes = COALESCE(EXCLUDED.notes, public.payments.notes),
    status = 'payment_verification_pending',
    rejection_reason = NULL,
    verified_by = NULL,
    verified_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_payment_id;

  -- 8. Update booking payment_status to 'payment_verification_pending' (status remains 'accepted')
  UPDATE public.bookings
  SET payment_status = 'payment_verification_pending',
      updated_at = NOW()
  WHERE id = v_booking.id;

  -- 9. Notify Admin of new submission for verification
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    title,
    message,
    type,
    booking_id
  )
  SELECT 
    p.id,
    'admin',
    'New UPI Payment Verification: #' || v_booking.booking_number,
    'Customer ' || v_booking.customer_name || ' submitted UTR ' || TRIM(p_payment_reference) || ' for ₹' || v_payable_amount || '. Please verify bank credit.',
    'system',
    v_booking.id
  FROM public.profiles p
  WHERE p.role = 'admin';

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'booking_id', v_booking.id,
    'status', 'payment_verification_pending',
    'amount', v_payable_amount,
    'payment_reference', TRIM(p_payment_reference)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_upi_payment_securely(UUID, TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_upi_payment_securely(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 7. ATOMIC RPC: ADMIN VERIFY UPI PAYMENT
CREATE OR REPLACE FUNCTION public.verify_upi_payment_securely(
  p_payment_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_commission_pct NUMERIC := 10.00; -- Officially confirmed by business owner
  v_gross_amount NUMERIC;
  v_commission_amount NUMERIC;
  v_chef_payable NUMERIC;
BEGIN
  -- 1. Strict Authorization check
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can verify and approve payments.';
  END IF;

  -- 2. Lock payment row to prevent race conditions
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found.', p_payment_id;
  END IF;

  IF v_payment.status != 'payment_verification_pending' THEN
    RAISE EXCEPTION 'Payment % is not in pending verification status (current status: %).', p_payment_id, v_payment.status;
  END IF;

  -- 3. Lock booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_payment.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated booking % not found.', v_payment.booking_id;
  END IF;

  -- 4. Update Payment record (payments.status)
  UPDATE public.payments
  SET status = 'paid',
      verified_by = v_caller_id,
      verified_at = NOW(),
      rejection_reason = NULL,
      notes = COALESCE(p_admin_notes, notes),
      updated_at = NOW()
  WHERE id = p_payment_id;

  -- 5. Update Booking payment status (bookings.payment_status) and confirm booking
  UPDATE public.bookings
  SET payment_status = 'paid',
      status = 'confirmed',
      updated_at = NOW()
  WHERE id = v_booking.id;

  -- 6. Generate Chef Settlement Record (10% Platform Commission / 90% Chef Payable)
  v_gross_amount := v_booking.total_amount;
  v_commission_amount := ROUND(v_gross_amount * (v_commission_pct / 100.0), 2);
  v_chef_payable := v_gross_amount - v_commission_amount;

  INSERT INTO public.chef_settlements (
    booking_id,
    chef_id,
    gross_amount,
    commission_percentage,
    commission_amount,
    platform_commission,
    chef_payable_amount,
    settlement_status,
    notes
  ) VALUES (
    v_booking.id,
    v_booking.chef_id,
    v_gross_amount,
    v_commission_pct,
    v_commission_amount,
    v_commission_amount,
    v_chef_payable,
    'pending',
    'Generated upon Admin UPI payment verification (10% confirmed commission)'
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    gross_amount = EXCLUDED.gross_amount,
    commission_percentage = EXCLUDED.commission_percentage,
    commission_amount = EXCLUDED.commission_amount,
    platform_commission = EXCLUDED.platform_commission,
    chef_payable_amount = EXCLUDED.chef_payable_amount,
    settlement_status = CASE 
      WHEN public.chef_settlements.settlement_status = 'settled' THEN 'settled'
      ELSE 'pending'
    END,
    payout_reference = CASE 
      WHEN public.chef_settlements.settlement_status = 'settled' THEN public.chef_settlements.payout_reference
      ELSE NULL
    END,
    payout_date = CASE 
      WHEN public.chef_settlements.settlement_status = 'settled' THEN public.chef_settlements.payout_date
      ELSE NULL
    END,
    verified_by = CASE 
      WHEN public.chef_settlements.settlement_status = 'settled' THEN public.chef_settlements.verified_by
      ELSE NULL
    END,
    updated_at = NOW();

  -- 7. Notify Customer
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
    'Payment Verified! Booking #' || v_booking.booking_number || ' Confirmed',
    'Your UPI payment of ₹' || v_payment.amount || ' (UTR: ' || COALESCE(v_payment.payment_reference, 'N/A') || ') has been verified by BookMyChef. Your booking is confirmed!',
    'payment_received',
    v_booking.id
  );

  -- 8. Notify Chef
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    title,
    message,
    type,
    booking_id
  ) VALUES (
    (SELECT profile_id FROM public.chef_profiles WHERE id = v_booking.chef_id LIMIT 1),
    'chef',
    'Booking #' || v_booking.booking_number || ' Confirmed & Paid',
    'Advance payment verified for customer ' || v_booking.customer_name || '. Prepare for appointment on ' || v_booking.event_date || '.',
    'payment_received',
    v_booking.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'booking_id', v_booking.id,
    'status', 'paid',
    'verified_at', NOW()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_upi_payment_securely(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_upi_payment_securely(UUID, TEXT) TO authenticated;

-- 8. ATOMIC RPC: ADMIN REJECT UPI PAYMENT
CREATE OR REPLACE FUNCTION public.reject_upi_payment_securely(
  p_payment_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  -- 1. Strict Authorization check
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can reject payments.';
  END IF;

  IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
    RAISE EXCEPTION 'A non-empty rejection reason is required.';
  END IF;

  -- 2. Lock payment row
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found.', p_payment_id;
  END IF;

  IF v_payment.status = 'paid' THEN
    RAISE EXCEPTION 'Cannot reject an already verified and paid payment.';
  END IF;

  -- 3. Lock booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_payment.booking_id
  FOR UPDATE;

  -- 4. Update Payment record to rejected (payments.status)
  UPDATE public.payments
  SET status = 'rejected',
      rejection_reason = TRIM(p_rejection_reason),
      verified_by = v_caller_id,
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = p_payment_id;

  -- 5. Revert booking payment status to pending to permit customer resubmission (bookings.payment_status)
  IF v_booking.id IS NOT NULL THEN
    UPDATE public.bookings
    SET payment_status = 'pending',
        updated_at = NOW()
    WHERE id = v_booking.id;

    -- 6. Notify Customer with reason
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
      'Payment Verification Unsuccessful: #' || v_booking.booking_number,
      'Your payment reference (' || COALESCE(v_payment.payment_reference, 'N/A') || ') could not be verified: "' || TRIM(p_rejection_reason) || '". Please verify your bank statement and submit your payment details again.',
      'payment_received',
      v_booking.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'status', 'rejected',
    'rejection_reason', TRIM(p_rejection_reason)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_upi_payment_securely(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.reject_upi_payment_securely(UUID, TEXT) TO authenticated;

-- 9. ATOMIC RPC: ADMIN RECORD CHEF SETTLEMENT PAYOUT
CREATE OR REPLACE FUNCTION public.record_chef_settlement_payout_securely(
  p_settlement_id UUID,
  p_payout_reference TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_settlement public.chef_settlements%ROWTYPE;
BEGIN
  -- 1. Authorization check
  IF v_caller_id IS NULL OR NOT public.is_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can record chef payout settlements.';
  END IF;

  IF p_payout_reference IS NULL OR TRIM(p_payout_reference) = '' THEN
    RAISE EXCEPTION 'A valid bank payout reference (UTR / IMPS number) is required.';
  END IF;

  -- 2. Lock settlement row
  SELECT * INTO v_settlement
  FROM public.chef_settlements
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chef settlement % not found.', p_settlement_id;
  END IF;

  IF v_settlement.settlement_status = 'settled' THEN
    RAISE EXCEPTION 'Settlement % has already been marked as settled (payout reference: %).', p_settlement_id, v_settlement.payout_reference;
  END IF;

  IF v_settlement.settlement_status = 'cancelled' THEN
    RAISE EXCEPTION 'Settlement % has been cancelled and cannot be paid out.', p_settlement_id;
  END IF;

  -- 3. Update settlement
  UPDATE public.chef_settlements
  SET settlement_status = 'settled',
      payout_reference = TRIM(p_payout_reference),
      payout_date = NOW(),
      verified_by = v_caller_id,
      notes = COALESCE(p_admin_notes, notes),
      updated_at = NOW()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', p_settlement_id,
    'status', 'settled',
    'payout_reference', TRIM(p_payout_reference),
    'payout_date', NOW()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_chef_settlement_payout_securely(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.record_chef_settlement_payout_securely(UUID, TEXT, TEXT) TO authenticated;

-- 10. SECURE STORAGE BUCKET FOR PAYMENT RECEIPTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'payment_receipts',
      'payment_receipts',
      false, -- Strictly private
      5242880, -- 5 MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET 
      public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    -- Customer upload policy: isolated to payment_receipts/<auth.uid()>/...
    DROP POLICY IF EXISTS "Customers can upload own payment receipts" ON storage.objects;
    CREATE POLICY "Customers can upload own payment receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'payment_receipts' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );

    -- Customer read policy: own receipts or platform admin
    DROP POLICY IF EXISTS "Authenticated users view authorized receipts" ON storage.objects;
    CREATE POLICY "Authenticated users view authorized receipts"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'payment_receipts' AND
      ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );
  END IF;
END $$;

-- 11. REALTIME PUBLICATION VERIFICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chef_settlements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chef_settlements;
  END IF;
END $$;

-- 12. COMPATIBILITY VIEW SYNCHRONIZATION
CREATE OR REPLACE VIEW public.booking_payments AS 
SELECT * FROM public.payments;
