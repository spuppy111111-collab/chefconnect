import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBookingFees,
  getEventMultiplier,
  getGuestScaleSurcharge,
  formatINR,
} from './pricing';

test('getEventMultiplier calculates correct weights for events', () => {
  assert.equal(getEventMultiplier('wedding'), 1.35);
  assert.equal(getEventMultiplier('festival'), 1.25);
  assert.equal(getEventMultiplier('family_function'), 1.15);
  assert.equal(getEventMultiplier('home_cooking'), 1.0);
});

test('getGuestScaleSurcharge handles guest tiers properly', () => {
  assert.equal(getGuestScaleSurcharge(5), 0);
  assert.equal(getGuestScaleSurcharge(20), 250);
  assert.equal(getGuestScaleSurcharge(45), 600);
  assert.equal(getGuestScaleSurcharge(80), 1200);
  assert.equal(getGuestScaleSurcharge(150), 2000);
});

test('calculateBookingFees when customer provides ingredients', () => {
  const result = calculateBookingFees({
    hourlyRate: 500,
    baseCharge: 500,
    durationHours: 3,
    guestsCount: 8,
    eventType: 'home_cooking',
    items: [{ quantity: 5, unit: 'kg', estimatedCostPerUnit: 200 }],
    ingredientArrangement: 'customer_provided',
    commissionPercentage: 10,
  });

  // Base 500 + 3*500 = 2000. Multiplier 1.0, surcharge 0 -> 2000 service fee
  assert.equal(result.chefServiceFee, 2000);
  // Ingredient fee is 0 since customer provides
  assert.equal(result.ingredientFee, 0);
  // Platform fee is 10% of 2000 = 200
  assert.equal(result.platformFee, 200);
  // Total = 2200
  assert.equal(result.totalAmount, 2200);
  // Advance deposit = 50% = 1100
  assert.equal(result.advanceDepositRequired, 1100);
});

test('calculateBookingFees when chef provides ingredients for laddu preparation', () => {
  const result = calculateBookingFees({
    hourlyRate: 600,
    baseCharge: 500,
    durationHours: 4,
    guestsCount: 30, // 600 surcharge
    eventType: 'family_function', // 1.15 multiplier
    items: [{ quantity: 10, unit: 'kg', estimatedCostPerUnit: 350 }], // 3500 ingredients
    ingredientArrangement: 'chef_provided',
    commissionPercentage: 10,
    additionalCharges: 100, // travel allowance
  });

  // (500 + 2400) * 1.15 + 600 = 2900 * 1.15 + 600 = 3335 + 600 = 3935
  assert.equal(result.chefServiceFee, 3935);
  assert.equal(result.ingredientFee, 3500);
  assert.equal(result.additionalCharges, 100);
  // Subtotal = 3935 + 3500 + 100 = 7535. 10% platform = 754
  assert.equal(result.platformFee, 754);
  assert.equal(result.totalAmount, 3935 + 3500 + 100 + 754);
});

test('formatINR formats currency symbol correctly', () => {
  const formatted = formatINR(5000);
  assert.ok(formatted.includes('5,000') || formatted.includes('5000'));
});
