import { Booking, Review } from '../types/database';

export interface ChefCalculatedStats {
  ratingDisplay: string; // e.g. "⭐ 4.8/5" or "No ratings yet"
  averageRating: number | null; // e.g. 4.8 or null
  reviewCount: number;
  totalCompletedBookings: number;
  lastMonthCompletedBookings: number;
}

/**
 * Returns total count of bookings with status === 'completed' for this chef.
 */
export function getChefCompletedBookingsCount(chefId: string, bookings: Booking[]): number {
  return bookings.filter(
    (b) => b.chefId === chefId && b.status === 'completed'
  ).length;
}

/**
 * Returns count of bookings with status === 'completed' completed in the previous calendar month.
 * Uses eventDate (or createdAt) to determine the calendar month and year.
 */
export function getChefLastMonthCompletedCount(
  chefId: string,
  bookings: Booking[],
  referenceDate: Date = new Date()
): number {
  const currentMonth = referenceDate.getMonth(); // 0 = Jan, 10 = Nov, etc.
  const currentYear = referenceDate.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  return bookings.filter((b) => {
    if (b.chefId !== chefId || b.status !== 'completed') return false;

    // Use eventDate (format YYYY-MM-DD) or fallback to updatedAt / createdAt (ISO string)
    const dateStr = b.eventDate || b.updatedAt || b.createdAt;
    if (!dateStr) return false;

    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      return year === prevYear && month === prevMonth;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  }).length;
}

/**
 * Calculates the average rating from genuine customer reviews for this chef.
 * If there are no reviews, returns ratingDisplay "No reviews yet".
 */
export function getChefCalculatedRating(chefId: string, reviews: Review[]): {
  ratingDisplay: string;
  averageRating: number | null;
  reviewCount: number;
} {
  const chefReviews = reviews.filter(
    (r) => r.chefId === chefId && typeof r.rating === 'number' && !isNaN(r.rating) && r.rating > 0
  );

  if (chefReviews.length === 0) {
    return {
      ratingDisplay: 'No reviews yet',
      averageRating: null,
      reviewCount: 0,
    };
  }

  const sum = chefReviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / chefReviews.length) * 10) / 10;

  return {
    ratingDisplay: `${avg.toFixed(1)} (${chefReviews.length} ${chefReviews.length === 1 ? 'Review' : 'Reviews'})`,
    averageRating: avg,
    reviewCount: chefReviews.length,
  };
}

/**
 * Aggregates all live computed statistics for a chef from actual bookings and reviews.
 */
export function getChefStats(
  chefId: string,
  bookings: Booking[],
  reviews: Review[],
  referenceDate: Date = new Date()
): ChefCalculatedStats {
  const ratingData = getChefCalculatedRating(chefId, reviews);
  const totalCompleted = getChefCompletedBookingsCount(chefId, bookings);
  const lastMonthCompleted = getChefLastMonthCompletedCount(chefId, bookings, referenceDate);

  return {
    ratingDisplay: ratingData.ratingDisplay,
    averageRating: ratingData.averageRating,
    reviewCount: ratingData.reviewCount,
    totalCompletedBookings: totalCompleted,
    lastMonthCompletedBookings: lastMonthCompleted,
  };
}

