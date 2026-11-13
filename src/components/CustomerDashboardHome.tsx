import React from 'react';
import { Chef, Booking, Review, Profile } from '../types/database';
import {
  Search,
  Calendar,
  Utensils,
  ChefHat,
  ShieldCheck,
  CheckCircle2,
  Star,
  ArrowRight,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  CreditCard,
  Phone,
  Heart,
  Award,
} from 'lucide-react';
import { FoodItemSelectDropdown } from './FoodItemSelectDropdown';
import { ChefCard } from './ChefCard';
import { getDynamicCategoriesFromApprovedChefs } from '../utils/dynamicCategories';
import { formatINR } from '../utils/pricing';
import { getBookingStatusBadge } from '../utils/bookingWorkflow';
import { FoodCategoryCatalog } from '../utils/foodItemsCatalog';

interface CustomerDashboardHomeProps {
  currentUser: Profile | null;
  chefs: Chef[];
  bookings: Booking[];
  reviews: Review[];
  onNavigateTab: (tab: any) => void;
  onSelectChefForBooking: (chef: Chef) => void;
  onViewChefProfile: (chef: Chef) => void;
  onToggleSaveChef: (chefId: string) => void;
  selectedFoodItems: string[];
  onChangeSelectedFoodItems: (items: string[]) => void;
  customerLocationFilter: string;
  onChangeCustomerLocationFilter: (loc: string) => void;
  onSelectSpecialtyFilter: (spec: string) => void;
  onPayBooking: (b: Booking) => void;
  onContactChef: (name: string, phone: string) => void;
  nextBooking: Booking | null;
  dynamicFoodCatalog?: FoodCategoryCatalog[];
}

