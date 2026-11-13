import React from 'react';
import { Booking, BookingPayment } from '../types/database';
import { X, CheckCircle2, Download, Printer, ChefHat, Calendar, MapPin, Receipt, ShieldCheck } from 'lucide-react';
import { formatINR } from '../utils/pricing';

interface ReceiptModalProps {
  booking: Booking | null;
  payment: BookingPayment | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  booking,
  payment,
  onClose,
}) => {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 relative print:shadow-none print:border-none">
        
        {/* Modal Header */}
        <div className="bg-[#173D2E] text-white p-6 sm:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center print:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-white p-1 overflow-hidden shadow-md shrink-0 border border-amber-200/50">
              <img src="/logo.jpg" alt="bookmychef.com" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold font-display">
                bookmy<span className="text-[#D9A441]">chef</span><span className="text-xs text-[#D9A441] font-mono">.com</span>
              </span>
              <p className="text-[11px] text-[#FFF8EC]/70">Official Cooking Service Receipt</p>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs text-[#FFF8EC]/70 uppercase tracking-wider font-semibold block">
                Booking Reference
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {booking.bookingNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#FFF8EC]/70 uppercase tracking-wider font-semibold block">
                Payment Status
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {payment?.status === 'paid' ? 'PAID & CONFIRMED' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6 text-stone-800">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs pb-6 border-b border-stone-200">
            <div>
              <span className="text-stone-400 uppercase font-bold text-[10px] block mb-1">
                Customer Name:
              </span>
              <p className="font-bold text-stone-900">{booking.customerName}</p>
              <p className="text-stone-500">{booking.customerPhone}</p>
              <p className="text-stone-500">{booking.customerEmail}</p>
            </div>

            <div>
              <span className="text-stone-400 uppercase font-bold text-[10px] block mb-1">
                Assigned Chef:
              </span>
              <p className="font-bold text-stone-900">{booking.chefName}</p>
              <p className="text-stone-500">Service: {booking.eventType.replace('_', ' ')}</p>
              <p className="text-stone-500">Date: {booking.eventDate} at {booking.startTime}</p>
            </div>
          </div>

          {/* Cooking Venue */}
          <div className="text-xs bg-[#FFF8EC] p-4 rounded-2xl border border-[#D9A441]/30">
            <span className="text-[#173D2E] uppercase font-bold text-[10px] block mb-1">
              On-Site Cooking Venue:
            </span>
            <p className="font-semibold text-stone-800">{booking.venueAddress}</p>
            <p className="text-stone-600 mt-1">
              Ingredients: {booking.ingredientArrangement === 'chef_provided' ? 'Arranged by Chef' : 'Provided by Customer'}
            </p>
          </div>

          {/* Menu Items Table */}
          <div>
            <span className="text-stone-400 uppercase font-bold text-[10px] block mb-2">
              Food Menu & Quantities
            </span>
            <div className="border border-stone-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {booking.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-stone-800">{item.dishName}</td>
                      <td className="p-3 text-right font-bold text-[#173D2E]">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-3 text-right text-stone-500 capitalize">{item.foodType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="pt-4 border-t border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-600">Chef Cooking Service Fee ({booking.expectedDurationHours}h):</span>
              <span className="font-semibold">{formatINR(booking.chefServiceFee)}</span>
            </div>

            {booking.ingredientFee > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">Fresh Raw Ingredients:</span>
                <span className="font-semibold">{formatINR(booking.ingredientFee)}</span>
              </div>
            )}

            {booking.additionalCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">Additional Charges ({booking.additionalChargesNotes}):</span>
                <span className="font-semibold">{formatINR(booking.additionalCharges)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-stone-600">Platform Insurance & Coordination Fee:</span>
              <span className="font-semibold">{formatINR(booking.platformFee)}</span>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between text-sm font-bold">
              <span>Total Service Value:</span>
              <span className="text-[#173D2E] font-black">{formatINR(booking.totalAmount)}</span>
            </div>

            {payment && (
              <div className="pt-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between text-xs font-bold text-emerald-800">
                <span>Advance Paid via {payment.paymentGateway.toUpperCase()}:</span>
                <span>{formatINR(payment.amount)}</span>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-2 text-[10px] text-stone-400 flex items-center justify-between">
            <span>Transaction ID: {payment?.razorpayPaymentId || 'N/A'}</span>
            <span>Receipt #{payment?.receiptNumber || 'RCPT-PREVIEW'}</span>
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#173D2E] text-white text-xs font-bold hover:bg-[#0f291e]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
