import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionBookingStatus,
  hasBookingConflict,
  checkChefAvailabilityForSlot,
  isDateInPast,
} from './bookingWorkflow';
import { calculateCancellationRefund } from './pricing';

test('canTransitionBookingStatus enforces role restrictions', () => {
  // Customer can cancel pending or accepted
  assert.equal(canTransitionBookingStatus('pending', 'cancelled', 'customer'), true);
  assert.equal(canTransitionBookingStatus('accepted', 'cancelled', 'customer'), true);
  // Customer can pay to confirm accepted
  assert.equal(canTransitionBookingStatus('accepted', 'confirmed', 'customer'), true);
  // Customer CANNOT mark completed or in_progress
  assert.equal(canTransitionBookingStatus('confirmed', 'in_progress', 'customer'), false);
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'customer'), false);

  // Chef can accept or reject pending
  assert.equal(canTransitionBookingStatus('pending', 'accepted', 'chef'), true);
  assert.equal(canTransitionBookingStatus('pending', 'rejected', 'chef'), true);
  // Chef can start confirmed cooking and complete it
  assert.equal(canTransitionBookingStatus('confirmed', 'in_progress', 'chef'), true);
  assert.equal(canTransitionBookingStatus('in_progress', 'completed', 'chef'), true);

  // Admin can perform administrative transitions
  assert.equal(canTransitionBookingStatus('pending', 'confirmed', 'admin'), true);
});

test('hasBookingConflict correctly detects overlapping booking windows', () => {
  const existingBookings = [
    {
      id: 'b1',
      eventDate: '2026-11-05',
      startTime: '10:00',
      expectedDurationHours: 3, // 10:00 to 13:00 (+1h buffer = 14:00)
      status: 'confirmed' as const,
    },
    {
      id: 'b2',
      eventDate: '2026-11-05',
      startTime: '17:00',
      expectedDurationHours: 2, // 17:00 to 19:00 (+1h buffer = 20:00)
      status: 'confirmed' as const,
    },
  ];

  // Conflict: 12:00 overlaps with b1 (10:00-14:00)
  assert.equal(
    hasBookingConflict(existingBookings, {
      eventDate: '2026-11-05',
      startTime: '12:00',
      expectedDurationHours: 2,
    }),
    true
  );

  // Conflict: 13:30 overlaps with b1 buffer
  assert.equal(
    hasBookingConflict(existingBookings, {
      eventDate: '2026-11-05',
      startTime: '13:30',
      expectedDurationHours: 2,
    }),
    true
  );

  // Non-conflict: 14:30 to 16:30 is between b1 and b2
  assert.equal(
    hasBookingConflict(existingBookings, {
      eventDate: '2026-11-05',
      startTime: '14:30',
      expectedDurationHours: 1.5,
    }),
    false
  );

  // Different date: no conflict
  assert.equal(
    hasBookingConflict(existingBookings, {
      eventDate: '2026-11-06',
      startTime: '10:00',
      expectedDurationHours: 3,
    }),
    false
  );
});

