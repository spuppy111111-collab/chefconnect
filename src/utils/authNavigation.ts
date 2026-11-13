import { UserRole, Profile } from '../types/database';

export type AppView =
  | 'landing'
  | 'chefs'
  | 'customer_login'
  | 'chef_login'
  | 'admin_login'
  | 'login_hub'
  | 'customer_dashboard'
  | 'chef_dashboard'
  | 'admin_portal';

export const ROLE_DASHBOARDS: Record<UserRole, AppView> = {
  customer: 'customer_dashboard',
  chef: 'chef_dashboard',
  admin: 'admin_portal',
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  customer: '/customer/dashboard',
  chef: '/chef/dashboard',
  admin: '/admin/dashboard',
};

export const ROLE_LOGIN_VIEWS: Record<UserRole, AppView> = {
  customer: 'customer_login',
  chef: 'chef_login',
  admin: 'admin_login',
};

export const ROLE_LOGIN_PATHS: Record<UserRole, string> = {
  customer: '/customer/login',
  chef: '/chef/login',
  admin: '/admin/login',
};

/**
 * Returns the appropriate dashboard view name for a given user role.
 */
export function getDashboardViewForRole(role: UserRole): AppView {
  return ROLE_DASHBOARDS[role] || 'customer_dashboard';
}

/**
 * Returns the dashboard URL path for a given user role.
 */
export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role] || '/customer/dashboard';
}

/**
 * Returns the login view for a given user role.
 */
export function getLoginViewForRole(role?: UserRole): AppView {
  if (!role) return 'login_hub';
  return ROLE_LOGIN_VIEWS[role] || 'customer_login';
}

/**
 * Returns the login URL path for a given user role.
 */
export function getLoginPathForRole(role?: UserRole): string {
  if (!role) return '/login';
  return ROLE_LOGIN_PATHS[role] || '/customer/login';
}

/**
 * Maps a URL pathname to the corresponding application view.
 */
export function getViewFromPath(pathname: string): AppView {
  const cleanPath = (pathname || '').toLowerCase().trim();
  if (cleanPath.includes('/customer/login')) return 'customer_login';
  if (cleanPath.includes('/chef/login')) return 'chef_login';
  if (cleanPath.includes('/admin/login')) return 'admin_login';
  if (cleanPath === '/login' || cleanPath.startsWith('/login')) return 'login_hub';
  if (cleanPath.includes('/customer/dashboard')) return 'customer_dashboard';
  if (cleanPath.includes('/chef/dashboard')) return 'chef_dashboard';
  if (cleanPath.includes('/admin/dashboard') || cleanPath.includes('/admin_portal') || cleanPath.endsWith('/admin')) {
    return 'admin_portal';
  }
  if (cleanPath.includes('/chefs')) return 'chefs';
  return 'landing';
}

/**
 * Maps an application view to its canonical URL pathname.
 */
export function getPathFromView(view: AppView | string): string {
  switch (view) {
    case 'customer_login':
      return '/customer/login';
    case 'chef_login':
      return '/chef/login';
    case 'admin_login':
      return '/admin/login';
    case 'login_hub':
      return '/login';
    case 'customer_dashboard':
      return '/customer/dashboard';
    case 'chef_dashboard':
      return '/chef/dashboard';
    case 'admin_portal':
      return '/admin/dashboard';
    case 'chefs':
      return '/chefs';
    case 'landing':
    default:
      return '/';
  }
}

/**
 * Checks whether a given view is a guest-only route (Login / Register pages).
 * Authenticated users must NOT access these routes and must be redirected to their dashboard.
 */
export function isGuestOnlyRoute(view: AppView | string): boolean {
  return (
    view === 'customer_login' ||
    view === 'chef_login' ||
    view === 'admin_login' ||
    view === 'login_hub'
  );
}

/**
 * Checks whether a given view is a protected route requiring authentication.
 */
export function isProtectedRoute(view: AppView | string): boolean {
  return (
    view === 'customer_dashboard' ||
    view === 'chef_dashboard' ||
    view === 'admin_portal'
  );
}

/**
 * Returns the list of roles authorized to access a given protected view.
 */
