import React, { useState } from 'react';
import {
  UtensilsCrossed,
  ArrowRight,
  Play,
  ShieldCheck,
  Star,
  Home,
  Headphones,
  MapPin,
  Utensils,
  Calendar,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { EventType, FoodType } from '../types/database';

interface LandingHeroProps {
  onSearch: (filters: { location?: string; specialty?: string; eventType?: EventType; foodType?: FoodType }) => void;
  onExploreChefs: () => void;
  onOpenBookingExample?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSearch,
  onExploreChefs,
  onOpenBookingExample,
}) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | ''>('');
  const [showVideoModal, setShowVideoModal] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      location: selectedLocation || undefined,
      specialty: selectedSpecialty || undefined,
      eventType: (selectedEventType as EventType) || undefined,
    });
  };

  return (
    <div className="relative bg-[#0B3027] text-white">
      {/* Warm ambient background lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#D9A441]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#173D2E]/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Hero Section matching reference UI */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-20 sm:pb-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Hero Text Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tag Badge: Premium Home Cooking Services */}
            <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full border border-[#D9A441] bg-[#0B3027]/80 text-[#D9A441] text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
              <UtensilsCrossed className="w-4 h-4 text-[#D9A441]" />
              <span>Premium Home Cooking Services</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold font-serif tracking-tight text-white leading-[1.12]">
              Book a Professional <br />
              <span className="text-[#D9A441]">Chef</span> at Your Home
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#FFF8EC]/90 max-w-xl leading-relaxed font-sans">
              Enjoy delicious homemade meals for any occasion – home, events, birthdays, weddings and more.
            </p>

            {/* CTA Buttons: Explore Chefs & Watch Video */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
              
              {/* Primary Pill Button: Explore Chefs */}
              <button
                onClick={onExploreChefs}
                className="px-8 py-3.5 rounded-full font-bold text-sm bg-[#D9A441] hover:bg-[#c49132] text-[#0B3027] shadow-xl hover:shadow-2xl transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <span>Explore Chefs</span>
                <ArrowRight className="w-4 h-4 text-[#0B3027]" />
              </button>

              {/* Secondary Play Button: Watch Video */}
              <button
                onClick={() => setShowVideoModal(true)}
                className="flex items-center space-x-3 text-white font-medium hover:text-[#D9A441] transition-colors group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full border-2 border-white/80 flex items-center justify-center group-hover:border-[#D9A441] transition-colors bg-black/20 backdrop-blur-sm">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5 group-hover:fill-[#D9A441] group-hover:text-[#D9A441] transition-colors" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Watch Video</span>
              </button>
            </div>

            {/* Micro value badge */}
            <div className="pt-2 text-xs text-[#FFF8EC]/70 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Over 400+ verified master chefs for authentic feasts & poojas.</span>
            </div>

          </div>

          {/* Right Hero Visual Column (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Glowing ambient ring */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#D9A441]/30 to-[#0B3027] rounded-3xl blur-2xl transform scale-95 opacity-70" />

              {/* Hero Chef Image Card featuring Indian Woman Chef */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#D9A441]/40 bg-[#08241d] group">
                <img
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=85"
                  alt="Professional Indian Woman Chef preparing fresh food in a modern kitchen"
                  className="w-full h-[400px] sm:h-[450px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />

                {/* Subtle warmth vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B3027]/70 via-transparent to-black/20 pointer-events-none" />

                {/* Floating Badge: Verified Lady Cooks & Chefs Available */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-amber-200/80 shadow-xl flex items-center justify-between text-stone-800 transition-transform group-hover:-translate-y-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 font-bold text-lg shadow-xs">
                      👩‍🍳
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#173D2E] block">
                        Verified Lady Cooks & Chefs
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-stone-500">
                        Hygienic Home Cooking • Poojas & Family Meals
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[#D9A441] bg-[#173D2E] px-2.5 py-1 rounded-full shrink-0 shadow-xs">
                    ★ 4.95
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Floating Trust Bar matching exact reference image */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 relative z-30">
        <div className="bg-[#FFFDF8] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl border border-amber-200/70 grid grid-cols-2 lg:grid-cols-4 gap-6 text-stone-800">
          
          {/* 1. Trusted & Verified Chefs */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 lg:pr-4 lg:border-r lg:border-stone-200/80">
            <div className="w-12 h-12 rounded-full bg-[#0B3027] text-[#D9A441] flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Trusted & Verified
              </h3>
              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Chefs
              </p>
            </div>
          </div>

          {/* 2. Top Rated Professionals */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 lg:px-4 lg:border-r lg:border-stone-200/80">
            <div className="w-12 h-12 rounded-full bg-[#0B3027] text-[#D9A441] flex items-center justify-center shrink-0 shadow-sm">
              <Star className="w-6 h-6 text-[#D9A441] fill-[#D9A441]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Top Rated
              </h3>
              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Professionals
              </p>
            </div>
          </div>

          {/* 3. Cook at Your Convenience */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 lg:px-4 lg:border-r lg:border-stone-200/80">
            <div className="w-12 h-12 rounded-full bg-[#0B3027] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Cook at Your
              </h3>
              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Convenience
              </p>
            </div>
          </div>

          {/* 4. 24/7 Customer Support */}
          <div className="flex items-center space-x-3.5 sm:space-x-4 lg:pl-4">
            <div className="w-12 h-12 rounded-full bg-[#0B3027] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                24/7 Customer
              </h3>
              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                Support
              </p>
            </div>
          </div>

        </div>

        {/* Search Chefs Filter Bar directly underneath the Trust Bar */}
        <div className="mt-6 bg-white rounded-3xl p-4 sm:p-5 shadow-xl text-stone-800 border border-stone-200">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            
            {/* Location Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-[#0B3027] mr-1" />
                Location / City
              </label>
              <input
                type="text"
                placeholder="e.g. Jubilee Hills, Hyderabad"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0B3027] text-xs sm:text-sm font-medium bg-[#FFF8EC]/30"
              />
            </div>

            {/* Specialty / Cuisine Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center">
                <Utensils className="w-3.5 h-3.5 text-[#0B3027] mr-1" />
                Cuisine / Specialty
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0B3027] text-xs sm:text-sm font-medium bg-[#FFF8EC]/30"
              >
                <option value="">All Specialties</option>
                <option value="Sweets & Laddu Preparation">Sweets & Laddu (Bulk)</option>
                <option value="Traditional Andhra Cuisine">Traditional Andhra & Telangana</option>
                <option value="Dum Biryani & Kebabs">Dum Biryani & Kebabs</option>
                <option value="Festival Cooking">Festival & Pooja Satvik</option>
                <option value="Wedding & Function Cooking">Wedding & Bulk Feasts</option>
                <option value="Home Cooking">Everyday Home Cooking</option>
              </select>
            </div>

            {/* Event Type Filter */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[#0B3027] mr-1" />
                Event Type
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value as EventType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0B3027] text-xs sm:text-sm font-medium bg-[#FFF8EC]/30"
              >
                <option value="">Any Event</option>
                <option value="home_cooking">Home Cooking</option>
                <option value="family_function">Family Function</option>
                <option value="festival">Festival / Pooja</option>
                <option value="birthday">Birthday Party</option>
                <option value="wedding">Wedding / Reception</option>
                <option value="corporate_event">Corporate Gathering</option>
              </select>
            </div>

            {/* Search CTA */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-[42px] rounded-xl font-bold bg-[#0B3027] hover:bg-[#071f19] text-[#FFF8EC] flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg cursor-pointer text-xs sm:text-sm"
              >
                <Search className="w-4 h-4 text-[#D9A441]" />
                <span>Search Chefs</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Video Modal when clicking "Watch Video" */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="bg-[#0B3027] rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#D9A441]/40 shadow-2xl relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D9A441]/20 text-[#D9A441] text-xs font-bold mb-2">
                <Play className="w-3.5 h-3.5 fill-[#D9A441]" />
                <span>bookmychef.com Experience Preview</span>
              </div>
              <h3 className="text-2xl font-bold font-serif text-white">
                How At-Home Chef Booking Works
              </h3>
              <p className="text-xs text-[#FFF8EC]/70 mt-1">
                From chef selection to fresh cooking in your kitchen.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#D9A441]/30 bg-black flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80"
                  alt="Cooking process demonstration"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-[#D9A441] text-[#0B3027] flex items-center justify-center shadow-2xl mb-3">
                    <Play className="w-7 h-7 fill-[#0B3027] ml-1" />
                  </div>
                  <p className="text-sm font-bold text-white">Live Culinary Experience Video</p>
                  <p className="text-xs text-[#FFF8EC]/80 mt-1 max-w-sm">
                    Watch our culinary master prepare pure ghee motichoor laddus and a festive 5-course feast right in a family kitchen.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-[#124236] p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-[#D9A441] block text-sm">1. Choose</span>
                  <span className="text-stone-300 text-[11px]">Select chef & dishes</span>
                </div>
                <div className="bg-[#124236] p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-[#D9A441] block text-sm">2. Arrive</span>
                  <span className="text-stone-300 text-[11px]">Chef cooks at venue</span>
                </div>
                <div className="bg-[#124236] p-3 rounded-xl border border-white/10">
                  <span className="font-bold text-[#D9A441] block text-sm">3. Feast</span>
                  <span className="text-stone-300 text-[11px]">Hot, fresh & spotless</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowVideoModal(false);
                  onExploreChefs();
                }}
                className="w-full py-3 rounded-xl font-bold bg-[#D9A441] text-[#0B3027] text-xs hover:bg-[#c49132] transition-colors shadow-md mt-2 cursor-pointer"
              >
                Book Your First Chef Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
