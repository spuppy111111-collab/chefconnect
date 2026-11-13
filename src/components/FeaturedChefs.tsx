import React from 'react';
import { Chef } from '../types/database';
import { Star, MapPin, Award, ArrowRight, ShieldCheck, Clock, Check } from 'lucide-react';
import { formatINR } from '../utils/pricing';

interface FeaturedChefsProps {
  chefs: Chef[];
  onSelectChef: (chef: Chef) => void;
  onViewAllChefs: () => void;
}

export const FeaturedChefs: React.FC<FeaturedChefsProps> = ({
  chefs,
  onSelectChef,
  onViewAllChefs,
}) => {
  const approvedChefs = chefs.filter((c) => c.status === 'approved');

  return (
    <section className="py-20 bg-white border-t border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-2">
              <Award className="w-4 h-4 text-[#D9A441]" />
              <span>Verified Culinary Masters</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#173D2E] font-display">
              Featured Professional Chefs
            </h2>
            <p className="mt-2 text-stone-600 max-w-2xl text-sm sm:text-base">
              Certified, vetted, and hygiene-screened chefs available for private home cooking and grand family functions.
            </p>
          </div>

          <button
            onClick={onViewAllChefs}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 text-sm font-bold text-[#173D2E] hover:text-[#D9A441] transition-colors self-start md:self-auto"
          >
            <span>View All Chefs ({approvedChefs.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Chefs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {approvedChefs.slice(0, 3).map((chef) => (
            <div
              key={chef.id}
              className="bg-[#FFF8EC]/40 rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Top Banner & Photo */}
              <div className="relative">
                <div className="h-60 w-full overflow-hidden bg-stone-200">
                  <img
                    src={chef.avatarUrl}
                    alt={chef.fullName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center space-x-1 text-xs font-bold text-stone-800">
                  <Star className="w-4 h-4 text-[#D9A441] fill-[#D9A441]" />
                  <span>{chef.rating.toFixed(1)}</span>
                  <span className="text-stone-400 font-normal">({chef.reviewCount})</span>
                </div>

                {/* Experience & Verified Badge */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#173D2E]/90 backdrop-blur-md text-[#FFF8EC] text-[11px] font-bold flex items-center space-x-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>
                      {chef.fullName.toLowerCase().includes('devi') || chef.fullName.toLowerCase().includes('lakshmi') || chef.fullName.toLowerCase().includes('sunitha')
                        ? '👩‍🍳 Verified Lady Chef'
                        : 'Verified Master'}
                    </span>
                  </span>
                </div>

                {/* Name & Location on image overlay */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-bold font-display text-white">
                    {chef.fullName}
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-[#FFF8EC]/90 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
                    <span className="truncate">{chef.location}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Bio */}
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {chef.bio}
                  </p>

                  {/* Specialties Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {chef.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#173D2E] font-medium border border-stone-200"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Signature Dishes Preview */}
                  <div className="mt-4 bg-white/80 rounded-2xl p-3 border border-stone-200/70 text-xs">
                    <span className="font-bold text-[#173D2E] block mb-1">
                      Popular Prep:
                    </span>
                    <ul className="space-y-1 text-stone-600">
                      {chef.featuredDishes.slice(0, 2).map((dish, i) => (
                        <li key={i} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center">
                            <Check className="w-3 h-3 text-[#173D2E] mr-1.5 shrink-0" />
                            {dish.name}
                          </span>
                          <span className="font-semibold text-stone-700">
                            ~{dish.typicalPrepTimeHours}h
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Pricing & Booking Action */}
                <div className="mt-6 pt-4 border-t border-stone-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-500 block uppercase tracking-wider font-semibold">
                      Service Base Rate
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-extrabold text-[#173D2E]">
                        {formatINR(chef.hourlyRate)}
                      </span>
                      <span className="text-xs text-stone-500">/ hour</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectChef(chef)}
                    className="px-5 py-2.5 rounded-xl font-bold bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] text-xs transition-colors shadow-sm flex items-center space-x-1"
                  >
                    <span>Check Availability</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D9A441]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