export function getAllowedRolesForView(view: AppView | string): UserRole[] {
  switch (view) {
    case 'customer_dashboard':
      return ['customer', 'admin'];
    case 'chef_dashboard':
      return ['chef', 'admin'];
    case 'admin_portal':
      return ['admin'];
    default:
      return ['customer', 'chef', 'admin'];
  }
}

export interface NavigationDecision {
  allowed: boolean;
  targetView: AppView;
  redirectToView?: AppView;
  targetPath: string;
  shouldReplace: boolean;
  reason?: string;
}

/**
 * Comprehensive Route Guard & Navigation Decision Engine.
 * Evaluates whether the requested targetView is permissible given currentUser.
 *
 * Rules:
 * 1. Guest-Only Route (Login/Auth) + Authenticated User:
 *    BLOCKED -> Redirects to role-specific dashboard with history replacement (replace: true).
 *    Prevents back-button navigation to login.
 * 2. Protected Route + Unauthenticated User (currentUser === null):
 *    BLOCKED -> Redirects to corresponding login page with history replacement (replace: true).
 *    Prevents back-button navigation to dashboard after logout.
 * 3. Protected Route + Role Mismatch (e.g. customer trying to access chef/admin dashboard):
 *    BLOCKED -> Redirects to user's authorized role dashboard with history replacement.
 * 4. Allowed Route (Public, or permitted protected/guest route):
 *    ALLOWED -> Proceeds to targetView.
 */
export function resolveGuardedNavigation(
  requestedView: AppView | string,
  currentUser: Profile | null,
  options?: { isPopState?: boolean; replace?: boolean }
): NavigationDecision {
  const view = (requestedView as AppView) || 'landing';
  const targetPath = getPathFromView(view);

  // 1. Guest-only routes: Login and registration
  if (isGuestOnlyRoute(view)) {
    if (currentUser) {
      const roleDashboard = getDashboardViewForRole(currentUser.role);
      return {
        allowed: false,
        targetView: view,
        redirectToView: roleDashboard,
        targetPath: getPathFromView(roleDashboard),
        shouldReplace: true, // Always replace state to prevent Back navigation into Login
        reason: `Authenticated ${currentUser.role} redirected from guest-only ${view} to ${roleDashboard}`,
      };
    }

    return {
      allowed: true,
      targetView: view,
      targetPath,
      shouldReplace: Boolean(options?.replace),
    };
  }

  // 2. Protected dashboard routes
  if (isProtectedRoute(view)) {
    if (!currentUser) {
      let loginRedirect: AppView = 'login_hub';
      if (view === 'customer_dashboard') loginRedirect = 'customer_login';
      else if (view === 'chef_dashboard') loginRedirect = 'chef_login';
      else if (view === 'admin_portal') loginRedirect = 'admin_login';

      return {
        allowed: false,
        targetView: view,
        redirectToView: loginRedirect,
        targetPath: getPathFromView(loginRedirect),
        shouldReplace: true, // Replace state so user cannot press forward/back into unauthenticated dashboard
        reason: `Unauthenticated access to protected ${view} redirected to ${loginRedirect}`,
      };
    }

    const allowedRoles = getAllowedRolesForView(view);
    if (!allowedRoles.includes(currentUser.role)) {
      const ownDashboard = getDashboardViewForRole(currentUser.role);
      return {
        allowed: false,
        targetView: view,
        redirectToView: ownDashboard,
        targetPath: getPathFromView(ownDashboard),
        shouldReplace: true,
        reason: `Role ${currentUser.role} not authorized for ${view}, redirected to ${ownDashboard}`,
      };
    }

    return {
      allowed: true,
      targetView: view,
      targetPath,
      shouldReplace: Boolean(options?.replace),
    };
  }

  // 3. Public routes (landing, chefs directory, etc.)
  return {
    allowed: true,
    targetView: view,
    targetPath,
    shouldReplace: Boolean(options?.replace),
  };
}

/**
 * Validates session integrity and timestamp freshness.
 * Returns false if session timestamp is expired.
 */
export function isSessionExpired(sessionExpiresAt?: number | string | null): boolean {
  if (!sessionExpiresAt) return false;
  const expiryTime = typeof sessionExpiresAt === 'string' ? new Date(sessionExpiresAt).getTime() : sessionExpiresAt;
  if (isNaN(expiryTime)) return false;
  return Date.now() > expiryTime;
}

