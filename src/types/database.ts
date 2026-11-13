export type UserRole = 'customer' | 'chef' | 'admin';

export type ChefStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type BookingStatus =
  | 'pending'      // Customer submitted request
  | 'accepted'     // Chef accepted and submitted quotation
  | 'rejected'     // Chef rejected request
  | 'confirmed'    // Customer paid deposit/fee
  | 'in_progress'  // Chef arrived and cooking started
  | 'completed'    // Cooking finished and verified
  | 'cancelled';   // Cancelled by customer or chef

export type PaymentStatus =
  | 'pending'
  | 'payment_verification_pending'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type IngredientArrangement = 'customer_provided' | 'chef_provided' | 'split';

export type EventType =
  | 'home_cooking'
  | 'family_function'
  | 'birthday'
  | 'wedding'
  | 'festival'
  | 'corporate_event'
  | 'other';

export type FoodType =
  | 'vegetarian'
  | 'non_vegetarian'
  | 'sweets'
  | 'snacks'
  | 'traditional'
  | 'custom_menu';

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: 'Home' | 'Office' | 'Event Venue' | 'Other';
  addressLine: string;
  city: string;
  landmark?: string;
  isDefault: boolean;
}

export interface DietaryPreferences {
  dietType?: 'all' | 'vegetarian' | 'pure_jain' | 'halal' | 'vegan';
  spiceLevel?: 'mild' | 'medium' | 'spicy' | 'authentic_regional';
  isNutFree?: boolean;
  isLowOil?: boolean;
  isVegetarian?: boolean;
  isJain?: boolean;
  allergies?: string[];
  specialInstructions?: string;
  notes?: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  avatarUrl?: string;
  addresses?: CustomerAddress[];
  dietaryPreferences?: DietaryPreferences;
  savedChefIds?: string[];
  authProvider?: 'email' | 'google';
  createdAt: string;
}

export interface ChefAvailability {
  id: string;
  chefId: string;
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  date?: string; // Specific ISO date string e.g. "2026-11-15"
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "20:00"
  isAvailable: boolean;
  bookedDates?: string[]; // ISO date strings e.g. "2026-10-30"
  bufferMinutes?: number;
  reason?: string;
  createdAt?: string;
}

export interface CookingCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  imageUrl?: string;
  popularDishes: string[];
}

export interface CookingService {
  id: string;
  chefId: string;
  categoryId: string;
  serviceName: string;
  description: string;
  pricingType: 'hourly' | 'per_person' | 'per_kg' | 'fixed_event';
  baseRate: number;
  minDurationHours: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Chef {
  id: string;
  profileId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  experienceYears: number;
  bio: string;
  specialties: string[]; // e.g. ["Traditional Andhra", "Sweets & Laddus", "Bulk Wedding Feast"]
  supportedEvents: EventType[];
  location: string;
  serviceAreas: string[]; // e.g. ["Gachibowli", "Jubilee Hills", "Banjara Hills", "Madhapur"]
  serviceRadius?: number; // Service radius in kilometers (e.g. 15 km)
  hourlyRate: number;
  baseCharge: number;
  perPersonRate: number;
  rating: number;
  reviewCount: number;
  status: ChefStatus;
  rejectionReason?: string;
  workingHours: string;
  workingDays?: string[]; // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  blockedDates?: string[];
  equipmentArrangement: 'brings_own_knives_spices' | 'uses_customer_kitchen' | 'brings_full_commercial_kit';
  isAvailableToday: boolean;
  featuredDishes: {
    name: string;
    category: string;
    unit: string;
    typicalPrepTimeHours: number;
    samplePricePerUnit: number;
  }[];
  certificates?: { id: string; name: string; issuer: string; date: string }[];
  services?: CookingService[];
  createdAt: string;
}

export interface BookingItem {
  id: string;
  dishName: string;
  foodType: FoodType;
  quantity: number;
  unit: 'kg' | 'plates' | 'pieces' | 'liters' | 'courses';
  estimatedCostPerUnit?: number;
  specialInstructions?: string;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  customerId: string;
  chefId?: string;
  amount: number;
  currency: string;
  paymentGateway: 'upi_qr' | 'razorpay' | 'cash_on_completion';
  paymentReference?: string; // UTR or transaction ID
  upiId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status: PaymentStatus;
  receiptNumber: string;
  receiptUrl?: string; // Optional uploaded screenshot
  notes?: string;
  submittedAt?: string;
  paidAt?: string;
  createdAt?: string;
  verifiedBy?: string; // Admin profile ID
  verifiedAt?: string;
  rejectionReason?: string;
  refundAmount?: number;
  refundReason?: string;
}

export interface ChefSettlement {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  chefId: string;
  chefName: string;
  grossAmount: number;
  grossBookingAmount?: number; // Backward-compatible alias
  commissionPercentage: number; // 10.00%
  commissionAmount: number; // Gross * 10%
  platformCommission: number; // Backward-compatible alias for commissionAmount
  chefPayableAmount: number; // Gross * 90%
  netPayableToChef?: number; // Backward-compatible alias
  settlementStatus: 'pending' | 'settled' | 'on_hold' | 'cancelled';
  payoutReference?: string; // Bank UTR or IMPS reference
  payoutDate?: string;
  verifiedBy?: string; // Admin profile ID who authorized and recorded payout
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RescheduleRequest {
  newDate: string;
  newTime: string;
  reason: string;
  requestedBy: 'customer' | 'chef';
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string; // e.g. "CC-BK-8902"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  chefId: string;
  chefName: string;
  chefAvatarUrl: string;
  eventType: EventType;
  foodType: FoodType;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  expectedDurationHours: number;
  guestsCount: number;
  venueAddress: string;
  city: string;
  items: BookingItem[];
  ingredientArrangement: IngredientArrangement;
  utensilsProvidedByCustomer: boolean;
  specialInstructions?: string;
  referenceImages?: string[];
  
  // Cost breakdown
  chefServiceFee: number;
  ingredientFee: number;
  platformFee: number;
  additionalCharges: number;
  additionalChargesNotes?: string;
  totalAmount: number;
  advanceDepositRequired: number;

  status: BookingStatus;
  chefQuotationNotes?: string;
  paymentStatus: PaymentStatus;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'chef' | 'admin';
  cancelledAt?: string;
  rescheduleRequest?: RescheduleRequest;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  chefId: string;
  rating: number; // 1 to 5
  comment: string;
  foodTasteRating: number;
  cleanlinessRating: number;
  punctualityRating: number;
  photos?: string[];
  chefReply?: string;
  chefReplyAt?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected' | 'payment_received' | 'status_update' | 'system' | 'message';
  bookingId?: string;
  read: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  bookingId?: string;
  subject: string;
  category: 'booking' | 'refund' | 'chef_behavior' | 'billing' | 'general';
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface PlatformConfig {
  commissionPercentage: number;
  taxPercentage: number;
  minAdvancePaymentPercentage: number;
  cancellationRefundThresholdHours: number;
  supportPhone: string;
  supportEmail: string;
}
