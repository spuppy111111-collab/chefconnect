import React, { useState, useMemo } from 'react';
import { Chef, EventType } from '../types/database';
import {
  Search,
  Filter,
  MapPin,
  Star,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
  Clock,
  Sparkles,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import { checkChefAvailabilityForSlot } from '../utils/bookingWorkflow';
import { appStore } from '../services/store';
import { ChefCard } from './ChefCard';
import { ChefCardSkeleton } from './skeletons/ChefCardSkeleton';

interface ChefDirectoryProps {
  chefs: Chef[];
  initialFilters?: {
    location?: string;
    specialty?: string;
    eventType?: EventType;
  };
  isLoading?: boolean;
  onSelectChef: (chef: Chef) => void;
}

export const ChefDirectory: React.FC<ChefDirectoryProps> = ({
  chefs,
  initialFilters = {},
  isLoading = false,
  onSelectChef,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialFilters.specialty || '');
  const [selectedLocation, setSelectedLocation] = useState(initialFilters.location || '');
  const [maxBudget, setMaxBudget] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(0);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [targetDate, setTargetDate] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('10:00');
  const [filterAvailableOnly, setFilterAvailableOnly] = useState<boolean>(false);

  const bookings = appStore.getState().bookings;
  const reviews = appStore.getState().reviews;

  // Sync when initialFilters change
  React.useEffect(() => {
    if (initialFilters.specialty) setSelectedSpecialty(initialFilters.specialty);
    if (initialFilters.location) setSelectedLocation(initialFilters.location);
  }, [initialFilters]);

  // Extract unique locations and specialties from approved chefs
  const approvedChefs = useMemo(() => chefs.filter((c) => c.status === 'approved'), [chefs]);

  const uniqueSpecialties = useMemo(() => {
    const set = new Set<string>();
    approvedChefs.forEach((c) => c.specialties.forEach((s) => set.add(s)));
    return Array.from(set);
  }, [approvedChefs]);

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    approvedChefs.forEach((c) => {
      c.serviceAreas.forEach((area) => set.add(area));
    });
    return Array.from(set);
  }, [approvedChefs]);

  // Filtered Chefs
  const filteredChefs = useMemo(() => {
    return approvedChefs.filter((chef) => {
      // Search text (name, bio, specialties, dishes)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = chef.fullName.toLowerCase().includes(query);
        const matchesBio = chef.bio.toLowerCase().includes(query);
        const matchesSpecialty = chef.specialties.some((s) => s.toLowerCase().includes(query));
        const matchesDish = chef.featuredDishes.some((d) => d.name.toLowerCase().includes(query));
        if (!matchesName && !matchesBio && !matchesSpecialty && !matchesDish) {
          return false;
        }
      }

      // Specialty filter
      if (selectedSpecialty && !chef.specialties.includes(selectedSpecialty)) {
        return false;
      }

      // Location filter
      if (selectedLocation) {
        const loc = selectedLocation.toLowerCase();
        const matchesLocation =
          chef.location.toLowerCase().includes(loc) ||
          chef.serviceAreas.some((a) => a.toLowerCase().includes(loc));
        if (!matchesLocation) return false;
      }

      // Budget filter
      if (chef.hourlyRate > maxBudget) {
        return false;
      }

      // Rating filter
      if (minRating > 0 && chef.rating < minRating) {
        return false;
      }

      // Availability filter: Today
      if (availableTodayOnly) {
        const todayStr = new Date().toISOString().split('T')[0];
        const avail = checkChefAvailabilityForSlot(chef, bookings, {
          eventDate: todayStr,
          startTime: '12:00',
          expectedDurationHours: 3,
        });
        if (!avail.isAvailable || !chef.isAvailableToday) {
          return false;
        }
      }

      // Slot filter: Target Date & Time
      if (targetDate && filterAvailableOnly) {
        const slotAvail = checkChefAvailabilityForSlot(chef, bookings, {
          eventDate: targetDate,
          startTime: targetTime || '10:00',
          expectedDurationHours: 3,
        });
        if (!slotAvail.isAvailable) {
          return false;
        }
      }

      return true;
    });
  }, [
    approvedChefs,
    bookings,
    searchTerm,
    selectedSpecialty,
    selectedLocation,
    maxBudget,
    minRating,
    availableTodayOnly,
    targetDate,
    targetTime,
    filterAvailableOnly,
  ]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('');
    setSelectedLocation('');
    setMaxBudget(1000);
    setMinRating(0);
    setAvailableTodayOnly(false);
    setTargetDate('');
    setTargetTime('10:00');
    setFilterAvailableOnly(false);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(selectedSpecialty) ||
    Boolean(selectedLocation) ||
    Boolean(targetDate) ||
    maxBudget < 1000 ||
    minRating > 0 ||
    availableTodayOnly ||
    filterAvailableOnly;

  return (
    <div className="py-12 bg-[#FFF8EC] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title */}
        <div className="mb-10">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-2">
            <Sparkles className="w-4 h-4 text-[#D9A441]" />
            <span>Curated Culinary Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] font-display">
            Find Your At-Home Private Chef
          </h1>
          <p className="mt-2 text-stone-600 text-sm sm:text-base max-w-2xl">
            Browse verified culinary artisans specializing in regional cuisine, sweets, wedding banquets, and everyday home meals.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by chef name, dish (e.g. Laddu, Biryani), or cuisine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Specialty Select */}
            <div>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-sm bg-white"
              >
                <option value="">All Specialties</option>
                {uniqueSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Area Select */}
            <div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-sm bg-white"
              >
                <option value="">All Service Areas</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Secondary Filter Row */}
          <div className="mt-6 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              
              {/* Budget Slider */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-bold text-stone-600">Max Rate:</span>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="w-28 sm:w-36 accent-[#173D2E]"
                />
                <span className="font-bold text-[#173D2E]">
                  {formatINR(maxBudget)}/hr
                </span>
              </div>

              {/* Min Rating */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-stone-600">Rating:</span>
                <div className="flex space-x-1">
                  {[0, 4.5, 4.8].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        minRating === rating
                          ? 'bg-[#173D2E] text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {rating === 0 ? 'All' : `${rating}+ ★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Today Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={availableTodayOnly}
                  onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#173D2E] accent-[#173D2E]"
                />
                <span>Available Today</span>
              </label>

            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-semibold text-stone-600">
            Showing <span className="text-[#173D2E] font-bold">{filteredChefs.length}</span> verified chefs
          </p>
        </div>

        {/* Chef Cards Grid */}
        {isLoading ? (
          <ChefCardSkeleton count={6} />
        ) : filteredChefs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
            <div className="w-16 h-16 rounded-full bg-[#FFF8EC] text-[#D9A441] flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#173D2E]">No chefs match your current filters</h3>
            <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
              Try broadening your budget range, picking a different service area, or resetting the search filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#173D2E] text-[#FFF8EC] font-bold text-xs hover:bg-[#0f291e]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredChefs.map((chef) => (
              <ChefCard
                key={chef.id}
                chef={chef}
                bookings={bookings}
                reviews={reviews}
                onViewProfile={onSelectChef}
                onBookChef={onSelectChef}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
