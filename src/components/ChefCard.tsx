import React from 'react';
import { Chef, Booking, Review } from '../types/database';
import { getChefStats } from '../utils/chefStats';
import { CheckCircle2, Heart, Eye, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/pricing';

export interface ChefMatchInfo {
  matchedCount: number;
  totalSelected: number;
  isFullMatch: boolean;
  matchedItems?: string[];
}

interface ChefCardProps {
  chef: Chef;
  bookings: Booking[];
  reviews: Review[];
  matchedInfo?: ChefMatchInfo;
  isSaved?: boolean;
  onToggleSave?: (chefId: string) => void;
  onViewProfile: (chef: Chef) => void;
  onBookChef: (chef: Chef) => void;
}

export const ChefCard: React.FC<ChefCardProps> = ({
  chef,
  bookings,
  reviews,
  matchedInfo,
  isSaved = false,
  onToggleSave,
  onViewProfile,
  onBookChef,
}) => {
  const stats = getChefStats(chef.id, bookings, reviews);
  const isActuallyVerified = chef.status === 'approved';

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      {/* 1. Chef Profile Photo Section */}
      <div className="relative h-56 sm:h-64 w-full bg-stone-100 overflow-hidden">
        <img
          src={chef.avatarUrl}
          alt={chef.fullName || 'Chef Photo'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Favorite Heart Button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(chef.id);
            }}
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md shadow-md transition-all ${
              isSaved
                ? 'bg-white text-red-500 hover:scale-110'
                : 'bg-black/40 text-white hover:text-red-400 hover:bg-black/60'
            }`}
            aria-label={isSaved ? 'Remove from favorites' : 'Save chef'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Verified Badge - ONLY shown if chef is actually verified (status === 'approved') */}
        {isActuallyVerified && (
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span className="px-3 py-1 rounded-full bg-[#173D2E]/90 backdrop-blur-md text-[#FFF8EC] text-[11px] font-bold flex items-center space-x-1.5 shadow-sm border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Verified Chef</span>
            </span>
          </div>
        )}

        {/* Starting Price Overlay in photo bottom corner */}
        <div className="absolute bottom-3 right-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20">
          <span className="text-[10px] text-stone-300 mr-1">From</span>
          <span className="text-xs font-black text-[#D9A441]">{formatINR(chef.hourlyRate || chef.baseCharge || 0)}</span>
          <span className="text-[10px] text-stone-300">/hr</span>
        </div>
      </div>

      {/* 2. Information Display Under Profile Photo */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Chef Name */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xl font-bold font-display text-[#173D2E] leading-tight">
              {chef.fullName || 'Not provided'}
            </h3>
          </div>

          {/* Core Stats Block directly under photo & name */}
          <div className="space-y-2 text-xs text-stone-700">
            {/* 1. ⭐ Experience: {years} Years */}
            <div className="flex items-center space-x-1.5 font-semibold">
              <span className="text-amber-500">⭐</span>
              <span className="font-bold">Experience:</span>
              <span>{chef.experienceYears ? `${chef.experienceYears} Years` : 'Not provided'}</span>
            </div>

            {/* 2. 📦 Completed Orders Last Month: {count} */}
            <div className="flex items-center space-x-1.5 font-semibold">
              <span>📦</span>
              <span className="font-bold">Completed Orders Last Month:</span>
              <span className="font-bold text-[#173D2E]">
                {typeof stats.lastMonthCompletedBookings === 'number'
                  ? stats.lastMonthCompletedBookings
                  : 'Not provided'}
              </span>
            </div>

            {/* 3. ⭐ Rating: {rating} ({count} Reviews) or No reviews yet */}
            <div className="flex items-center space-x-1.5 font-semibold">
              <span className="text-amber-500">⭐</span>
              <span className="font-bold">Rating:</span>
              {stats.averageRating ? (
                <span className="text-[#D9A441] font-bold">
                  {stats.averageRating.toFixed(1)}{' '}
                  <span className="text-stone-500 font-normal">
                    ({stats.reviewCount} {stats.reviewCount === 1 ? 'Review' : 'Reviews'})
                  </span>
                </span>
              ) : (
                <span className="text-stone-500 font-normal">No reviews yet</span>
              )}
            </div>

            {/* 4. 📍 Location: {location} */}
            <div className="flex items-center space-x-1.5">
              <span className="text-red-500 shrink-0">📍</span>
              <span className="font-bold shrink-0">Location:</span>
              <span className="truncate">
                {chef.location
                  ? `${chef.location}${chef.serviceRadius ? ` (${chef.serviceRadius} km radius)` : ''}`
                  : 'Not provided'}
              </span>
            </div>

            {/* Starting Price & Availability Status */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] border-t border-stone-100">
              <div className="flex items-center space-x-1 font-semibold text-stone-600">
                <span>Starting price:</span>
                <span className="font-black text-[#173D2E]">
                  {chef.hourlyRate ? `${formatINR(chef.hourlyRate)}/hr` : 'Not provided'}
                </span>
              </div>

              <div className="flex items-center space-x-1 font-bold">
                <span className={`w-2 h-2 rounded-full ${chef.isAvailableToday ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                <span className={chef.isAvailableToday ? 'text-emerald-700' : 'text-stone-500'}>
                  {chef.isAvailableToday ? 'Available Today' : 'Next slot available'}
                </span>
              </div>
            </div>
          </div>

          {/* Match badge (if chef matched selected food items) */}
          {matchedInfo && matchedInfo.totalSelected > 0 && (
            <div className="pt-1">
              {matchedInfo.isFullMatch ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  ✨ Prepares all {matchedInfo.totalSelected} selected dishes
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                  Offers {matchedInfo.matchedCount} of {matchedInfo.totalSelected} selected dishes
                </span>
              )}
            </div>
          )}

          {/* Food Specialties */}
          {chef.specialties && chef.specialties.length > 0 ? (
            <div className="pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">
                Specialties:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {chef.specialties.slice(0, 3).map((spec, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FFF8EC] text-[#173D2E] font-medium border border-[#D9A441]/30 truncate max-w-[200px]"
                  >
                    {spec}
                  </span>
                ))}
                {chef.specialties.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold">
                    +{chef.specialties.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-1 text-[11px] text-stone-400 italic">
              Specialties: Not provided
            </div>
          )}
        </div>

        {/* 3. Action Buttons: View Profile & Book Chef */}
        <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onViewProfile(chef)}
            className="w-full py-2.5 px-3 rounded-xl border border-[#173D2E] text-[#173D2E] hover:bg-[#173D2E]/5 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Profile</span>
          </button>

          <button
            type="button"
            onClick={() => onBookChef(chef)}
            className="w-full py-2.5 px-3 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
          >
            <span>Book Chef</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D9A441]" />
          </button>
        </div>
      </div>
    </div>
  );
};