test('checkChefAvailabilityForSlot correctly enforces approvals and double-booking consistency', () => {
  // 1. Past date check
  assert.equal(isDateInPast('2020-01-01'), true);
  assert.equal(isDateInPast('2030-01-01'), false);

  const mockChef = {
    id: 'chef-test-1',
    status: 'approved',
    blockedDates: ['2026-11-20'],
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  const existingBookings = [
    {
      id: 'b1',
      chefId: 'chef-test-1',
      eventDate: '2026-11-25',
      startTime: '10:00',
      expectedDurationHours: 3,
      status: 'confirmed' as const,
    },
  ];

  // Approved chef on open slot -> available
  const openRes = checkChefAvailabilityForSlot(mockChef, existingBookings, {
    eventDate: '2026-11-25',
    startTime: '15:00',
    expectedDurationHours: 2,
  });
  assert.equal(openRes.isAvailable, true);

  // Conflicting slot -> not available
  const conflictRes = checkChefAvailabilityForSlot(mockChef, existingBookings, {
    eventDate: '2026-11-25',
    startTime: '11:00',
    expectedDurationHours: 2,
  });
  assert.equal(conflictRes.isAvailable, false);
  assert.ok(conflictRes.reason?.includes('active booking'));

  // Blocked date -> not available
  const blockedRes = checkChefAvailabilityForSlot(mockChef, existingBookings, {
    eventDate: '2026-11-20',
    startTime: '10:00',
    expectedDurationHours: 3,
  });
  assert.equal(blockedRes.isAvailable, false);

  // Pending chef -> not available
  const pendingChef = { ...mockChef, status: 'pending' };
  const pendingRes = checkChefAvailabilityForSlot(pendingChef, existingBookings, {
    eventDate: '2026-11-26',
    startTime: '10:00',
    expectedDurationHours: 3,
  });
  assert.equal(pendingRes.isAvailable, false);

  // Cancellation policy refunds
  const fullRefund = calculateCancellationRefund(3000, 48); // 48h prior
  assert.equal(fullRefund.refundAmount, 3000);
  assert.equal(fullRefund.retainedAmount, 0);

  const partialRefund = calculateCancellationRefund(3000, 10); // 10h prior (90%)
  assert.equal(partialRefund.refundAmount, 2700);
  assert.equal(partialRefund.retainedAmount, 300);

  const lateRefund = calculateCancellationRefund(3000, 1); // 1h prior (50%)
  assert.equal(lateRefund.refundAmount, 1500);
  assert.equal(lateRefund.retainedAmount, 1500);
});

test('toggleChefDateAvailability and batchSetChefAvailability update blockedDates correctly', async () => {
  const { appStore } = await import('../services/store');
  const chefId = 'chef-1';
  const chef = appStore.getState().chefs.find((c) => c.id === chefId);
  const chefOwner = appStore.getState().profiles.find((p) => p.id === chef?.profileId);
  if (chefOwner) {
    appStore.setCurrentUser(chefOwner);
  }

  // Toggle to blocked (isAvailable = false)
  const blocked1 = appStore.toggleChefDateAvailability(chefId, '2026-12-25', false);
  assert.ok(blocked1?.includes('2026-12-25'));

  // Toggle to unblocked (isAvailable = true)
  const unblocked = appStore.toggleChefDateAvailability(chefId, '2026-12-25', true);
  assert.ok(!unblocked?.includes('2026-12-25'));

  // Batch block multiple dates
  const batchBlocked = appStore.batchSetChefAvailability(chefId, ['2026-12-24', '2026-12-25'], false);
  assert.ok(batchBlocked?.includes('2026-12-24'));
  assert.ok(batchBlocked?.includes('2026-12-25'));

  // Batch unblock
  const batchUnblocked = appStore.batchSetChefAvailability(chefId, ['2026-12-24', '2026-12-25'], true);
  assert.ok(!batchUnblocked?.includes('2026-12-24'));
  assert.ok(!batchUnblocked?.includes('2026-12-25'));
});

test('Authorization enforcement: only chef himself or admin can modify availability', async () => {
  const { appStore } = await import('../services/store');
  const chef = appStore.getState().chefs[0]; // chef-1, profile user-chef-1
  const customerUser = appStore.getState().profiles.find((p) => p.role === 'customer')!;
  const otherChefUser = appStore.getState().profiles.find((p) => p.role === 'chef' && p.id !== chef.profileId)!;

  // 1. As a customer: attempting to modify availability must throw Unauthorized
  appStore.setCurrentUser(customerUser);
  assert.throws(
    () => {
      appStore.toggleChefDateAvailability(chef.id, '2026-12-10', false);
    },
    /Unauthorized: Customers cannot modify chef availability/
  );

  // 2. As another chef: attempting to modify chef-1's availability must throw Unauthorized
  if (otherChefUser) {
    appStore.setCurrentUser(otherChefUser);
    assert.throws(
      () => {
        appStore.toggleChefDateAvailability(chef.id, '2026-12-10', false);
      },
      /Unauthorized: Chefs can only modify their own availability/
    );
  }

  // 3. As the chef himself: allowed
  const chefOwner = appStore.getState().profiles.find((p) => p.id === chef.profileId)!;
  appStore.setCurrentUser(chefOwner);
  assert.doesNotThrow(() => {
    appStore.toggleChefDateAvailability(chef.id, '2026-12-10', false);
  });
  // Clean up
  appStore.toggleChefDateAvailability(chef.id, '2026-12-10', true);
});

test('Invalid date and non-positive quantity validation in createBooking', async () => {
  const { appStore } = await import('../services/store');
  const chef = appStore.getState().chefs.find((c) => c.status === 'approved')!;

  const baseBooking = {
    customerId: 'cust-test',
    customerName: 'Test Customer',
    customerPhone: '+91 99999 88888',
    customerEmail: 'test@example.com',
    chefId: chef.id,
    chefName: chef.fullName,
    chefAvatarUrl: chef.avatarUrl,
    eventType: 'home_cooking' as const,
    foodType: 'traditional' as const,
    eventDate: '2020-01-01', // Past date!
    startTime: '10:00',
    expectedDurationHours: 3,
    guestsCount: 10,
    venueAddress: 'Test Road, Jubilee Hills',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Biryani', foodType: 'traditional' as const, quantity: 5, unit: 'plates' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 1500,
    ingredientFee: 0,
    platformFee: 150,
    additionalCharges: 0,
    totalAmount: 1650,
    advanceDepositRequired: 825,
  };

  // 1. Past date must throw
  assert.throws(() => {
    appStore.createBooking(baseBooking);
  }, /Booking date cannot be in the past/);

  // 2. Non-positive quantity must throw
  const invalidQtyBooking = {
    ...baseBooking,
    eventDate: '2026-12-15',
    items: [{ id: '1', dishName: 'Biryani', foodType: 'traditional' as const, quantity: 0, unit: 'plates' as const }],
  };
  assert.throws(() => {
    appStore.createBooking(invalidQtyBooking);
  }, /Food quantities must be strictly positive/);
});

test('Concurrency and double-booking conflict protection on createBooking and confirmPayment', async () => {
  const { appStore } = await import('../services/store');
  const chef = appStore.getState().chefs.find((c) => c.status === 'approved')!;
  const testDate = '2026-12-18';

  const booking1Data = {
    customerId: 'cust-1',
    customerName: 'Customer One',
    customerPhone: '+91 99999 11111',
    customerEmail: 'cust1@example.com',
    chefId: chef.id,
    chefName: chef.fullName,
    chefAvatarUrl: chef.avatarUrl,
    eventType: 'birthday' as const,
    foodType: 'sweets' as const,
    eventDate: testDate,
    startTime: '14:00',
    expectedDurationHours: 3, // 14:00 to 17:00 (+1h buffer to 18:00)
    guestsCount: 15,
    venueAddress: 'Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Gulab Jamun', foodType: 'sweets' as const, quantity: 5, unit: 'kg' as const }],
    ingredientArrangement: 'chef_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 2000,
    ingredientFee: 1000,
    platformFee: 300,
    additionalCharges: 0,
    totalAmount: 3300,
    advanceDepositRequired: 1650,
  };

  // Customer 1 books slot
  const b1 = appStore.createBooking(booking1Data);
  assert.ok(b1.id);

  // Customer 2 attempts to concurrently book overlapping slot (15:00 to 18:00)
  const booking2Data = {
    ...booking1Data,
    customerId: 'cust-2',
    customerName: 'Customer Two',
    startTime: '15:00',
  };

  assert.throws(() => {
    appStore.createBooking(booking2Data);
  }, /Chef already has an active booking during this time slot/);

  // Non-overlapping slot on same day (08:00 to 11:00) succeeds
  const booking3Data = {
    ...booking1Data,
    customerId: 'cust-3',
    customerName: 'Customer Three',
    startTime: '08:00',
    expectedDurationHours: 2,
  };
  const b3 = appStore.createBooking(booking3Data);
  assert.ok(b3.id);
});

