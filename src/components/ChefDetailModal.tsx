import React, { useState } from 'react';
import { Chef, Review, CookingService } from '../types/database';
import {
  X,
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Check,
  Calendar,
  Utensils,
  ChevronRight,
  MessageSquare,
  Sparkles,
  DollarSign,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import { getChefStats } from '../utils/chefStats';
import { appStore } from '../services/store';

interface ChefDetailModalProps {
  chef: Chef | null;
  reviews: Review[];
  onClose: () => void;
  onProceedToBooking: (chef: Chef, selectedSlot?: { date: string; time: string }) => void;
}

export const ChefDetailModal: React.FC<ChefDetailModalProps> = ({
  chef,
  reviews,
  onClose,
  onProceedToBooking,
}) => {
  if (!chef) return null;

  const chefReviews = reviews.filter((r) => r.chefId === chef.id);
  const bookings = appStore.getState().bookings;
  const cookingServices = appStore.getState().cookingServices;
  const stats = getChefStats(chef.id, bookings, reviews);
  const isActuallyVerified = chef.status === 'approved';

  // Live menu items / cooking services registered by this chef
  const chefMenuServices = cookingServices.filter(
    (s) => s.chefId === chef.id && s.isActive !== false
  );

  // Quick slot selector for convenience, respecting working hours
  const today = new Date();
  const sampleSlots = [
    { label: 'Tomorrow', date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], time: '09:00' },
    { label: 'In 3 Days', date: new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0], time: '11:00' },
    { label: 'Weekend Morning', date: new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0], time: '08:30' },
    { label: 'Weekend Evening', date: new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0], time: '17:00' },
  ];

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-stone-700 hover:text-stone-900 flex items-center justify-center shadow-md transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Banner */}
        <div className="relative h-64 sm:h-76 w-full bg-stone-900 overflow-hidden">
          <img
            src={chef.avatarUrl}
            alt={chef.fullName || 'Chef Photo'}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-6 left-6 flex flex-wrap items-center gap-2">
            {isActuallyVerified ? (
              <span className="px-3 py-1 rounded-full bg-[#173D2E]/90 backdrop-blur-md text-[#FFF8EC] text-xs font-bold flex items-center space-x-1.5 shadow-md border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-[#D9A441]" />
                <span>Verified Chef • Identity & Hygiene Audited</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-stone-800/80 backdrop-blur-md text-stone-300 text-xs font-bold">
                Verification Pending
              </span>
            )}

            <span className="px-3 py-1 rounded-full bg-[#D9A441] text-[#173D2E] text-xs font-extrabold shadow-md">
              {chef.experienceYears ? `${chef.experienceYears} Years Experience` : 'Experience: Not provided'}
            </span>

            {stats.lastMonthCompletedBookings > 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md">
                {stats.lastMonthCompletedBookings} Orders Completed Last Month
              </span>
            )}
          </div>

          {/* Chef Title, Location & Key Stats */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
                  {chef.fullName || 'Not provided'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#FFF8EC]/90 mt-1.5">
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 text-[#D9A441] mr-1" />
                    {chef.location
                      ? `${chef.location}${chef.serviceRadius ? ` (${chef.serviceRadius} km radius)` : ''}`
                      : 'Location: Not provided'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center text-[#D9A441] font-bold">
                    <Star className="w-4 h-4 fill-current mr-1" />
                    {stats.averageRating ? `${stats.averageRating.toFixed(1)}/5 (${stats.reviewCount} ${stats.reviewCount === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-300 font-semibold">
                    {stats.totalCompletedBookings} Total Completed Bookings
                  </span>
                </div>
              </div>

              {/* Rate Card */}
              <div className="bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-right shrink-0">
                <span className="text-[10px] text-[#FFF8EC] uppercase font-bold tracking-wider block">
                  Starting Rate
                </span>
                <span className="text-2xl font-black text-white">
                  {formatINR(chef.hourlyRate || chef.baseCharge || 0)}
                </span>
                <span className="text-xs text-[#FFF8EC]"> / hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Content Details */}
        <div className="p-6 sm:p-8 space-y-8">

          {/* 1. Professional Introduction & Background */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#D9A441]" />
              <span>Professional Introduction & Culinary Expertise</span>
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">
              {chef.bio || 'Not provided.'}
            </p>
          </div>

          {/* 2. Specialties & Supported Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#FFF8EC] p-6 rounded-3xl border border-[#D9A441]/30">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D2E] mb-3 flex items-center">
                <Utensils className="w-4 h-4 text-[#D9A441] mr-1.5" />
                Food Specialties
              </h4>
              <div className="flex flex-wrap gap-2">
                {(chef.specialties || []).map((spec, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-white text-xs font-semibold text-[#173D2E] border border-stone-200 shadow-2xs"
                  >
                    {spec}
                  </span>
                ))}
                {(chef.specialties || []).length === 0 && (
                  <span className="text-xs text-stone-500 italic">Not provided</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#173D2E] mb-3 flex items-center">
                <Calendar className="w-4 h-4 text-[#D9A441] mr-1.5" />
                Event Types Supported
              </h4>
              <div className="flex flex-wrap gap-2">
                {(chef.supportedEvents || []).map((evt, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-white text-xs font-semibold text-stone-700 border border-stone-200 capitalize"
                  >
                    {evt.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Pricing & Service Charges Breakdown */}
          <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#173D2E] flex items-center space-x-1.5">
              <DollarSign className="w-4 h-4 text-[#D9A441]" />
              <span>Pricing & Service Charges</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Hourly Cooking Rate</span>
                <span className="text-lg font-black text-[#173D2E]">{formatINR(chef.hourlyRate || 0)} / hr</span>
                <span className="text-[11px] text-stone-500 block">Min 2-3 hours service</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Event Base Charge</span>
                <span className="text-lg font-black text-[#173D2E]">{formatINR(chef.baseCharge || 0)}</span>
                <span className="text-[11px] text-stone-500 block">Base setup & travel</span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Per Person Rate</span>
                <span className="text-lg font-black text-[#173D2E]">{formatINR(chef.perPersonRate || 100)} / person</span>
                <span className="text-[11px] text-stone-500 block">For buffets & group events</span>
              </div>
            </div>
          </div>

          {/* 4. Complete Menu and Food Item List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
                <Utensils className="w-4 h-4 text-[#D9A441]" />
                <span>Menu & Signature Food Items</span>
              </h3>
              <span className="text-xs text-stone-500">
                Prepared live on-site
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Featured Dishes */}
              {(chef.featuredDishes || []).map((dish, i) => (
                <div
                  key={`feat-${i}`}
                  className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-[#173D2E]">{dish.name}</h5>
                    <span className="text-[11px] text-stone-500">
                      Category: {dish.category || 'Specialty'} • Per {dish.unit || 'plate'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-stone-600 block">
                      ~{dish.typicalPrepTimeHours || 2} hrs prep
                    </span>
                    <span className="text-xs font-bold text-[#D9A441]">
                      Est. {formatINR(dish.samplePricePerUnit || 150)}/{dish.unit || 'unit'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Registered Cooking Services / Menu Items */}
              {chefMenuServices.map((srv) => (
                <div
                  key={`srv-${srv.id}`}
                  className="p-3.5 rounded-2xl bg-[#FFF8EC]/60 border border-[#D9A441]/30 flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-[#173D2E]">{srv.serviceName}</h5>
                    <span className="text-[11px] text-stone-500">
                      {srv.description || 'Custom crafted culinary specialty'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-stone-600 block">
                      Min {srv.minDurationHours} hrs
                    </span>
                    <span className="text-xs font-bold text-[#D9A441]">
                      {formatINR(srv.baseRate)} / {srv.pricingType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}

              {(chef.featuredDishes || []).length === 0 && chefMenuServices.length === 0 && (
                <div className="col-span-2 p-6 rounded-2xl bg-stone-50 text-center text-xs text-stone-500">
                  No customized menu items registered. Custom menus can be requested during booking.
                </div>
              )}
            </div>
          </div>

          {/* 5. Service Locations, Radius & Working Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-600">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <h4 className="font-bold text-[#173D2E] mb-1.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Service Coverage Locations:</span>
              </h4>
              <p>
                <strong>Base City:</strong> {chef.location || 'Not provided'}
                {chef.serviceRadius ? ` (${chef.serviceRadius} km coverage radius)` : ''}
              </p>
              <p className="mt-1">
                <strong>Serving Areas:</strong> {(chef.serviceAreas || []).join(', ') || 'Within base location'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <h4 className="font-bold text-[#173D2E] mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>Working Hours & Schedule:</span>
              </h4>
              <p>
                <strong>Daily Hours:</strong> {chef.workingHours || '08:00 AM - 10:00 PM'}
              </p>
              <p className="mt-1">
                <strong>Operating Days:</strong> {(chef.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).join(', ')}
              </p>
            </div>
          </div>

          {/* 6. Available Dates and Time Slots Picker */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-[#D9A441]" />
              <span>Select Date & Preferred Time Slot</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sampleSlots.map((slot, idx) => {
                const isBlocked = (chef.blockedDates || []).includes(slot.date);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isBlocked
                        ? 'opacity-40 cursor-not-allowed border-stone-200 bg-stone-100'
                        : selectedSlotIndex === idx
                        ? 'border-[#173D2E] bg-[#173D2E] text-white shadow-md'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <span className="text-[11px] font-bold block opacity-80">{slot.label}</span>
                    <span className="text-xs font-extrabold block mt-0.5">{slot.date}</span>
                    <span className={`text-[11px] block mt-1 font-semibold ${selectedSlotIndex === idx ? 'text-[#D9A441]' : 'text-stone-500'}`}>
                      {isBlocked ? 'Blocked' : `At ${slot.time}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Customer Reviews & Ratings */}
          <div className="pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-1.5">
                <Star className="w-4 h-4 text-[#D9A441]" />
                <span>Customer Reviews & Ratings ({chefReviews.length})</span>
              </h3>
              <span className="text-xs font-bold text-[#173D2E]">
                {stats.averageRating ? `Average ${stats.averageRating.toFixed(1)} / 5.0` : 'No reviews yet'}
              </span>
            </div>

            {chefReviews.length > 0 ? (
              <div className="space-y-4">
                {chefReviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-[#FFF8EC]/60 border border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#173D2E]">{rev.customerName}</span>
                      <div className="flex text-[#D9A441]">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                    {rev.chefReply && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-white border border-amber-200/80 text-[11px]">
                        <span className="font-bold text-[#173D2E] block">Chef Reply:</span>
                        <p className="text-stone-600 mt-0.5">{rev.chefReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">No reviews yet for this chef.</p>
            )}
          </div>

        </div>

        {/* Modal Sticky Bottom CTA Bar with clear Book This Chef button */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg z-20">
          <div>
            <span className="text-xs text-stone-500 block">Starting Rate</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-[#173D2E]">
                {formatINR(chef.hourlyRate || chef.baseCharge || 0)}
              </span>
              <span className="text-xs text-stone-500">/ hr + ingredients as agreed</span>
            </div>
          </div>

          <button
            onClick={() => {
              const chosen = sampleSlots[selectedSlotIndex];
              onProceedToBooking(chef, { date: chosen.date, time: chosen.time });
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-extrabold bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] text-sm shadow-md hover:shadow-xl transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>Book This Chef</span>
            <ChevronRight className="w-4 h-4 text-[#D9A441]" />
          </button>
        </div>

      </div>
    </div>
  );
};
