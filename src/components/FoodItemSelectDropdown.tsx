import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Utensils, ChevronDown } from 'lucide-react';
import { FOOD_CATALOG, FoodCategoryCatalog } from '../utils/foodItemsCatalog';

interface FoodItemSelectDropdownProps {
  selectedItems: string[];
  onChange: (items: string[]) => void;
  categories?: FoodCategoryCatalog[];
  placeholder?: string;
  className?: string;
}

export const FoodItemSelectDropdown: React.FC<FoodItemSelectDropdownProps> = ({
  selectedItems,
  onChange,
  categories,
  placeholder = 'Select or search food items (e.g. Biryani, Dosa, Laddoo)...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const containerRef = useRef<HTMLDivElement>(null);

  // Use dynamic categories derived strictly from registered chef dishes
  const activeCatalog = useMemo(() => {
    return categories || [];
  }, [categories]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (itemName: string) => {
    if (selectedItems.includes(itemName)) {
      onChange(selectedItems.filter((i) => i !== itemName));
    } else {
      onChange([...selectedItems, itemName]);
    }
  };

  const removeItem = (itemName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedItems.filter((i) => i !== itemName));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Filtered categories and items
  const filteredCatalog = useMemo(() => {
    return activeCatalog
      .map((cat) => {
        const items = cat.items.filter((item) => {
          if (activeCategory !== 'All' && cat.category !== activeCategory) {
            return false;
          }
          if (!searchQuery.trim()) return true;

          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchKeywords = (item.keywords || []).some((k) => k.toLowerCase().includes(q));
          const matchCat = cat.category.toLowerCase().includes(q);
          return matchName || matchKeywords || matchCat;
        });

        return {
          category: cat.category,
          items,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [activeCatalog, activeCategory, searchQuery]);

  const categoriesList = useMemo(() => {
    return ['All', ...activeCatalog.map((c) => c.category)];
  }, [activeCatalog]);

  const totalCatalogItems = useMemo(() => {
    return activeCatalog.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [activeCatalog]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Dropdown Trigger / Input Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[46px] w-full px-3.5 py-2 rounded-2xl border border-stone-200 bg-white hover:border-[#173D2E] focus-within:ring-2 focus-within:ring-[#173D2E] cursor-pointer flex flex-wrap items-center gap-1.5 transition-all shadow-sm"
      >
        <Utensils className="w-4 h-4 text-[#D9A441] shrink-0 mr-1" />

        {selectedItems.length === 0 ? (
          <span className="text-stone-400 text-xs sm:text-sm select-none">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {selectedItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#FFF8EC] border border-[#D9A441]/40 text-[#173D2E] text-xs font-bold"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={(e) => removeItem(item, e)}
                  className="hover:text-red-600 focus:outline-none ml-1 p-0.5 rounded-full hover:bg-amber-100"
                  aria-label={`Remove ${item}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center space-x-1 pl-2">
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-bold text-stone-400 hover:text-red-600 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 mr-1"
            >
              Clear
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#173D2E]' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search bar inside dropdown */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search food item (e.g. Chicken Biryani, Dosa, Mysore Pak)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#173D2E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category filter buttons */}
            {categoriesList.length > 2 && (
              <div className="flex gap-1.5 overflow-x-auto mt-2 pt-1 pb-1 scrollbar-none text-[11px]">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCategory(cat);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors ${
                      activeCategory === cat
                        ? 'bg-[#173D2E] text-white shadow-xs'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of items grouped by category or Empty States */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-3">
            {totalCatalogItems === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <Utensils className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="font-semibold text-stone-700">No food items available at this time.</p>
                <p className="text-[11px] text-stone-400 mt-1">Please check back once menus are loaded.</p>
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                <Search className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="font-semibold text-stone-700">No food items match "{searchQuery}".</p>
                <p className="text-[11px] text-stone-400 mt-1">Try another keyword or select a different category.</p>
              </div>
            ) : (
              filteredCatalog.map((catGroup) => (
                <div key={catGroup.category} className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#D9A441] bg-amber-50/50 rounded-lg">
                    {catGroup.category}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                    {catGroup.items.map((item) => {
                      const isSelected = selectedItems.includes(item.name);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.name)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#173D2E] text-white font-bold'
                              : 'hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          <span>{item.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#D9A441]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer showing count and close */}
          <div className="p-3 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-[#173D2E] text-[#FFF8EC] font-bold text-xs hover:bg-[#0f291e]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
