import { Chef, CookingService, CookingCategory } from '../types/database';

export interface FoodItemEntry {
  id: string;
  name: string;
  category: string;
  keywords: string[];
}

export interface FoodCategoryCatalog {
  category: string;
  items: FoodItemEntry[];
}

/**
 * Standard 6 core culinary categories requested for ChefConnect Explore Chefs
 */
export const FOOD_CATALOG: FoodCategoryCatalog[] = [
  {
    category: 'Sweets & Desserts',
    items: [
      { id: 'item-besan-laddoo', name: 'Besan Laddoo', category: 'Sweets & Desserts', keywords: ['besan laddu', 'besan laddoo', 'laddu', 'sweets', 'mithai', 'ghee'] },
      { id: 'item-motichoor-laddu', name: 'Motichoor Laddu', category: 'Sweets & Desserts', keywords: ['motichoor', 'motichoor laddu', 'sweets', 'laddu'] },
      { id: 'item-mysore-pak', name: 'Mysore Pak (Ghee Soft)', category: 'Sweets & Desserts', keywords: ['mysore pak', 'ghee mysore pak', 'sweets', 'mithai'] },
      { id: 'item-gulab-jamun', name: 'Gulab Jamun', category: 'Sweets & Desserts', keywords: ['gulab jamun', 'jamun', 'dessert', 'sweets', 'mithai'] },
      { id: 'item-kaju-katli', name: 'Kaju Katli', category: 'Sweets & Desserts', keywords: ['kaju katli', 'cashew sweet', 'mithai'] },
      { id: 'item-double-ka-meetha', name: 'Double Ka Meetha', category: 'Sweets & Desserts', keywords: ['double ka meetha', 'shahi tukda', 'hyderabadi dessert', 'sweets'] },
      { id: 'item-payasam', name: 'Elai Payasam / Kheer', category: 'Sweets & Desserts', keywords: ['payasam', 'kheer', 'semiya payasam', 'prasadam'] },
      { id: 'item-rawa-sheera', name: 'Satyanarayan Vrat Rawa Sheera', category: 'Sweets & Desserts', keywords: ['sheera', 'sooji halwa', 'satyanarayan vrat', 'prasadam'] },
      { id: 'item-poornam-boorelu', name: 'Poornam Boorelu', category: 'Sweets & Desserts', keywords: ['poornam boorelu', 'boorelu', 'andhra festival sweet', 'prasadam'] },
    ],
  },
  {
    category: 'South Indian',
    items: [
      { id: 'item-dosa', name: 'Dosa', category: 'South Indian', keywords: ['dosa', 'masala dosa', 'ghee roast', 'tiffin', 'south indian', 'andhra'] },
      { id: 'item-masala-dosa', name: 'Ghee Roast Crispy Masala Dosa', category: 'South Indian', keywords: ['dosa', 'masala dosa', 'ghee roast', 'crispy dosa'] },
      { id: 'item-idli', name: 'Idli & Sambar', category: 'South Indian', keywords: ['idli', 'tiffin', 'south indian', 'sambar'] },
      { id: 'item-meda-vada', name: 'Meda Vada Combo', category: 'South Indian', keywords: ['vada', 'meda vada', 'medu vada', 'breakfast', 'tiffin'] },
      { id: 'item-upma', name: 'Rawa Upma', category: 'South Indian', keywords: ['upma', 'rava upma', 'tiffin', 'breakfast'] },
      { id: 'item-gutti-vankaya', name: 'Gutti Vankaya Kura', category: 'South Indian', keywords: ['gutti vankaya', 'brinjal', 'andhra', 'curry'] },
      { id: 'item-andhra-pappu', name: 'Andhra Pappu Charu & Mudda Pappu', category: 'South Indian', keywords: ['pappu', 'mudda pappu', 'charu', 'rasam'] },
      { id: 'item-gongura-mutton', name: 'Gongura Mutton Curry', category: 'South Indian', keywords: ['gongura mutton', 'gongura', 'mutton', 'andhra non-veg'] },
      { id: 'item-curd-rice', name: 'Curd Rice / Bagara Baath', category: 'South Indian', keywords: ['curd rice', 'bagara rice', 'perugu annam'] },
    ],
  },
  {
    category: 'North Indian',
    items: [
      { id: 'item-paneer-butter-masala', name: 'Paneer Butter Masala', category: 'North Indian', keywords: ['paneer butter masala', 'paneer', 'makhani', 'north indian', 'punjabi'] },
      { id: 'item-dal-makhani', name: 'Dal Makhani Slow Cooked', category: 'North Indian', keywords: ['dal makhani', 'black dal', 'north indian', 'punjabi'] },
      { id: 'item-shahi-paneer', name: 'Shahi Paneer', category: 'North Indian', keywords: ['shahi paneer', 'paneer', 'mughlai', 'curry'] },
      { id: 'item-butter-chicken', name: 'Butter Chicken', category: 'North Indian', keywords: ['butter chicken', 'murgh makhani', 'chicken curry', 'north indian'] },
      { id: 'item-chana-masala', name: 'Amritsari Chana Masala', category: 'North Indian', keywords: ['chana masala', 'chole', 'punjabi chole'] },
      { id: 'item-kadai-paneer', name: 'Kadai Paneer', category: 'North Indian', keywords: ['kadai paneer', 'paneer', 'kadai gravy'] },
      { id: 'item-paratha', name: 'Aloo / Gobi Stuffed Paratha', category: 'North Indian', keywords: ['paratha', 'aloo paratha', 'punjabi breakfast'] },
    ],
  },
  {
    category: 'Snacks & Starters',
    items: [
      { id: 'item-samosa', name: 'Punjabi Samosa', category: 'Snacks & Starters', keywords: ['samosa', 'aloo samosa', 'tea snacks', 'chaat'] },
      { id: 'item-mirchi-bajji', name: 'Mirchi Bajji & Onion Pakoda', category: 'Snacks & Starters', keywords: ['mirchi bajji', 'pakoda', 'bajji', 'andhra snacks'] },
      { id: 'item-shami-kebabs', name: 'Shami Kebabs & Mint Chutney', category: 'Snacks & Starters', keywords: ['shami kebab', 'kebabs', 'galouti', 'starters'] },
      { id: 'item-paneer-tikka', name: 'Tandoori Paneer Tikka', category: 'Snacks & Starters', keywords: ['paneer tikka', 'tandoori tikka', 'starters'] },
      { id: 'item-cutlets', name: 'Crispy Veg Cutlets', category: 'Snacks & Starters', keywords: ['cutlet', 'veg cutlet', 'party snacks'] },
      { id: 'item-chilli-paneer', name: 'Indo-Chinese Chilli Paneer', category: 'Snacks & Starters', keywords: ['chilli paneer', 'indo chinese', 'paneer starter'] },
      { id: 'item-spring-rolls', name: 'Vegetable Spring Rolls', category: 'Snacks & Starters', keywords: ['spring rolls', 'crispy rolls', 'chinese appetizer'] },
    ],
  },
  {
    category: 'Main Course',
    items: [
      { id: 'item-mutton-dum-biryani', name: 'Hyderabadi Zafrani Mutton Dum Biryani', category: 'Main Course', keywords: ['mutton biryani', 'dum biryani', 'zafrani biryani', 'deg biryani', 'royal', 'biryani'] },
      { id: 'item-chicken-biryani', name: 'Chicken Biryani', category: 'Main Course', keywords: ['chicken biryani', 'biryani', 'dum biryani', 'wedding feast'] },
      { id: 'item-veg-biryani', name: 'Veg Dum Biryani', category: 'Main Course', keywords: ['veg biryani', 'vegetable biryani', 'dum biryani', 'wedding'] },
      { id: 'item-wedding-pulao', name: 'Shahi Veg Pulao', category: 'Main Course', keywords: ['pulao', 'shahi pulao', 'wedding feast', 'bagara rice'] },
      { id: 'item-banana-leaf-feast', name: 'Authentic Andhra Banana Leaf Grand Feast', category: 'Main Course', keywords: ['banana leaf', 'grand feast', 'wedding meals', 'multi-course'] },
      { id: 'item-mirchi-salan', name: 'Mirchi Ka Salan & Bagara Rice', category: 'Main Course', keywords: ['salan', 'bagara rice', 'hyderabadi'] },
    ],
  },
  {
    category: 'Festival Specials',
    items: [
      { id: 'item-fest-pulihora', name: 'Pulihora', category: 'Festival Specials', keywords: ['pulihora', 'prasadam', 'festival', 'tamarind rice', 'traditional'] },
      { id: 'item-fest-pongali', name: 'Chakkara Pongali', category: 'Festival Specials', keywords: ['pongal', 'pongali', 'chakkara pongali', 'sweet pongal', 'prasadam'] },
      { id: 'item-fest-satvik', name: 'Traditional Satvik Vrat Bhog & Prasadam (No Onion/Garlic)', category: 'Festival Specials', keywords: ['satvik', 'pooja bhog', 'vrat bhog', 'no onion garlic', 'pure veg'] },
      { id: 'item-fest-sundal', name: 'Sundal & Prasadam Platter', category: 'Festival Specials', keywords: ['sundal', 'navaratri prasadam', 'prasadam'] },
      { id: 'item-fest-boorelu', name: 'Poornam Boorelu Combo', category: 'Festival Specials', keywords: ['poornam boorelu', 'boorelu', 'festival sweet'] },
    ],
  },
];