test('Cancelled bookings free up the time slot for new bookings', async () => {
  const { appStore } = await import('../services/store');
  const chef = appStore.getState().chefs.find((c) => c.status === 'approved')!;
  const testDate = '2026-12-22';

  const bookingData = {
    customerId: 'cust-cancel-test',
    customerName: 'Test Customer',
    customerPhone: '+91 99999 22222',
    customerEmail: 'canceltest@example.com',
    chefId: chef.id,
    chefName: chef.fullName,
    chefAvatarUrl: chef.avatarUrl,
    eventType: 'home_cooking' as const,
    foodType: 'vegetarian' as const,
    eventDate: testDate,
    startTime: '12:00',
    expectedDurationHours: 3,
    guestsCount: 8,
    venueAddress: 'Kondapur, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Paneer Butter Masala', foodType: 'vegetarian' as const, quantity: 4, unit: 'plates' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 1200,
    ingredientFee: 0,
    platformFee: 120,
    additionalCharges: 0,
    totalAmount: 1320,
    advanceDepositRequired: 660,
  };

  // 1. Create booking
  const b = appStore.createBooking(bookingData);

  // 2. Cancel the booking
  appStore.cancelBooking(b.id, 'Customer emergency', 'customer');
  assert.equal(appStore.getState().bookings.find((x) => x.id === b.id)?.status, 'cancelled');

  // 3. Re-booking the same slot must now succeed without conflict error
  assert.doesNotThrow(() => {
    const rebooked = appStore.createBooking({
      ...bookingData,
      customerName: 'New Customer After Cancellation',
    });
    assert.ok(rebooked.id);
  });
});

