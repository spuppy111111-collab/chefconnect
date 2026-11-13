import React from 'react';

interface ChefCardSkeletonProps {
  count?: number;
}

export const ChefCardSkeleton: React.FC<ChefCardSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="chef-directory-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col justify-between animate-pulse"
        >
          {/* Photo & Badges placeholder */}
          <div className="relative h-64 w-full bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50/50">
            {/* Rating Badge skeleton */}
            <div className="absolute top-4 right-4 w-20 h-7 rounded-full bg-white/80" />

            {/* Experience Badge skeleton */}
            <div className="absolute top-4 left-4 w-32 h-6 rounded-full bg-stone-300/60" />

            {/* Name and Location placeholder */}
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              <div className="h-6 w-3/4 rounded-lg bg-white/70" />
              <div className="h-4 w-1/2 rounded-md bg-white/50" />
            </div>
          </div>

          {/* Body Details placeholder */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Bio lines */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-stone-200/80" />
                <div className="h-3 w-5/6 rounded bg-stone-200/70" />
              </div>

              {/* Specialty pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="h-5 w-20 rounded-full bg-amber-100/70" />
                <div className="h-5 w-24 rounded-full bg-amber-100/70" />
                <div className="h-5 w-16 rounded-full bg-amber-100/70" />
              </div>

              {/* Service Areas placeholder */}
              <div className="pt-3 border-t border-stone-100 space-y-1.5">
                <div className="h-2.5 w-28 rounded bg-stone-200/60" />
                <div className="h-3.5 w-48 rounded bg-stone-200/80" />
              </div>

              {/* Working hours placeholder */}
              <div className="h-3.5 w-36 rounded bg-stone-200/60" />
            </div>

            {/* Pricing and Action Button */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2.5 w-16 rounded bg-stone-200/60" />
                <div className="h-6 w-24 rounded bg-stone-300/70" />
              </div>
              <div className="h-9 w-28 rounded-xl bg-stone-300/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