// Flat list of all default food items
export const ALL_FOOD_ITEMS: FoodItemEntry[] = Array.from(
  new Map(
    FOOD_CATALOG.flatMap((cat) => cat.items).map((item) => [item.name.toLowerCase(), item])
  ).values()
);

/**
 * Builds a dynamic food catalog combining:
 * 1. Live cooking services (menu_items table from Supabase / store) for approved chefs
 * 2. Chef featured dishes (live registered chef profiles with status === 'approved')
 *
 * CRITICAL REQUIREMENTS:
 * - Dynamic backend/profile query: only includes dishes and categories offered by active, approved chefs.
 * - If no registered approved chef offers an item or category, it does NOT appear.
 * - Distinct food items: if multiple chefs offer the same dish (e.g. Biryani), it appears only once.
 * - Returns only categories that have at least one registered item.
 */
export function getDynamicFoodCatalog(
  chefs: Chef[] = [],
  cookingServices: CookingService[] = [],
  _categories: CookingCategory[] = []
): FoodCategoryCatalog[] {
  // Map of category name -> Map of foodItemName (lowercase) -> FoodItemEntry
  const categoryMap = new Map<string, Map<string, FoodItemEntry>>();

  // Only consider active, approved chefs
  const approvedChefs = (chefs || []).filter(
    (c) => c.status === 'approved' || !c.status
  );
  const approvedChefIds = new Set(approvedChefs.map((c) => c.id));

  const mapToStandardCategory = (rawCategory: string, dishName: string): string => {
    const text = `${rawCategory} ${dishName}`.toLowerCase();
    if (text.includes('sweet') || text.includes('dessert') || text.includes('laddu') || text.includes('halwai') || text.includes('pak') || text.includes('mithai')) {
      return 'Sweets & Desserts';
    }
    if (text.includes('festival') || text.includes('satvik') || text.includes('prasadam') || text.includes('bhog') || text.includes('pooja') || text.includes('vrat')) {
      return 'Festival Specials';
    }
    if (text.includes('biryani') || text.includes('pulao') || text.includes('main') || text.includes('curry') || text.includes('gravy') || text.includes('meal') || text.includes('feast')) {
      return 'Main Course';
    }
    if (text.includes('starter') || text.includes('snack') || text.includes('kebab') || text.includes('tikka') || text.includes('samosa') || text.includes('bajji')) {
      return 'Snacks & Starters';
    }
    if (text.includes('north') || text.includes('punjabi') || text.includes('paneer') || text.includes('dal') || text.includes('tandoor') || text.includes('paratha')) {
      return 'North Indian';
    }
    if (text.includes('south') || text.includes('andhra') || text.includes('dosa') || text.includes('idli') || text.includes('tiffin') || text.includes('pappu')) {
      return 'South Indian';
    }
    return rawCategory && rawCategory.trim() ? rawCategory.trim() : 'Main Course';
  };

  const addItem = (categoryName: string = '', name: string = '', keywords: (string | undefined | null)[] = []) => {
    if (!name || typeof name !== 'string') return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const validKeywords = (keywords || [])
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim().toLowerCase());

    const stdCategory = mapToStandardCategory(categoryName || '', trimmedName);
    if (!categoryMap.has(stdCategory)) {
      categoryMap.set(stdCategory, new Map());
    }

    const itemsMap = categoryMap.get(stdCategory)!;
    const lowerName = trimmedName.toLowerCase();

    if (!itemsMap.has(lowerName)) {
      itemsMap.set(lowerName, {
        id: `food-${lowerName.replace(/[^a-z0-9]/g, '-')}`,
        name: trimmedName,
        category: stdCategory,
        keywords: Array.from(new Set([lowerName, ...validKeywords])),
      });
    } else {
      const existing = itemsMap.get(lowerName)!;
      validKeywords.forEach((lowerK) => {
        if (!existing.keywords.includes(lowerK)) {
          existing.keywords.push(lowerK);
        }
      });
    }
  };

  // 1. Ingest approved chef featured dishes
  approvedChefs.forEach((chef) => {
    (chef.featuredDishes || []).forEach((dish) => {
      addItem(dish.category || 'Main Course', dish.name, [dish.name, dish.category, ...(chef.specialties || [])]);
    });
  });

  // 2. Ingest live cooking services (menu_items table) for approved chefs only
  (cookingServices || []).forEach((service) => {
    if (service.isActive === false) return;
    if (service.chefId && !approvedChefIds.has(service.chefId)) return;
    addItem(service.categoryId || 'Main Course', service.serviceName, [service.serviceName, service.description || '']);
  });

  // Convert map to sorted FoodCategoryCatalog array
  const result: FoodCategoryCatalog[] = [];
  const standardOrder = [
    'Sweets & Desserts',
    'South Indian',
    'North Indian',
    'Snacks & Starters',
    'Main Course',
    'Festival Specials',
  ];

  standardOrder.forEach((catName) => {
    const itemsMap = categoryMap.get(catName);
    if (itemsMap && itemsMap.size > 0) {
      const items = Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      result.push({ category: catName, items });
    }
  });

  // Append any other dynamically created categories if present
  categoryMap.forEach((itemsMap, catName) => {
    if (!standardOrder.includes(catName)) {
      const items = Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      if (items.length > 0) {
        result.push({ category: catName, items });
      }
    }
  });

  return result;
}

