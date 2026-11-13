import React from 'react';

/**
 * Metric stats cards skeleton for Customer, Chef, and Admin dashboards.
 */
export const DashboardStatsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className={`grid grid-cols-2 ${count >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`} data-testid="dashboard-stats-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-stone-200/80" />
            <div className="w-5 h-5 rounded-full bg-amber-100/80" />
          </div>
          <div className="h-7 w-16 rounded-md bg-stone-300/80" />
          <div className="h-2.5 w-24 rounded bg-stone-200/60" />
        </div>
      ))}
    </div>
  );
};

/**
 * Booking card skeleton for customer and chef booking lists.
 */
export const BookingCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" data-testid="booking-cards-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-2xs animate-pulse space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-stone-200/80 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-stone-300/80" />
                <div className="h-3 w-24 rounded bg-stone-200/70" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-7 w-24 rounded-full bg-amber-100/70" />
              <div className="h-7 w-20 rounded-full bg-stone-200/70" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-stone-200/60" />
              <div className="h-3.5 w-24 rounded bg-stone-300/70" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-stone-200/60" />
              <div className="h-3.5 w-20 rounded bg-stone-300/70" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-stone-200/60" />
              <div className="h-3.5 w-28 rounded bg-stone-300/70" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-stone-200/60" />
              <div className="h-4 w-20 rounded bg-stone-300/80" />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <div className="h-3 w-40 rounded bg-stone-200/60" />
            <div className="flex space-x-2">
              <div className="h-8 w-24 rounded-xl bg-stone-200/80" />
              <div className="h-8 w-28 rounded-xl bg-amber-200/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Table rows skeleton for AdminPortal and data grids.
 */
export const AdminTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-2xs animate-pulse" data-testid="admin-table-skeleton">
      <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-stone-300/70" />
        <div className="h-8 w-48 rounded-xl bg-stone-200/70" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-stone-200/80 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-48 rounded bg-stone-300/80" />
                <div className="h-2.5 w-32 rounded bg-stone-200/60" />
              </div>
            </div>
            <div className="hidden sm:block h-6 w-24 rounded-full bg-amber-100/60" />
            <div className="h-4 w-20 rounded bg-stone-200/80" />
            <div className="flex items-center space-x-2">
              <div className="h-8 w-20 rounded-xl bg-emerald-100/70" />
              <div className="h-8 w-20 rounded-xl bg-red-100/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
