import {
  Booking,
  BookingPayment,
  Chef,
  CookingCategory,
  CookingService,
  CustomerAddress,
  DietaryPreferences,
  NotificationItem,
  Profile,
  Review,
  SupportTicket,
  UserRole,
  PlatformConfig,
  BookingStatus,
  ChefAvailability,
  ChefSettlement,
} from '../types/database';
import {
  hasBookingConflict,
  isDateInPast,
  canTransitionBookingStatus,
  canCancelBooking,
} from '../utils/bookingWorkflow';
import { calculateCancellationRefund } from '../utils/pricing';
import { supabaseService } from './supabaseService';

const STORAGE_KEY = 'bookmychef_app_store_v3';

export interface AppState {
  currentUser: Profile | null;
  activeRole: UserRole;
  authToken?: string;
  sessionExpiresAt?: number;
  profiles: Profile[];
  chefs: Chef[];
  categories: CookingCategory[];
  cookingServices: CookingService[];
  bookings: Booking[];
  payments: BookingPayment[];
  reviews: Review[];
  notifications: NotificationItem[];
  supportTickets: SupportTicket[];
  platformConfig: PlatformConfig;
  chefAvailability: ChefAvailability[];
  chefSettlements: ChefSettlement[];
}

const INITIAL_CATEGORIES: CookingCategory[] = [];

const slugifyCategory = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';

const mapCategoryIcon = (name: string): CookingCategory['iconName'] => {
  const value = name.toLowerCase();
  if (value.includes('sweet') || value.includes('laddu') || value.includes('mithai') || value.includes('dessert')) return 'Sparkles';
  if (value.includes('dosa') || value.includes('south') || value.includes('andhra') || value.includes('tiffin') || value.includes('idli')) return 'Flame';
  if (value.includes('festival') || value.includes('pooja') || value.includes('satvik') || value.includes('traditional')) return 'Sun';
  if (value.includes('biryani') || value.includes('kebab') || value.includes('non-veg') || value.includes('mughlai') || value.includes('tandoor')) return 'UtensilsCrossed';
  if (value.includes('wedding') || value.includes('party') || value.includes('bulk') || value.includes('function') || value.includes('catering')) return 'Crown';
  return 'Home';
};

const mapCategoryImage = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('sweet') || value.includes('laddu') || value.includes('mithai')) {
    return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80';
  }
  if (value.includes('dosa') || value.includes('south') || value.includes('andhra')) {
    return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80';
  }
  if (value.includes('festival') || value.includes('pooja') || value.includes('satvik')) {
    return 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80';
  }
  if (value.includes('biryani') || value.includes('kebab') || value.includes('non-veg')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80';
  }
  if (value.includes('wedding') || value.includes('party') || value.includes('bulk') || value.includes('function')) {
    return 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80';
};

const buildDynamicCategories = (chefs: Chef[]): CookingCategory[] => {
  const specialties = new Map<string, CookingCategory>();

  chefs.forEach((chef) => {
    (chef.specialties || []).forEach((specialty) => {
      const name = specialty.trim();
      if (!name) return;
      if (!specialties.has(name.toLowerCase())) {
        const nameText = name.replace(/\s+/g, ' ');
        const popularDishes = (chef.featuredDishes || []).map((dish) => dish.name).slice(0, 3);
        specialties.set(name.toLowerCase(), {
          id: `dyn-${slugifyCategory(nameText)}`,
          name: nameText,
          slug: slugifyCategory(nameText),
          description: `Explore chefs offering ${nameText.toLowerCase()} with authentic flavors, fresh preparation, and trusted home-cooking service.`,
          iconName: mapCategoryIcon(nameText),
          imageUrl: mapCategoryImage(nameText),
          popularDishes: popularDishes.length ? popularDishes : ['Chef special platter', 'Freshly prepared favourites', 'Authentic home-style recipe'],
        });
      }
    });
  });

  const categories = Array.from(specialties.values());
  if (categories.length) return categories;
  return INITIAL_CATEGORIES;
};

const INITIAL_SERVICES: CookingService[] = [
  {
    id: 'srv-1',
    chefId: 'chef-1',
    categoryId: 'cat-sweets',
    serviceName: 'Pure Ghee Besan & Motichoor Laddu Preparation',
    description: 'Master live preparation of traditional laddus for auspicious pujas, housewarmings, and weddings.',
    pricingType: 'per_kg',
    baseRate: 400,
    minDurationHours: 3.0,
    imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-2',
    chefId: 'chef-1',
    categoryId: 'cat-festival',
    serviceName: 'Traditional Satvik Vrat Bhog & Prasadam',
    description: '100% onion-garlic-free holy meals cooked strictly with fresh utensils and sacred protocols.',
    pricingType: 'hourly',
    baseRate: 650,
    minDurationHours: 3.0,
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-3',
    chefId: 'chef-2',
    categoryId: 'cat-andhra',
    serviceName: 'Authentic Andhra Banana Leaf Grand Feast',
    description: 'Multi-course traditional Andhra spread with Pappu Charu, Gongura Mutton, Gutti Vankaya, and sweets.',
    pricingType: 'per_person',
    baseRate: 180,
    minDurationHours: 3.5,
    imageUrl: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-4',
    chefId: 'chef-3',
    categoryId: 'cat-biryani',
    serviceName: 'Live Hyderabadi Deg Dum Biryani & Kebabs',
    description: 'Slow charcoal cooked Zafrani Dum Biryani in heavy copper deg on your terrace or lawn.',
    pricingType: 'per_kg',
    baseRate: 850,
    minDurationHours: 4.0,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
];

const INITIAL_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr-1',
    customerId: 'user-cust-1',
    label: 'Home',
    addressLine: 'Villa 14, Palm Meadows, Jubilee Hills, Road No 36',
    city: 'Hyderabad',
    landmark: 'Near Peddamma Temple',
    isDefault: true,
  },
  {
    id: 'addr-2',
    customerId: 'user-cust-1',
    label: 'Event Venue',
    addressLine: 'Sannidhi Community Hall, Gachibowli Main Rd',
    city: 'Hyderabad',
    landmark: 'Opposite DLF Cybercity Gate 2',
    isDefault: false,
  },
];

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-cust-1',
    role: 'customer',
    fullName: 'Rahul Verma',
    email: 'rahul@example.com',
    phone: '+91 98765 43210',
    address: 'Villa 14, Palm Meadows, Jubilee Hills',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    addresses: INITIAL_ADDRESSES,
    dietaryPreferences: {
      dietType: 'vegetarian',
      spiceLevel: 'medium',
      isNutFree: false,
      isLowOil: true,
      notes: 'Prefer cow ghee and less artificial color in sweets. Mild green chillies.',
    },
    savedChefIds: ['chef-1', 'chef-2'],
    createdAt: '2026-09-15T09:00:00Z',
  },
  {
    id: 'user-chef-1',
    role: 'chef',
    fullName: 'Chef Venkateshwarlu Sharma',
    email: 'venkatesh@chefconnect.in',
    phone: '+91 98220 11223',
    address: 'Near Temple Road, Himayatnagar',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'user-chef-2',
    role: 'chef',
    fullName: 'Chef Lakshmi Devi',
    email: 'lakshmi@chefconnect.in',
    phone: '+91 98440 22334',
    address: 'Madhapur Main Road',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-08-12T11:00:00Z',
  },
  {
    id: 'user-chef-3',
    role: 'chef',
    fullName: 'Chef Farhan Qureshi',
    email: 'farhan@chefconnect.in',
    phone: '+91 98110 33445',
    address: 'Mehdipatnam',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'user-chef-pending',
    role: 'chef',
    fullName: 'Chef Mohan Das',
    email: 'mohan@chefconnect.in',
    phone: '+91 97660 55667',
    address: 'Kukatpally Housing Board',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    createdAt: '2026-10-25T14:30:00Z',
  },
  {
    id: 'user-admin-1',
    role: 'admin',
    fullName: 'Priya Swaminathan',
    email: 'admin@chefconnect.in',
    phone: '+91 99000 88990',
    address: 'ChefConnect HQ, Financial District',
    city: 'Hyderabad',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-07-01T08:00:00Z',
  },
];