/**
 * Checks whether a single chef offers a specific food item.
 * Evaluates:
 * 1. chef.featuredDishes (name match)
 * 2. chef.services or cookingServices for this chef (serviceName & description)
 * 3. chef.specialties
 */
export function chefOffersFoodItem(
  chef: Chef,
  foodItemName: string,
  cookingServices?: CookingService[]
): boolean {
  if (!foodItemName || !foodItemName.trim()) return false;

  const target = foodItemName.trim().toLowerCase();

  // 1. Check chef's featuredDishes
  const hasInDishes = (chef.featuredDishes || []).some((d) => {
    const dName = (d.name || '').trim().toLowerCase();
    return dName === target || dName.includes(target) || target.includes(dName);
  });
  if (hasInDishes) return true;

  // 2. Check chef's cookingServices (menu_items)
  const chefServices = (chef.services || []).concat(
    (cookingServices || []).filter((s) => s.chefId === chef.id && s.isActive !== false)
  );
  const hasInServices = chefServices.some((s) => {
    const sName = (s.serviceName || '').trim().toLowerCase();
    const sDesc = (s.description || '').toLowerCase();
    return sName === target || sName.includes(target) || target.includes(sName) || sDesc.includes(target);
  });
  if (hasInServices) return true;

  // 3. Check chef's specialties (direct item match)
  const specialties = (chef.specialties || []).map((s) => s.trim().toLowerCase());
  if (specialties.some((s) => s === target || s.includes(target) || target.includes(s))) {
    return true;
  }

  return false;
}