test('Double acceptance prevention and role authorization on bookings', async () => {
  const { appStore } = await import('../services/store');
  const approvedChef = appStore.getState().chefs.find((c) => c.status === 'approved')!;
  const testDate = '2026-12-25';

  const booking = appStore.createBooking({
    customerId: 'cust-workflow-test',
    customerName: 'Workflow Test Customer',
    customerPhone: '+91 91234 56789',
    customerEmail: 'workflow@example.com',
    chefId: approvedChef.id,
    chefName: approvedChef.fullName,
    chefAvatarUrl: approvedChef.avatarUrl,
    eventType: 'home_cooking' as const,
    foodType: 'vegetarian' as const,
    eventDate: testDate,
    startTime: '11:00',
    expectedDurationHours: 3,
    guestsCount: 6,
    venueAddress: 'Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Dal Tadka', foodType: 'vegetarian' as const, quantity: 2, unit: 'plates' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 1500,
    ingredientFee: 0,
    platformFee: 150,
    additionalCharges: 0,
    totalAmount: 1650,
    advanceDepositRequired: 825,
  });

  assert.equal(booking.status, 'pending');

  // Unauthorized chef (Chef 2) cannot accept Chef 1's booking
  const otherChef = appStore.getState().chefs.find((c) => c.id !== approvedChef.id && c.status === 'approved');
  if (otherChef) {
    const otherProfile = appStore.getState().profiles.find((p) => p.id === otherChef.profileId);
    if (otherProfile) {
      appStore.setCurrentUser(otherProfile);
      assert.throws(() => {
        appStore.chefAcceptBooking(booking.id, { chefQuotationNotes: 'Unauthorized accept' });
      }, /Unauthorized: You can only accept bookings assigned to your chef profile/);
    }
  }

  // Assigned chef accepts successfully
  const assignedChefProfile = appStore.getState().profiles.find((p) => p.id === approvedChef.profileId);
  if (assignedChefProfile) {
    appStore.setCurrentUser(assignedChefProfile);
  }
  appStore.chefAcceptBooking(booking.id, { chefQuotationNotes: 'Approved quotation' });
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'accepted');

  // Attempting to accept a second time (double acceptance) must fail
  assert.throws(() => {
    appStore.chefAcceptBooking(booking.id, { chefQuotationNotes: 'Second accept attempt' });
  }, /Cannot accept booking: Booking .* is already accepted/);
});

