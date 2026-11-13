import test from 'node:test';
import assert from 'node:assert/strict';
import { canCancelBooking, canTransitionBookingStatus } from './bookingWorkflow';
import { appStore } from '../services/store';
import { Booking } from '../types/database';

test('CUSTOMER FEATURES: canCancelBooking validates eligible and restricted states', () => {
  // 1. Pending, Accepted, Confirmed MUST be eligible
  assert.equal(canCancelBooking('pending', 'customer').canCancel, true);
  assert.equal(canCancelBooking('accepted', 'customer').canCancel, true);
  assert.equal(canCancelBooking('confirmed', 'customer').canCancel, true);

  // 2. In Progress and Completed MUST be restricted
  const inProgressCheck = canCancelBooking('in_progress', 'customer');
  assert.equal(inProgressCheck.canCancel, false);
  assert.match(inProgressCheck.error || '', /in progress/i);

  const completedCheck = canCancelBooking('completed', 'customer');
  assert.equal(completedCheck.canCancel, false);
  assert.match(completedCheck.error || '', /completed/i);

  // 3. Already cancelled MUST be prevented from duplicate cancellation
  const cancelledCheck = canCancelBooking('cancelled', 'customer');
  assert.equal(cancelledCheck.canCancel, false);
  assert.match(cancelledCheck.error || '', /already cancelled/i);

  // 4. canTransitionBookingStatus matches
  assert.equal(canTransitionBookingStatus('pending', 'cancelled', 'customer'), true);
  assert.equal(canTransitionBookingStatus('accepted', 'cancelled', 'customer'), true);
  assert.equal(canTransitionBookingStatus('confirmed', 'cancelled', 'customer'), true);
  assert.equal(canTransitionBookingStatus('in_progress', 'cancelled', 'customer'), false);
  assert.equal(canTransitionBookingStatus('completed', 'cancelled', 'customer'), false);
  assert.equal(canTransitionBookingStatus('cancelled', 'cancelled', 'customer'), false);
});

test('CUSTOMER CANCELLATION: Pending booking cancellation workflow', () => {
  const store = appStore;
  const state = store.getState();

  // Create a fresh pending booking
  const newBooking = store.createBooking({
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul@example.com',
    chefId: 'chef-1',
    chefName: 'Chef Venkateshwarlu Sharma',
    eventType: 'family_function',
    foodType: 'traditional',
    eventDate: '2026-12-01',
    startTime: '11:00',
    expectedDurationHours: 3,
    guestsCount: 15,
    venueAddress: 'Flat 401, Hyderabad',
    city: 'Hyderabad',
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: true,
    items: [
      {
        id: 'item-test-1',
        dishName: 'Hyderabadi Biryani',
        foodType: 'non_vegetarian',
        quantity: 5,
        unit: 'kg',
      },
    ],
  });

  assert.equal(newBooking.status, 'pending');

  // Cancel the pending booking
  const cancelResult = store.cancelBooking(newBooking.id, 'Change of date requested by family', 'customer');
  assert.equal(cancelResult.success, true);

  // Verify booking record was updated, NEVER deleted
  const updated = store.getState().bookings.find((b) => b.id === newBooking.id);
  assert.ok(updated, 'Booking record must exist and never be deleted');
  assert.equal(updated.status, 'cancelled');
  assert.equal(updated.cancelledBy, 'customer');
  assert.equal(updated.cancellationReason, 'Change of date requested by family');
  assert.ok(updated.cancelledAt, 'cancelledAt timestamp must be recorded');

  // Verify notification was dispatched to chef
  const notif = store.getState().notifications.find(
    (n) => n.bookingId === newBooking.id && n.recipientRole === 'chef'
  );
  assert.ok(notif, 'Notification must be sent to the assigned chef');
  assert.match(notif.message, /Change of date requested by family/);
});

test('CUSTOMER CANCELLATION: Confirmed (paid) booking cancellation and refund processing', () => {
  const store = appStore;

  // bk-103 is confirmed in sample data
  const booking103 = store.getState().bookings.find((b) => b.id === 'bk-103');
  assert.ok(booking103);
  assert.equal(booking103.status, 'confirmed');

  // Cancel the confirmed booking with optional reason
  const result = store.cancelBooking(booking103.id, '', 'customer'); // blank reason tests default fallback
  assert.equal(result.success, true);

  const updated103 = store.getState().bookings.find((b) => b.id === 'bk-103');
  assert.equal(updated103?.status, 'cancelled');
  assert.equal(updated103?.cancelledBy, 'customer');
  assert.equal(updated103?.paymentStatus, 'refunded');
  assert.equal(updated103?.cancellationReason, 'Cancelled by customer');
  assert.ok(updated103?.cancelledAt);

  // Verify payment record updated to refunded
  const payment = store.getState().payments.find((p) => p.bookingId === 'bk-103');
  if (payment) {
    assert.equal(payment.status, 'refunded');
    assert.ok(payment.refundAmount && payment.refundAmount > 0);
  }
});

test('CONCURRENCY & RACE CONDITION: Chef cannot accept an already cancelled booking', () => {
  const store = appStore;

  // Create a pending booking
  const b = store.createBooking({
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul@example.com',
    chefId: 'chef-2',
    chefName: 'Chef Lakshmi Devi',
    eventType: 'festival',
    foodType: 'traditional',
    eventDate: '2026-12-05',
    startTime: '10:00',
    expectedDurationHours: 3,
    guestsCount: 10,
    venueAddress: 'Hyderabad',
    city: 'Hyderabad',
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: true,
    items: [{ id: 'item-2', dishName: 'Pulihora', foodType: 'traditional', quantity: 2, unit: 'kg' }],
  });

  // Customer cancels it
  store.cancelBooking(b.id, 'No longer needed', 'customer');

  // Chef attempts to accept the cancelled booking -> MUST throw error
  assert.throws(
    () => {
      store.chefAcceptBooking(b.id, {
        revisedServiceFee: 3000,
        revisedDurationHours: 3,
      });
    },
    /Cannot accept booking.*already cancelled/i,
    'Chefs must be strictly prevented from accepting cancelled bookings'
  );
});

test('DUPLICATE CANCELLATION: Calling cancelBooking on an already cancelled booking is rejected', () => {
  const store = appStore;
  const b = store.getState().bookings.find((bk) => bk.id === 'bk-103');
  assert.ok(b);
  assert.equal(b.status, 'cancelled');

  assert.throws(
    () => {
      store.cancelBooking(b.id, 'Trying to cancel again', 'customer');
    },
    /already cancelled/i,
    'Duplicate cancellation must be rejected'
  );
});

test('RESTRICTED STATUS: Attempting to cancel a completed booking is rejected', () => {
  const store = appStore;
  // bk-102 is completed
  const b = store.getState().bookings.find((bk) => bk.id === 'bk-102');
  assert.ok(b);
  assert.equal(b.status, 'completed');

  assert.throws(
    () => {
      store.cancelBooking(b.id, 'Attempt cancel completed', 'customer');
    },
    /Cannot cancel a completed booking/i,
    'Completed bookings cannot be cancelled'
  );
});

