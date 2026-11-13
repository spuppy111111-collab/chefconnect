import { Chef } from '../types/database';

export interface DynamicFoodCategory {
  name: string;
  chefCount: number;
  imageUrl: string;
  chefs: Chef[];
}

// High quality authentic Indian food photography curated for regional cuisines
const CATEGORY_IMAGE_REGISTRY: Record<string, string> = {
  'south indian': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
  'dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
  'andhra': 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80',
  'north indian': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  'punjabi': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  'tandoor': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  'sweets': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  'laddu': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  'mithai': 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  'kebab': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'chinese': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80',
  'noodles': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80',
  'festival': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
  'satvik': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
  'pooja': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
  'wedding': 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
  'feast': 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80',
  'home cooking': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
  'breakfast': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
  'snacks': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  'healthy': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  'vegetarian': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80';

/**
 * Extracts unique, dynamic food categories exclusively from approved, active chefs in Supabase/store.
 * Only categories that have at least one approved chef are included.
 */
export function getDynamicCategoriesFromApprovedChefs(chefs: Chef[]): DynamicFoodCategory[] {
  const approvedChefs = chefs.filter((c) => c.status === 'approved');
  const categoryMap = new Map<string, { chefs: Chef[]; imageUrl: string }>();

  approvedChefs.forEach((chef) => {
    const chefSpecs = chef.specialties || [];
    chefSpecs.forEach((spec) => {
      const cleanName = spec.trim();
      if (!cleanName) return;

      const existing = categoryMap.get(cleanName);
      if (existing) {
        if (!existing.chefs.some((c) => c.id === chef.id)) {
          existing.chefs.push(chef);
        }
      } else {
        const lower = cleanName.toLowerCase();
        let matchedImage = DEFAULT_CATEGORY_IMAGE;
        for (const [key, url] of Object.entries(CATEGORY_IMAGE_REGISTRY)) {
          if (lower.includes(key)) {
            matchedImage = url;
            break;
          }
        }
        categoryMap.set(cleanName, {
          chefs: [chef],
          imageUrl: matchedImage,
        });
      }
    });
  });

  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    chefCount: data.chefs.length,
    imageUrl: data.imageUrl,
    chefs: data.chefs,
  }));
}