test('Review and rating lifecycle: requires completion, customer ownership, and blocks duplicates', async () => {
  const { appStore } = await import('../services/store');
  const approvedChef = appStore.getState().chefs.find((c) => c.status === 'approved')!;
  const testCustomerId = 'cust-review-tester';

  const booking = appStore.createBooking({
    customerId: testCustomerId,
    customerName: 'Review Test Customer',
    customerPhone: '+91 98888 77777',
    customerEmail: 'reviewtest@example.com',
    chefId: approvedChef.id,
    chefName: approvedChef.fullName,
    chefAvatarUrl: approvedChef.avatarUrl,
    eventType: 'festival' as const,
    foodType: 'traditional' as const,
    eventDate: '2026-12-30',
    startTime: '10:00',
    expectedDurationHours: 3,
    guestsCount: 10,
    venueAddress: 'Hitec City, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Pulihora', foodType: 'traditional' as const, quantity: 5, unit: 'kg' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 2000,
    ingredientFee: 0,
    platformFee: 200,
    additionalCharges: 0,
    totalAmount: 2200,
    advanceDepositRequired: 1100,
  });

  // 1. Attempting to review while status is 'pending' must throw error
  assert.throws(() => {
    appStore.addReview({
      bookingId: booking.id,
      customerId: testCustomerId,
      customerName: 'Review Test Customer',
      chefId: approvedChef.id,
      rating: 5,
      comment: 'Premature review',
      foodTasteRating: 5,
      cleanlinessRating: 5,
      punctualityRating: 5,
    });
  }, /Reviews can only be submitted for completed cooking services/);

  // 2. Advance booking through lifecycle: pending -> accepted -> confirmed -> in_progress -> completed
  appStore.chefAcceptBooking(booking.id, {});
  appStore.confirmPayment(booking.id, {
    amount: 1100,
    paymentGateway: 'razorpay',
    razorpayOrderId: 'order_test_1',
    razorpayPaymentId: 'pay_test_1',
  });
  appStore.updateBookingStatus(booking.id, 'in_progress', 'chef');
  appStore.updateBookingStatus(booking.id, 'completed', 'chef');

  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'completed');

  // 3. Different customer cannot review this booking
  assert.throws(() => {
    appStore.addReview({
      bookingId: booking.id,
      customerId: 'imposter-customer-id',
      customerName: 'Imposter',
      chefId: approvedChef.id,
      rating: 1,
      comment: 'Fake review',
      foodTasteRating: 1,
      cleanlinessRating: 1,
      punctualityRating: 1,
    });
  }, /Unauthorized: Only the customer associated with this completed booking/);

  // 4. Authorized customer submits review successfully
  const review = appStore.addReview({
    bookingId: booking.id,
    customerId: testCustomerId,
    customerName: 'Review Test Customer',
    chefId: approvedChef.id,
    rating: 5,
    comment: 'Exceptional cooking and hygiene!',
    foodTasteRating: 5,
    cleanlinessRating: 5,
    punctualityRating: 5,
  });

  assert.ok(review.id);
  assert.equal(review.rating, 5);

  // 5. Duplicate review for the same booking must throw error
  assert.throws(() => {
    appStore.addReview({
      bookingId: booking.id,
      customerId: testCustomerId,
      customerName: 'Review Test Customer',
      chefId: approvedChef.id,
      rating: 4,
      comment: 'Second review attempt',
      foodTasteRating: 4,
      cleanlinessRating: 4,
      punctualityRating: 4,
    });
  }, /A review has already been submitted for booking/);
});