export const CustomerDashboardHome: React.FC<CustomerDashboardHomeProps> = ({
  currentUser,
  chefs,
  bookings,
  reviews,
  onNavigateTab,
  onSelectChefForBooking,
  onViewChefProfile,
  onToggleSaveChef,
  selectedFoodItems,
  onChangeSelectedFoodItems,
  customerLocationFilter,
  onChangeCustomerLocationFilter,
  onSelectSpecialtyFilter,
  onPayBooking,
  onContactChef,
  nextBooking,
  dynamicFoodCatalog,
}) => {
  const approvedChefs = chefs.filter((c) => c.status === 'approved');
  const dynamicCategories = getDynamicCategoriesFromApprovedChefs(chefs);
  const verifiedReviews = reviews.filter((r) => r.rating && r.comment);

  return (
    <div className="space-y-12">
      {/* 1. PREMIUM FULL-WIDTH HERO SECTION */}
      <div className="relative rounded-3xl sm:rounded-[36px] overflow-hidden bg-[#142D27] text-white shadow-2xl border border-[#D6B779]/20 min-h-[460px] sm:min-h-[520px] flex items-center">
        {/* Hero background image featuring professional Indian woman chef in luxury kitchen */}
        <img
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1920&q=85"
          alt="Professional Indian woman chef cooking traditional food in luxury kitchen"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#142D27]/95 via-[#142D27]/85 to-transparent sm:w-3/4" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#142D27] via-transparent to-[#142D27]/40" />

        <div className="relative z-10 max-w-2xl px-6 sm:px-12 py-12 sm:py-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#D6B779]/20 backdrop-blur-md text-[#D6B779] text-xs font-bold mb-4 border border-[#D6B779]/40 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ChefConnect • Your Personal Chef, Booked.</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold font-serif leading-[1.15] text-[#F7F5EF] tracking-tight">
            Experience the Joy of{' '}
            <span className="text-[#D6B779] italic font-serif">Homemade Cooking</span>
          </h1>

          <p className="mt-4 text-xs sm:text-base text-[#F7F5EF]/85 leading-relaxed max-w-xl font-normal">
            Book talented professional chefs and enjoy unforgettable meals prepared fresh for your special moments right in your home kitchen.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => onNavigateTab('find_chef')}
              className="px-7 py-3.5 rounded-2xl bg-[#D6B779] hover:bg-[#c4a464] text-[#142D27] font-black text-xs sm:text-sm shadow-xl transition-all duration-200 active:scale-95 flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Explore Our Chefs</span>
            </button>

            <button
              onClick={() => onNavigateTab('book_chef')}
              className="px-7 py-3.5 rounded-2xl bg-[#243B33]/80 hover:bg-[#243B33] text-[#F7F5EF] font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4 text-[#D6B779]" />
              <span>Book a Personal Chef</span>
            </button>
          </div>

          {/* Quick highlights pill row */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-[11px] text-[#F7F5EF]/80">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#D6B779]" />
              <span>Verified Lady & Master Chefs</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#D6B779]" />
              <span>100% Fresh in Your Kitchen</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Star className="w-4 h-4 text-[#D6B779] fill-[#D6B779]" />
              <span>4.9/5 Average Rating</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. TWO QUICK BOOKING OPTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A: Choose Your Food */}
        <div
          onClick={() => onNavigateTab('find_chef')}
          className="relative group cursor-pointer overflow-hidden rounded-3xl p-7 bg-white border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF8EC] text-[#142D27] flex items-center justify-center border border-[#D6B779]/40 group-hover:scale-110 transition-transform">
              <Utensils className="w-6 h-6 text-[#D6B779]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D6B779] bg-amber-50 px-2.5 py-1 rounded-full border border-[#D6B779]/30">
              Option A
            </span>
          </div>
          <div className="mt-5 space-y-1.5">
            <h3 className="text-xl font-bold font-serif text-[#142D27] group-hover:text-[#D6B779] transition-colors">
              Choose Your Food
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Select food items and favorite dishes (Biryani, Crispy Dosa, Paneer, Laddus) and discover talented chefs specializing in those recipes.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#142D27]">
            <span>Find by Food Selection</span>
            <ArrowRight className="w-4 h-4 text-[#D6B779] group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Option B: Choose Your Chef */}
        <div
          onClick={() => onNavigateTab('find_chef')}
          className="relative group cursor-pointer overflow-hidden rounded-3xl p-7 bg-white border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#142D27] flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
              <ChefHat className="w-6 h-6 text-[#142D27]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Option B
            </span>
          </div>
          <div className="mt-5 space-y-1.5">
            <h3 className="text-xl font-bold font-serif text-[#142D27] group-hover:text-[#142D27] transition-colors">
              Choose Your Chef
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Explore chef portfolios, years of experience, genuine ratings, completed orders last month, and service areas across your city.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#142D27]">
            <span>Browse Chef Profiles</span>
            <ArrowRight className="w-4 h-4 text-[#D6B779] group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. SMART FOOD SEARCH PANEL */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
        <div className="max-w-xl">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#D6B779] mb-1">
            <Search className="w-3.5 h-3.5 text-[#D6B779]" />
            <span>Instant Chef Matching</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
            What Would You Love to Eat Today?
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Search food items, select your locality, and immediately find verified chefs who cook those dishes live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="text-xs font-bold text-stone-700 block mb-1.5 flex items-center space-x-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#D6B779]" />
              <span>Select Food Items & Dishes</span>
            </label>
            <FoodItemSelectDropdown
              selectedItems={selectedFoodItems}
              onChange={onChangeSelectedFoodItems}
              categories={dynamicFoodCatalog}
              placeholder="Search food (Biryani, Dosa, Laddoo, Paneer)..."
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-bold text-stone-700 block mb-1.5 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D6B779]" />
              <span>Your City or Neighborhood</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerLocationFilter}
                onChange={(e) => onChangeCustomerLocationFilter(e.target.value)}
                placeholder="e.g. Madhapur, Jubilee Hills, Guntur..."
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#142D27]"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button
              onClick={() => onNavigateTab('find_chef')}
              className="w-full py-3 rounded-2xl bg-[#142D27] hover:bg-[#0B3027] text-[#F7F5EF] font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Search className="w-3.5 h-3.5 text-[#D6B779]" />
              <span>Search Chefs</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. DYNAMIC FOOD EXPERIENCE CATEGORIES (Strictly from approved registered chefs) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#D6B779] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dynamic Culinary Specialties</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
              Food Experience Categories
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Live specialties offered by approved partner chefs. Sourced dynamically from genuine chef profiles.
            </p>
          </div>
          {dynamicCategories.length > 0 && (
            <span className="text-xs font-bold text-[#142D27] bg-[#E9EFE9] px-3 py-1.5 rounded-full">
              {dynamicCategories.length} Active Cuisines Available
            </span>
          )}
        </div>

        {dynamicCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-sm max-w-lg mx-auto">
            <ChefHat className="w-12 h-12 text-[#D6B779] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-[#142D27]">
              No food categories are currently available. Please check back soon.
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Once chefs register their specialties and receive approval, their cuisines will appear dynamically here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {dynamicCategories.map((cat) => (
              <div
                key={cat.name}
                onClick={() => onSelectSpecialtyFilter(cat.name)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-stone-100">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="text-sm sm:text-base font-bold font-serif text-white group-hover:text-[#D6B779] transition-colors leading-tight">
                      {cat.name}
                    </h4>
                    <span className="text-[10px] text-stone-300 font-medium">
                      {cat.chefCount} {cat.chefCount === 1 ? 'Approved Chef' : 'Approved Chefs'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-[#F7F5EF] flex items-center justify-between text-xs font-bold text-[#142D27]">
                  <span className="text-[11px]">Explore Category</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#D6B779] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. EXPLORE OUR CHEFS PREVIEW */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
              Meet Your Personal Chefs
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Discover talented chefs who bring authentic flavours to your table.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('find_chef')}
            className="text-xs font-bold text-[#142D27] hover:text-[#D6B779] flex items-center space-x-1"
          >
            <span>View All ({approvedChefs.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvedChefs.slice(0, 3).map((chef) => {
            const isSaved = currentUser?.savedChefIds?.includes(chef.id);
            return (
              <ChefCard
                key={chef.id}
                chef={chef}
                bookings={bookings}
                reviews={reviews}
                isSaved={isSaved}
                onToggleSave={onToggleSaveChef}
                onViewProfile={onViewChefProfile}
                onBookChef={onSelectChefForBooking}
              />
            );
          })}
        </div>
      </div>

      {/* 6. SPECIAL OCCASIONS SECTION */}
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
            Make Every Occasion Special
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Bespoke live culinary menus crafted for intimate birthday celebrations, grand weddings, and sacred traditional ceremonies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Birthday Celebrations',
              desc: 'Live starters, tandoori appetizers, pasta, and customized snacks for parties of all ages.',
              image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Wedding Functions',
              desc: 'Royal multi-course banana leaf spreads, live deg biryani, and multi-cuisine banquets.',
              image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Family Gatherings',
              desc: 'Wholesome homestyle thalis, fresh phulkas, nutritious curries, and comforting regional food.',
              image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Festival Celebrations',
              desc: 'Deepavali sweets, Sankranti savories, and traditional holiday delicacies prepared fresh.',
              image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Housewarming Ceremonies',
              desc: 'Auspicious Gruhapravesam feasts, pure ghee laddus, and welcoming ceremonial lunch service.',
              image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80',
            },
            {
              title: 'Traditional Pooja Events',
              desc: '100% pure satvik, onion-garlic-free prasadam cooked strictly with holy protocols.',
              image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
            },
          ].map((occ) => (
            <div
              key={occ.title}
              onClick={() => onNavigateTab('find_chef')}
              className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative h-48 w-full overflow-hidden bg-stone-100">
                <img
                  src={occ.image}
                  alt={occ.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h4 className="text-lg font-bold font-serif text-white group-hover:text-[#D6B779] transition-colors">
                    {occ.title}
                  </h4>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed">{occ.desc}</p>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#142D27]">
                  <span>Explore Caterers</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D6B779] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. CUSTOMER TRUST SECTION */}
      <div className="bg-[#E9EFE9] rounded-3xl p-8 sm:p-10 border border-[#142D27]/10 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-[#142D27]/70">
            Why Families Trust ChefConnect
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
            The Gold Standard in Personal Chef Services
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
            <ShieldCheck className="w-7 h-7 text-[#D6B779]" />
            <h4 className="text-xs font-bold text-[#142D27]">Verified Chefs</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              FSSAI hygiene certified & background verified partners.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
            <Utensils className="w-7 h-7 text-[#D6B779]" />
            <h4 className="text-xs font-bold text-[#142D27]">Authentic Cooking</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Cooked live in your kitchen with your trusted spices and oil.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
            <Calendar className="w-7 h-7 text-[#D6B779]" />
            <h4 className="text-xs font-bold text-[#142D27]">Easy Online Booking</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Select date, slot, and food items in 5 intuitive steps.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
            <CreditCard className="w-7 h-7 text-[#D6B779]" />
            <h4 className="text-xs font-bold text-[#142D27]">Transparent Pricing</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Zero hidden fees. Clear hourly and per-guest quotes.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
            <Star className="w-7 h-7 text-[#D6B779]" />
            <h4 className="text-xs font-bold text-[#142D27]">Genuine Reviews</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Authentic feedback from real families who booked services.
            </p>
          </div>
        </div>
      </div>

      {/* 8. GENUINE CUSTOMER TESTIMONIALS */}
      {verifiedReviews.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#142D27]">
              Words From Our Delighted Hosts
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Real experiences from family functions and home dinner parties.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {verifiedReviews.slice(0, 3).map((rev) => {
              const linkedChef = chefs.find((c) => c.id === rev.chefId);
              return (
                <div
                  key={rev.id}
                  className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center space-x-1 text-[#D6B779]">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-[#142D27]">{rev.customerName}</span>
                    {linkedChef && (
                      <span className="text-[11px] text-stone-500">
                        Chef: <strong>{linkedChef.fullName.split(' ')[1] || linkedChef.fullName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. NEXT COOKING SERVICE & SUMMARY FOR RETURNING CUSTOMERS */}
      {nextBooking && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#D6B779]" />
              <h3 className="text-base font-bold font-serif text-[#142D27]">
                Your Upcoming Cooking Appointment
              </h3>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              #{nextBooking.bookingNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-stone-700">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Assigned Chef</span>
              <span className="font-bold text-[#142D27] text-sm block">{nextBooking.chefName}</span>
              <span className="text-[11px] text-stone-500 capitalize">{nextBooking.eventType.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Date & Time</span>
              <span className="font-bold text-[#142D27] block">{nextBooking.eventDate} at {nextBooking.startTime}</span>
              <span className="text-[11px] text-stone-500">{nextBooking.expectedDurationHours}h cooking</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Location</span>
              <span className="font-semibold text-stone-800 line-clamp-1 block">{nextBooking.venueAddress}</span>
              <span className="text-[11px] text-stone-500">{nextBooking.city}</span>
            </div>
            <div className="flex items-center justify-end space-x-2">
              {nextBooking.status === 'accepted' && (
                nextBooking.paymentStatus === 'payment_verification_pending' ? (
                  <span className="px-3 py-2 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center space-x-1.5 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Verification Pending</span>
                  </span>
                ) : nextBooking.paymentStatus === 'rejected' ? (
                  <button
                    onClick={() => onPayBooking(nextBooking)}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
                  >
                    Resubmit Deposit
                  </button>
                ) : (
                  <button
                    onClick={() => onPayBooking(nextBooking)}
                    className="px-4 py-2 rounded-xl bg-[#142D27] text-[#F7F5EF] text-xs font-bold hover:bg-[#0f291e]"
                  >
                    Pay Deposit
                  </button>
                )
              )}
              <button
                onClick={() => onNavigateTab('my_bookings')}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50"
              >
                View Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. PREMIUM FOOTER */}
      <footer className="pt-10 pb-6 border-t border-stone-200 space-y-8 text-xs text-stone-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <img src="/logo.jpg" alt="ChefConnect" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold font-serif text-base text-[#142D27]">ChefConnect</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Your Personal Chef, Booked. Verified professional lady and master chefs for daily meals, celebrations, and royal gatherings.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#142D27] mb-2.5 uppercase tracking-wider text-[11px]">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigateTab('find_chef')} className="hover:text-[#D6B779]">
                  Explore Our Chefs
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateTab('book_chef')} className="hover:text-[#D6B779]">
                  Book a Personal Chef
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateTab('my_bookings')} className="hover:text-[#D6B779]">
                  My Reservations
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateTab('profile')} className="hover:text-[#D6B779]">
                  Account Profile
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#142D27] mb-2.5 uppercase tracking-wider text-[11px]">
              Customer Support
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>Concierge Helpline: +91 99000 88990</li>
              <li>Email: support@bookmychef.com</li>
              <li>Operational Hours: 7:00 AM – 11:00 PM</li>
              <li>Hygiene & Food Safety Protocols</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#142D27] mb-2.5 uppercase tracking-wider text-[11px]">
              Legal & Trust
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li className="hover:text-[#142D27] cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-[#142D27] cursor-pointer">Privacy Policy</li>
              <li className="hover:text-[#142D27] cursor-pointer">Cancellation & Refund Policy</li>
              <li className="hover:text-[#142D27] cursor-pointer">Chef Partner Verification</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
          <span>© {new Date().getFullYear()} ChefConnect – Your Personal Chef, Booked. All rights reserved.</span>
          <span>Crafted for Authentic Indian Culinary Excellence</span>
        </div>
      </footer>
    </div>
  );
};

