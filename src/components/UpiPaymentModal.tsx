import React, { useState } from 'react';
import { Booking } from '../types/database';
import { appStore } from '../services/store';
import {
  X,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  Maximize2,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  Info,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import confetti from 'canvas-confetti';

interface UpiPaymentModalProps {
  booking: Booking | null;
  onClose: () => void;
  onPaymentSubmitted?: (payment: any) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  booking,
  onClose,
  onPaymentSubmitted,
}) => {
  if (!booking) return null;

  const [utrNumber, setUtrNumber] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [enlargedQr, setEnlargedQr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exact BookMyChef merchant VPA decoded directly from original QR asset
  const MERCHANT_VPA = '6281376739@fam';
  const MERCHANT_NAME = 'BookMyChef';

  // Advance deposit amount (50% standard policy) or full fee
  const payableAmount = booking.advanceDepositRequired || Math.round(booking.totalAmount * 0.5);

  const handleCopyVpa = () => {
    try {
      navigator.clipboard.writeText(MERCHANT_VPA);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Receipt file size must be under 5 MB.');
        return;
      }
      setReceiptFileName(file.name);
      setErrorMessage(null);
    }
  };

  const handleSubmitUtr = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setErrorMessage('Please enter the 12-digit UPI Transaction ID / UTR from your payment receipt.');
      return;
    }

    if (cleanUtr.length < 6) {
      setErrorMessage('UTR / Transaction reference number must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payment = appStore.submitUpiPayment({
        bookingId: booking.id,
        amount: payableAmount,
        utr: cleanUtr,
        receiptUrl: receiptFileName ? `uploads/receipts/${receiptFileName}` : undefined,
        notes: customerNotes,
      });

      setIsSubmitting(false);
      setSubmittedPayment(payment);

      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D9A441', '#173D2E', '#F5E8D0'],
        });
      } catch {
        // ignore
      }

      if (onPaymentSubmitted) {
        onPaymentSubmitted(payment);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Unable to submit payment details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 relative my-8">
        
        {/* Header */}
        <div className="bg-[#173D2E] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center border border-[#D9A441]/40 text-[#D9A441]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-tight">Scan & Pay using UPI</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#D9A441] text-[#173D2E]">
                  Official Merchant
                </span>
              </div>
              <p className="text-[11px] text-stone-300">
                BookMyChef Booking #{booking.bookingNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="bg-[#FFF8EC] px-6 py-4 border-b border-[#D9A441]/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Advance Deposit Required (50%)
            </span>
            <span className="text-xs text-stone-600">
              For: {booking.chefName} • {booking.eventDate} ({booking.startTime})
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#173D2E]">
              {formatINR(payableAmount)}
            </span>
            <span className="block text-[10px] text-stone-500">
              Total Booking: {formatINR(booking.totalAmount)}
            </span>
          </div>
        </div>

        {submittedPayment ? (
          /* Post-Submission Confirmation Screen */
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-800 inline-block border border-amber-200">
                Payment Verification Pending
              </span>
              <h3 className="text-xl font-bold font-display text-[#173D2E]">
                Payment Submitted Successfully!
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Your payment details have been submitted successfully. BookMyChef will verify your transaction against our official merchant bank records and update your payment status.
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Booking ID:</span>
                <span className="font-mono font-bold text-[#173D2E]">#{booking.bookingNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Submitted UTR / Ref:</span>
                <span className="font-mono font-bold text-stone-800">{submittedPayment.paymentReference}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Payable Amount:</span>
                <span className="font-bold text-[#173D2E]">{formatINR(payableAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Merchant Account:</span>
                <span className="font-medium text-stone-700">{MERCHANT_NAME} ({MERCHANT_VPA})</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] transition-colors shadow-md"
            >
              Back to My Bookings
            </button>
          </div>
        ) : (
          /* Payment & Scanning Form */
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* QR Code and Payee Card */}
            <div className="bg-gradient-to-b from-stone-50 to-stone-100/60 rounded-3xl p-5 border border-stone-200 flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-3 px-2">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                    Merchant Name
                  </span>
                  <span className="text-xs font-bold text-[#173D2E]">{MERCHANT_NAME}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnlargedQr(!enlargedQr)}
                  className="text-stone-500 hover:text-[#173D2E] text-[11px] font-semibold flex items-center space-x-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{enlargedQr ? 'Normal View' : 'Enlarge QR'}</span>
                </button>
              </div>

              {/* Exact uncropped original BookMyChef QR image */}
              <div className={`relative bg-stone-900 p-2.5 rounded-2xl shadow-md border-2 border-[#D9A441] transition-all duration-300 ${
                enlargedQr ? 'w-80 sm:w-96' : 'w-56 sm:w-64'
              }`}>
                <img
                  src="/bookmychef-merchant-qr.jpg"
                  alt="BookMyChef Official Merchant UPI QR Code"
                  className="w-full h-auto rounded-xl object-contain block mx-auto"
                />
              </div>

              {/* VPA and One-Click Copy */}
              <div className="mt-4 flex items-center justify-center space-x-2 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-sm">
                <span className="text-xs text-stone-500">UPI ID:</span>
                <span className="font-mono text-xs font-bold text-[#173D2E]">{MERCHANT_VPA}</span>
                <button
                  type="button"
                  onClick={handleCopyVpa}
                  className="ml-1 p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-[#173D2E] transition-colors"
                  title="Copy UPI ID"
                >
                  {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {copiedVpa && (
                <span className="text-[10px] text-emerald-600 font-bold mt-1">UPI ID copied to clipboard!</span>
              )}

              <p className="text-[11px] text-stone-500 mt-2">
                Scan with Google Pay, PhonePe, Paytm, BHIM, or any bank UPI app
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs text-stone-700 space-y-2">
              <span className="font-bold text-[#173D2E] block uppercase tracking-wider text-[10px]">
                How to Complete Your Payment
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-stone-600">
                <li>Open your preferred UPI app (PhonePe, Google Pay, Paytm, BHIM, etc.).</li>
                <li>Scan the BookMyChef QR code above or send payment to <strong className="text-stone-800">{MERCHANT_VPA}</strong>.</li>
                <li>Enter the exact payable amount: <strong className="text-[#173D2E] font-bold">{formatINR(payableAmount)}</strong>.</li>
                <li>Complete payment. Locate the <strong className="text-stone-800">12-digit UTR / UPI Transaction Reference Number</strong> on your transaction receipt.</li>
                <li>Enter the UTR below and submit for verification.</li>
              </ol>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* UTR Submission Form */}
            <form onSubmit={handleSubmitUtr} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  12-Digit UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 432109876543 or 268102918291"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 font-mono text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#173D2E] focus:border-transparent bg-white shadow-sm"
                  maxLength={22}
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Found in your UPI application transaction details / receipt screen.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Optional Payment Receipt Screenshot
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center px-4 py-2.5 border border-dashed border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors text-xs text-stone-600">
                    <Upload className="w-4 h-4 mr-2 text-stone-400" />
                    <span>{receiptFileName ? receiptFileName : 'Upload receipt screenshot (JPG, PNG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {receiptFileName && (
                    <button
                      type="button"
                      onClick={() => setReceiptFileName(null)}
                      className="text-stone-400 hover:text-stone-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via PhonePe from HDFC Account"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#173D2E] bg-white"
                />
              </div>

              {/* Security Notice */}
              <div className="flex items-start space-x-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  BookMyChef verifies each bank transfer with official merchant bank statements before confirming your booking. Never enter your UPI PIN or bank credentials on any website.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !utrNumber.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Submitting Payment Details...</span>
                ) : (
                  <>
                    <span>Submit UTR for Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="bg-stone-100 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct Bank Settlement to BookMyChef</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>256-Bit SSL Encrypted Verification</span>
          </div>
        </div>

      </div>
    </div>
  );
};

