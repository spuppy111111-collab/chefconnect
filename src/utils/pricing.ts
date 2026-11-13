import { EventType, IngredientArrangement } from '../types/database';

export interface FeeCalculationInput {
  hourlyRate: number;
  baseCharge: number;
  durationHours: number;
  guestsCount: number;
  eventType: EventType;
  items: {
    quantity: number;
    unit: string;
    estimatedCostPerUnit?: number;
  }[];
  ingredientArrangement: IngredientArrangement;
  commissionPercentage?: number;
  taxPercentage?: number;
  additionalCharges?: number;
}

export interface FeeBreakdown {
  chefServiceFee: number;
  ingredientFee: number;
  platformFee: number;
  gstAmount: number;
  additionalCharges: number;
  totalAmount: number;
  advanceDepositRequired: number;
  guestScaleSurcharge: number;
  eventScaleMultiplier: number;
}

/**
 * Multiplier based on event type scale and complexity
 */
export function getEventMultiplier(eventType: EventType): number {
  switch (eventType) {
    case 'wedding':
      return 1.35; // highest complexity & preparation
    case 'festival':
      return 1.25;
    case 'family_function':
    case 'birthday':
      return 1.15;
    case 'corporate_event':
      return 1.2;
    case 'home_cooking':
    case 'other':
    default:
      return 1.0;
  }
}

/**
 * Extra assistant / scale surcharge for large guest counts
 */
export function getGuestScaleSurcharge(guestsCount: number): number {
  if (guestsCount <= 10) return 0;
  if (guestsCount <= 25) return 250;
  if (guestsCount <= 50) return 600;
  if (guestsCount <= 100) return 1200;
  return 1200 + Math.ceil((guestsCount - 100) / 50) * 800;
}

/**
 * Calculate total booking fees with detailed breakdown
 */
export function calculateBookingFees(input: FeeCalculationInput): FeeBreakdown {
  const {
    hourlyRate,
    baseCharge = 500,
    durationHours = 3,
    guestsCount = 6,
    eventType = 'home_cooking',
    items = [],
    ingredientArrangement = 'customer_provided',
    commissionPercentage = 10,
    taxPercentage = 0,
    additionalCharges = 0,
  } = input;

  const validDuration = Math.max(1, durationHours);
  const timeCost = validDuration * Math.max(100, hourlyRate);
  const eventMultiplier = getEventMultiplier(eventType);
  const guestSurcharge = getGuestScaleSurcharge(guestsCount);

  // Raw chef service fee calculation
  const rawServiceFee = (baseCharge + timeCost) * eventMultiplier + guestSurcharge;
  const chefServiceFee = Math.round(rawServiceFee);

  // Ingredient calculation
  let ingredientFee = 0;
  if (ingredientArrangement === 'chef_provided') {
    ingredientFee = items.reduce((acc, item) => {
      const validQty = Math.max(0, item.quantity || 0);
      const unitRate = item.estimatedCostPerUnit || 150;
      return acc + Math.round(validQty * unitRate);
    }, 0);
  }

  // Platform fee
  const subtotalBeforePlatform = chefServiceFee + ingredientFee + additionalCharges;
  const platformFee = Math.round((subtotalBeforePlatform * commissionPercentage) / 100);

  // GST (Goods & Services Tax)
  const gstAmount = taxPercentage > 0 ? Math.round(((subtotalBeforePlatform + platformFee) * taxPercentage) / 100) : 0;

  const totalAmount = chefServiceFee + ingredientFee + additionalCharges + platformFee + gstAmount;

  // Advance deposit (50% of total)
  const advanceDepositRequired = Math.round(totalAmount * 0.5);

  return {
    chefServiceFee,
    ingredientFee,
    platformFee,
    gstAmount,
    additionalCharges,
    totalAmount,
    advanceDepositRequired,
    guestScaleSurcharge: guestSurcharge,
    eventScaleMultiplier: eventMultiplier,
  };
}

/**
 * Calculates cancellation refund according to ChefConnect policy:
 * - More than 24 hours prior to booking: 100% full refund
 * - Between 2 and 24 hours prior: 90% refund (10% chef preparation/reservation charge retained)
 * - Less than 2 hours or no-show: 50% refund
 */
export function calculateCancellationRefund(
  totalPaid: number,
  hoursBeforeEvent: number
): { refundAmount: number; retainedAmount: number; reason: string } {
  if (totalPaid <= 0) {
    return { refundAmount: 0, retainedAmount: 0, reason: 'No payment made' };
  }

  if (hoursBeforeEvent >= 24) {
    return {
      refundAmount: totalPaid,
      retainedAmount: 0,
      reason: '100% Full refund (Cancelled 24+ hours in advance)',
    };
  }

  if (hoursBeforeEvent >= 2) {
    const retained = Math.round(totalPaid * 0.1);
    const refund = totalPaid - retained;
    return {
      refundAmount: refund,
      retainedAmount: retained,
      reason: '90% Refund (10% chef prep and scheduling fee retained for cancellation < 24h)',
    };
  }

  const retained = Math.round(totalPaid * 0.5);
  const refund = totalPaid - retained;
  return {
    refundAmount: refund,
    retainedAmount: retained,
    reason: '50% Refund (Late cancellation under 2 hours)',
  };
}

/**
 * Format currency in Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
