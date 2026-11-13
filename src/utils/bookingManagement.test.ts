import test from 'node:test';
import assert from 'node:assert/strict';
import { appStore } from '../services/store';
import {
  canTransitionBookingStatus,
  canCancelBooking,
  hasBookingConflict,
} from './bookingWorkflow';

test('LIFECYCLE TRANSITIONS: Complete happy path pending -> accepted -> confirmed -> in_progress -> completed', () => {
  const store = appStore;

  // 1. Customer creates a booking (status = pending)
  store.switchRole('customer');
  const booking = store.createBooking({
    customerId: 'user-cust-lifecycle',
    customerName: 'Ananya Rao',
    customerPhone: '+91 91234 56789',
    customerEmail: 'ananya@example.com',
    chefId: 'chef-1',
    chefName: 'Chef Venkateshwarlu Sharma',
    eventType: 'birthday',
    foodType: 'vegetarian',
    eventDate: '2026-12-15',
    startTime: '18:00',
    expectedDurationHours: 4,
    guestsCount: 20,
    venueAddress: 'Plot 88, Banjara Hills',
    city: 'Hyderabad',
    ingredientArrangement: 'chef_provided',
    utensilsProvidedByCustomer: true,
    items: [
      {
        id: 'item-lifecycle-1',
        dishName: 'Paneer Butter Masala',
        foodType: 'vegetarian',
        quantity: 5,
        unit: 'kg',
      },
    ],
  });

  assert.equal(booking.status, 'pending');

  // Verify role permission checks
  assert.equal(canTransitionBookingStatus('pending', 'accepted', 'chef'), true);
  assert.equal(canTransitionBookingStatus('pending', 'accepted', 'customer'), false);

  // 2. Chef logs in and accepts booking with quotation
  store.switchRole('chef');
  store.chefAcceptBooking(booking.id, {
    revisedServiceFee: 3200,
    revisedDurationHours: 4,
    additionalCharges: 300,
    additionalChargesNotes: 'Special organic paneer sourcing',
    chefQuotationNotes: 'Looking forward to preparing an authentic feast!',
  });

  const accepted = store.getState().bookings.find((b) => b.id === booking.id);
  assert.ok(accepted);
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.chefServiceFee, 3200);
  assert.equal(accepted.additionalCharges, 300);
  assert.equal(accepted.chefQuotationNotes, 'Looking forward to preparing an authentic feast!');

  // Verify customer received notification
  const acceptNotif = store.getState().notifications.find(
    (n) => n.bookingId === booking.id && n.type === 'booking_accepted'
  );
  assert.ok(acceptNotif, 'Customer must receive booking_accepted notification');

  // 3. Customer confirms booking by paying advance
  store.switchRole('customer');
  assert.equal(canTransitionBookingStatus('accepted', 'confirmed', 'customer'), true);
  store.confirmPayment(booking.id, {
    amount: accepted.advanceDepositRequired,
    razorpayPaymentId: 'pay_test_lifecycle_123',
    razorpayOrderId: 'order_test_lifecycle_456',
    paymentGateway: 'razorpay',
  });

  const confirmed = store.getState().bookings.find((b) => b.id === booking.id);
  assert.ok(confirmed);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.paymentStatus, 'paid');

  // 4. Chef starts cooking (confirmed -> in_progress)
  store.switchRole('chef');
  assert.equal(canTransitionBookingStatus('confirmed', 'in_progress', 'chef'), true);
  assert.equal(canTransitionBookingStatus('confirmed', 'in_progress', 'customer'), false);

  store.updateBookingStatus(booking.id, 'in_progress');
  const inProgress = store.getState().bookings.find((b) => b.id === booking.id);
  assert.ok(inProgress);
  assert.equal(inProgress.status, 'in_progress');

  // 5. Chef marks cooking completed (in_progress -> completed)
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'chef'), true);
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'customer'), false);

  store.updateBookingStatus(booking.id, 'completed');
  const completed = store.getState().bookings.find((b) => b.id === booking.id);
  assert.ok(completed);
  assert.equal(completed.status, 'completed');

  // 6. Customer submits review after service completion
  store.switchRole('customer');
  const review = store.addReview({
    bookingId: booking.id,
    customerId: 'user-cust-lifecycle',
    customerName: 'Ananya Rao',
    chefId: 'chef-1',
    rating: 5,
    comment: 'Spectacular paneer dish and exceptional punctuality!',
    foodTasteRating: 5,
    cleanlinessRating: 5,
    punctualityRating: 5,
  });

  assert.ok(review.id);
  const foundReview = store.getState().reviews.find((r) => r.bookingId === booking.id);
  assert.ok(foundReview);
  assert.equal(foundReview.rating, 5);
});

