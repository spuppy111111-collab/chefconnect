import React, { useState, useMemo } from 'react';
import { Chef, EventType, FoodType, IngredientArrangement, BookingItem } from '../types/database';
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  Utensils,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  Scale,
  Sparkles,
} from 'lucide-react';
import { calculateBookingFees, formatINR } from '../utils/pricing';
import { hasBookingConflict, isDateInPast, checkChefAvailabilityForSlot } from '../utils/bookingWorkflow';
import { appStore } from '../services/store';

interface BookingFormModalProps {
  chef: Chef | null;
  initialSlot?: { date: string; time: string };
  onClose: () => void;
  onSubmitBooking: (bookingData: any) => void;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  chef,
  initialSlot,
  onClose,
  onSubmitBooking,
}) => {
  if (!chef) return null;

  const state = appStore.getState();
  const currentUser = state.currentUser;

  // Form states
  const [eventType, setEventType] = useState<EventType>('family_function');
  const [foodType, setFoodType] = useState<FoodType>('sweets');
  
  // Date & Time
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [eventDate, setEventDate] = useState<string>(initialSlot?.date || tomorrowStr);
  const [startTime, setStartTime] = useState<string>(initialSlot?.time || '09:00');
  const [durationHours, setDurationHours] = useState<number>(4);
  const [guestsCount, setGuestsCount] = useState<number>(25);

  // Address
  const [venueAddress, setVenueAddress] = useState<string>(
    currentUser?.address || 'Villa 14, Palm Meadows, Jubilee Hills'
  );
  const [city, setCity] = useState<string>(currentUser?.city || 'Hyderabad');

  // Customer Contact Details
  const [customerName, setCustomerName] = useState<string>(currentUser?.fullName || 'Rahul Verma');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '+91 98765 43210');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || 'rahul@example.com');

  // Ingredients & Equipment
  const [ingredientArrangement, setIngredientArrangement] =
    useState<IngredientArrangement>('chef_provided');
  const [utensilsProvidedByCustomer, setUtensilsProvidedByCustomer] = useState<boolean>(true);
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    'Need pure cow ghee and roasted dry fruits for the laddus. Family function pooja in morning.'
  );

  // Food Items List (Dynamic items & quantities)
  const defaultItem: BookingItem = {
    id: `item-${Date.now()}`,
    dishName: chef.specialties.includes('Sweets & Laddu Preparation')
      ? 'Pure Ghee Besan Laddu'
      : chef.featuredDishes[0]?.name || 'Traditional Feast Meals',
    foodType: 'sweets',
    quantity: 10,
    unit: 'kg',
    estimatedCostPerUnit: 350,
    specialInstructions: '10 kg packed in sweet gift boxes',
  };

  const [items, setItems] = useState<BookingItem[]>([defaultItem]);

  // Add Item to menu
  const addItem = () => {
    const newItem: BookingItem = {
      id: `item-${Date.now()}`,
      dishName: '',
      foodType: foodType,
      quantity: 5,
      unit: foodType === 'sweets' ? 'kg' : 'plates',
      estimatedCostPerUnit: 200,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BookingItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Live Price Calculations
  const calculatedFee = useMemo(() => {
    return calculateBookingFees({
      hourlyRate: chef.hourlyRate,
      baseCharge: chef.baseCharge,
      durationHours,
      guestsCount,
      eventType,
      items: items.map((i) => ({
        quantity: i.quantity,
        unit: i.unit,
        estimatedCostPerUnit: i.estimatedCostPerUnit,
      })),
      ingredientArrangement,
      commissionPercentage: state.platformConfig.commissionPercentage,
    });
  }, [
    chef,
    durationHours,
    guestsCount,
    eventType,
    items,
    ingredientArrangement,
    state.platformConfig.commissionPercentage,
  ]);

  // Availability & Conflict Detection Check
  const availabilityCheck = useMemo(() => {
    return checkChefAvailabilityForSlot(
      chef,
      state.bookings,
      {
        eventDate,
        startTime,
        expectedDurationHours: durationHours,
      }
    );
  }, [chef, state.bookings, eventDate, startTime, durationHours]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // 1. Guard against past date
    if (isDateInPast(eventDate)) {
      alert('Booking date cannot be in the past. Please select an upcoming date.');
      return;
    }

    // 2. Food items and quantities validation
    if (items.some((i) => !i.dishName.trim())) {
      alert('Please enter names for all requested food items.');
      return;
    }

    if (items.some((i) => !i.quantity || i.quantity <= 0 || isNaN(i.quantity))) {
      alert('All food item quantities must be greater than zero.');
      return;
    }

    // 3. Guests and duration
    if (!guestsCount || guestsCount < 1) {
      alert('Please specify at least 1 guest for the cooking service.');
      return;
    }

    if (!durationHours || durationHours < 1) {
      alert('Cooking duration must be at least 1 hour.');
      return;
    }

    // 4. Venue address
    if (!venueAddress.trim()) {
      alert('Please enter your full cooking venue address.');
      return;
    }

    // 5. Re-check slot availability and conflict immediately prior to dispatch
    const latestState = appStore.getState();
    const liveAvailability = checkChefAvailabilityForSlot(
      chef,
      latestState.bookings,
      {
        eventDate,
        startTime,
        expectedDurationHours: durationHours,
      }
    );

    if (!liveAvailability.isAvailable) {
      alert(`Cannot book: ${liveAvailability.reason || 'Chef is unavailable for this date and time'}`);
      return;
    }

    setIsSubmitting(true);

    const bookingPayload = {
      customerId: currentUser?.id || `user-cust-${Date.now()}`,
      customerName,
      customerPhone,
      customerEmail,
      chefId: chef.id,
      chefName: chef.fullName,
      chefAvatarUrl: chef.avatarUrl,
      eventType,
      foodType,
      eventDate,
      startTime,
      expectedDurationHours: durationHours,
      guestsCount,
      venueAddress,
      city,
      items,
      ingredientArrangement,
      utensilsProvidedByCustomer,
      specialInstructions,
      referenceImages: [],
      chefServiceFee: calculatedFee.chefServiceFee,
      ingredientFee: calculatedFee.ingredientFee,
      platformFee: calculatedFee.platformFee,
      additionalCharges: 0,
      totalAmount: calculatedFee.totalAmount,
      advanceDepositRequired: calculatedFee.advanceDepositRequired,
    };

    try {
      onSubmitBooking(bookingPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-stone-200 relative">
        
        {/* Top Header */}
        <div className="sticky top-0 bg-white z-20 px-6 sm:px-8 py-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={chef.avatarUrl}
              alt={chef.fullName}
              className="w-12 h-12 rounded-2xl object-cover border border-[#D9A441]"
            />
            <div>
              <h2 className="text-xl font-bold font-display text-[#173D2E]">
                Booking Request: {chef.fullName}
              </h2>
              <p className="text-xs text-stone-500">
                At-Home Cooking Service • {formatINR(chef.hourlyRate)}/hr base
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {/* Section 1: Event Details & Schedule */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" />
              1. Event & Schedule Requirements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Event Type */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Type of Event
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                >
                  <option value="home_cooking">Home Cooking</option>
                  <option value="family_function">Family Function</option>
                  <option value="birthday">Birthday Party</option>
                  <option value="festival">Festival / Pooja</option>
                  <option value="wedding">Wedding / Reception</option>
                  <option value="corporate_event">Corporate Gathering</option>
                  <option value="other">Other Event</option>
                </select>
              </div>

              {/* Food Type */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Food Category
                </label>
                <select
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value as FoodType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                >
                  <option value="sweets">Sweets & Mithai Preparation</option>
                  <option value="traditional">Traditional Regional Dishes</option>
                  <option value="vegetarian">Pure Vegetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian Specialties</option>
                  <option value="snacks">Snacks & Hi-Tea</option>
                  <option value="custom_menu">Custom Mixed Menu</option>
                </select>
              </div>

              {/* Event Date */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Cooking Date
                </label>
                <input
                  type="date"
                  min={tomorrowStr}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Chef Arrival Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  required
                />
              </div>

              {/* Cooking Duration */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Expected Duration (Hours)
                </label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  step="0.5"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  required
                />
                <span className="text-[10px] text-stone-400">Prep, cooking & packaging</span>
              </div>

              {/* Number of People */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Number of People / Guests
                </label>
                <input
                  type="number"
                  min="2"
                  max="500"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:ring-2 focus:ring-[#173D2E]"
                  required
                />
                <span className="text-[10px] text-stone-400">Determines assistant ratio</span>
              </div>

            </div>

            {/* Availability / Conflict Warning */}
            {!availabilityCheck.isAvailable && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Chef Unavailable:</span> {availabilityCheck.reason}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Food Items & Quantities Builder */}
          <div className="bg-[#FFF8EC]/60 p-6 rounded-3xl border border-[#D9A441]/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#173D2E] flex items-center">
                  <Utensils className="w-4 h-4 text-[#D9A441] mr-1.5" />
                  2. Dishes to Prepare & Quantities
                </h3>
                <p className="text-xs text-stone-500">
                  Specify exact quantities (e.g. 10 kg Besan Laddu or 30 plates Biryani).
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="px-3.5 py-1.5 rounded-xl bg-[#173D2E] text-white hover:bg-[#0f291e] text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Add Dish</span>
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Dish Name */}
                  <div className="sm:col-span-5">
                    <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                      Dish Name #{idx + 1}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pure Ghee Besan Laddu"
                      value={item.dishName}
                      onChange={(e) => updateItem(idx, 'dishName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-[#173D2E]"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-800"
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                    >
                      <option value="kg">kg (weight)</option>
                      <option value="plates">plates</option>
                      <option value="pieces">pieces</option>
                      <option value="liters">liters</option>
                    </select>
                  </div>

                  {/* Estimated Cost if chef provides */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                      Raw Est. / {item.unit}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.estimatedCostPerUnit || 150}
                      onChange={(e) => updateItem(idx, 'estimatedCostPerUnit', Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="p-2 text-stone-400 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Ingredients & Utensils Arrangement */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-3 flex items-center">
              <PackageCheck className="w-4 h-4 mr-1.5" />
              3. Ingredients & Equipment Arrangement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Ingredient Choice */}
              <div
                onClick={() => setIngredientArrangement('customer_provided')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  ingredientArrangement === 'customer_provided'
                    ? 'border-[#173D2E] bg-[#173D2E]/5 ring-2 ring-[#173D2E]'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#173D2E]">
                    I Will Provide All Ingredients
                  </span>
                  <span className="text-xs font-bold text-emerald-700">₹0 Extra</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  You purchase the ghee, flour, dry fruits, spices, and groceries. Chef sends you a checklist before arrival.
                </p>
              </div>

              {/* Chef Provides Ingredients */}
              <div
                onClick={() => setIngredientArrangement('chef_provided')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  ingredientArrangement === 'chef_provided'
                    ? 'border-[#173D2E] bg-[#173D2E]/5 ring-2 ring-[#173D2E]'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#173D2E]">
                    Chef Arranges Fresh Ingredients
                  </span>
                  <span className="text-xs font-bold text-[#D9A441]">
                    + {formatINR(calculatedFee.ingredientFee)} Est.
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Chef purchases premium ingredients (pure cow ghee, fresh spices, nuts) and brings receipts.
                </p>
              </div>

            </div>

            {/* Utensils Availability Toggle */}
            <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-stone-800 block">
                  Cooking Utensils & Stove Availability
                </span>
                <span className="text-stone-500">
                  Does your home or venue have standard gas burners, cooking vessels, and running water?
                </span>
              </div>
              <label className="flex items-center space-x-2 shrink-0 font-bold text-[#173D2E]">
                <input
                  type="checkbox"
                  checked={utensilsProvidedByCustomer}
                  onChange={(e) => setUtensilsProvidedByCustomer(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#173D2E]"
                />
                <span>Available at Venue</span>
              </label>
            </div>
          </div>

          {/* Section 4: Cooking Venue Address & Instructions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-1.5" />
              4. Venue Address & Special Instructions
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Full Cooking Address & Landmark
                </label>
                <textarea
                  rows={2}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="e.g. Villa 14, Palm Meadows, Road No 36, Jubilee Hills, Hyderabad"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#173D2E]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">
                  Dietary Requirements & Kitchen Notes
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Jain food (no onion/garlic), pure cow ghee, mild spice for kids"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-[#173D2E]"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Transparent Pricing Breakdown */}
          <div className="p-6 rounded-3xl bg-stone-900 text-white border border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-4 flex items-center">
              <Scale className="w-4 h-4 mr-1.5" />
              Estimated Transparent Pricing Breakdown
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Chef Cooking Service Fee ({durationHours}h × {formatINR(chef.hourlyRate)} + base):</span>
                <span className="font-semibold text-white">{formatINR(calculatedFee.chefServiceFee)}</span>
              </div>

              {ingredientArrangement === 'chef_provided' && (
                <div className="flex justify-between text-stone-300">
                  <span>Estimated Fresh Ingredients Cost:</span>
                  <span className="font-semibold text-amber-300">{formatINR(calculatedFee.ingredientFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-300">
                <span>Platform Coordination & Hygiene Insurance (10%):</span>
                <span className="font-semibold text-white">{formatINR(calculatedFee.platformFee)}</span>
              </div>

              <div className="pt-3 border-t border-stone-700 flex justify-between text-sm sm:text-base font-bold">
                <span className="text-[#FFF8EC]">Total Estimated Amount:</span>
                <span className="text-[#D9A441] font-extrabold text-lg sm:text-xl">
                  {formatINR(calculatedFee.totalAmount)}
                </span>
              </div>

              <div className="pt-2 text-[11px] text-stone-400 flex items-center justify-between">
                <span>Advance deposit due upon chef quotation acceptance (50%):</span>
                <span className="font-bold text-emerald-400">
                  {formatINR(calculatedFee.advanceDepositRequired)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!availabilityCheck.isAvailable || isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-extrabold bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>{isSubmitting ? 'Verifying & Submitting...' : 'Submit Booking Request'}</span>
              <ChevronRight className="w-4 h-4 text-[#D9A441]" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