const INITIAL_CHEFS: Chef[] = [
  {
    id: 'chef-2',
    profileId: 'user-chef-2',
    fullName: 'Chef Lakshmi Devi',
    email: 'lakshmi@chefconnect.in',
    phone: '+91 98440 22334',
    avatarUrl: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80',
    experienceYears: 14,
    bio: 'Renowned female master chef in authentic Andhra, South Indian live dosas, and healthy everyday home cooking. Known for immaculate kitchen hygiene, warm hospitality, and traditional flavors.',
    specialties: ['Crispy Dosa & South Indian Feasts', 'Traditional Andhra Cuisine', 'Home Cooking', 'Bulk Family Events'],
    supportedEvents: ['family_function', 'wedding', 'home_cooking', 'festival', 'birthday'],
    location: 'Madhapur, Hyderabad',
    serviceAreas: ['Madhapur', 'Gachibowli', 'Kondapur', 'Hitec City', 'Jubilee Hills', 'Kukatpally'],
    serviceRadius: 15,
    hourlyRate: 550,
    baseCharge: 500,
    perPersonRate: 100,
    rating: 4.98,
    reviewCount: 56,
    status: 'approved',
    workingHours: '07:00 AM - 10:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    blockedDates: [],
    equipmentArrangement: 'brings_own_knives_spices',
    isAvailableToday: true,
    featuredDishes: [
      { name: 'Ghee Roast Crispy Masala Dosa', category: 'Tiffin', unit: 'plates', typicalPrepTimeHours: 1.5, samplePricePerUnit: 140 },
      { name: 'Gutti Vankaya Kura', category: 'Vegetarian', unit: 'plates', typicalPrepTimeHours: 2.0, samplePricePerUnit: 160 },
      { name: 'Gongura Mutton Curry', category: 'Non-Veg', unit: 'kg', typicalPrepTimeHours: 2.5, samplePricePerUnit: 600 },
      { name: 'Andhra Pappu Charu & Mudda Pappu', category: 'Vegetarian', unit: 'plates', typicalPrepTimeHours: 1.5, samplePricePerUnit: 120 },
    ],
    createdAt: '2026-08-12T11:00:00Z',
  },
  {
    id: 'chef-1',
    profileId: 'user-chef-1',
    fullName: 'Chef Venkateshwarlu Sharma',
    email: 'venkatesh@chefconnect.in',
    phone: '+91 98220 11223',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80',
    experienceYears: 18,
    bio: 'Master halwai & sweets artisan with 18+ years of expertise. Specializing in temple-style pure ghee laddus, motichoor, kaju sweets, and festive pooja bhog. Trained in Tirupati traditions.',
    specialties: ['Sweets & Laddu Gift Preparation', 'Festival & Satvik Pooja Cooking', 'Home Cooking', 'Bulk Family Events'],
    supportedEvents: ['family_function', 'festival', 'wedding', 'birthday', 'home_cooking'],
    location: 'Himayatnagar, Hyderabad',
    serviceAreas: ['Jubilee Hills', 'Banjara Hills', 'Himayatnagar', 'Begumpet', 'Secunderabad', 'Gachibowli'],
    serviceRadius: 20,
    hourlyRate: 650,
    baseCharge: 600,
    perPersonRate: 120,
    rating: 4.96,
    reviewCount: 48,
    status: 'approved',
    workingHours: '06:00 AM - 09:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    blockedDates: ['2026-11-15'],
    equipmentArrangement: 'brings_own_knives_spices',
    isAvailableToday: true,
    featuredDishes: [
      { name: 'Pure Ghee Besan Laddu', category: 'Sweets', unit: 'kg', typicalPrepTimeHours: 2.5, samplePricePerUnit: 400 },
      { name: 'Motichoor Laddu', category: 'Sweets', unit: 'kg', typicalPrepTimeHours: 3.0, samplePricePerUnit: 450 },
      { name: 'Mysore Pak (Ghee Soft)', category: 'Sweets', unit: 'kg', typicalPrepTimeHours: 2.0, samplePricePerUnit: 500 },
      { name: 'Satyanarayan Vrat Rawa Sheera', category: 'Prasadam', unit: 'kg', typicalPrepTimeHours: 1.5, samplePricePerUnit: 350 },
      { name: 'Pulihora & Meda Vada Combo', category: 'Traditional', unit: 'plates', typicalPrepTimeHours: 2.5, samplePricePerUnit: 180 },
    ],
    createdAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'chef-3',
    profileId: 'user-chef-3',
    fullName: 'Chef Farhan Qureshi',
    email: 'farhan@chefconnect.in',
    phone: '+91 98110 33445',
    avatarUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80',
    experienceYears: 16,
    bio: 'Direct descendant of royal Awadhi & Hyderabadi Bawarchis. Known for charcoal slow-cooked Zafrani Dum Biryani, melt-in-mouth Galouti kebabs, and party live-cooking counters.',
    specialties: ['Dum Biryani & Kebabs', 'Birthday Party Cooking', 'Wedding & Function Cooking', 'Non-Vegetarian Meals'],
    supportedEvents: ['birthday', 'family_function', 'wedding', 'corporate_event'],
    location: 'Mehdipatnam, Hyderabad',
    serviceAreas: ['Mehdipatnam', 'Banjara Hills', 'Tolichowki', 'Gachibowli', 'Attapur'],
    serviceRadius: 18,
    hourlyRate: 700,
    baseCharge: 750,
    perPersonRate: 150,
    rating: 4.95,
    reviewCount: 62,
    status: 'approved',
    workingHours: '10:00 AM - 11:00 PM',
    workingDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    blockedDates: [],
    equipmentArrangement: 'brings_full_commercial_kit',
    isAvailableToday: true,
    featuredDishes: [
      { name: 'Hyderabadi Zafrani Mutton Dum Biryani', category: 'Biryani', unit: 'kg', typicalPrepTimeHours: 3.5, samplePricePerUnit: 850 },
      { name: 'Shami Kebabs & Mint Chutney', category: 'Starters', unit: 'plates', typicalPrepTimeHours: 2.0, samplePricePerUnit: 250 },
      { name: 'Mirchi Ka Salan & Bagara Rice', category: 'Mughlai', unit: 'plates', typicalPrepTimeHours: 2.0, samplePricePerUnit: 180 },
    ],
    createdAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'chef-4',
    profileId: 'user-chef-pending',
    fullName: 'Chef Mohan Das',
    email: 'mohan@chefconnect.in',
    phone: '+91 97660 55667',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    experienceYears: 10,
    bio: 'Specialist in North Indian Tandoor, Punjabi curries, and live snacks for birthday parties. Seeking platform onboarding approval.',
    specialties: ['Birthday Party Cooking', 'Home Cooking', 'Vegetarian Meals'],
    supportedEvents: ['birthday', 'home_cooking', 'family_function'],
    location: 'Kukatpally, Hyderabad',
    serviceAreas: ['Kukatpally', 'Miyapur', 'Nizampet', 'KPHB'],
    serviceRadius: 12,
    hourlyRate: 500,
    baseCharge: 450,
    perPersonRate: 90,
    rating: 4.80,
    reviewCount: 12,
    status: 'pending',
    workingHours: '08:00 AM - 09:00 PM',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    blockedDates: [],
    equipmentArrangement: 'brings_own_knives_spices',
    isAvailableToday: true,
    featuredDishes: [
      { name: 'Paneer Butter Masala', category: 'Vegetarian', unit: 'plates', typicalPrepTimeHours: 1.5, samplePricePerUnit: 150 },
      { name: 'Dal Makhani Slow Cooked', category: 'Vegetarian', unit: 'plates', typicalPrepTimeHours: 2.5, samplePricePerUnit: 140 },
    ],
    createdAt: '2026-10-25T14:30:00Z',
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-101',
    bookingNumber: 'CC-BK-7491',
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul@example.com',
    chefId: 'chef-1',
    chefName: 'Chef Venkateshwarlu Sharma',
    chefAvatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80',
    eventType: 'family_function',
    foodType: 'sweets',
    eventDate: '2026-11-04',
    startTime: '09:00',
    expectedDurationHours: 4,
    guestsCount: 45,
    venueAddress: 'Villa 14, Palm Meadows, Jubilee Hills',
    city: 'Hyderabad',
    items: [
      {
        id: 'bi-1',
        dishName: 'Tirupati Style Besan Laddu',
        foodType: 'sweets',
        quantity: 10,
        unit: 'kg',
        estimatedCostPerUnit: 350,
        specialInstructions: 'Use pure cow ghee, roasted cashews, and cardamoms. Need 10 kg packed for family guests.',
      },
      {
        id: 'bi-2',
        dishName: 'Mysore Pak',
        foodType: 'sweets',
        quantity: 5,
        unit: 'kg',
        estimatedCostPerUnit: 400,
        specialInstructions: 'Melt-in-mouth texture, not brittle.',
      },
    ],
    ingredientArrangement: 'chef_provided',
    utensilsProvidedByCustomer: true,
    specialInstructions: 'Gas stove and large heavy-bottom kadai are provided in our kitchen. Chef to bring special moulds.',
    chefServiceFee: 3950,
    ingredientFee: 5500,
    platformFee: 945,
    additionalCharges: 0,
    totalAmount: 10395,
    advanceDepositRequired: 5198,
    status: 'accepted',
    chefQuotationNotes: 'Quotation confirmed! I will bring fresh Nandini cow ghee, premium gram flour, and dry fruits directly from market.',
    paymentStatus: 'pending',
    createdAt: '2026-10-27T10:15:00Z',
    updatedAt: '2026-10-27T12:00:00Z',
  },
  {
    id: 'bk-102',
    bookingNumber: 'CC-BK-6320',
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul@example.com',
    chefId: 'chef-2',
    chefName: 'Chef Lakshmi Devi',
    chefAvatarUrl: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&w=200&q=80',
    eventType: 'festival',
    foodType: 'traditional',
    eventDate: '2026-10-20',
    startTime: '08:30',
    expectedDurationHours: 3.5,
    guestsCount: 20,
    venueAddress: 'Villa 14, Palm Meadows, Jubilee Hills',
    city: 'Hyderabad',
    items: [
      {
        id: 'bi-3',
        dishName: 'Traditional Andhra Banana Leaf Meal',
        foodType: 'traditional',
        quantity: 20,
        unit: 'plates',
        estimatedCostPerUnit: 150,
      },
    ],
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: true,
    specialInstructions: 'Deepavali family gathering lunch. Spicy Andhra style.',
    chefServiceFee: 2650,
    ingredientFee: 0,
    platformFee: 265,
    additionalCharges: 0,
    totalAmount: 2915,
    advanceDepositRequired: 1458,
    status: 'completed',
    paymentStatus: 'paid',
    createdAt: '2026-10-18T08:00:00Z',
    updatedAt: '2026-10-20T14:00:00Z',
  },
  {
    id: 'bk-103',
    bookingNumber: 'CC-BK-9182',
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    customerEmail: 'rahul@example.com',
    chefId: 'chef-3',
    chefName: 'Chef Farhan Qureshi',
    chefAvatarUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=200&q=80',
    eventType: 'birthday',
    foodType: 'non_vegetarian',
    eventDate: '2026-11-08',
    startTime: '17:00',
    expectedDurationHours: 4,
    guestsCount: 30,
    venueAddress: 'Villa 14, Palm Meadows, Jubilee Hills',
    city: 'Hyderabad',
    items: [
      {
        id: 'bi-4',
        dishName: 'Hyderabadi Zafrani Mutton Dum Biryani',
        foodType: 'non_vegetarian',
        quantity: 8,
        unit: 'kg',
        estimatedCostPerUnit: 750,
      },
      {
        id: 'bi-5',
        dishName: 'Shami Kebabs',
        foodType: 'non_vegetarian',
        quantity: 30,
        unit: 'plates',
        estimatedCostPerUnit: 180,
      },
    ],
    ingredientArrangement: 'customer_provided',
    utensilsProvidedByCustomer: false,
    specialInstructions: 'Chef will bring his own heavy copper deg (biryani handi) and charcoal setup for the lawn.',
    chefServiceFee: 4100,
    ingredientFee: 0,
    platformFee: 410,
    additionalCharges: 500,
    additionalChargesNotes: 'Includes traditional copper deg, seal dough & charcoal',
    totalAmount: 5010,
    advanceDepositRequired: 2505,
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2026-10-26T11:00:00Z',
    updatedAt: '2026-10-26T15:20:00Z',
  },
];

