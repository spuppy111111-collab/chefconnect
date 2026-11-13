import React, { useState } from 'react';
import { Booking } from '../types/database';
import { X, Star, ChefHat, Sparkles } from 'lucide-react';
import { appStore } from '../services/store';

interface ReviewModalProps {
  booking: Booking | null;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  onClose,
  onSubmitSuccess,
}) => {
  if (!booking) return null;

  const [rating, setRating] = useState(5);
  const [foodTasteRating, setFoodTasteRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMessage('Please write a brief comment describing your culinary experience.');
      return;
    }
    setErrorMessage('');

    try {
      appStore.addReview({
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName,
        chefId: booking.chefId,
        rating,
        comment,
        foodTasteRating,
        cleanlinessRating,
        punctualityRating,
      });

      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to submit review.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8EC] border border-[#D9A441] flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-[#173D2E]" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-[#173D2E]">
              Rate {booking.chefName}
            </h3>
            <p className="text-xs text-stone-500">
              For Booking #{booking.bookingNumber} • {booking.eventDate}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Overall Star Rating */}
          <div className="bg-[#FFF8EC] p-4 rounded-2xl text-center">
            <span className="font-bold text-stone-700 block mb-2">Overall Experience</span>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-[#D9A441] hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'fill-[#D9A441]' : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Sub-ratings */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-stone-50 rounded-xl">
              <span className="text-[10px] text-stone-500 font-bold block mb-1">Food Taste</span>
              <select
                value={foodTasteRating}
                onChange={(e) => setFoodTasteRating(Number(e.target.value))}
                className="w-full text-xs font-bold p-1 bg-white border rounded"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>{s} Stars</option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-xl">
              <span className="text-[10px] text-stone-500 font-bold block mb-1">Cleanliness</span>
              <select
                value={cleanlinessRating}
                onChange={(e) => setCleanlinessRating(Number(e.target.value))}
                className="w-full text-xs font-bold p-1 bg-white border rounded"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>{s} Stars</option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-stone-50 rounded-xl">
              <span className="text-[10px] text-stone-500 font-bold block mb-1">Punctuality</span>
              <select
                value={punctualityRating}
                onChange={(e) => setPunctualityRating(Number(e.target.value))}
                className="w-full text-xs font-bold p-1 bg-white border rounded"
              >
                {[5, 4, 3, 2, 1].map((s) => (
                  <option key={s} value={s}>{s} Stars</option>
                ))}
              </select>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="font-bold text-stone-700 block mb-1">Your Detailed Review</label>
            <textarea
              rows={3}
              placeholder="How was the flavor, presentation, and kitchen cleanliness? Mention your favorite dishes..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-800"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-extrabold text-xs shadow-md"
          >
            Submit Verified Review
          </button>
        </form>
      </div>
    </div>
  );
};
