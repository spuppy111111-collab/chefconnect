import React, { useState } from 'react';
import { X, Mail, CheckCircle2, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  role: 'customer' | 'chef' | 'admin';
  initialEmail?: string;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  role,
  initialEmail = '',
  onClose,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          throw error;
        }
      } else {
        // Simulated secure password reset flow
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to process password reset request. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 relative">
        {/* Header */}
        <div className="bg-[#173D2E] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#D9A441] flex items-center justify-center text-[#173D2E]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Reset Your Password</h3>
              <p className="text-xs text-[#FFF8EC]/70 capitalize">{role} Account Recovery</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#173D2E]">Check Your Inbox</h4>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                  We have dispatched a secure password reset link to <strong className="text-stone-900">{email}</strong>.
                  Please follow the instructions in the email to set a new password.
                </p>
              </div>

              <div className="p-3 bg-[#FFF8EC] rounded-xl border border-[#D9A441]/30 text-[11px] text-[#173D2E] text-left flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                <span>Links expire within 1 hour for your security. Check your spam folder if it doesn't arrive within 2 minutes.</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-[#173D2E] text-[#FFF8EC] font-bold text-xs hover:bg-[#0f291e] transition-colors"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                Enter your registered {role} email address below. We will send you a verification link to securely reset your credentials.
              </p>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`e.g. ${role === 'chef' ? 'chef@chefconnect.in' : 'user@example.com'}`}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#173D2E] text-xs font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-[#173D2E] hover:bg-[#0f291e] text-[#FFF8EC] font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Sending Reset Instructions...' : 'Send Password Reset Link'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D9A441]" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