const INITIAL_PAYMENTS: BookingPayment[] = [
  {
    id: 'pay-1',
    bookingId: 'bk-102',
    customerId: 'user-cust-1',
    amount: 2915,
    currency: 'INR',
    paymentGateway: 'razorpay',
    razorpayPaymentId: 'pay_rzp_mock_82910',
    razorpayOrderId: 'order_rzp_7718',
    status: 'paid',
    receiptNumber: 'RCPT-2026-102',
    paidAt: '2026-10-18T08:30:00Z',
  },
  {
    id: 'pay-2',
    bookingId: 'bk-103',
    customerId: 'user-cust-1',
    amount: 2505,
    currency: 'INR',
    paymentGateway: 'razorpay',
    razorpayPaymentId: 'pay_rzp_mock_94812',
    razorpayOrderId: 'order_rzp_9931',
    status: 'paid',
    receiptNumber: 'RCPT-2026-103',
    paidAt: '2026-10-26T15:20:00Z',
  },
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    bookingId: 'bk-102',
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    chefId: 'chef-2',
    rating: 5,
    comment: 'Chef Lakshmi cooked our Deepavali lunch at home. The Gutti Vankaya and Gongura curry tasted like a royal traditional feast! Super punctual and cleaned the kitchen spotless.',
    foodTasteRating: 5,
    cleanlinessRating: 5,
    punctualityRating: 5,
    createdAt: '2026-10-20T16:00:00Z',
  },
  {
    id: 'rev-2',
    bookingId: 'bk-prev-1',
    customerId: 'user-cust-2',
    customerName: 'Ananya Deshmukh',
    chefId: 'chef-1',
    rating: 5,
    comment: 'We booked Chef Venkatesh for 15 kg of pure ghee Motichoor and Besan laddus for my sister’s engagement. Everyone asked for the recipe! He managed the kitchen with supreme mastery.',
    foodTasteRating: 5,
    cleanlinessRating: 5,
    punctualityRating: 5,
    createdAt: '2026-10-15T18:00:00Z',
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    recipientId: 'user-cust-1',
    recipientRole: 'customer',
    title: 'Quotation Accepted by Chef Venkatesh',
    message: 'Chef Venkateshwarlu Sharma has accepted your booking request (CC-BK-7491) for 10 kg Besan Laddu. Review the quotation and proceed to pay the deposit.',
    type: 'booking_accepted',
    bookingId: 'bk-101',
    read: false,
    createdAt: '2026-10-27T12:00:00Z',
  },
  {
    id: 'notif-2',
    recipientId: 'user-chef-1',
    recipientRole: 'chef',
    title: 'New Booking Request',
    message: 'Rahul Verma requested 10 kg Besan Laddu & 5 kg Mysore Pak for a Family Function on 04 Nov 2026.',
    type: 'booking_request',
    bookingId: 'bk-101',
    read: true,
    createdAt: '2026-10-27T10:15:00Z',
  },
];

const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    customerId: 'user-cust-1',
    customerName: 'Rahul Verma',
    customerEmail: 'rahul@example.com',
    bookingId: 'bk-101',
    subject: 'Special gas cylinder requirement for sweet moulds',
    category: 'booking',
    message: 'Hi support team, I wanted to confirm if the chef brings specialized high-flame burners or if standard residential pipeline is sufficient.',
    status: 'resolved',
    createdAt: '2026-10-27T11:00:00Z',
  },
];

