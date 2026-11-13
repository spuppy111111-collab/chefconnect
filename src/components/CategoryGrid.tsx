import React from 'react';
import { CookingCategory } from '../types/database';
import { Sparkles, Flame, Sun, UtensilsCrossed, Crown, Home, ArrowRight } from 'lucide-react';

interface CategoryGridProps {
  categories: CookingCategory[];
  onSelectCategory: (categoryName: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onSelectCategory,
}) => {
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-[#D9A441]" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-[#D9A441]" />;
      case 'Sun':
        return <Sun className="w-6 h-6 text-[#D9A441]" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-6 h-6 text-[#D9A441]" />;
      case 'Crown':
        return <Crown className="w-6 h-6 text-[#D9A441]" />;
      case 'Home':
      default:
        return <Home className="w-6 h-6 text-[#D9A441]" />;
    }
  };

  return (
    <section className="py-20 bg-[#FFF8EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
            Specialized Culinary Services
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#173D2E] font-display">
            Popular Cooking Services
          </h2>
          <p className="mt-4 text-base text-stone-600">
            Chefs bring custom expertise, authentic regional recipes, and heavy equipment directly to your premises.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-stone-200/80 transition-all duration-300 cursor-pointer flex flex-col transform hover:-translate-y-1"
            >
              {/* Image banner with overlay */}
              <div className="h-48 w-full relative overflow-hidden bg-stone-100">
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Floating Icon Badge */}
                <div className="absolute top-4 left-4 p-3 rounded-2xl bg-[#173D2E]/90 backdrop-blur-md shadow-md">
                  {getIcon(cat.iconName || 'Home')}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#173D2E] font-display group-hover:text-[#c49132] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                    {cat.description}
                  </p>

                  {/* Popular Dishes Chips */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cat.popularDishes.slice(0, 3).map((dish, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFF8EC] text-[#173D2E] font-medium border border-stone-200"
                      >
                        {dish}
                      </span>
                    ))}
                    {cat.popularDishes.length > 3 && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-stone-100 text-stone-500 font-medium">
                        +{cat.popularDishes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500">
                    On-demand & scheduled
                  </span>
                  <div className="flex items-center space-x-1 text-sm font-bold text-[#173D2E] group-hover:text-[#D9A441] transition-colors">
                    <span>Explore Chefs</span>
                    <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
