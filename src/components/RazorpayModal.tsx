import React, { useState } from 'react';
import { Booking } from '../types/database';
import {
  X,
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '../utils/pricing';
import confetti from 'canvas-confetti';

interface RazorpayModalProps {
  booking: Booking | null;
  onClose: () => void;
  onPaymentSuccess: (paymentData: {
    amount: number;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    paymentGateway: 'razorpay' | 'cash_on_completion';
  }) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  if (!booking) return null;

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('rahul@okaxis');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('892');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Advance deposit amount or full total
  const payableAmount = booking.advanceDepositRequired || Math.round(booking.totalAmount * 0.5);

  const handlePayNow = () => {
    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsProcessing(false);

      if (simulateFailure) {
        setErrorMessage('Transaction Declined (Sandbox): Card issuer reported insufficient funds or authentication timeout. Booking remains unpaid.');
        return;
      }

      setIsCompleted(true);

      // Trigger confetti celebration!
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D9A441', '#173D2E', '#F5E8D0'],
        });
      } catch {
        // ignore
      }

      const randomHex = Math.floor(100000 + Math.random() * 900000);
      const paymentData = {
        amount: payableAmount,
        razorpayPaymentId: `pay_rzp_test_${randomHex}`,
        razorpayOrderId: `order_rzp_${Math.floor(1000 + Math.random() * 9000)}`,
        paymentGateway: 'razorpay' as const,
      };

      setTimeout(() => {
        onPaymentSuccess(paymentData);
      }, 1200);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 relative">
        
        {/* Razorpay Brand Header */}
        <div className="bg-[#0C2340] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-400/40">
              <span className="font-black text-blue-400 text-sm">₹</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold tracking-tight">Razorpay</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-stone-900">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                bookmychef.com Booking #{booking.bookingNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="bg-[#FFF8EC] px-6 py-4 border-b border-[#D9A441]/30 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Payable Advance (50% Deposit)
            </span>
            <span className="text-xs text-stone-600">
              For: {booking.chefName} • {booking.eventDate}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#173D2E]">
              {formatINR(payableAmount)}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        {isCompleted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-[#173D2E]">Payment Verified Successfully!</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto">
              Your advance payment of {formatINR(payableAmount)} has been credited. Booking #{booking.bookingNumber} is now Confirmed.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                  paymentMethod === 'upi' ? 'bg-white shadow text-[#173D2E]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                  paymentMethod === 'card' ? 'bg-white shadow text-[#173D2E]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
                  paymentMethod === 'netbanking' ? 'bg-white shadow text-[#173D2E]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* UPI View */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-stone-700 block">Instant Scan & Pay</span>
                    <span className="text-[11px] text-stone-500">Google Pay, PhonePe, Paytm, BHIM</span>
                  </div>
                  <div className="w-14 h-14 bg-white border border-stone-300 rounded-lg p-1 flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-stone-800" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">
                    Enter UPI ID / VPA (Test)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Card View */}
            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">
                    Test Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-500 block mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-500 block mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NetBanking View */}
            {paymentMethod === 'netbanking' && (
              <div>
                <label className="text-[11px] font-bold text-stone-500 block mb-1">
                  Select Popular Bank
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-3 rounded-xl border text-left font-semibold ${
                        selectedBank === bank
                          ? 'border-[#173D2E] bg-[#173D2E]/5 text-[#173D2E]'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Security Note */}
            <div className="flex items-center space-x-2 text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Razorpay 256-bit SSL encrypted sandbox environment.</span>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-[#0C2340] hover:bg-[#14325a] text-white font-extrabold text-sm shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Simulating Gateway Authorization...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-[#D9A441]" />
                  <span>Pay {formatINR(payableAmount)}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