class StoreManager {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
    // Connect to Supabase Realtime for live booking & review synchronization in browser context
    if (typeof window !== 'undefined') {
      supabaseService.subscribeToBookingChanges((payload) => {
        if (!payload) return;

        // 1. Handle Booking Events (INSERT, UPDATE)
        if (payload.type === 'booking' && payload.new) {
          const remote = payload.new;
          const local = this.state.bookings.find(
            (b) => b.id === remote.id || b.bookingNumber === remote.booking_number
          );

          if (local) {
            // Update existing booking
            let changed = false;
            if (local.status !== remote.status) {
              local.status = remote.status;
              changed = true;
            }
            if (remote.chef_quotation_notes && local.chefQuotationNotes !== remote.chef_quotation_notes) {
              local.chefQuotationNotes = remote.chef_quotation_notes;
              changed = true;
            }
            if (remote.total_amount && local.totalAmount !== Number(remote.total_amount)) {
              local.totalAmount = Number(remote.total_amount);
              changed = true;
            }
            if (changed) {
              local.updatedAt = remote.updated_at || new Date().toISOString();
              this.notify();
            }
          } else if (payload.eventType === 'INSERT') {
            // New booking created by customer on another client
            const newBooking: Booking = {
              id: remote.id,
              bookingNumber: remote.booking_number,
              customerId: remote.customer_id || '',
              customerName: remote.customer_name,
              customerPhone: remote.customer_phone || '',
              customerEmail: remote.customer_email || '',
              chefId: remote.chef_id || '',
              chefName: remote.chef_name,
              chefAvatarUrl: remote.chef_avatar_url || '',
              eventType: remote.event_type,
              foodType: remote.food_type,
              eventDate: remote.event_date,
              startTime: remote.start_time,
              expectedDurationHours: Number(remote.expected_duration_hours || 3),
              guestsCount: Number(remote.guests_count || 10),
              venueAddress: remote.venue_address,
              city: remote.city || 'Hyderabad',
              items: [],
              ingredientArrangement: remote.ingredient_arrangement,
              utensilsProvidedByCustomer: true,
              specialInstructions: remote.special_instructions,
              chefServiceFee: Number(remote.chef_service_fee || 0),
              ingredientFee: Number(remote.ingredient_fee || 0),
              platformFee: Number(remote.platform_fee || 0),
              additionalCharges: 0,
              totalAmount: Number(remote.total_amount || 0),
              advanceDepositRequired: Number(remote.advance_deposit_required || 0),
              status: remote.status,
              paymentStatus: remote.payment_status || 'pending',
              createdAt: remote.created_at || new Date().toISOString(),
              updatedAt: remote.updated_at || new Date().toISOString(),
            };
            this.state.bookings.unshift(newBooking);
            this.notify();
          }
        }

        // 2. Handle Review Events (INSERT, UPDATE)
        if (payload.type === 'review' && payload.new) {
          const remote = payload.new;
          const local = this.state.reviews.find((r) => r.id === remote.id || r.bookingId === remote.booking_id);

          if (!local && payload.eventType === 'INSERT') {
            const newReview: Review = {
              id: remote.id,
              bookingId: remote.booking_id,
              customerId: remote.customer_id || '',
              customerName: remote.customer_name,
              chefId: remote.chef_id,
              rating: remote.rating,
              comment: remote.comment || '',
              foodTasteRating: remote.food_taste_rating || 5,
              cleanlinessRating: remote.cleanliness_rating || 5,
              punctualityRating: remote.punctuality_rating || 5,
              chefReply: remote.chef_reply,
              chefReplyAt: remote.chef_reply_at,
              createdAt: remote.created_at || new Date().toISOString(),
            };
            this.state.reviews.unshift(newReview);

            // Update chef aggregate stats
            const chefReviews = this.state.reviews.filter((r) => r.chefId === newReview.chefId);
            const avgRating = chefReviews.reduce((sum, r) => sum + r.rating, 0) / chefReviews.length;
            const chef = this.state.chefs.find((c) => c.id === newReview.chefId);
            if (chef) {
              chef.rating = Number(avgRating.toFixed(2));
              chef.reviewCount = chefReviews.length;
            }
            this.notify();
          } else if (local && remote.chef_reply) {
            local.chefReply = remote.chef_reply;
            local.chefReplyAt = remote.chef_reply_at || new Date().toISOString();
            this.notify();
          }
        }

        // 3. Handle Chef Profile Events (UPDATE, INSERT)
        if (payload.type === 'chef_profile' && payload.new) {
          const remote = payload.new;
          const localChef = this.state.chefs.find(
            (c) => c.id === remote.id || c.profileId === remote.profile_id
          );
          if (localChef) {
            if (remote.full_name) localChef.fullName = remote.full_name;
            if (remote.phone) localChef.phone = remote.phone;
            if (remote.email) localChef.email = remote.email;
            if (remote.avatar_url) localChef.avatarUrl = remote.avatar_url;
            if (remote.bio) localChef.bio = remote.bio;
            if (remote.experience_years !== undefined) localChef.experienceYears = Number(remote.experience_years);
            if (remote.specialties) localChef.specialties = remote.specialties;
            if (remote.location) localChef.location = remote.location;
            if (remote.service_areas) localChef.serviceAreas = remote.service_areas;
            if (remote.service_radius !== undefined) localChef.serviceRadius = Number(remote.service_radius);
            if (remote.hourly_rate !== undefined) localChef.hourlyRate = Number(remote.hourly_rate);
            if (remote.base_charge !== undefined) localChef.baseCharge = Number(remote.base_charge);
            if (remote.per_person_rate !== undefined) localChef.perPersonRate = Number(remote.per_person_rate);
            if (remote.status) localChef.status = remote.status;
            if (remote.working_hours) localChef.workingHours = remote.working_hours;
            if (remote.working_days) localChef.workingDays = remote.working_days;
            if (remote.blocked_dates) localChef.blockedDates = remote.blocked_dates;
            this.notify();
          }
        }

        // 4. Handle Notification Events (INSERT, UPDATE)
        if (payload.type === 'notification' && payload.new) {
          const remote = payload.new;
          const local = this.state.notifications.find((n) => n.id === remote.id);
          if (!local && (payload.eventType === 'INSERT' || !local)) {
            const newNotif: NotificationItem = {
              id: remote.id,
              recipientId: remote.recipient_id,
              recipientRole: remote.recipient_role || 'customer',
              title: remote.title,
              message: remote.message,
              type: remote.type || 'system',
              bookingId: remote.booking_id,
              read: Boolean(remote.read),
              createdAt: remote.created_at || new Date().toISOString(),
            };
            this.state.notifications.unshift(newNotif);
            this.notify();
          } else if (local && remote.read !== undefined && local.read !== Boolean(remote.read)) {
            local.read = Boolean(remote.read);
            this.notify();
          }
        }

        // 5. Handle Menu Item Events (INSERT, UPDATE, DELETE) for dynamic food catalog
        if (payload.type === 'menu_item') {
          if (payload.eventType === 'DELETE' && payload.old?.id) {
            this.state.cookingServices = this.state.cookingServices.filter((s) => s.id !== payload.old.id);
            this.notify();
          } else if (payload.new) {
            const remote = payload.new;
            const existingIndex = this.state.cookingServices.findIndex((s) => s.id === remote.id);
            const mappedService: CookingService = {
              id: remote.id,
              chefId: remote.chef_id,
              serviceName: remote.service_name || remote.name || 'Specialty Dish',
              categoryId: remote.category_id || remote.category || 'Main Course',
              description: remote.description || '',
              pricingType: 'fixed_event',
              baseRate: Number(remote.base_rate || remote.price || 0),
              minDurationHours: Number(remote.min_duration_hours || 2),
              isActive: remote.is_active !== undefined ? Boolean(remote.is_active) : (remote.is_available !== false),
            };

            if (existingIndex >= 0) {
              this.state.cookingServices[existingIndex] = {
                ...this.state.cookingServices[existingIndex],
                ...mappedService,
              };
            } else {
              this.state.cookingServices.push(mappedService);
            }
            this.notify();
          }
        }
      });

      // Hydrate with remote menu items from Supabase if present
      supabaseService.fetchChefMenuItems().then((remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          remoteItems.forEach((remoteItem) => {
            const idx = this.state.cookingServices.findIndex((s) => s.id === remoteItem.id);
            if (idx >= 0) {
              this.state.cookingServices[idx] = { ...this.state.cookingServices[idx], ...remoteItem };
            } else {
              this.state.cookingServices.push(remoteItem);
            }
          });
          this.notify();
        }
      }).catch(() => {});
    }
  }

  private loadState(): AppState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.chefAvailability) parsed.chefAvailability = [];
        if (!parsed.chefSettlements) parsed.chefSettlements = [];
        parsed.categories = buildDynamicCategories(parsed.chefs || INITIAL_CHEFS);

        // Persistent Session & Token validation
        if (parsed.currentUser && parsed.sessionExpiresAt) {
          if (Date.now() > parsed.sessionExpiresAt) {
            console.warn('Authentication session expired on load. Logging out.');
            parsed.currentUser = null;
            parsed.authToken = undefined;
            parsed.sessionExpiresAt = undefined;
          }
        }
        return parsed;
      }
    } catch {
      // ignore
    }

    const defaultState: AppState = {
      currentUser: null,
      activeRole: 'customer',
      profiles: INITIAL_PROFILES,
      chefs: INITIAL_CHEFS,
      categories: buildDynamicCategories(INITIAL_CHEFS),
      cookingServices: INITIAL_SERVICES,
      bookings: INITIAL_BOOKINGS,
      payments: INITIAL_PAYMENTS,
      reviews: INITIAL_REVIEWS,
      notifications: INITIAL_NOTIFICATIONS,
      supportTickets: INITIAL_SUPPORT_TICKETS,
      platformConfig: {
        commissionPercentage: 10,
        taxPercentage: 5,
        minAdvancePaymentPercentage: 50,
        cancellationRefundThresholdHours: 24,
        supportPhone: '+91 800-243-3266',
        supportEmail: 'support@chefconnect.in',
      },
      chefAvailability: [],
      chefSettlements: [],
    };

    this.saveState(defaultState);
    return defaultState;
  }

  private saveState(state: AppState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.state.categories = buildDynamicCategories(this.state.chefs);
    this.saveState(this.state);
    this.listeners.forEach((fn) => fn());
  }

  // --- Auth & Role Switching ---

  public switchRole(role: UserRole) {
    this.state.activeRole = role;
    if (role === 'customer') {
      this.state.currentUser = this.state.profiles.find((p) => p.role === 'customer') || null;
    } else if (role === 'chef') {
      this.state.currentUser = this.state.profiles.find((p) => p.role === 'chef') || null;
    } else if (role === 'admin') {
      this.state.currentUser = this.state.profiles.find((p) => p.role === 'admin') || null;
    }
    this.notify();
  }

  public setCurrentUser(user: Profile | null, sessionDurationHours: number = 24) {
    this.state.currentUser = user;
    if (user) {
      this.state.activeRole = user.role;
      this.state.sessionExpiresAt = Date.now() + sessionDurationHours * 3600 * 1000;
      this.state.authToken = `token_${user.id}_${Date.now()}`;
    } else {
      this.state.sessionExpiresAt = undefined;
      this.state.authToken = undefined;
    }
    this.notify();
  }

  public logout() {
    this.state.currentUser = null;
    this.state.sessionExpiresAt = undefined;
    this.state.authToken = undefined;
    this.notify();
    supabaseService.signOut().catch(() => { });
  }

  public updateProfile(
    profileIdOrUpdates: string | Partial<Profile>,
    maybeUpdates?: Partial<Profile>
  ) {
    let targetId = this.state.currentUser?.id;
    let updates: Partial<Profile>;

    if (typeof profileIdOrUpdates === 'string') {
      targetId = profileIdOrUpdates;
      updates = maybeUpdates || {};
    } else {
      updates = profileIdOrUpdates;
    }

    if (!targetId) return;

    this.state.profiles = this.state.profiles.map((p) =>
      p.id === targetId ? { ...p, ...updates } : p
    );
    if (this.state.currentUser && this.state.currentUser.id === targetId) {
      this.state.currentUser = { ...this.state.currentUser, ...updates };
    }
    this.notify();
    supabaseService.syncUserProfile(targetId, updates).catch(() => {});
  }

  // --- Customer Favorites & Addresses ---

  public toggleSaveChef(chefId: string) {
    if (!this.state.currentUser) return;
    const currentSaved = this.state.currentUser.savedChefIds || [];
    const exists = currentSaved.includes(chefId);
    const updated = exists ? currentSaved.filter((id) => id !== chefId) : [...currentSaved, chefId];
    this.updateProfile({ savedChefIds: updated });
  }

  public addCustomerAddress(address: Omit<CustomerAddress, 'id'>) {
    if (!this.state.currentUser) return;
    const newAddress: CustomerAddress = {
      ...address,
      id: `addr-${Date.now()}`,
    };
    const currentAddresses = this.state.currentUser.addresses || [];
    const updated = [...currentAddresses, newAddress];
    this.updateProfile({ addresses: updated });
  }

  public deleteCustomerAddress(addressId: string) {
    if (!this.state.currentUser) return;
    const currentAddresses = this.state.currentUser.addresses || [];
    const updated = currentAddresses.filter((a) => a.id !== addressId);
    this.updateProfile({ addresses: updated });
  }

  public setDefaultAddress(addressId: string) {
    if (!this.state.currentUser) return;
    const currentAddresses = this.state.currentUser.addresses || [];
    const updated = currentAddresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    this.updateProfile({ addresses: updated });
  }

  public updateCustomerPreferences(prefs: DietaryPreferences) {
    this.updateProfile({ dietaryPreferences: prefs });
  }

  // --- Registration ---

  public registerCustomer(data: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    avatarUrl?: string;
    authProvider?: 'email' | 'google';
  }): Profile {
    const newProfile: Profile = {
      id: `user-cust-${Date.now()}`,
      role: 'customer',
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.fullName)}`,
      authProvider: data.authProvider || 'email',
      addresses: [
        {
          id: `addr-${Date.now()}`,
          customerId: `user-cust-${Date.now()}`,
          label: 'Home',
          addressLine: data.address,
          city: data.city,
          isDefault: true,
        },
      ],
      dietaryPreferences: {
        dietType: 'all',
        spiceLevel: 'medium',
        isNutFree: false,
        isLowOil: false,
      },
      savedChefIds: [],
      createdAt: new Date().toISOString(),
    };
    this.state.profiles.push(newProfile);
    this.state.currentUser = newProfile;
    this.state.activeRole = 'customer';
    this.notify();
    return newProfile;
  }

  public registerChef(data: {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl: string;
    experienceYears: number;
    bio: string;
    specialties: string[];
    supportedEvents: any[];
    location: string;
    serviceAreas: string[];
    hourlyRate: number;
    baseCharge: number;
    workingHours: string;
  }): Chef {
    const profileId = `user-chef-${Date.now()}`;
    const newProfile: Profile = {
      id: profileId,
      role: 'chef',
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.location,
      city: 'Hyderabad',
      avatarUrl: data.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    this.state.profiles.push(newProfile);

    const newChef: Chef = {
      id: `chef-${Date.now()}`,
      profileId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80',
      experienceYears: data.experienceYears,
      bio: data.bio,
      specialties: data.specialties,
      supportedEvents: data.supportedEvents,
      location: data.location,
      serviceAreas: data.serviceAreas,
      hourlyRate: data.hourlyRate,
      baseCharge: data.baseCharge,
      perPersonRate: 100,
      rating: 5.0,
      reviewCount: 0,
      status: 'pending',
      workingHours: data.workingHours || '08:00 AM - 08:00 PM',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      blockedDates: [],
      equipmentArrangement: 'brings_own_knives_spices',
      isAvailableToday: true,
      featuredDishes: [],
      createdAt: new Date().toISOString(),
    };

    this.state.chefs.push(newChef);
    this.state.currentUser = newProfile;
    this.state.activeRole = 'chef';

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: 'user-admin-1',
      recipientRole: 'admin',
      title: 'New Chef Onboarding Application',
      message: `${newChef.fullName} applied with specialties: ${newChef.specialties.join(', ')}. Review and approve.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
    return newChef;
  }

  // --- Booking Operations ---

  public createBooking(bookingData: Omit<
    Booking,
    | 'id'
    | 'bookingNumber'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'paymentStatus'
    | 'chefAvatarUrl'
    | 'chefServiceFee'
    | 'ingredientFee'
    | 'platformFee'
    | 'additionalCharges'
    | 'totalAmount'
    | 'advanceDepositRequired'
  > & {
    chefAvatarUrl?: string;
    chefServiceFee?: number;
    ingredientFee?: number;
    platformFee?: number;
    additionalCharges?: number;
    totalAmount?: number;
    advanceDepositRequired?: number;
  }): Booking {
    // 1. Guard against past booking dates
    if (isDateInPast(bookingData.eventDate)) {
      throw new Error('Booking date cannot be in the past');
    }

    // 2. Guard against non-positive food quantities
    if (!bookingData.items || bookingData.items.length === 0) {
      throw new Error('At least one food item must be specified');
    }
    if (bookingData.items.some((i) => !i.quantity || i.quantity <= 0 || isNaN(i.quantity))) {
      throw new Error('Food quantities must be strictly positive');
    }

    // 3. Chef existence & approval validation
    const chef = this.state.chefs.find((c) => c.id === bookingData.chefId);
    if (!chef) {
      throw new Error('Selected chef not found');
    }
    if (chef.status !== 'approved') {
      throw new Error('Chef is not currently approved to accept new booking requests');
    }

    // 4. Chef calendar blocked date validation
    if (chef.blockedDates && chef.blockedDates.includes(bookingData.eventDate)) {
      throw new Error(`Chef ${chef.fullName} is unavailable on ${bookingData.eventDate} (date is blocked on chef calendar). Please select an open date.`);
    }

    const dateRecord = (this.state.chefAvailability || []).find(
      (r) => r.chefId === bookingData.chefId && r.date === bookingData.eventDate
    );
    if (dateRecord && !dateRecord.isAvailable) {
      throw new Error(`Chef ${chef.fullName} is unavailable on ${bookingData.eventDate}: ${dateRecord.reason || 'Date is blocked on chef calendar'}`);
    }

    // 5. Double-booking conflict validation against existing active bookings
    const chefBookings = this.state.bookings.filter((b) => b.chefId === bookingData.chefId);
    if (
      hasBookingConflict(chefBookings, {
        eventDate: bookingData.eventDate,
        startTime: bookingData.startTime,
        expectedDurationHours: bookingData.expectedDurationHours,
      })
    ) {
      throw new Error('Chef already has an active booking during this time slot (including buffer). Please choose another time or date.');
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `CC-BK-${randomDigits}`;
    const chefAvatarUrl = bookingData.chefAvatarUrl || chef?.avatarUrl || '';
    const chefServiceFee = bookingData.chefServiceFee ?? ((chef?.hourlyRate || 500) * bookingData.expectedDurationHours);
    const ingredientFee = bookingData.ingredientFee ?? (bookingData.ingredientArrangement === 'chef_provided' ? 1000 : 0);
    const platformFee = bookingData.platformFee ?? Math.round((chefServiceFee + ingredientFee) * 0.1);
    const additionalCharges = bookingData.additionalCharges ?? 0;
    const totalAmount = bookingData.totalAmount ?? (chefServiceFee + ingredientFee + platformFee + additionalCharges);
    const advanceDepositRequired = bookingData.advanceDepositRequired ?? Math.round(totalAmount * 0.3);

    const newBooking: Booking = {
      ...bookingData,
      chefAvatarUrl,
      chefServiceFee,
      ingredientFee,
      platformFee,
      additionalCharges,
      totalAmount,
      advanceDepositRequired,
      id: `bk-${Date.now()}`,
      bookingNumber,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.bookings.unshift(newBooking);

    // Notify Chef
    if (chef) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-c`,
        recipientId: chef.profileId,
        recipientRole: 'chef',
        title: `New Booking Request #${bookingNumber}`,
        message: `${newBooking.customerName} requested a cooking service for ${newBooking.eventDate} (${newBooking.guestsCount} guests).`,
        type: 'booking_request',
        bookingId: newBooking.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Notify Customer
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-u`,
      recipientId: newBooking.customerId,
      recipientRole: 'customer',
      title: `Booking Request Submitted #${bookingNumber}`,
      message: `Your cooking request with ${newBooking.chefName} is pending chef confirmation. You'll receive a quotation shortly.`,
      type: 'booking_request',
      bookingId: newBooking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
    supabaseService.syncBookingToSupabase(newBooking);
    return newBooking;
  }

  public chefAcceptBooking(
    bookingId: string,
    quotation: {
      revisedServiceFee?: number;
      revisedDurationHours?: number;
      additionalCharges?: number;
      additionalChargesNotes?: string;
      chefQuotationNotes?: string;
    }
  ) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    // Prevent accepting non-pending or already accepted/rejected/cancelled bookings
    if (booking.status !== 'pending') {
      throw new Error(`Cannot accept booking: Booking #${booking.bookingNumber} is already ${booking.status}.`);
    }

    // Role check: Only the assigned chef or admin can accept
    if (this.state.currentUser) {
      if (this.state.currentUser.role === 'customer') {
        throw new Error('Unauthorized: Customers cannot accept chef bookings.');
      }
      if (this.state.currentUser.role === 'chef') {
        const currentChef = this.state.chefs.find((c) => c.profileId === this.state.currentUser?.id);
        if (currentChef && booking.chefId !== currentChef.id) {
          throw new Error('Unauthorized: You can only accept bookings assigned to your chef profile.');
        }
      }
    }

    // Verify slot is still conflict-free before accepting
    const otherBookings = this.state.bookings.filter(
      (b) => b.chefId === booking.chefId && b.id !== bookingId && b.status !== 'cancelled' && b.status !== 'rejected'
    );
    if (
      hasBookingConflict(otherBookings, {
        eventDate: booking.eventDate,
        startTime: booking.startTime,
        expectedDurationHours: quotation.revisedDurationHours || booking.expectedDurationHours,
      })
    ) {
      throw new Error('Cannot accept booking: Another active booking overlaps this cooking time slot.');
    }

    booking.status = 'accepted';
    booking.updatedAt = new Date().toISOString();
    if (quotation.revisedServiceFee !== undefined) booking.chefServiceFee = quotation.revisedServiceFee;
    if (quotation.revisedDurationHours !== undefined) booking.expectedDurationHours = quotation.revisedDurationHours;
    if (quotation.additionalCharges !== undefined) booking.additionalCharges = quotation.additionalCharges;
    if (quotation.additionalChargesNotes) booking.additionalChargesNotes = quotation.additionalChargesNotes;
    if (quotation.chefQuotationNotes) booking.chefQuotationNotes = quotation.chefQuotationNotes;

    const subtotal = booking.chefServiceFee + booking.ingredientFee + booking.additionalCharges;
    booking.platformFee = Math.round((subtotal * this.state.platformConfig.commissionPercentage) / 100);
    booking.totalAmount = subtotal + booking.platformFee;
    booking.advanceDepositRequired = Math.round(booking.totalAmount * (this.state.platformConfig.minAdvancePaymentPercentage / 100));

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Quotation Accepted for #${booking.bookingNumber}`,
      message: `${booking.chefName} accepted your request! Total: ₹${booking.totalAmount.toLocaleString('en-IN')}. Please pay the advance deposit to confirm.`,
      type: 'booking_accepted',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
    supabaseService.acceptBookingInSupabase(booking.id, quotation);
  }

  public chefRejectBooking(bookingId: string, reason: string) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.status !== 'pending') {
      throw new Error(`Cannot decline booking: Booking #${booking.bookingNumber} is already ${booking.status}.`);
    }

    if (this.state.currentUser) {
      if (this.state.currentUser.role === 'customer') {
        throw new Error('Unauthorized: Customers cannot decline bookings on behalf of chefs.');
      }
      if (this.state.currentUser.role === 'chef') {
        const currentChef = this.state.chefs.find((c) => c.profileId === this.state.currentUser?.id);
        if (currentChef && booking.chefId !== currentChef.id) {
          throw new Error('Unauthorized: You can only decline bookings assigned to your chef profile.');
        }
      }
    }

    booking.status = 'rejected';
    booking.cancellationReason = reason;
    booking.cancelledBy = 'chef';
    booking.updatedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Booking Request Declined #${booking.bookingNumber}`,
      message: `${booking.chefName} could not accept this date/slot. Reason: ${reason}.`,
      type: 'booking_rejected',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
    supabaseService.syncBookingStatusToSupabase(booking.bookingNumber, 'rejected', reason);
  }

  public confirmPayment(bookingId: string, paymentDetails: {
    amount: number;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    paymentGateway: 'razorpay' | 'cash_on_completion';
  }) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'rejected' || booking.status === 'cancelled') {
      throw new Error('Cannot process payment for a rejected or cancelled booking.');
    }

    if (booking.paymentStatus === 'paid') {
      throw new Error('Booking payment has already been verified and processed.');
    }

    if (booking.status !== 'accepted') {
      throw new Error('Payment is only permitted after the chef has accepted the request with a quotation.');
    }

    // Verify no confirmed bookings overlap before processing payment
    const otherActiveBookings = this.state.bookings.filter(
      (b) => b.chefId === booking.chefId && b.id !== bookingId && (b.status === 'confirmed' || b.status === 'in_progress')
    );
    if (
      hasBookingConflict(otherActiveBookings, {
        eventDate: booking.eventDate,
        startTime: booking.startTime,
        expectedDurationHours: booking.expectedDurationHours,
      })
    ) {
      throw new Error('Payment cannot be processed: Another customer has already confirmed a booking overlapping this time slot.');
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.updatedAt = new Date().toISOString();

    const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment: BookingPayment = {
      id: `pay-${Date.now()}`,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: paymentDetails.amount,
      currency: 'INR',
      paymentGateway: paymentDetails.paymentGateway,
      razorpayPaymentId: paymentDetails.razorpayPaymentId,
      razorpayOrderId: paymentDetails.razorpayOrderId,
      status: 'paid',
      receiptNumber,
      paidAt: new Date().toISOString(),
    };

    this.state.payments.unshift(payment);

    this.state.notifications.unshift({
      id: `notif-${Date.now()}-c`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Payment Successful! Booking #${booking.bookingNumber} Confirmed`,
      message: `We received your payment of ₹${paymentDetails.amount.toLocaleString('en-IN')}. Receipt #${receiptNumber} generated.`,
      type: 'payment_received',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const chef = this.state.chefs.find((c) => c.id === booking.chefId);
    if (chef) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-ch`,
        recipientId: chef.profileId,
        recipientRole: 'chef',
        title: `Booking #${booking.bookingNumber} Confirmed & Paid`,
        message: `${booking.customerName} has completed the advance payment. Prepare for cooking on ${booking.eventDate} at ${booking.startTime}.`,
        type: 'payment_received',
        bookingId: booking.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.notify();
    return payment;
  }

  // --- Static UPI QR Payment Operations ---

  public submitUpiPayment(params: {
    bookingId: string;
    amount: number;
    utr?: string;
    paymentReference?: string;
    receiptUrl?: string;
    notes?: string;
  }): BookingPayment {
    const booking = this.state.bookings.find((b) => b.id === params.bookingId);
    if (!booking) {
      throw new Error('Booking not found.');
    }

    const caller = this.state.currentUser;
    if (caller && caller.role !== 'admin' && booking.customerId !== caller.id) {
      throw new Error('Unauthorized: You can only submit payments for your own bookings.');
    }

    if (booking.status === 'rejected' || booking.status === 'cancelled') {
      throw new Error(`Cannot submit payment for a ${booking.status} booking.`);
    }

    if (booking.paymentStatus === 'paid') {
      throw new Error('This booking has already been verified and paid.');
    }

    const cleanUtr = ((params.utr || params.paymentReference) || '').trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      throw new Error('Please enter a valid 12-digit UTR or Transaction Reference Number (at least 6 characters).');
    }

    // Check duplicate UTR across all existing payments on other bookings
    const duplicate = this.state.payments.find(
      (p) =>
        p.paymentReference &&
        p.paymentReference.trim().toLowerCase() === cleanUtr.toLowerCase() &&
        p.bookingId !== booking.id
    );
    if (duplicate) {
      throw new Error(`Duplicate transaction reference: UTR "${cleanUtr}" is already registered in the system.`);
    }

    const existingPayment = this.state.payments.find((p) => p.bookingId === booking.id);
    const receiptNumber = existingPayment?.receiptNumber || `RCPT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate advance amount from trusted database booking record (never trust frontend amount)
    const trustedAmount = booking.advanceDepositRequired > 0 ? booking.advanceDepositRequired : booking.totalAmount;

    const paymentRecord: BookingPayment = {
      id: existingPayment?.id || `pay-${Date.now()}`,
      bookingId: booking.id,
      customerId: booking.customerId,
      chefId: booking.chefId,
      amount: trustedAmount,
      currency: 'INR',
      paymentGateway: 'upi_qr',
      paymentReference: cleanUtr,
      upiId: '6281376739@fam',
      status: 'payment_verification_pending',
      receiptNumber,
      receiptUrl: params.receiptUrl,
      notes: params.notes,
      submittedAt: new Date().toISOString(),
    };

    if (existingPayment) {
      const idx = this.state.payments.findIndex((p) => p.id === existingPayment.id);
      this.state.payments[idx] = paymentRecord;
    } else {
      this.state.payments.unshift(paymentRecord);
    }

    booking.paymentStatus = 'payment_verification_pending';
    booking.updatedAt = new Date().toISOString();

    // Send notifications to Customer & Admin
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-c`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Payment Submitted: #${booking.bookingNumber}`,
      message: `Your UPI payment of ₹${params.amount.toLocaleString('en-IN')} (UTR: ${cleanUtr}) was submitted. BookMyChef will verify your transaction and update your payment status.`,
      type: 'payment_received',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const adminProfile = this.state.profiles.find((p) => p.role === 'admin');
    if (adminProfile) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-adm`,
        recipientId: adminProfile.id,
        recipientRole: 'admin',
        title: `New UPI Payment Verification: #${booking.bookingNumber}`,
        message: `Customer ${booking.customerName} submitted UTR ${cleanUtr} for ₹${params.amount.toLocaleString('en-IN')}. Please verify bank credit.`,
        type: 'system',
        bookingId: booking.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.notify();
    supabaseService.recordUpiPaymentSubmission(paymentRecord).catch(() => {});
    return paymentRecord;
  }

  public adminVerifyUpiPayment(paymentId: string, adminId?: string): BookingPayment {
    const caller = this.state.currentUser;
    if (!caller || caller.role !== 'admin') {
      throw new Error('Unauthorized: Only platform administrators can verify and approve payments.');
    }

    const payment = this.state.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment record not found.');
    }

    if (payment.status === 'paid') {
      throw new Error('Payment has already been verified and marked as paid.');
    }

    const booking = this.state.bookings.find((b) => b.id === payment.bookingId);
    if (!booking) {
      throw new Error('Associated booking not found.');
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw new Error(`Cannot verify payment for a ${booking.status} booking.`);
    }

    const verifiedTimestamp = new Date().toISOString();
    payment.status = 'paid';
    payment.paidAt = verifiedTimestamp;
    payment.verifiedBy = adminId || caller.id;
    payment.verifiedAt = verifiedTimestamp;
    payment.rejectionReason = undefined;

    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.updatedAt = verifiedTimestamp;

    // Create Chef Settlement record with confirmed 10% platform commission
    const commissionPct = 10.0; // Confirmed by business owner
    const grossAmount = booking.totalAmount;
    const commissionAmount = Math.round((grossAmount * commissionPct) / 100);
    const chefPayableAmount = grossAmount - commissionAmount;

    const existingSettlement = this.state.chefSettlements.find((s) => s.bookingId === booking.id);
    if (!existingSettlement) {
      const settlement: ChefSettlement = {
        id: `stl-${Date.now()}`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        chefId: booking.chefId,
        chefName: booking.chefName,
        grossAmount,
        grossBookingAmount: grossAmount,
        commissionPercentage: commissionPct,
        commissionAmount,
        platformCommission: commissionAmount,
        chefPayableAmount,
        netPayableToChef: chefPayableAmount,
        settlementStatus: 'pending',
        createdAt: verifiedTimestamp,
        updatedAt: verifiedTimestamp,
      };
      this.state.chefSettlements.unshift(settlement);
    } else {
      existingSettlement.grossAmount = grossAmount;
      existingSettlement.grossBookingAmount = grossAmount;
      existingSettlement.commissionPercentage = commissionPct;
      existingSettlement.commissionAmount = commissionAmount;
      existingSettlement.platformCommission = commissionAmount;
      existingSettlement.chefPayableAmount = chefPayableAmount;
      existingSettlement.netPayableToChef = chefPayableAmount;
      existingSettlement.settlementStatus = 'pending';
      existingSettlement.payoutReference = undefined;
      existingSettlement.payoutDate = undefined;
      existingSettlement.verifiedBy = undefined;
      existingSettlement.verifiedAt = undefined;
      existingSettlement.updatedAt = verifiedTimestamp;
    }

    // Customer Notification
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-c-paid`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Payment Verified & Confirmed! #${booking.bookingNumber}`,
      message: `Your advance payment of ₹${payment.amount.toLocaleString('en-IN')} has been verified by BookMyChef. Booking is now confirmed!`,
      type: 'payment_received',
      bookingId: booking.id,
      read: false,
      createdAt: verifiedTimestamp,
    });

    // Chef Notification
    const chef = this.state.chefs.find((c) => c.id === booking.chefId);
    if (chef) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}-ch-paid`,
        recipientId: chef.profileId,
        recipientRole: 'chef',
        title: `Booking #${booking.bookingNumber} Confirmed & Paid`,
        message: `Advance payment verified for ${booking.customerName}. Prepare for cooking on ${booking.eventDate} at ${booking.startTime}.`,
        type: 'payment_received',
        bookingId: booking.id,
        read: false,
        createdAt: verifiedTimestamp,
      });
    }

    this.notify();
    supabaseService.adminVerifyPaymentInSupabase(payment.id, payment.verifiedBy).catch(() => {});
    return payment;
  }

  public adminRejectUpiPayment(paymentId: string, rejectionReason: string, adminId?: string): BookingPayment {
    const caller = this.state.currentUser;
    if (!caller || caller.role !== 'admin') {
      throw new Error('Unauthorized: Only platform administrators can reject payments.');
    }

    const cleanReason = (rejectionReason || '').trim();
    if (!cleanReason) {
      throw new Error('A rejection reason must be provided (e.g. UTR not matching bank statement credit).');
    }

    const payment = this.state.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment record not found.');
    }

    const booking = this.state.bookings.find((b) => b.id === payment.bookingId);
    if (!booking) {
      throw new Error('Associated booking not found.');
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw new Error(`Cannot verify payment for a ${booking.status} booking.`);
    }

    const rejectedTimestamp = new Date().toISOString();
    payment.status = 'rejected';
    payment.rejectionReason = cleanReason;
    payment.verifiedBy = adminId || caller.id;
    payment.verifiedAt = rejectedTimestamp;

    booking.paymentStatus = 'pending';
    booking.updatedAt = rejectedTimestamp;

    // Customer Notification with Rejection Reason
    this.state.notifications.unshift({
      id: `notif-${Date.now()}-c-rej`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title: `Payment Verification Unsuccessful: #${booking.bookingNumber}`,
      message: `Your payment reference (${payment.paymentReference}) could not be verified: "${cleanReason}". Please check and resubmit your payment details.`,
      type: 'payment_received',
      bookingId: booking.id,
      read: false,
      createdAt: rejectedTimestamp,
    });

    this.notify();
    supabaseService.adminRejectPaymentInSupabase(payment.id, cleanReason, payment.verifiedBy).catch(() => {});
    return payment;
  }

  public adminRecordChefSettlement(settlementId: string, payoutReference: string, _adminId?: string): ChefSettlement {
    const caller = this.state.currentUser;
    if (!caller || caller.role !== 'admin') {
      throw new Error('Unauthorized: Only platform administrators can manage settlements.');
    }

    const cleanRef = (payoutReference || '').trim();
    if (!cleanRef) {
      throw new Error('Bank payout reference (UTR / IMPS number) is required.');
    }

    const settlement = this.state.chefSettlements.find((s) => s.id === settlementId);
    if (!settlement) {
      throw new Error('Settlement record not found.');
    }

    if (settlement.settlementStatus === 'settled') {
      throw new Error(`Settlement has already been settled with reference "${settlement.payoutReference}".`);
    }

    if (settlement.settlementStatus === 'cancelled') {
      throw new Error('Settlement has been cancelled and cannot be paid out.');
    }

    const nowIso = new Date().toISOString();
    settlement.settlementStatus = 'settled';
    settlement.payoutReference = cleanRef;
    settlement.payoutDate = nowIso;
    settlement.verifiedBy = _adminId || caller.id;
    settlement.verifiedAt = nowIso;
    settlement.updatedAt = nowIso;

    this.notify();
    supabaseService.adminRecordSettlementPayoutInSupabase(settlement.id, cleanRef, settlement.verifiedBy).catch(() => {});
    return settlement;
  }

  public updateBookingStatus(bookingId: string, newStatus: BookingStatus, actorRole?: UserRole) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    if (actorRole && !canTransitionBookingStatus(booking.status, newStatus, actorRole)) {
      throw new Error(`Unauthorized or invalid status transition from ${booking.status} to ${newStatus} by ${actorRole}.`);
    }

    booking.status = newStatus;
    booking.updatedAt = new Date().toISOString();

    let title = `Booking Status Updated: #${booking.bookingNumber}`;
    let message = `Booking status changed to ${newStatus}.`;

    if (newStatus === 'in_progress') {
      title = `Cooking Started! #${booking.bookingNumber}`;
      message = `${booking.chefName} has arrived and commenced cooking at your venue.`;
    } else if (newStatus === 'completed') {
      title = `Cooking Service Completed #${booking.bookingNumber}`;
      message = `${booking.chefName} has concluded the service. Please rate your culinary experience!`;
    }

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: booking.customerId,
      recipientRole: 'customer',
      title,
      message,
      type: 'status_update',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
    supabaseService.syncBookingStatusToSupabase(booking.bookingNumber, newStatus);
  }

  public cancelBooking(
    bookingId: string,
    reason: string = '',
    cancelledBy: 'customer' | 'chef' | 'admin' = 'customer'
  ): { success: boolean; error?: string } {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // 1. Validate status eligibility
    const validation = canCancelBooking(booking.status, cancelledBy);
    if (!validation.canCancel) {
      throw new Error(validation.error || `Cannot cancel booking with status "${booking.status}".`);
    }

    const nowIso = new Date().toISOString();
    const finalReason = reason.trim() || `Cancelled by ${cancelledBy}`;

    // 2. Mutate booking status
    booking.status = 'cancelled';
    booking.cancellationReason = finalReason;
    booking.cancelledBy = cancelledBy;
    booking.cancelledAt = nowIso;
    booking.updatedAt = nowIso;

    // 3. Process payment refund if payment was already made
    if (booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
      const payment = this.state.payments.find((p) => p.bookingId === booking.id);
      if (payment) {
        payment.status = 'refunded';

        // Calculate policy refund based on hours before event
        const eventDateTime = new Date(`${booking.eventDate}T${booking.startTime}:00`).getTime();
        const now = Date.now();
        const hoursBefore = isNaN(eventDateTime) ? 48 : Math.max(0, (eventDateTime - now) / (1000 * 60 * 60));

        const refundCalc = calculateCancellationRefund(payment.amount, hoursBefore);
        payment.refundAmount = refundCalc.refundAmount;
        payment.refundReason = `Cancellation by ${cancelledBy}: ${finalReason}. (${refundCalc.reason})`;
      }
    }

    // 3b. Cancel pending chef settlement payout if booking is cancelled before cooking
    const linkedSettlement = this.state.chefSettlements.find((s) => s.bookingId === booking.id);
    if (linkedSettlement && linkedSettlement.settlementStatus === 'pending') {
      linkedSettlement.settlementStatus = 'cancelled';
      linkedSettlement.notes = `Booking cancelled by ${cancelledBy} prior to service completion. Post-service chef payout cancelled according to cancellation policy.`;
      linkedSettlement.updatedAt = nowIso;
    }

    // 4. Restore chef availability if this was the only active booking for that date
    const chef = this.state.chefs.find((c) => c.id === booking.chefId);
    if (chef) {
      const remainingActiveBookings = this.state.bookings.filter(
        (b) =>
          b.chefId === booking.chefId &&
          b.eventDate === booking.eventDate &&
          b.id !== booking.id &&
          b.status !== 'cancelled' &&
          b.status !== 'rejected'
      );

      // If no other bookings exist on this date, check if date needs unblocking in calendar
      if (remainingActiveBookings.length === 0) {
        // If availability record was set for this booking, mark it available
        const availRecord = (this.state.chefAvailability || []).find(
          (a) => a.chefId === booking.chefId && a.date === booking.eventDate
        );
        if (availRecord && (availRecord.reason?.includes('Booking') || !availRecord.isAvailable)) {
          availRecord.isAvailable = true;
          availRecord.reason = undefined;
        }
      }
    }

    // 5. Send notifications
    if (cancelledBy === 'customer') {
      const chefProfileId = chef?.profileId || '';
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        recipientId: chefProfileId,
        recipientRole: 'chef',
        title: `Booking #${booking.bookingNumber} Cancelled`,
        message: `Customer ${booking.customerName} cancelled booking #${booking.bookingNumber} scheduled for ${booking.eventDate}. Reason: ${finalReason}.`,
        type: 'status_update',
        bookingId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        recipientId: booking.customerId,
        recipientRole: 'customer',
        title: `Booking #${booking.bookingNumber} Cancelled`,
        message: `Your booking #${booking.bookingNumber} with ${booking.chefName} was cancelled by ${cancelledBy}. Reason: ${finalReason}.`,
        type: 'status_update',
        bookingId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    }

    // 6. Broadcast state change immediately
    this.notify();

    // 7. Sync to Supabase
    supabaseService.cancelBookingInSupabase(booking.id, booking.bookingNumber, finalReason, cancelledBy);

    return { success: true };
  }

  public requestReschedule(bookingId: string, newDate: string, newTime: string, reason: string, requestedBy: 'customer' | 'chef') {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    booking.rescheduleRequest = {
      newDate,
      newTime,
      reason,
      requestedBy,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    booking.updatedAt = new Date().toISOString();

    const targetRecipient = requestedBy === 'customer' ? (this.state.chefs.find(c => c.id === booking.chefId)?.profileId || '') : booking.customerId;
    const targetRole = requestedBy === 'customer' ? 'chef' : 'customer';

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: targetRecipient,
      recipientRole: targetRole,
      title: `Reschedule Request for #${booking.bookingNumber}`,
      message: `${requestedBy === 'customer' ? booking.customerName : booking.chefName} requested to reschedule to ${newDate} at ${newTime}. Reason: ${reason}`,
      type: 'status_update',
      bookingId: booking.id,
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
  }

  public respondReschedule(bookingId: string, accept: boolean) {
    const booking = this.state.bookings.find((b) => b.id === bookingId);
    if (!booking || !booking.rescheduleRequest) return;

    if (accept) {
      booking.eventDate = booking.rescheduleRequest.newDate;
      booking.startTime = booking.rescheduleRequest.newTime;
      booking.rescheduleRequest.status = 'accepted';
    } else {
      booking.rescheduleRequest.status = 'declined';
    }
    booking.updatedAt = new Date().toISOString();

    this.notify();
  }

  // --- Chef Services Management ---

  public chefAddService(serviceData: Omit<CookingService, 'id'>) {
    const newService: CookingService = {
      ...serviceData,
      id: `srv-${Date.now()}`,
    };
    this.state.cookingServices.push(newService);
    this.notify();
    supabaseService.addChefMenuItem(newService).catch(() => {});
    return newService;
  }

  public chefUpdateService(serviceId: string, updates: Partial<CookingService>) {
    this.state.cookingServices = this.state.cookingServices.map((s) =>
      s.id === serviceId ? { ...s, ...updates } : s
    );
    this.notify();
    supabaseService.updateChefMenuItem(serviceId, updates).catch(() => {});
  }

  public chefToggleServiceActive(serviceId: string) {
    const target = this.state.cookingServices.find((s) => s.id === serviceId);
    const newActive = target ? !target.isActive : true;
    this.state.cookingServices = this.state.cookingServices.map((s) =>
      s.id === serviceId ? { ...s, isActive: newActive } : s
    );
    this.notify();
    supabaseService.updateChefMenuItem(serviceId, { isActive: newActive }).catch(() => {});
  }

  public chefDeleteService(serviceId: string) {
    this.state.cookingServices = this.state.cookingServices.filter((s) => s.id !== serviceId);
    this.notify();
    supabaseService.deleteChefMenuItem(serviceId).catch(() => {});
  }

  public chefUpdateProfile(chefId: string, updates: Partial<Chef>) {
    const chefIndex = this.state.chefs.findIndex((c) => c.id === chefId);
    if (chefIndex === -1) return;
    this.state.chefs[chefIndex] = {
      ...this.state.chefs[chefIndex],
      ...updates,
    };
    // Also sync with currentUser profile if applicable
    if (this.state.currentUser && this.state.currentUser.id === this.state.chefs[chefIndex].profileId) {
      if (updates.fullName) this.state.currentUser.fullName = updates.fullName;
      if (updates.phone) this.state.currentUser.phone = updates.phone;
      if (updates.avatarUrl) this.state.currentUser.avatarUrl = updates.avatarUrl;
    }
    this.notify();
    supabaseService.syncChefProfileToSupabase(chefId, updates);
  }

  public chefReplyReview(reviewId: string, reply: string) {
    const review = this.state.reviews.find((r) => r.id === reviewId);
    if (!review) return;
    review.chefReply = reply;
    review.chefReplyAt = new Date().toISOString();
    this.notify();
    supabaseService.replyReviewInSupabase(reviewId, reply);
  }

  public chefUpdateSchedule(chefId: string, updates: { workingHours?: string; workingDays?: string[]; blockedDates?: string[] }) {
    const chef = this.state.chefs.find((c) => c.id === chefId);
    if (!chef) return;
    if (updates.workingHours) chef.workingHours = updates.workingHours;
    if (updates.workingDays) chef.workingDays = updates.workingDays;
    if (updates.blockedDates) chef.blockedDates = updates.blockedDates;
    this.notify();
  }

  public toggleChefDateAvailability(
    chefId: string,
    date: string,
    isAvailable: boolean,
    details?: { startTime?: string; endTime?: string; reason?: string }
  ) {
    const chef = this.state.chefs.find((c) => c.id === chefId);
    if (!chef) throw new Error('Chef not found');

    // Authorization check: Only admin or the chef himself can modify
    const user = this.state.currentUser;
    if (user) {
      if (user.role === 'customer') {
        throw new Error('Unauthorized: Customers cannot modify chef availability schedule');
      }
      if (user.role === 'chef' && user.id !== chef.profileId) {
        throw new Error("Unauthorized: Chefs can only modify their own availability");
      }
    }

    // Prevent unblocking or toggling a date that already has an active confirmed booking
    const activeBookingOnDate = this.state.bookings.find(
      (b) => b.chefId === chefId && b.eventDate === date && (b.status === 'confirmed' || b.status === 'in_progress')
    );
    if (activeBookingOnDate) {
      throw new Error(`Cannot modify availability: Date ${date} has an active confirmed booking (#${activeBookingOnDate.bookingNumber}).`);
    }

    const currentBlocked = chef.blockedDates || [];
    if (isAvailable) {
      // Unblock date
      chef.blockedDates = currentBlocked.filter((d) => d !== date);
    } else {
      // Block date
      if (!currentBlocked.includes(date)) {
        chef.blockedDates = [...currentBlocked, date];
      }
    }

    // Update chefAvailability record
    if (!this.state.chefAvailability) this.state.chefAvailability = [];
    const existingIndex = this.state.chefAvailability.findIndex(
      (r) => r.chefId === chefId && r.date === date
    );
    const updatedRecord: ChefAvailability = {
      id: existingIndex >= 0 ? this.state.chefAvailability[existingIndex].id : `avail-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      chefId,
      date,
      dayOfWeek: new Date(date).getDay(),
      startTime: details?.startTime || '08:00',
      endTime: details?.endTime || '21:00',
      isAvailable,
      reason: isAvailable ? undefined : details?.reason || 'Personal leave',
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.state.chefAvailability[existingIndex] = updatedRecord;
    } else {
      this.state.chefAvailability.push(updatedRecord);
    }

    this.notify();
    return chef.blockedDates;
  }

  public batchSetChefAvailability(
    chefId: string,
    dates: string[],
    isAvailable: boolean,
    reason?: string
  ) {
    const chef = this.state.chefs.find((c) => c.id === chefId);
    if (!chef) throw new Error('Chef not found');

    // Authorization check: Only admin or the chef himself can modify
    const user = this.state.currentUser;
    if (user) {
      if (user.role === 'customer') {
        throw new Error('Unauthorized: Customers cannot modify chef availability schedule');
      }
      if (user.role === 'chef' && user.id !== chef.profileId) {
        throw new Error("Unauthorized: Chefs can only modify their own availability");
      }
    }

    // Filter out dates that have active confirmed bookings
    const confirmedBookingDates = new Set(
      this.state.bookings
        .filter((b) => b.chefId === chefId && (b.status === 'confirmed' || b.status === 'in_progress'))
        .map((b) => b.eventDate)
    );

    const validDates = dates.filter((d) => !confirmedBookingDates.has(d));

    const currentBlocked = new Set(chef.blockedDates || []);
    if (isAvailable) {
      validDates.forEach((d) => currentBlocked.delete(d));
    } else {
      validDates.forEach((d) => currentBlocked.add(d));
    }
    chef.blockedDates = Array.from(currentBlocked).sort();

    if (!this.state.chefAvailability) this.state.chefAvailability = [];
    validDates.forEach((date) => {
      const existingIndex = this.state.chefAvailability.findIndex(
        (r) => r.chefId === chefId && r.date === date
      );
      const record: ChefAvailability = {
        id: existingIndex >= 0 ? this.state.chefAvailability[existingIndex].id : `avail-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        chefId,
        date,
        dayOfWeek: new Date(date).getDay(),
        startTime: '08:00',
        endTime: '21:00',
        isAvailable,
        reason: isAvailable ? undefined : reason || 'Batch update',
        createdAt: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        this.state.chefAvailability[existingIndex] = record;
      } else {
        this.state.chefAvailability.push(record);
      }
    });

    this.notify();
    return chef.blockedDates;
  }

  // --- Reviews & Support ---

  public addReview(reviewData: Omit<Review, 'id' | 'createdAt'>) {
    const booking = this.state.bookings.find((b) => b.id === reviewData.bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'completed') {
      throw new Error('Reviews can only be submitted for completed cooking services.');
    }

    if (reviewData.customerId && booking.customerId && booking.customerId !== reviewData.customerId) {
      throw new Error('Unauthorized: Only the customer associated with this completed booking can submit a review.');
    }

    const alreadyReviewed = this.state.reviews.some((r) => r.bookingId === reviewData.bookingId);
    if (alreadyReviewed) {
      throw new Error(`A review has already been submitted for booking #${booking.bookingNumber}.`);
    }

    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.state.reviews.unshift(newReview);

    const chefReviews = this.state.reviews.filter((r) => r.chefId === reviewData.chefId);
    const avgRating = chefReviews.reduce((sum, r) => sum + r.rating, 0) / chefReviews.length;
    const chef = this.state.chefs.find((c) => c.id === reviewData.chefId);
    if (chef) {
      chef.rating = Number(avgRating.toFixed(2));
      chef.reviewCount = chefReviews.length;
    }

    this.notify();
    supabaseService.submitReviewToSupabase(newReview);
    return newReview;
  }

  public submitSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) {
    const newTicket: SupportTicket = {
      ...ticketData,
      id: `tkt-${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.state.supportTickets.unshift(newTicket);
    this.notify();
    return newTicket;
  }

  // --- Admin ---

  public adminApproveChef(chefId: string) {
    if (this.state.currentUser?.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can approve chefs.');
    }
    const chef = this.state.chefs.find((c) => c.id === chefId);
    if (!chef) return;
    chef.status = 'approved';
    delete chef.rejectionReason;

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: chef.profileId,
      recipientRole: 'chef',
      title: 'Chef Application Approved! 🎉',
      message: 'Congratulations! Your ChefConnect profile has been verified and approved by Admin. You are now live and can receive booking requests.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
  }

  public adminRejectChef(chefId: string, reason: string) {
    if (this.state.currentUser?.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can reject chefs.');
    }
    const chef = this.state.chefs.find((c) => c.id === chefId);
    if (!chef) return;
    chef.status = 'rejected';
    chef.rejectionReason = reason;

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientId: chef.profileId,
      recipientRole: 'chef',
      title: 'Chef Application Update',
      message: `Your profile application could not be approved at this time. Reason: ${reason}.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.notify();
  }

  public adminUpdateCommission(commissionPercentage: number) {
    this.state.platformConfig.commissionPercentage = commissionPercentage;
    this.notify();
  }

  public markNotificationAsRead(notifId: string) {
    const notif = this.state.notifications.find((n) => n.id === notifId);
    if (notif) {
      notif.read = true;
      this.notify();
      supabaseService.markNotificationReadInSupabase(notifId);
    }
  }

  public markAllNotificationsRead(role: UserRole) {
    this.state.notifications.forEach((n) => {
      if (n.recipientRole === role) {
        n.read = true;
      }
    });
    this.notify();
    supabaseService.markAllNotificationsReadInSupabase(this.state.currentUser?.id);
  }

  public resetToDefaultSeed() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadState();
    this.notify();
  }
}

export const appStore = new StoreManager();
