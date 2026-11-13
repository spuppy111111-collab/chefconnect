import React from 'react';
import { ShieldCheck, Flame, Scale, Clock, HeartHandshake, Sparkles, Star, Quote } from 'lucide-react';
import { Review } from '../types/database';

interface WhyChooseUsProps {
  reviews: Review[];
}

export const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ reviews }) => {
  const reasons = [
    {
      title: 'Cooked In Front of You',
      desc: 'Watch authentic live cooking with zero pre-packaged preservatives or mystery oil reheating.',
      icon: <Flame className="w-5 h-5 text-[#D9A441]" />,
    },
    {
      title: 'Full Ingredient Control',
      desc: 'Use your own cold-pressed oils, pure A2 ghee, and organic spices, or let the chef curate market supplies.',
      icon: <Sparkles className="w-5 h-5 text-[#D9A441]" />,
    },
    {
      title: 'Strict Hygiene & Background Checks',
      desc: 'Every chef is interviewed, identity-verified, and hygiene-certified by our platform operations team.',
      icon: <ShieldCheck className="w-5 h-5 text-[#D9A441]" />,
    },
    {
      title: 'Transparent Pricing & Verified Payouts',
      desc: 'Service fees are itemized clearly. Advances are held securely until the chef accepts and completes the booking.',
      icon: <Scale className="w-5 h-5 text-[#D9A441]" />,
    },
    {
      title: 'No Double-Booking Conflicts',
      desc: 'Smart calendar locks ensure your chef is dedicated solely to your function at the booked time slot.',
      icon: <Clock className="w-5 h-5 text-[#D9A441]" />,
    },
    {
      title: 'Zero Delivery Delay Anxiety',
      desc: 'Never worry about spilled takeout containers or cold, soggy party food during important family milestones.',
      icon: <HeartHandshake className="w-5 h-5 text-[#D9A441]" />,
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Why Choose Us */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
              The bookmychef.com Standard
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#173D2E] font-display leading-tight">
              Why Hire a Private Chef Instead of Ordering Delivery?
            </h2>
            <p className="mt-4 text-stone-600 text-sm sm:text-base leading-relaxed">
              Catering halls force rigid set menus, and food delivery apps deliver lukewarm food in plastic tubs. bookmychef.com brings an executive culinary artisan directly to your kitchen.
            </p>

            <div className="mt-8 p-6 rounded-3xl bg-[#FFF8EC] border border-[#D9A441]/40">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl font-black text-[#173D2E]">4.95 / 5.0</span>
                <div className="flex text-[#D9A441]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-stone-600">
                Over 1,200+ family functions, festive poojas, and birthday parties hosted successfully across top residential societies.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {reasons.map((r, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#FFF8EC]/40 border border-stone-200 hover:border-[#D9A441] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#173D2E] flex items-center justify-center mb-4">
                  {r.icon}
                </div>
                <h3 className="text-base font-bold text-[#173D2E] font-display">
                  {r.title}
                </h3>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="pt-16 border-t border-stone-200">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
              Real Stories & Celebrations
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-[#173D2E] font-display">
              Loved by Hosts & Families
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[#FFF8EC]/60 rounded-3xl p-8 border border-stone-200/80 shadow-sm relative"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-[#D9A441]/30" />
                <div className="flex items-center space-x-1 text-[#D9A441] mb-4">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed italic">
                  "{rev.comment}"
                </p>
                <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#173D2E]">{rev.customerName}</h4>
                    <span className="text-xs text-stone-500">Verified Client Booking</span>
                  </div>
                  <div className="text-right text-[11px] text-stone-500">
                    <div>Taste: {rev.foodTasteRating}/5</div>
                    <div>Hygiene: {rev.cleanlinessRating}/5</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