test('REJECTION WORKFLOW: Chef rejects booking with reason and notifies customer', () => {
  const store = appStore;

  store.switchRole('customer');
  const booking = store.createBooking({
    customerId: 'user-cust-reject',
    customerName: 'Kavita Reddy',
    customerPhone: '+91 98480 12345',
    customerEmail: 'kavita@example.com',
    chefId: 'chef-1',
    chefName: 'Chef Venkateshwarlu Sharma',
    eventType: 'festival',
    foodType: 'traditional',
    eventDate: '2026-12-25',
    startTime: '09:00',
    expectedDurationHours: 3,
    guestsCount: 10,
    venueAddress: 'Flat 102, Jubilee Hills',
    city: 'Hyderabad',
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: true,
    items: [
      {
        id: 'item-rej-1',
        dishName: 'Festival Sweets & Tiffin',
        foodType: 'vegetarian',
        quantity: 3,
        unit: 'kg',
      },
    ],
  });

  assert.equal(booking.status, 'pending');

  // Chef declines booking
  store.switchRole('chef');
  store.chefRejectBooking(booking.id, 'Fully booked for festival season catering');

  const rejected = store.getState().bookings.find((b) => b.id === booking.id);
  assert.ok(rejected);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.cancelledBy, 'chef');
  assert.equal(rejected.cancellationReason, 'Fully booked for festival season catering');

  // Notification sent to customer
  const rejectNotif = store.getState().notifications.find(
    (n) => n.bookingId === booking.id && n.type === 'booking_rejected'
  );
  assert.ok(rejectNotif);
  assert.match(rejectNotif.message, /festival season catering/);
});

test('SECURITY & VALIDATION: Duplicate acceptance and invalid status transitions are rejected', () => {
  const store = appStore;

  store.switchRole('customer');
  const booking = store.createBooking({
    customerId: 'user-cust-sec',
    customerName: 'Suresh Kumar',
    customerPhone: '+91 97000 11223',
    customerEmail: 'suresh@example.com',
    chefId: 'chef-1',
    chefName: 'Chef Venkateshwarlu Sharma',
    eventType: 'home_cooking',
    foodType: 'vegetarian',
    eventDate: '2026-12-28',
    startTime: '12:00',
    expectedDurationHours: 2,
    guestsCount: 4,
    venueAddress: 'Madhapur',
    city: 'Hyderabad',
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: true,
    items: [
      {
        id: 'item-sec-1',
        dishName: 'South Indian Thali',
        foodType: 'vegetarian',
        quantity: 4,
        unit: 'plates',
      },
    ],
  });

  // Customer cancels booking
  store.cancelBooking(booking.id, 'Plans changed', 'customer');
  const cancelledBooking = store.getState().bookings.find((b) => b.id === booking.id);
  assert.equal(cancelledBooking?.status, 'cancelled');

  // Chef attempting to accept a cancelled booking MUST throw an error
  store.switchRole('chef');
  assert.throws(
    () => {
      store.chefAcceptBooking(booking.id, { revisedServiceFee: 1500 });
    },
    /Cannot accept booking.*cancelled/i,
    'Must prevent chef from accepting cancelled booking'
  );

  // Attempting to cancel an already cancelled booking MUST fail
  const cancelCheck = canCancelBooking('cancelled', 'customer');
  assert.equal(cancelCheck.canCancel, false);

  // Attempting to cancel an in_progress booking MUST fail
  const inProgressCheck = canCancelBooking('in_progress', 'customer');
  assert.equal(inProgressCheck.canCancel, false);
});

test('CONCURRENT BOOKINGS: Detects overlapping time slots on same chef and date', () => {
  const existingBookings = [
    {
      id: 'existing-1',
      eventDate: '2026-12-20',
      startTime: '10:00',
      expectedDurationHours: 3, // 10:00 to 13:00 (+1h travel buffer = 14:00)
      status: 'confirmed' as const,
    },
  ];

  // Request during existing booking window (11:00) -> CONFLICT
  const conflict1 = hasBookingConflict(existingBookings, {
    eventDate: '2026-12-20',
    startTime: '11:00',
    expectedDurationHours: 2,
  });
  assert.equal(conflict1, true, 'Overlapping start time must trigger conflict');

  // Request during buffer window (13:30) -> CONFLICT
  const conflict2 = hasBookingConflict(existingBookings, {
    eventDate: '2026-12-20',
    startTime: '13:30',
    expectedDurationHours: 2,
  });
  assert.equal(conflict2, true, 'Start time within 1h buffer must trigger conflict');

  // Request after buffer window (14:30) -> NO CONFLICT
  const conflict3 = hasBookingConflict(existingBookings, {
    eventDate: '2026-12-20',
    startTime: '14:30',
    expectedDurationHours: 2,
  });
  assert.equal(conflict3, false, 'Start time after buffer must succeed');

  // Request on a different date -> NO CONFLICT
  const conflict4 = hasBookingConflict(existingBookings, {
    eventDate: '2026-12-21',
    startTime: '10:00',
    expectedDurationHours: 3,
  });
  assert.equal(conflict4, false, 'Different date must never conflict');
});

test('NOTIFICATIONS: Real-time notification mark read and mark all read operations', () => {
  const store = appStore;

  // Add sample notification
  const testNotifId = `test-notif-${Date.now()}`;
  store.getState().notifications.unshift({
    id: testNotifId,
    recipientId: 'user-cust-1',
    recipientRole: 'customer',
    title: 'Test Notification',
    message: 'Testing mark as read',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
  });

  const beforeRead = store.getState().notifications.find((n) => n.id === testNotifId);
  assert.equal(beforeRead?.read, false);

  // Mark single notification read
  store.markNotificationAsRead(testNotifId);
  const afterRead = store.getState().notifications.find((n) => n.id === testNotifId);
  assert.equal(afterRead?.read, true);

  // Mark all customer notifications read
  store.markAllNotificationsRead('customer');
  const unreadCust = store.getState().notifications.filter(
    (n) => n.recipientRole === 'customer' && !n.read
  );
  assert.equal(unreadCust.length, 0, 'All customer notifications must be marked read');
});