/**
 * Checks whether a chef matches all selected food items.
 */
export function chefMatchesFoodItems(chef: Chef, selectedItemNames: string[]): boolean {
  if (!selectedItemNames || selectedItemNames.length === 0) return true;
  return selectedItemNames.every((item) => chefOffersFoodItem(chef, item));
}

/**
 * Checks whether a chef serves a given customer location.
 */
export function chefServesLocation(chef: Chef, customerLocation: string): boolean {
  if (!customerLocation || !customerLocation.trim()) return true;

  const loc = customerLocation.trim().toLowerCase();
  const chefLoc = (chef.location || '').toLowerCase();
  const chefAreas = (chef.serviceAreas || []).map((a) => a.toLowerCase());

  // Direct match on chef's base location or service areas
  if (chefLoc.includes(loc) || loc.includes(chefLoc)) return true;
  if (chefAreas.some((area) => area.includes(loc) || loc.includes(area))) return true;

  // Common city matching (e.g. Hyderabad, Guntur, Vijayawada, Bangalore, Secunderabad)
  const commonCities = ['hyderabad', 'guntur', 'vijayawada', 'bangalore', 'chennai', 'mumbai', 'delhi', 'pune', 'secunderabad'];
  for (const city of commonCities) {
    if (loc.includes(city) && (chefLoc.includes(city) || chefAreas.some((a) => a.includes(city)))) {
      return true;
    }
  }

  return false;
}

export interface ChefMatchEvaluation {
  chef: Chef;
  matchedItems: string[];
  matchedCount: number;
  totalSelected: number;
  isFullMatch: boolean;
}