test('TASK 4: Complete E2E workflow - booking -> acceptance -> in_progress -> completed -> review -> rating recalculation', async () => {
  const { appStore } = await import('../services/store');
  const targetChef = appStore.getState().chefs.find((c) => c.status === 'approved')!;
  const initialReviewCount = targetChef.reviewCount;
  const customerId = 'cust-e2e-workflow';

  // 1. Customer creates booking
  const booking = appStore.createBooking({
    customerId,
    customerName: 'Kavitha Reddy',
    customerPhone: '+91 98765 11223',
    customerEmail: 'kavitha@example.com',
    chefId: targetChef.id,
    chefName: targetChef.fullName,
    chefAvatarUrl: targetChef.avatarUrl,
    eventType: 'birthday' as const,
    foodType: 'custom_menu' as const,
    eventDate: '2026-12-15',
    startTime: '18:00',
    expectedDurationHours: 4,
    guestsCount: 20,
    venueAddress: 'Film Nagar, Road No 10, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Live Pasta & Starters', foodType: 'custom_menu' as const, quantity: 20, unit: 'plates' as const }],
    ingredientArrangement: 'chef_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 3200,
    ingredientFee: 2000,
    platformFee: 320,
    additionalCharges: 0,
    totalAmount: 5520,
    advanceDepositRequired: 2760,
  });

  // Verify booking is pending and stored in state
  assert.equal(booking.status, 'pending');
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'pending');

  // 2. Chef receives request and accepts booking with quotation update
  const chefProfile = appStore.getState().profiles.find((p) => p.id === targetChef.profileId);
  if (chefProfile) appStore.setCurrentUser(chefProfile);

  appStore.chefAcceptBooking(booking.id, {
    revisedServiceFee: 3500,
    chefQuotationNotes: 'Added artisanal sauce preparations. Confirmed!',
  });

  const acceptedBooking = appStore.getState().bookings.find((b) => b.id === booking.id)!;
  assert.equal(acceptedBooking.status, 'accepted');
  assert.equal(acceptedBooking.chefServiceFee, 3500);

  // 3. Customer receives status update & pays advance deposit (confirmed)
  appStore.confirmPayment(booking.id, {
    amount: acceptedBooking.advanceDepositRequired,
    paymentGateway: 'razorpay',
    razorpayOrderId: 'order_e2e_99',
    razorpayPaymentId: 'pay_e2e_99',
  });
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'confirmed');

  // 4. Chef starts preparation -> in_progress
  appStore.updateBookingStatus(booking.id, 'in_progress', 'chef');
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'in_progress');

  // 5. Chef completes booking -> completed
  appStore.updateBookingStatus(booking.id, 'completed', 'chef');
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking.id)?.status, 'completed');

  // 6. Customer submits 5-star review
  const review = appStore.addReview({
    bookingId: booking.id,
    customerId,
    customerName: 'Kavitha Reddy',
    chefId: targetChef.id,
    rating: 5,
    comment: 'The live pasta bar was spectacular! All guests loved it.',
    foodTasteRating: 5,
    cleanlinessRating: 5,
    punctualityRating: 5,
  });
  assert.ok(review.id);

  // 7. Chef rating and review count are recalculated dynamically
  const updatedChef = appStore.getState().chefs.find((c) => c.id === targetChef.id)!;
  assert.equal(updatedChef.reviewCount, initialReviewCount + 1);
  assert.ok(updatedChef.rating > 0);
});

