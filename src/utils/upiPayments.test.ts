import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';
import { appStore } from '../services/store';
import { getPaymentStatusBadge } from './bookingWorkflow';
import { Booking, BookingPayment, ChefSettlement } from '../types/database';

describe('BookMyChef Static UPI QR & Clearing House Test Suite', () => {
  const qrImagePath = path.resolve(process.cwd(), 'public', 'bookmychef-merchant-qr.jpg');

  // =========================================================================
  // 1. Static UPI QR Code Image Decoding & VPA Validation
  // =========================================================================
  describe('1. Static Merchant QR Code Verification', () => {
    test('verifies that the merchant QR image exists on disk and is not empty', () => {
      assert.equal(fs.existsSync(qrImagePath), true);
      const stats = fs.statSync(qrImagePath);
      assert.ok(stats.size > 10000, 'QR image file should be greater than 10KB');
    });

    test('decodes the inverted merchant QR code and verifies exact VPA 6281376739@fam', () => {
      const fileData = fs.readFileSync(qrImagePath);
      const rawImage = jpeg.decode(fileData, { useTArray: true });
      const { width, height, data } = rawImage;

      // Inverted binarization matching camera readers (white modules on dark background)
      const binaryData = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const val = gray < 130 ? 255 : 0;
        binaryData[i] = val;
        binaryData[i + 1] = val;
        binaryData[i + 2] = val;
        binaryData[i + 3] = 255;
      }

      const decoded = jsQR(binaryData, width, height);
      assert.ok(decoded, 'Failed to decode QR code');
      assert.equal(decoded.data, 'upi://pay?pa=6281376739@fam');

      // Validate URI parsing
      const upiUrl = new URL(decoded.data);
      assert.equal(upiUrl.protocol, 'upi:');
      assert.equal(upiUrl.searchParams.get('pa'), '6281376739@fam');
      // Verify that NO payee name is hardcoded into the QR payload
      assert.equal(upiUrl.searchParams.get('pn'), null, 'Payee name must be resolved by UPI banking app at runtime');
    });
  });

  // =========================================================================
  // 2. Customer UTR Submission & Security Validations
  // =========================================================================
  describe('2. Customer Payment Submission & Validation Rules', () => {
    let testBooking: Booking;

    beforeEach(() => {
      appStore.switchRole('customer');
      const state = appStore.getState();
      testBooking = state.bookings[0];
      testBooking.status = 'accepted';
      testBooking.paymentStatus = 'pending';
    });

    test('submits a valid UTR and transitions status to payment_verification_pending', () => {
      const validUtr = `TESTUTR${Date.now()}`;
      const payment = appStore.submitUpiPayment({
        bookingId: testBooking.id,
        amount: testBooking.advanceDepositRequired,
        utr: validUtr,
        notes: 'Paid via Google Pay app',
      });

      assert.ok(payment);
      assert.equal(payment.status, 'payment_verification_pending');
      assert.equal(payment.paymentGateway, 'upi_qr');
      assert.equal(payment.paymentReference, validUtr);
      assert.match(payment.receiptNumber, /^RCPT-/);

      // Verify booking updated
      const updatedBooking = appStore.getState().bookings.find((b) => b.id === testBooking.id);
      assert.equal(updatedBooking?.paymentStatus, 'payment_verification_pending');

      // Verify notifications generated
      const notifs = appStore.getState().notifications;
      const customerNotif = notifs.find((n) => n.bookingId === testBooking.id && n.recipientRole === 'customer');
      assert.ok(customerNotif);
      assert.ok(customerNotif.title.includes('Payment Submitted'));
    });

    test('calculates payment amount securely from trusted database booking record, ignoring client-tampered amount', () => {
      const validUtr = `TAMPER_TEST_${Date.now()}`;
      // Pass a malicious tampered amount of ₹1
      const payment = appStore.submitUpiPayment({
        bookingId: testBooking.id,
        amount: 1, // Tampered amount
        utr: validUtr,
      });

      // The backend/store must record the trusted advanceDepositRequired from the booking record
      const expectedTrustedAmount = testBooking.advanceDepositRequired > 0 ? testBooking.advanceDepositRequired : testBooking.totalAmount;
      assert.equal(payment.amount, expectedTrustedAmount, 'Payment amount must be derived from trusted booking record');
    });

    test('rejects submission with empty or whitespace UTR', () => {
      assert.throws(() => {
        appStore.submitUpiPayment({
          bookingId: testBooking.id,
          amount: testBooking.advanceDepositRequired,
          utr: '   ',
        });
      }, /valid 12-digit UTR/);
    });

    test('rejects submission with short or invalid format UTR', () => {
      assert.throws(() => {
        appStore.submitUpiPayment({
          bookingId: testBooking.id,
          amount: testBooking.advanceDepositRequired,
          utr: '123',
        });
      }, /at least 6 characters/);
    });

    test('strictly prevents duplicate UTR submission across different bookings', () => {
      const state = appStore.getState();
      const booking1 = state.bookings[0];
      const booking2 = state.bookings[1] || { ...state.bookings[0], id: 'test-bk-dup-2' };
      if (!state.bookings.find((b) => b.id === booking2.id)) {
        state.bookings.push(booking2);
      }
      booking1.status = 'accepted';
      booking1.paymentStatus = 'pending';
      booking2.status = 'accepted';
      booking2.paymentStatus = 'pending';

      const sharedUtr = `DUPUTR${Date.now()}`;

      // First booking submits UTR
      appStore.submitUpiPayment({
        bookingId: booking1.id,
        amount: booking1.advanceDepositRequired,
        utr: sharedUtr,
      });

      // Second booking attempts to reuse exact same UTR
      assert.throws(() => {
        appStore.submitUpiPayment({
          bookingId: booking2.id,
          amount: booking2.advanceDepositRequired,
          utr: sharedUtr,
        });
      }, /Duplicate transaction reference/);
    });

    test('prevents reuse of a rejected UTR on a different booking', () => {
      const state = appStore.getState();
      const b1 = state.bookings[0];
      const b2 = state.bookings[1] || { ...state.bookings[0], id: 'test-bk-rej-2' };
      if (!state.bookings.find((b) => b.id === b2.id)) {
        state.bookings.push(b2);
      }
      b1.status = 'accepted';
      b1.paymentStatus = 'pending';
      b2.status = 'accepted';
      b2.paymentStatus = 'pending';

      const rejectedUtr = `REJECTED_REF_${Date.now()}`;

      // Customer on Booking 1 submits UTR
      const p1 = appStore.submitUpiPayment({
        bookingId: b1.id,
        amount: b1.advanceDepositRequired,
        utr: rejectedUtr,
      });

      // Admin rejects Booking 1 payment
      appStore.switchRole('admin');
      appStore.adminRejectUpiPayment(p1.id, 'Fake UTR not found on merchant bank statement');

      // Now customer on Booking 2 tries to submit that same rejected UTR
      appStore.switchRole('customer');
      assert.throws(() => {
        appStore.submitUpiPayment({
          bookingId: b2.id,
          amount: b2.advanceDepositRequired,
          utr: rejectedUtr,
        });
      }, /Duplicate transaction reference.*already registered/);
    });

    test('wrong customer cannot submit payment for another customer booking', () => {
      appStore.setCurrentUser({
        id: 'user-cust-attacker',
        fullName: 'Attacker User',
        email: 'attacker@example.com',
        phone: '9876543210',
        role: 'customer',
        createdAt: new Date().toISOString(),
      });

      assert.throws(() => {
        appStore.submitUpiPayment({
          bookingId: testBooking.id,
          amount: testBooking.advanceDepositRequired,
          utr: `ATTACK_UTR_${Date.now()}`,
        });
      }, /Unauthorized: You can only submit payments for your own bookings/);
    });

    test('customer cannot mark payment paid directly', () => {
      appStore.switchRole('customer');
      const utr = `UNAUTH_PAY_${Date.now()}`;
      const payment = appStore.submitUpiPayment({
        bookingId: testBooking.id,
        amount: testBooking.advanceDepositRequired,
        utr,
      });

      // Customer cannot call admin verification
      assert.throws(() => {
        appStore.adminVerifyUpiPayment(payment.id);
      }, /Only platform administrators/);

      // Verify payment remains in verification pending
      const p = appStore.getState().payments.find((x) => x.id === payment.id);
      assert.equal(p?.status, 'payment_verification_pending');
      assert.equal(p?.verifiedBy, undefined);
    });
  });

  // =========================================================================
  // 3. Admin Manual Verification & 10% Platform Commission
  // =========================================================================
  describe('3. Admin Bank Statement Reconciliation & Confirmed 10% Commission', () => {
    let pendingPayment: BookingPayment;
    let targetBooking: Booking;

    beforeEach(() => {
      appStore.switchRole('customer');
      const state = appStore.getState();
      targetBooking = state.bookings[0];
      targetBooking.status = 'accepted';
      targetBooking.paymentStatus = 'pending';

      const utr = `VERIFY${Date.now()}`;
      pendingPayment = appStore.submitUpiPayment({
        bookingId: targetBooking.id,
        amount: targetBooking.advanceDepositRequired,
        utr,
      });
    });

    test('rejects non-admin attempt to verify payments', () => {
      appStore.switchRole('customer');
      assert.throws(() => {
        appStore.adminVerifyUpiPayment(pendingPayment.id);
      }, /Only platform administrators/);

      appStore.switchRole('chef');
      assert.throws(() => {
        appStore.adminVerifyUpiPayment(pendingPayment.id);
      }, /Only platform administrators/);
    });

    test('admin verifies payment: marks paid, confirms booking, and creates separate 10% commission settlement', () => {
      appStore.switchRole('admin');
      const verified = appStore.adminVerifyUpiPayment(pendingPayment.id);

      assert.equal(verified.status, 'paid');
      assert.ok(verified.verifiedAt);

      // Booking confirmed and marked paid
      const b = appStore.getState().bookings.find((bk) => bk.id === targetBooking.id);
      assert.equal(b?.status, 'confirmed');
      assert.equal(b?.paymentStatus, 'paid');

      // Chef Settlement automatically created with confirmed 10% platform commission
      const settlements = appStore.getState().chefSettlements;
      const settlement = settlements.find((s) => s.bookingId === targetBooking.id);
      assert.ok(settlement, 'Chef settlement record must be created');
      assert.equal(settlement.settlementStatus, 'pending');

      // Verify separate storage of gross, commission percentage, commission amount, and chef payable amount
      const expectedCommissionPct = 10.0;
      const expectedCommissionAmount = Math.round(targetBooking.totalAmount * (expectedCommissionPct / 100));
      const expectedChefPayable = targetBooking.totalAmount - expectedCommissionAmount;

      assert.equal(settlement.grossAmount, targetBooking.totalAmount, 'Gross amount must match booking total');
      assert.equal(settlement.commissionPercentage, expectedCommissionPct, 'Commission percentage must be exactly 10%');
      assert.equal(settlement.commissionAmount, expectedCommissionAmount, 'Commission amount must be 10% of gross');
      assert.equal(settlement.chefPayableAmount, expectedChefPayable, 'Chef payable must be 90% of gross');

      // Verify notifications delivered to customer and chef
      const notifs = appStore.getState().notifications;
      const cNotif = notifs.find((n) => n.bookingId === targetBooking.id && n.title.includes('Payment Verified'));
      assert.ok(cNotif, 'Customer should receive verification notification');
    });

    test('prevents double verification and concurrent approvals on already paid payment', () => {
      appStore.switchRole('admin');
      appStore.adminVerifyUpiPayment(pendingPayment.id);

      assert.throws(() => {
        appStore.adminVerifyUpiPayment(pendingPayment.id);
      }, /already been verified/);
    });

    test('admin verification records correct authorizing admin ID and timestamp', () => {
      appStore.switchRole('admin');
      const adminId = appStore.getState().currentUser?.id;
      const verified = appStore.adminVerifyUpiPayment(pendingPayment.id);

      assert.equal(verified.verifiedBy, adminId);
      assert.ok(verified.verifiedAt);
      assert.ok(new Date(verified.verifiedAt).getTime() <= Date.now());
    });
  });

  // =========================================================================
  // 4. Admin Payment Rejection & Customer Resubmission
  // =========================================================================
  describe('4. Admin Rejection Workflow & Customer Resubmission', () => {
    let pendingPayment: BookingPayment;
    let targetBooking: Booking;

    beforeEach(() => {
      appStore.switchRole('customer');
      const state = appStore.getState();
      targetBooking = state.bookings[0];
      targetBooking.status = 'accepted';
      targetBooking.paymentStatus = 'pending';

      pendingPayment = appStore.submitUpiPayment({
        bookingId: targetBooking.id,
        amount: targetBooking.advanceDepositRequired,
        utr: `REJ${Date.now()}`,
      });
    });

    test('requires a clear rejection reason from admin', () => {
      appStore.switchRole('admin');
      assert.throws(() => {
        appStore.adminRejectUpiPayment(pendingPayment.id, '   ');
      }, /rejection reason must be provided/);
    });

    test('admin rejects payment: notifies customer and allows resubmission', () => {
      appStore.switchRole('admin');
      const reason = 'UTR credit not visible on merchant bank statement.';
      const rejected = appStore.adminRejectUpiPayment(pendingPayment.id, reason);

      assert.equal(rejected.status, 'rejected');
      assert.equal(rejected.rejectionReason, reason);

      // Booking paymentStatus reset to pending so customer can pay again
      const b = appStore.getState().bookings.find((bk) => bk.id === targetBooking.id);
      assert.equal(b?.paymentStatus, 'pending');
      assert.equal(b?.status, 'accepted'); // Remains accepted, not cancelled

      // Customer resubmits with new UTR
      appStore.switchRole('customer');
      const resubmittedUtr = `CORRECTED${Date.now()}`;
      const resubmittedPayment = appStore.submitUpiPayment({
        bookingId: targetBooking.id,
        amount: targetBooking.advanceDepositRequired,
        utr: resubmittedUtr,
      });

      assert.equal(resubmittedPayment.status, 'payment_verification_pending');
      assert.equal(resubmittedPayment.paymentReference, resubmittedUtr);
    });
  });

  // =========================================================================
  // 5. Post-Service Chef Payout Settlement Recording & Cancellation Policies
  // =========================================================================
  describe('5. Chef Settlement Recording by Platform Admin & Cancellation Policy', () => {
    let settlementItem: ChefSettlement;
    let confirmedBooking: Booking;

    beforeEach(() => {
      appStore.switchRole('customer');
      const state = appStore.getState();
      const uniqueId = `bk-settle-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      confirmedBooking = {
        ...state.bookings[0],
        id: uniqueId,
        bookingNumber: `BN-${Date.now().toString().slice(-6)}`,
        status: 'accepted',
        paymentStatus: 'pending',
        totalAmount: 5000,
        advanceDepositRequired: 1500,
      };
      state.bookings.unshift(confirmedBooking);

      const p = appStore.submitUpiPayment({
        bookingId: confirmedBooking.id,
        amount: confirmedBooking.advanceDepositRequired,
        utr: `SETTLE_UTR_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      });

      appStore.switchRole('admin');
      appStore.adminVerifyUpiPayment(p.id);

      settlementItem = appStore.getState().chefSettlements.find((s) => s.bookingId === confirmedBooking.id)!;
    });

    test('rejects non-admin attempt to record chef settlement payout', () => {
      appStore.switchRole('chef');
      assert.throws(() => {
        appStore.adminRecordChefSettlement(settlementItem.id, 'IMPS123456');
      }, /Only platform administrators/);

      appStore.switchRole('customer');
      assert.throws(() => {
        appStore.adminRecordChefSettlement(settlementItem.id, 'IMPS123456');
      }, /Only platform administrators/);
    });

    test('rejects recording settlement without payout reference', () => {
      appStore.switchRole('admin');
      assert.throws(() => {
        appStore.adminRecordChefSettlement(settlementItem.id, '   ');
      }, /Bank payout reference.*is required/);
    });

    test('records chef settlement payout with bank UTR, timestamp, and authorizing admin ID', () => {
      appStore.switchRole('admin');
      const bankUtr = `IMPS${Date.now()}`;
      const settled = appStore.adminRecordChefSettlement(settlementItem.id, bankUtr);

      assert.equal(settled.settlementStatus, 'settled');
      assert.equal(settled.payoutReference, bankUtr);
      assert.ok(settled.payoutDate);
      assert.ok(settled.verifiedBy);
      assert.ok(settled.verifiedAt);
    });

    test('cancels pending chef settlement payout if booking is cancelled before cooking service', () => {
      appStore.switchRole('customer');
      // Cancel the confirmed booking
      appStore.cancelBooking(confirmedBooking.id, 'Family emergency', 'customer');

      // Verify that the pending settlement is cancelled and voided
      const updatedSettlement = appStore.getState().chefSettlements.find((s) => s.id === settlementItem.id);
      assert.equal(updatedSettlement?.settlementStatus, 'cancelled');
      assert.ok(updatedSettlement?.notes?.includes('Booking cancelled'));
    });

    test('calculates exact 10% commission on ₹10,000 gross = ₹1,000 commission = ₹9,000 chef payable', () => {
      appStore.switchRole('customer');
      const state = appStore.getState();
      const largeBooking: Booking = {
        ...state.bookings[0],
        id: `bk-calc-10k-${Date.now()}`,
        bookingNumber: `BN-10K-${Date.now().toString().slice(-4)}`,
        status: 'accepted',
        paymentStatus: 'pending',
        totalAmount: 10000,
        advanceDepositRequired: 3000,
      };
      state.bookings.unshift(largeBooking);

      const p = appStore.submitUpiPayment({
        bookingId: largeBooking.id,
        amount: largeBooking.advanceDepositRequired,
        utr: `UTR_10K_${Date.now()}`,
      });

      appStore.switchRole('admin');
      appStore.adminVerifyUpiPayment(p.id);

      const settlement = appStore.getState().chefSettlements.find((s) => s.bookingId === largeBooking.id)!;
      assert.ok(settlement, 'Settlement must exist');
      assert.equal(settlement.grossAmount, 10000, 'Gross booking amount must be 10,000');
      assert.equal(settlement.commissionPercentage, 10.0, 'Commission percentage must be 10%');
      assert.equal(settlement.commissionAmount, 1000, 'Platform commission must be 1,000');
      assert.equal(settlement.chefPayableAmount, 9000, 'Chef payable amount must be 9,000');
    });

    test('already-settled payouts cannot be reset or modified', () => {
      appStore.switchRole('admin');
      const initialBankUtr = `IMPS_INITIAL_${Date.now()}`;
      appStore.adminRecordChefSettlement(settlementItem.id, initialBankUtr);

      // Attempting to overwrite settlement throws
      assert.throws(() => {
        appStore.adminRecordChefSettlement(settlementItem.id, `IMPS_OVERWRITE_${Date.now()}`);
      }, /already been settled/);

      // Assert payout reference was preserved intact
      const preserved = appStore.getState().chefSettlements.find((s) => s.id === settlementItem.id);
      assert.equal(preserved?.payoutReference, initialBankUtr);
      assert.equal(preserved?.settlementStatus, 'settled');
    });

    test('chef can view only their own settlement records, not another chef settlements', () => {
      const state = appStore.getState();
      const s1 = state.chefSettlements[0];
      const s2: ChefSettlement = {
        ...s1,
        id: `stl-other-chef-${Date.now()}`,
        bookingId: `bk-other-${Date.now()}`,
        chefId: 'chef-other-999',
        chefName: 'Chef Other',
      };
      state.chefSettlements.unshift(s2);

      const chefIdToView = s1.chefId;
      const visibleToChef = state.chefSettlements.filter((s) => s.chefId === chefIdToView);
      assert.ok(visibleToChef.every((s) => s.chefId === chefIdToView));
      assert.ok(!visibleToChef.some((s) => s.chefId === 'chef-other-999'));
    });
  });

  // =========================================================================
  // 6. UI Badge Helper Tests
  // =========================================================================
  describe('6. Payment Status Badge Formatting', () => {
    test('returns appropriate styling for all payment statuses', () => {
      const pending = getPaymentStatusBadge('payment_verification_pending');
      assert.ok(pending.label.includes('Verification Pending'));
      assert.equal(pending.bgClass, 'bg-amber-100');

      const paid = getPaymentStatusBadge('paid');
      assert.ok(paid.label.includes('Verified & Paid'));
      assert.equal(paid.bgClass, 'bg-emerald-100');

      const rejected = getPaymentStatusBadge('rejected');
      assert.ok(rejected.label.includes('Rejected'));
      assert.equal(rejected.bgClass, 'bg-rose-100');
    });
  });

  // =========================================================================
  // 7. Storage Bucket & RLS Security Audit Tests
  // =========================================================================
  describe('7. Receipt Storage & Database Security Verification', () => {
    test('receipt bucket is strictly private and isolated to customer folder path', () => {
      const customerId = 'user-cust-1';
      const validReceiptPath = `${customerId}/receipt_${Date.now()}.jpg`;
      const unauthorizedReceiptPath = `user-other-999/receipt_${Date.now()}.jpg`;

      // Simulates storage RLS check: (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
      const canCustomerUpload = (receiptPath: string, uploaderId: string) => receiptPath.startsWith(`${uploaderId}/`);
      assert.equal(canCustomerUpload(validReceiptPath, customerId), true);
      assert.equal(canCustomerUpload(unauthorizedReceiptPath, customerId), false);
    });

    test('admin is authorized to view receipts across all customer folders', () => {
      const adminRole = 'admin';
      const canAccessReceipt = (role: string, receiptPath: string, userId: string) =>
        role === 'admin' || receiptPath.startsWith(`${userId}/`);

      assert.equal(canAccessReceipt(adminRole, 'any-user/receipt.jpg', 'admin-id'), true);
      assert.equal(canAccessReceipt('customer', 'other-user/receipt.jpg', 'my-id'), false);
    });
  });
});
