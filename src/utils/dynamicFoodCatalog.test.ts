import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDynamicFoodCatalog,
  chefOffersFoodItem,
  chefMatchesFoodItems,
  filterAndRankChefs,
} from './foodItemsCatalog';
import { Chef } from '../types/database';

const makeDish = (name: string, category: string) => ({
  name,
  category,
  unit: 'per_dish',
  typicalPrepTimeHours: 1,
  samplePricePerUnit: 250,
});

function createMockChef(overrides: Partial<Chef> = {}): Chef {
  return {
    id: `chef-${Math.random().toString(36).substr(2, 9)}`,
    profileId: 'prof-mock',
    fullName: 'Chef Test',
    phone: '+91 98765 43210',
    email: 'chef@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Professional test chef',
    experienceYears: 8,
    specialties: [],
    supportedEvents: ['wedding', 'birthday'],
    location: 'Banjara Hills, Hyderabad',
    serviceAreas: ['Banjara Hills', 'Jubilee Hills', 'Madhapur'],
    serviceRadius: 15,
    hourlyRate: 800,
    baseCharge: 1500,
    perPersonRate: 350,
    rating: 4.8,
    reviewCount: 24,
    status: 'approved',
    equipmentArrangement: 'brings_own_knives_spices',
    featuredDishes: [],
    workingHours: '08:00 - 22:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    blockedDates: [],
    isAvailableToday: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Dynamic Chef-Based Food Categories & Discovery', () => {
  it('1. Does not display static/master categories when no chefs have registered dishes', () => {
    const catalog = getDynamicFoodCatalog([], []);
    assert.equal(catalog.length, 0, 'Catalog should be empty when no registered chefs offer items');
  });

  it('2. Chef A registers Biryani & Pulao -> both appear in Customer Dashboard catalog', () => {
    const chefA = createMockChef({
      id: 'chef-a',
      fullName: 'Chef A',
      status: 'approved',
      featuredDishes: [
        makeDish('Mutton Dum Biryani', 'Main Course'),
        makeDish('Shahi Veg Pulao', 'Main Course'),
      ],
    });

    const catalog = getDynamicFoodCatalog([chefA], []);
    const allDishes = catalog.flatMap((c) => c.items.map((i) => i.name));

    assert.ok(allDishes.includes('Mutton Dum Biryani'));
    assert.ok(allDishes.includes('Shahi Veg Pulao'));
    assert.ok(!allDishes.includes('Pizza'), 'Pizza must NOT appear since no chef registered it');
  });

  it('3. Chef B registers Dosa & Idli -> both appear under South Indian', () => {
    const chefB = createMockChef({
      id: 'chef-b',
      fullName: 'Chef B',
      status: 'approved',
      featuredDishes: [
        makeDish('Ghee Roast Dosa', 'South Indian'),
        makeDish('Steamed Idli Sambar', 'South Indian'),
      ],
    });

    const catalog = getDynamicFoodCatalog([chefB], []);
    const southIndianCat = catalog.find((c) => c.category === 'South Indian');

    assert.ok(southIndianCat, 'South Indian category should dynamically appear');
    const dishNames = southIndianCat.items.map((i) => i.name);
    assert.ok(dishNames.includes('Ghee Roast Dosa'));
    assert.ok(dishNames.includes('Steamed Idli Sambar'));
  });

  it('4. Chef C also registers Biryani -> Biryani appears only once without duplicates', () => {
    const chefA = createMockChef({
      id: 'chef-a',
      featuredDishes: [makeDish('Hyderabadi Biryani', 'Main Course')],
    });
    const chefC = createMockChef({
      id: 'chef-c',
      featuredDishes: [makeDish('Hyderabadi Biryani', 'Main Course')],
    });

    const catalog = getDynamicFoodCatalog([chefA, chefC], []);
    const mainCourse = catalog.find((c) => c.category === 'Main Course');
    assert.ok(mainCourse);

    const biryaniItems = mainCourse.items.filter((i) => i.name.toLowerCase() === 'hyderabadi biryani');
    assert.equal(biryaniItems.length, 1, 'Distinct grouping: Biryani must appear exactly once');
  });

  it('5. If no chef has registered Pizza -> Pizza does NOT appear in the catalog', () => {
    const chefA = createMockChef({
      featuredDishes: [makeDish('Paneer Butter Masala', 'North Indian')],
    });
    const catalog = getDynamicFoodCatalog([chefA], []);
    const allItems = catalog.flatMap((c) => c.items.map((i) => i.name.toLowerCase()));

    assert.ok(allItems.includes('paneer butter masala'));
    assert.ok(!allItems.includes('pizza'), 'Pizza must NOT appear');
  });

  it('6. When a chef removes a food item -> item disappears from customer dashboard', () => {
    const chef = createMockChef({
      id: 'chef-1',
      featuredDishes: [
        makeDish('Paneer Tikka', 'Snacks & Starters'),
        makeDish('Gulab Jamun', 'Sweets & Desserts'),
      ],
    });

    // Initial state: both appear
    let catalog = getDynamicFoodCatalog([chef], []);
    let allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
    assert.ok(allItems.includes('Paneer Tikka'));
    assert.ok(allItems.includes('Gulab Jamun'));

    // Chef removes Gulab Jamun
    const updatedChef = {
      ...chef,
      featuredDishes: [makeDish('Paneer Tikka', 'Snacks & Starters')],
    };
    catalog = getDynamicFoodCatalog([updatedChef], []);
    allItems = catalog.flatMap((c) => c.items.map((i) => i.name));
    assert.ok(allItems.includes('Paneer Tikka'));
    assert.ok(!allItems.includes('Gulab Jamun'), 'Gulab Jamun should be removed');
    assert.ok(!catalog.some((c) => c.category === 'Sweets & Desserts'), 'Empty category should disappear');
  });

  it('7. Only approved chefs contribute food items; pending or rejected chefs are excluded', () => {
    const pendingChef = createMockChef({
      id: 'chef-pending',
      status: 'pending',
      featuredDishes: [makeDish('Special Lasagna', 'Main Course')],
    });
    const rejectedChef = createMockChef({
      id: 'chef-rejected',
      status: 'rejected',
      featuredDishes: [makeDish('Special Tacos', 'Snacks & Starters')],
    });
    const approvedChef = createMockChef({
      id: 'chef-approved',
      status: 'approved',
      featuredDishes: [makeDish('Dal Makhani', 'North Indian')],
    });

    const catalog = getDynamicFoodCatalog([pendingChef, rejectedChef, approvedChef], []);
    const allDishes = catalog.flatMap((c) => c.items.map((i) => i.name));

    assert.ok(allDishes.includes('Dal Makhani'));
    assert.ok(!allDishes.includes('Special Lasagna'), 'Pending chef dishes must be excluded');
    assert.ok(!allDishes.includes('Special Tacos'), 'Rejected chef dishes must be excluded');
  });

  it('8. Selecting a food item shows ONLY chefs who offer that item', () => {
    const chefBiryani = createMockChef({
      id: 'chef-biryani',
      fullName: 'Chef Biryani Master',
      status: 'approved',
      featuredDishes: [makeDish('Chicken Dum Biryani', 'Main Course')],
    });
    const chefDosa = createMockChef({
      id: 'chef-dosa',
      fullName: 'Chef Dosa Master',
      status: 'approved',
      featuredDishes: [makeDish('Masala Dosa', 'South Indian')],
    });

    const result = filterAndRankChefs({
      chefs: [chefBiryani, chefDosa],
      selectedFoodItems: ['Chicken Dum Biryani'],
      customerLocation: '',
    });

    assert.equal(result.rankedChefs.length, 1);
    assert.equal(result.rankedChefs[0].id, 'chef-biryani');
  });

  it('9. Multi-select: prioritizes chefs who can prepare ALL selected items', () => {
    const chefOnlyBiryani = createMockChef({
      id: 'chef-only-biryani',
      status: 'approved',
      featuredDishes: [makeDish('Chicken Dum Biryani', 'Main Course')],
    });
    const chefBoth = createMockChef({
      id: 'chef-both',
      status: 'approved',
      featuredDishes: [
        makeDish('Chicken Dum Biryani', 'Main Course'),
        makeDish('Gulab Jamun', 'Sweets & Desserts'),
      ],
    });

    const result = filterAndRankChefs({
      chefs: [chefOnlyBiryani, chefBoth],
      selectedFoodItems: ['Chicken Dum Biryani', 'Gulab Jamun'],
      customerLocation: '',
    });

    assert.equal(result.rankedChefs.length, 2);
    assert.equal(result.rankedChefs[0].id, 'chef-both', 'Chef offering ALL items should be ranked first');
    assert.equal(result.totalFullMatches, 1);
    assert.equal(result.totalPartialMatches, 1);
  });

  it('10. Food filter works alongside location, budget, and availability filters', () => {
    const chefFar = createMockChef({
      id: 'chef-far',
      status: 'approved',
      location: 'Bangalore',
      serviceAreas: ['Bangalore North'],
      hourlyRate: 600,
      isAvailableToday: true,
      featuredDishes: [makeDish('Mutton Biryani', 'Main Course')],
    });
    const chefExpensive = createMockChef({
      id: 'chef-expensive',
      status: 'approved',
      location: 'Hyderabad',
      serviceAreas: ['Banjara Hills, Hyderabad'],
      hourlyRate: 3000,
      isAvailableToday: true,
      featuredDishes: [makeDish('Mutton Biryani', 'Main Course')],
    });
    const chefPerfect = createMockChef({
      id: 'chef-perfect',
      status: 'approved',
      location: 'Banjara Hills, Hyderabad',
      serviceAreas: ['Banjara Hills', 'Jubilee Hills'],
      hourlyRate: 800,
      isAvailableToday: true,
      featuredDishes: [makeDish('Mutton Biryani', 'Main Course')],
    });

    const result = filterAndRankChefs({
      chefs: [chefFar, chefExpensive, chefPerfect],
      selectedFoodItems: ['Mutton Biryani'],
      customerLocation: 'Banjara Hills, Hyderabad',
      maxBudget: 1000,
      availableTodayOnly: true,
    });

    assert.equal(result.rankedChefs.length, 1);
    assert.equal(result.rankedChefs[0].id, 'chef-perfect');
  });
});