/**
 * Filters and ranks chefs based on:
 * 1. Approved status
 * 2. Customer service location coverage (using serviceAreas, location, serviceRadius)
 * 3. Budget (maxHourlyRate if specified)
 * 4. Availability (availableTodayOnly if specified)
 * 5. Selected food items:
 *    - Excludes chefs who do not offer ANY selected food items
 *    - Prioritizes chefs who can prepare ALL selected items (placed first)
 *    - Then sorts partial matches by number of matching items
 *    - Secondary sorting by rating and experience
 * 6. Search query and specialty filter
 */
export function filterAndRankChefs(params: {
  chefs: Chef[];
  selectedFoodItems: string[];
  customerLocation: string;
  searchQuery?: string;
  selectedSpecialtyFilter?: string;
  maxBudget?: number;
  availableTodayOnly?: boolean;
  cookingServices?: CookingService[];
}): {
  rankedChefs: Chef[];
  evaluations: Map<string, ChefMatchEvaluation>;
  totalFullMatches: number;
  totalPartialMatches: number;
} {
  const {
    chefs,
    selectedFoodItems,
    customerLocation,
    searchQuery = '',
    selectedSpecialtyFilter = '',
    maxBudget,
    availableTodayOnly,
    cookingServices = [],
  } = params;

  const evaluations = new Map<string, ChefMatchEvaluation>();
  const eligibleChefs: Chef[] = [];

  const approvedChefs = chefs.filter((c) => c.status === 'approved');

  for (const chef of approvedChefs) {
    // 1. Location filtering
    if (customerLocation.trim() && !chefServesLocation(chef, customerLocation)) {
      continue;
    }

    // 2. Budget filter
    if (typeof maxBudget === 'number' && maxBudget > 0 && chef.hourlyRate > maxBudget) {
      continue;
    }

    // 3. Availability filter
    if (availableTodayOnly && !chef.isAvailableToday) {
      continue;
    }

    // 4. Specialty filter
    if (
      selectedSpecialtyFilter &&
      !(chef.specialties || []).some((s) =>
        s.toLowerCase().includes(selectedSpecialtyFilter.toLowerCase())
      )
    ) {
      continue;
    }

    // 5. Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = chef.fullName.toLowerCase().includes(q);
      const matchLoc =
        chef.location.toLowerCase().includes(q) ||
        (chef.serviceAreas || []).some((a) => a.toLowerCase().includes(q));
      const matchSpec = (chef.specialties || []).some((s) => s.toLowerCase().includes(q));
      const matchDishes = (chef.featuredDishes || []).some((d) => d.name.toLowerCase().includes(q));
      if (!matchName && !matchLoc && !matchSpec && !matchDishes) {
        continue;
      }
    }

    // 6. Food items filtering & prioritization scoring
    if (selectedFoodItems.length > 0) {
      const matchedItems = selectedFoodItems.filter((item) =>
        chefOffersFoodItem(chef, item, cookingServices)
      );

      // Must offer at least one selected item
      if (matchedItems.length === 0) {
        continue;
      }

      const isFullMatch = matchedItems.length === selectedFoodItems.length;

      evaluations.set(chef.id, {
        chef,
        matchedItems,
        matchedCount: matchedItems.length,
        totalSelected: selectedFoodItems.length,
        isFullMatch,
      });

      eligibleChefs.push(chef);
    } else {
      // No food items selected: chef is eligible
      evaluations.set(chef.id, {
        chef,
        matchedItems: [],
        matchedCount: 0,
        totalSelected: 0,
        isFullMatch: true,
      });
      eligibleChefs.push(chef);
    }
  }

  // Rank chefs:
  // 1. Full matches first (isFullMatch === true)
  // 2. matchedCount descending
  // 3. chef.rating descending
  // 4. chef.experienceYears descending
  eligibleChefs.sort((a, b) => {
    const evalA = evaluations.get(a.id);
    const evalB = evaluations.get(b.id);

    if (evalA && evalB) {
      if (evalA.isFullMatch !== evalB.isFullMatch) {
        return evalA.isFullMatch ? -1 : 1;
      }
      if (evalA.matchedCount !== evalB.matchedCount) {
        return evalB.matchedCount - evalA.matchedCount;
      }
    }

    if (b.rating !== a.rating) {
      return (b.rating || 0) - (a.rating || 0);
    }

    return (b.experienceYears || 0) - (a.experienceYears || 0);
  });

  let totalFullMatches = 0;
  let totalPartialMatches = 0;

  evaluations.forEach((ev) => {
    if (ev.totalSelected > 0) {
      if (ev.isFullMatch) totalFullMatches++;
      else totalPartialMatches++;
    }
  });

  return {
    rankedChefs: eligibleChefs,
    evaluations,
    totalFullMatches,
    totalPartialMatches,
  };
}