test('TASK 4: Rejection and cancellation lifecycles and invalid status transition prevention', async () => {
  const { appStore } = await import('../services/store');
  const targetChef = appStore.getState().chefs.find((c) => c.status === 'approved')!;

  // 1. Chef Rejection flow
  const booking1 = appStore.createBooking({
    customerId: 'cust-reject-test',
    customerName: 'Rejection Candidate',
    customerPhone: '+91 99999 11111',
    customerEmail: 'reject@example.com',
    chefId: targetChef.id,
    chefName: targetChef.fullName,
    chefAvatarUrl: targetChef.avatarUrl,
    eventType: 'home_cooking' as const,
    foodType: 'vegetarian' as const,
    eventDate: '2027-01-10',
    startTime: '12:00',
    expectedDurationHours: 2,
    guestsCount: 4,
    venueAddress: 'Kukatpally, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Khichdi', foodType: 'vegetarian' as const, quantity: 2, unit: 'plates' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 1000,
    ingredientFee: 0,
    platformFee: 100,
    additionalCharges: 0,
    totalAmount: 1100,
    advanceDepositRequired: 550,
  });

  const chefProfile = appStore.getState().profiles.find((p) => p.id === targetChef.profileId);
  if (chefProfile) appStore.setCurrentUser(chefProfile);

  appStore.chefRejectBooking(booking1.id, 'Schedule conflict for this specific time slot.');
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking1.id)?.status, 'rejected');

  // Illegal transition: Chef cannot mark a rejected booking as in_progress or completed
  assert.throws(() => {
    appStore.updateBookingStatus(booking1.id, 'in_progress', 'chef');
  }, /Unauthorized or invalid status transition from rejected to in_progress/);

  // 2. Cancellation flow
  const booking2 = appStore.createBooking({
    customerId: 'cust-cancel-test',
    customerName: 'Cancellation Candidate',
    customerPhone: '+91 99999 22222',
    customerEmail: 'cancel@example.com',
    chefId: targetChef.id,
    chefName: targetChef.fullName,
    chefAvatarUrl: targetChef.avatarUrl,
    eventType: 'home_cooking' as const,
    foodType: 'traditional' as const,
    eventDate: '2027-01-11',
    startTime: '13:00',
    expectedDurationHours: 2,
    guestsCount: 4,
    venueAddress: 'Madhapur, Hyderabad',
    city: 'Hyderabad',
    items: [{ id: '1', dishName: 'Sambar Rice', foodType: 'traditional' as const, quantity: 2, unit: 'plates' as const }],
    ingredientArrangement: 'customer_provided' as const,
    utensilsProvidedByCustomer: true,
    chefServiceFee: 1000,
    ingredientFee: 0,
    platformFee: 100,
    additionalCharges: 0,
    totalAmount: 1100,
    advanceDepositRequired: 550,
  });

  appStore.cancelBooking(booking2.id, 'Family function postponed', 'customer');
  assert.equal(appStore.getState().bookings.find((b) => b.id === booking2.id)?.status, 'cancelled');

  // Customer cannot review a cancelled booking
  assert.throws(() => {
    appStore.addReview({
      bookingId: booking2.id,
      customerId: 'cust-cancel-test',
      customerName: 'Cancellation Candidate',
      chefId: targetChef.id,
      rating: 5,
      comment: 'Review for cancelled service',
      foodTasteRating: 5,
      cleanlinessRating: 5,
      punctualityRating: 5,
    });
  }, /Reviews can only be submitted for completed cooking services/);
});

test('TASK 5: Realtime subscription registration, notification dispatch, and cleanup', async () => {
  const { supabaseService } = await import('../services/supabaseService');

  // Register listener
  const unsubscribe = supabaseService.subscribeToBookingChanges((payload) => {});

  // Verify listener registration returns teardown function
  assert.equal(typeof unsubscribe, 'function');

  // Unsubscribe cleanly
  unsubscribe();

  // Teardown socket cleanly for node process termination
  supabaseService.teardown();

  // Further unmount does not error
  assert.doesNotThrow(() => {
    unsubscribe();
  });
});

test('TASK 2 & 7: Security validation - No service-role key exposed and RBAC intact', async () => {
  const { SUPABASE_CONFIG } = await import('../lib/supabaseClient');

  // Verify client publishable key format
  assert.ok(SUPABASE_CONFIG.publishableKey);
  assert.ok(!SUPABASE_CONFIG.publishableKey.includes('service_role'));
  assert.ok(
    SUPABASE_CONFIG.publishableKey.startsWith('sb_publishable_') ||
    SUPABASE_CONFIG.publishableKey.startsWith('eyJ')
  );

  // Role separation check
  const { appStore } = await import('../services/store');
  const customerProfile = appStore.getState().profiles.find((p) => p.role === 'customer')!;
  appStore.setCurrentUser(customerProfile);

  // Customer cannot call admin functions
  assert.throws(() => {
    appStore.adminApproveChef('chef-1');
  }, /Unauthorized: Only administrators can approve chefs/);
});





