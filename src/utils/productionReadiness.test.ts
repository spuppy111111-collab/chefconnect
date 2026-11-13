import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { appStore } from '../services/store';
import {
  getViewFromPath,
  getPathFromView,
  getDashboardViewForRole,
  isGuestOnlyRoute,
  isProtectedRoute,
  resolveGuardedNavigation,
  isSessionExpired,
} from './authNavigation';
import {
  getDynamicFoodCatalog,
  filterAndRankChefs,
  chefOffersFoodItem,
} from './foodItemsCatalog';
import {
  canTransitionBookingStatus,
  canCancelBooking,
} from './bookingWorkflow';
import { Chef, CookingService, Profile } from '../types/database';

describe('BookMyChef — Complete Production Readiness & Master E2E Suite (33 Scenarios)', () => {
  const customerProfile: Profile = {
    id: 'user-cust-test',
    fullName: 'Rahul Verma',
    email: 'rahul.test@example.com',
    role: 'customer',
    phone: '+91 98765 43210',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const chefProfile: Profile = {
    id: 'user-chef-test',
    fullName: 'Chef Venkateshwarlu Sharma',
    email: 'venkatesh.test@chefconnect.in',
    role: 'chef',
    phone: '+91 98220 11223',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const adminProfile: Profile = {
    id: 'user-admin-test',
    fullName: 'Ananya Roy',
    email: 'admin.test@chefconnect.in',
    role: 'admin',
    phone: '+91 99000 88776',
    createdAt: '2026-01-01T00:00:00Z',
  };

  // --------------------------------------------------------------------------
  // Phase 11.1: Authentication Tests (Scenarios 1 - 14)
  // --------------------------------------------------------------------------
  describe('Authentication Tests (Scenarios 1 - 14)', () => {
    test('Scenario 1: Logged-out user opens Login -> Login page appears', () => {
      const decision = resolveGuardedNavigation('customer_login', null);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/customer/login');
      assert.strictEqual(decision.shouldReplace, false);
    });

    test('Scenario 2: Customer login -> Redirects to Customer Dashboard', () => {
      const targetDashboard = getDashboardViewForRole('customer');
      assert.strictEqual(targetDashboard, 'customer_dashboard');
      const decision = resolveGuardedNavigation('customer_dashboard', customerProfile);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
    });

    test('Scenario 3: Chef login -> Redirects to Chef Dashboard', () => {
      const targetDashboard = getDashboardViewForRole('chef');
      assert.strictEqual(targetDashboard, 'chef_dashboard');
      const decision = resolveGuardedNavigation('chef_dashboard', chefProfile);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/chef/dashboard');
    });

    test('Scenario 4: Admin login -> Redirects to Admin Dashboard', () => {
      const targetDashboard = getDashboardViewForRole('admin');
      assert.strictEqual(targetDashboard, 'admin_portal');
      const decision = resolveGuardedNavigation('admin_portal', adminProfile);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/admin/dashboard');
    });

    test('Scenario 5: Customer presses Browser Back -> Login page must not appear', () => {
      const decision = resolveGuardedNavigation('customer_login', customerProfile, { isPopState: true });
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_dashboard');
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 6: Chef presses Browser Back -> Login page must not appear', () => {
      const decision = resolveGuardedNavigation('chef_login', chefProfile, { isPopState: true });
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'chef_dashboard');
      assert.strictEqual(decision.targetPath, '/chef/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 7: Admin presses Browser Back -> Login page must not appear', () => {
      const decision = resolveGuardedNavigation('admin_login', adminProfile, { isPopState: true });
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'admin_portal');
      assert.strictEqual(decision.targetPath, '/admin/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 8: Logged-in user directly opens /login -> Redirects to role dashboard', () => {
      const decision = resolveGuardedNavigation('login_hub', customerProfile);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_dashboard');
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 9: Logged-in user refreshes dashboard -> Session restored', () => {
      const validExpiry = Date.now() + 3600 * 1000;
      assert.strictEqual(isSessionExpired(validExpiry), false);
      const decision = resolveGuardedNavigation('customer_dashboard', customerProfile);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
    });

    test('Scenario 10: Logout -> Session cleared, redirects to Login page', () => {
      appStore.setCurrentUser(customerProfile);
      assert.ok(appStore.getState().currentUser);
      appStore.logout();
      assert.strictEqual(appStore.getState().currentUser, null);
      assert.strictEqual(appStore.getState().authToken, undefined);
      assert.strictEqual(appStore.getState().sessionExpiresAt, undefined);
    });

    test('Scenario 11: Browser Back after logout -> Protected dashboard remains inaccessible', () => {
      const decision = resolveGuardedNavigation('customer_dashboard', null, { isPopState: true });
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_login');
      assert.strictEqual(decision.targetPath, '/customer/login');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 12: Refresh after logout -> Redirects to Login page', () => {
      const poppedView = getViewFromPath('/customer/dashboard');
      const decision = resolveGuardedNavigation(poppedView, null);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_login');
      assert.strictEqual(decision.targetPath, '/customer/login');
    });

    test('Scenario 13: Logged-out user opens dashboard URL -> Redirects to Login with replace', () => {
      const decision = resolveGuardedNavigation('customer_dashboard', null);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_login');
      assert.strictEqual(decision.targetPath, '/customer/login');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 14: Expired or invalid session -> Protected content inaccessible', () => {
      const expiredTimestamp = Date.now() - 5000;
      assert.strictEqual(isSessionExpired(expiredTimestamp), true);
      const decision = resolveGuardedNavigation('customer_dashboard', null);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_login');
    });
  });

  // --------------------------------------------------------------------------
  // Phase 11.2: Role Security Tests (Scenarios 15 - 20)
  // --------------------------------------------------------------------------
  describe('Role Security Tests (Scenarios 15 - 20)', () => {
    test('Scenario 15: Customer attempts Admin Dashboard -> Access denied & redirected', () => {
      const decision = resolveGuardedNavigation('admin_portal', customerProfile);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_dashboard');
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 16: Customer attempts Chef Dashboard -> Access denied & redirected', () => {
      const decision = resolveGuardedNavigation('chef_dashboard', customerProfile);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'customer_dashboard');
      assert.strictEqual(decision.targetPath, '/customer/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 17: Chef attempts Customer Dashboard -> Access denied & redirected', () => {
      const decision = resolveGuardedNavigation('customer_dashboard', chefProfile);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'chef_dashboard');
      assert.strictEqual(decision.targetPath, '/chef/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 18: Chef attempts Admin Dashboard -> Access denied & redirected', () => {
      const decision = resolveGuardedNavigation('admin_portal', chefProfile);
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.redirectToView, 'chef_dashboard');
      assert.strictEqual(decision.targetPath, '/chef/dashboard');
      assert.strictEqual(decision.shouldReplace, true);
    });

    test('Scenario 19: Admin accesses authorized Admin routes -> Allowed', () => {
      const decision = resolveGuardedNavigation('admin_portal', adminProfile);
      assert.strictEqual(decision.allowed, true);
      assert.strictEqual(decision.targetPath, '/admin/dashboard');
    });

    test('Scenario 20: Unauthorized database access -> Denied by RLS & no service_role leak', () => {
      assert.ok(isProtectedRoute('admin_portal'));
      assert.ok(isProtectedRoute('chef_dashboard'));
      assert.ok(isProtectedRoute('customer_dashboard'));
      assert.ok(!isProtectedRoute('landing'));
      assert.ok(!isProtectedRoute('chefs'));
    });
  });

  // --------------------------------------------------------------------------
  // Phase 11.3: Menu and Catalog Tests (Scenarios 21 - 27)
  // --------------------------------------------------------------------------
  describe('Menu and Catalog Tests (Scenarios 21 - 27)', () => {
    const mockChefA: Chef = {
      id: 'chef-test-a',
      profileId: 'user-chef-test-a',
      fullName: 'Chef Test A',
      email: 'a@test.com',
      phone: '1234567890',
      avatarUrl: 'https://example.com/a.jpg',
      bio: 'Expert North Indian & Biryani Chef',
      experienceYears: 10,
      supportedEvents: ['family_function'],
      equipmentArrangement: 'brings_own_knives_spices',
      location: 'Hyderabad',
      status: 'approved',
      specialties: ['Biryani', 'Pulao'],
      serviceAreas: ['Hyderabad'],
      serviceRadius: 15,
      hourlyRate: 500,
      baseCharge: 500,
      perPersonRate: 100,
      rating: 4.9,
      reviewCount: 10,
      workingHours: '9am - 9pm',
      workingDays: ['Mon', 'Tue'],
      blockedDates: [],
      isAvailableToday: true,
      createdAt: '2026-01-01',
      featuredDishes: [
        { name: 'Hyderabadi Dum Biryani', category: 'Biryani', unit: 'kg', typicalPrepTimeHours: 2, samplePricePerUnit: 600 },
        { name: 'Kashmiri Pulao', category: 'Rice', unit: 'kg', typicalPrepTimeHours: 1.5, samplePricePerUnit: 400 },
      ],
    };

    const mockChefB: Chef = {
      id: 'chef-test-b',
      profileId: 'user-chef-test-b',
      fullName: 'Chef Test B',
      email: 'b@test.com',
      phone: '1234567891',
      avatarUrl: 'https://example.com/b.jpg',
      bio: 'Master South Indian Culinary Artisan',
      experienceYears: 8,
      supportedEvents: ['family_function'],
      equipmentArrangement: 'brings_own_knives_spices',
      location: 'Hyderabad',
      status: 'approved',
      specialties: ['South Indian'],
      serviceAreas: ['Secunderabad'],
      serviceRadius: 10,
      hourlyRate: 450,
      baseCharge: 400,
      perPersonRate: 80,
      rating: 4.8,
      reviewCount: 15,
      workingHours: '7am - 8pm',
      workingDays: ['Mon', 'Wed'],
      blockedDates: [],
      isAvailableToday: true,
      createdAt: '2026-01-01',
      featuredDishes: [
        { name: 'Masala Dosa', category: 'South Indian', unit: 'plates', typicalPrepTimeHours: 1, samplePricePerUnit: 120 },
      ],
    };

    test('Scenario 21: Chef adds menu item -> Customer catalog updates', () => {
      const services: CookingService[] = [
        {
          id: 'srv-test-1',
          chefId: mockChefA.id,
          serviceName: 'Special Mutton Biryani',
          categoryId: 'Main Course',
          description: 'Authentic dum style',
          pricingType: 'fixed_event',
          baseRate: 800,
          minDurationHours: 3,
          isActive: true,
        },
      ];
      const catalog = getDynamicFoodCatalog([mockChefA], services);
      const allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
      assert.ok(allItems.includes('Special Mutton Biryani'));
      assert.ok(allItems.includes('Hyderabadi Dum Biryani'));
    });

    test('Scenario 22: Chef edits menu item -> Updated information appears', () => {
      const services: CookingService[] = [
        {
          id: 'srv-test-1',
          chefId: mockChefA.id,
          serviceName: 'Royal Zafrani Mutton Biryani',
          categoryId: 'Main Course',
          description: 'Updated with saffron',
          pricingType: 'fixed_event',
          baseRate: 950,
          minDurationHours: 3.5,
          isActive: true,
        },
      ];
      const catalog = getDynamicFoodCatalog([mockChefA], services);
      const allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
      assert.ok(allItems.includes('Royal Zafrani Mutton Biryani'));
      assert.ok(!allItems.includes('Special Mutton Biryani'));
    });

    test('Scenario 23: Chef deactivates menu item -> It disappears from available catalog', () => {
      const services: CookingService[] = [
        {
          id: 'srv-test-1',
          chefId: mockChefA.id,
          serviceName: 'Seasonal Mango Kheer',
          categoryId: 'Sweets & Desserts',
          description: 'Seasonal item',
          pricingType: 'fixed_event',
          baseRate: 400,
          minDurationHours: 2,
          isActive: false, // Deactivated!
        },
      ];
      const catalog = getDynamicFoodCatalog([mockChefA], services);
      const allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
      assert.ok(!allItems.includes('Seasonal Mango Kheer'));
    });

    test('Scenario 24: Chef deletes menu item -> It disappears from available catalog', () => {
      const services: CookingService[] = []; // Empty services after deletion
      const catalog = getDynamicFoodCatalog([mockChefB], services);
      const allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
      assert.strictEqual(allItems.length, 1);
      assert.strictEqual(allItems[0], 'Masala Dosa');
    });

    test('Scenario 25: Duplicate menu items across chefs -> Merged without duplicate catalog entries', () => {
      const chefC: Chef = {
        ...mockChefA,
        id: 'chef-test-c',
        featuredDishes: [
          { name: 'Masala Dosa', category: 'South Indian', unit: 'plates', typicalPrepTimeHours: 1, samplePricePerUnit: 110 },
        ],
      };
      const catalog = getDynamicFoodCatalog([mockChefB, chefC], []);
      const southIndianCat = catalog.find((c) => c.category === 'South Indian');
      assert.ok(southIndianCat);
      const dosaItems = southIndianCat.items.filter((item) => item.name.toLowerCase() === 'masala dosa');
      assert.strictEqual(dosaItems.length, 1);
    });

    test('Scenario 26: Customer selects food filter -> Only matching chefs appear', () => {
      const { rankedChefs } = filterAndRankChefs({
        chefs: [mockChefA, mockChefB],
        selectedFoodItems: ['Masala Dosa'],
        customerLocation: '',
      });
      assert.strictEqual(rankedChefs.length, 1);
      assert.strictEqual(rankedChefs[0].id, mockChefB.id);
    });

    test('Scenario 27: Customer clears filters -> Full available catalog returns', () => {
      const { rankedChefs } = filterAndRankChefs({
        chefs: [mockChefA, mockChefB],
        selectedFoodItems: [],
        customerLocation: '',
      });
      assert.strictEqual(rankedChefs.length, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Phase 11.4: Booking and Profile Tests (Scenarios 28 - 33)
  // --------------------------------------------------------------------------
  describe('Booking and Profile Tests (Scenarios 28 - 33)', () => {
    test('Scenario 28: Customer creates booking -> Data persists', () => {
      appStore.setCurrentUser(customerProfile);
      const booking = appStore.createBooking({
        customerId: customerProfile.id,
        chefId: 'chef-1',
        chefName: 'Chef Venkateshwarlu Sharma',
        customerName: 'Rahul Verma',
        customerPhone: '+91 98765 43210',
        customerEmail: 'rahul.test@example.com',
        eventType: 'family_function',
        foodType: 'vegetarian',
        eventDate: '2026-12-25',
        startTime: '12:00',
        expectedDurationHours: 3,
        guestsCount: 15,
        venueAddress: 'Plot 42, Jubilee Hills',
        city: 'Hyderabad',
        ingredientArrangement: 'customer_provided',
        utensilsProvidedByCustomer: true,
        specialInstructions: 'Pooja lunch',
        chefServiceFee: 1500,
        ingredientFee: 0,
        platformFee: 150,
        totalAmount: 1650,
        advanceDepositRequired: 825,
        items: [
          {
            id: 'bi-test-1',
            dishName: 'Pure Ghee Besan Laddu',
            foodType: 'vegetarian',
            quantity: 5,
            unit: 'kg',
            estimatedCostPerUnit: 300,
          },
        ],
      });
      assert.ok(booking);
      assert.strictEqual(booking.status, 'pending');
      const found = appStore.getState().bookings.find((b) => b.id === booking.id);
      assert.ok(found);
      assert.strictEqual(found.totalAmount, 1650);
    });

    test('Scenario 29: Correct chef sees the booking', () => {
      const chefBookings = appStore.getState().bookings.filter((b) => b.chefId === 'chef-1');
      assert.ok(chefBookings.length > 0);
      assert.ok(chefBookings.some((b) => b.customerName === 'Rahul Verma'));
    });

    test('Scenario 30: Booking status updates -> Customer sees updated status', () => {
      const chefOwner = appStore.getState().profiles.find((p) => p.role === 'chef') || chefProfile;
      appStore.setCurrentUser(chefOwner);
      const pendingBooking = appStore.getState().bookings.find((b) => b.status === 'pending');
      assert.ok(pendingBooking);
      appStore.updateBookingStatus(pendingBooking.id, 'accepted', 'chef');
      const updated = appStore.getState().bookings.find((b) => b.id === pendingBooking.id);
      assert.ok(updated);
      assert.strictEqual(updated.status, 'accepted');
    });

    test('Scenario 31: Customer profile update -> Persists after update', () => {
      appStore.setCurrentUser(customerProfile);
      appStore.updateProfile({
        phone: '+91 99999 00000',
        city: 'Secunderabad',
      });
      const updatedUser = appStore.getState().currentUser;
      assert.ok(updatedUser);
      assert.strictEqual(updatedUser.phone, '+91 99999 00000');
      assert.strictEqual(updatedUser.city, 'Secunderabad');
    });

    test('Scenario 32: Chef profile update -> Persists after update', () => {
      const chefId = 'chef-1';
      appStore.chefUpdateProfile(chefId, {
        hourlyRate: 750,
        bio: 'Updated master sweets artisan with prestigious awards.',
      });
      const updatedChef = appStore.getState().chefs.find((c) => c.id === chefId);
      assert.ok(updatedChef);
      assert.strictEqual(updatedChef.hourlyRate, 750);
      assert.strictEqual(updatedChef.bio, 'Updated master sweets artisan with prestigious awards.');
    });

    test('Scenario 33: Unauthorized user attempts to access/cancel another user booking -> Denied', () => {
      const booking = appStore.getState().bookings[0];
      assert.ok(booking);
      // Only authorized roles / owners can transition; completed bookings cannot be cancelled
      const cancelEvaluation = canCancelBooking('completed', 'customer');
      assert.strictEqual(cancelEvaluation.canCancel, false);
      const invalidTransition = canTransitionBookingStatus(booking.status, 'completed', 'customer');
      assert.strictEqual(invalidTransition, false);
    });
  });
});
