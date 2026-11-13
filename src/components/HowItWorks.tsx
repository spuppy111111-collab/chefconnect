import React from 'react';
import { Search, ClipboardList, CheckCircle2, CreditCard, ChefHat, Star } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Find & Select Your Chef',
      description: 'Filter verified chefs by cuisine specialty, budget, location, and calendar availability.',
      icon: <Search className="w-6 h-6 text-[#173D2E]" />,
    },
    {
      step: '02',
      title: 'Specify Menu & Quantities',
      description: 'Choose exact dishes (e.g., 10 kg laddus or 40 meals biryani), number of guests, and venue location.',
      icon: <ClipboardList className="w-6 h-6 text-[#173D2E]" />,
    },
    {
      step: '03',
      title: 'Choose Ingredient Supply',
      description: 'Decide if you will supply the groceries or if the chef should source fresh raw materials.',
      icon: <CheckCircle2 className="w-6 h-6 text-[#173D2E]" />,
    },
    {
      step: '04',
      title: 'Chef Reviews & Quotes',
      description: 'The chef reviews your timeline and requirements, then accepts and submits a final quotation.',
      icon: <ChefHat className="w-6 h-6 text-[#173D2E]" />,
    },
    {
      step: '05',
      title: 'Confirm with Razorpay',
      description: 'Pay a secure advance deposit via UPI, cards, or netbanking to lock in the chef’s exclusive slot.',
      icon: <CreditCard className="w-6 h-6 text-[#173D2E]" />,
    },
    {
      step: '06',
      title: 'Chef Arrives & Cooks Fresh',
      description: 'The chef arrives at your venue, prepares the feast live, cleans up, and you enjoy a memorable meal!',
      icon: <Star className="w-6 h-6 text-[#173D2E]" />,
    },
  ];

  return (
    <section className="py-20 bg-[#FFF8EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
            Seamless End-to-End Experience
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#173D2E] font-display">
            How bookmychef.com Works
          </h2>
          <p className="mt-4 text-base text-stone-600">
            Booking an authentic private chef is as effortless as reserving a hotel room, with transparent pricing and live status tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-8 border border-stone-200/90 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all"
            >
              <div className="absolute top-6 right-6 text-3xl font-black text-stone-100 group-hover:text-[#D9A441]/20 transition-colors font-display">
                {item.step}
              </div>

              <div className="w-14 h-14 rounded-2xl bg-[#FFF8EC] border border-[#D9A441]/40 flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                {item.icon}
              </div>

              <h3 className="text-lg font-bold text-[#173D2E] font-display">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm text-stone-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
