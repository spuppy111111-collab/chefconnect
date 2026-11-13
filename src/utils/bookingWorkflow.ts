import { BookingStatus, UserRole, PaymentStatus } from '../types/database';

/**
 * Validates whether a state transition is permitted for a given user role
 */
export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  role: UserRole
): boolean {
  if (role === 'admin') {
    // Admin has superuser override except transitioning completed to pending
    return true;
  }

  if (role === 'customer') {
    // Customer can:
    // 1. Cancel a pending, accepted, or confirmed booking
    if (
      (currentStatus === 'pending' || currentStatus === 'accepted' || currentStatus === 'confirmed') &&
      targetStatus === 'cancelled'
    ) {
      return true;
    }
    // 2. Confirm booking by paying (accepted -> confirmed)
    if (currentStatus === 'accepted' && targetStatus === 'confirmed') {
      return true;
    }
    return false;
  }

  if (role === 'chef') {
    // Chef can:
    // 1. Accept or reject a pending request
    if (currentStatus === 'pending' && (targetStatus === 'accepted' || targetStatus === 'rejected')) {
      return true;
    }
    // 2. Mark confirmed or accepted booking as in_progress (started cooking)
    if ((currentStatus === 'confirmed' || currentStatus === 'accepted') && targetStatus === 'in_progress') {
      return true;
    }
    // 3. Mark in_progress booking as completed
    if (currentStatus === 'in_progress' && targetStatus === 'completed') {
      return true;
    }
    // 4. Emergency cancellation before cooking started
    if (
      (currentStatus === 'pending' || currentStatus === 'accepted' || currentStatus === 'confirmed') &&
      targetStatus === 'cancelled'
    ) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Checks if a booking can be cancelled by a specific role with clear error messages
 */
export function canCancelBooking(
  currentStatus: BookingStatus,
  role: UserRole = 'customer'
): { canCancel: boolean; error?: string } {
  if (currentStatus === 'cancelled') {
    return { canCancel: false, error: 'Booking is already cancelled.' };
  }
  if (currentStatus === 'in_progress') {
    return { canCancel: false, error: 'Cannot cancel a booking that is currently in progress.' };
  }
  if (currentStatus === 'completed') {
    return { canCancel: false, error: 'Cannot cancel a completed booking.' };
  }
  if (currentStatus === 'rejected') {
    return { canCancel: false, error: 'Booking was declined by the chef.' };
  }

  if (['pending', 'accepted', 'confirmed'].includes(currentStatus)) {
    return { canCancel: true };
  }

  return { canCancel: false, error: `Cancellation not allowed for status "${currentStatus}".` };
}

/**
 * Checks for double-booking conflicts for a chef on a target date and time slot
 */
export function hasBookingConflict(
  existingBookings: {
    eventDate: string;
    startTime: string;
    expectedDurationHours: number;
    status: BookingStatus;
    id: string;
  }[],
  newBooking: {
    eventDate: string;
    startTime: string;
    expectedDurationHours: number;
    id?: string;
  }
): boolean {
  // Only active bookings cause conflicts
  const activeBookings = existingBookings.filter(
    (b) =>
      b.id !== newBooking.id &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      b.eventDate === newBooking.eventDate
  );

  const parseToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const newStart = parseToMinutes(newBooking.startTime);
  const newEnd = newStart + newBooking.expectedDurationHours * 60 + 60; // Include 1 hr buffer for travel and cleanup

  for (const existing of activeBookings) {
    const existingStart = parseToMinutes(existing.startTime);
    const existingEnd = existingStart + existing.expectedDurationHours * 60 + 60; // 1 hr buffer

    // Check overlap: (StartA < EndB) and (EndA > StartB)
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }

  return false;
}

/**
 * Get human-readable status badge color and label
 */
export function getBookingStatusBadge(status: BookingStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  stepIndex: number;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending Chef Review',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-200',
        stepIndex: 1,
      };
    case 'accepted':
      return {
        label: 'Quotation Accepted (Awaiting Payment)',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-800',
        borderClass: 'border-blue-200',
        stepIndex: 2,
      };
    case 'confirmed':
      return {
        label: 'Booking Confirmed (Paid)',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-200',
        stepIndex: 3,
      };
    case 'in_progress':
      return {
        label: 'Chef Cooking (In Progress)',
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-800',
        borderClass: 'border-purple-200',
        stepIndex: 4,
      };
    case 'completed':
      return {
        label: 'Cooking Completed',
        bgClass: 'bg-green-100',
        textClass: 'text-green-900',
        borderClass: 'border-green-300',
        stepIndex: 5,
      };
    case 'rejected':
      return {
        label: 'Declined by Chef',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
        stepIndex: 0,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-700',
        borderClass: 'border-stone-200',
        stepIndex: 0,
      };
  }
}

