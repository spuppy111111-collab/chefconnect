import React, { useEffect } from 'react';
import { Profile, UserRole } from '../types/database';
import { AppView, getDashboardViewForRole } from '../utils/authNavigation';
import { Lock, ShieldAlert, Loader2 } from 'lucide-react';

export interface GuestRouteProps {
  children: React.ReactNode;
  currentUser: Profile | null;
  isLoading?: boolean;
  onNavigate: (view: AppView | string, options?: { replace?: boolean }) => void;
}

/**
 * GuestRoute: Restricts access to unauthenticated users only.
 * If an authenticated user attempts to access a Guest route (e.g. Login, Register),
 * they are automatically redirected to their role-specific dashboard with replace navigation.
 */
export const GuestRoute: React.FC<GuestRouteProps> = ({
  children,
  currentUser,
  isLoading = false,
  onNavigate,
}) => {
  useEffect(() => {
    if (!isLoading && currentUser) {
      const targetDashboard = getDashboardViewForRole(currentUser.role);
      onNavigate(targetDashboard, { replace: true });
    }
  }, [currentUser, isLoading, onNavigate]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-[#173D2E] animate-spin mb-3" />
        <p className="text-xs text-stone-500 font-medium tracking-wide">
          Verifying authentication session...
        </p>
      </div>
    );
  }

  if (currentUser) {
    // Authenticated user: suppress guest page content while redirect takes effect
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-[#173D2E] animate-spin mb-3" />
        <p className="text-xs text-stone-500 font-medium">
          Redirecting to your {currentUser.role} dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export interface ProtectedRouteProps {
  children: React.ReactNode;
  currentUser: Profile | null;
  allowedRoles: UserRole[];
  currentView?: AppView | string;
  fallbackLoginView?: AppView | string;
  isLoading?: boolean;
  onNavigate: (view: AppView | string, options?: { replace?: boolean }) => void;
}

/**
 * ProtectedRoute: Enforces authentication and role-based authorization.
 * 1. Logged-out users are redirected to login with replace navigation.
 * 2. Authenticated users lacking required role are redirected to their own dashboard with replace.
 * 3. Shows secure loading state while authenticating.
 * 4. Never renders protected children to unauthorized visitors.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentUser,
  allowedRoles,
  fallbackLoginView = 'customer_login',
  isLoading = false,
  onNavigate,
}) => {
  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      // Unauthenticated -> redirect to login
      onNavigate(fallbackLoginView, { replace: true });
    } else if (!allowedRoles.includes(currentUser.role)) {
      // Wrong role -> redirect to their authorized role dashboard
      const authorizedDashboard = getDashboardViewForRole(currentUser.role);
      onNavigate(authorizedDashboard, { replace: true });
    }
  }, [currentUser, allowedRoles, fallbackLoginView, isLoading, onNavigate]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12">
        <Loader2 className="w-10 h-10 text-[#173D2E] animate-spin mb-4" />
        <h3 className="text-base font-semibold text-[#173D2E]">Authenticating Access</h3>
        <p className="text-xs text-stone-500 mt-1">Verifying secure credentials and role permissions...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-stone-200 text-center shadow-lg">
        <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#173D2E]" />
        </div>
        <h2 className="text-xl font-bold font-display text-[#173D2E]">Authentication Required</h2>
        <p className="text-xs text-stone-600 mt-2 leading-relaxed">
          You must be logged in to access this protected area. Redirecting you to login...
        </p>
        <div className="mt-6">
          <button
            onClick={() => onNavigate(fallbackLoginView, { replace: true })}
            className="w-full px-5 py-2.5 rounded-xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-lg">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-display text-rose-900">Access Restricted</h2>
        <p className="text-xs text-stone-600 mt-2 leading-relaxed">
          Your current account role (<span className="font-semibold capitalize">{currentUser.role}</span>) does not have permission to view this section.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate(getDashboardViewForRole(currentUser.role), { replace: true })}
            className="px-5 py-2.5 rounded-xl bg-[#173D2E] text-white font-bold text-xs hover:bg-[#0f291e] transition-colors"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