/**
 * Get human-readable payment status badge and label
 */
export function getPaymentStatusBadge(status: PaymentStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'payment_verification_pending':
      return {
        label: 'Verification Pending (UTR Submitted)',
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-900',
        borderClass: 'border-amber-300',
      };
    case 'paid':
      return {
        label: 'Verified & Paid',
        bgClass: 'bg-emerald-100',
        textClass: 'text-emerald-900',
        borderClass: 'border-emerald-300',
      };
    case 'rejected':
      return {
        label: 'Payment Rejected',
        bgClass: 'bg-rose-100',
        textClass: 'text-rose-900',
        borderClass: 'border-rose-300',
      };
    case 'failed':
      return {
        label: 'Payment Failed',
        bgClass: 'bg-rose-100',
        textClass: 'text-rose-900',
        borderClass: 'border-rose-300',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        bgClass: 'bg-purple-100',
        textClass: 'text-purple-900',
        borderClass: 'border-purple-300',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-600',
        borderClass: 'border-stone-300',
      };
    case 'pending':
    default:
      return {
        label: 'Payment Pending',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-700',
        borderClass: 'border-stone-300',
      };
  }
}

/**
 * Validates that a date is today or in the future
 */
export function isDateInPast(dateStr: string): boolean {
  if (!dateStr) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

/**
 * Unified slot availability checker used by both Search and Booking Form.
 * Ensures consistent double-booking prevention across the platform.
 */
export function checkChefAvailabilityForSlot(
  chef: {
    id: string;
    status: string;
    blockedDates?: string[];
    workingDays?: string[];
  },
  existingBookings: {
    chefId: string;
    eventDate: string;
    startTime: string;
    expectedDurationHours: number;
    status: BookingStatus;
    id: string;
  }[],
  slot: {
    eventDate: string;
    startTime: string;
    expectedDurationHours: number;
    excludeBookingId?: string;
  }
): { isAvailable: boolean; reason?: string } {
  if (chef.status !== 'approved') {
    return { isAvailable: false, reason: 'Chef profile is not approved for new bookings' };
  }

  if (isDateInPast(slot.eventDate)) {
    return { isAvailable: false, reason: 'Booking date cannot be in the past' };
  }

  if (chef.blockedDates && chef.blockedDates.includes(slot.eventDate)) {
    return { isAvailable: false, reason: 'Chef has blocked this date for personal leave' };
  }

  // Check day of week against chef's working days if configured
  if (chef.workingDays && chef.workingDays.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const bookingDay = dayNames[new Date(slot.eventDate).getDay()];
    if (!chef.workingDays.includes(bookingDay)) {
      return { isAvailable: false, reason: `Chef does not take bookings on ${bookingDay}s` };
    }
  }

  // Check overlap against active bookings for this chef
  const chefBookings = existingBookings.filter((b) => b.chefId === chef.id);
  const hasConflict = hasBookingConflict(chefBookings, {
    eventDate: slot.eventDate,
    startTime: slot.startTime,
    expectedDurationHours: slot.expectedDurationHours,
    id: slot.excludeBookingId,
  });

  if (hasConflict) {
    return {
      isAvailable: false,
      reason: 'Chef already has an active booking overlapping this time slot (including buffer)',
    };
  }

  return { isAvailable: true };
}

