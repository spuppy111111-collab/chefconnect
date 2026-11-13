import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getViewFromPath,
  getPathFromView,
  isGuestOnlyRoute,
  isProtectedRoute,
  getDashboardViewForRole,
  getDashboardPathForRole,
  getLoginViewForRole,
  getLoginPathForRole,
  getAllowedRolesForView,
  resolveGuardedNavigation,
  isSessionExpired,
} from './authNavigation';
import { Profile, UserRole } from '../types/database';

function createMockProfile(role: UserRole, overrides: Partial<Profile> = {}): Profile {
  return {
    id: `prof-${role}-${Math.random().toString(36).substring(2, 7)}`,
    role,
    fullName: `Test ${role.toUpperCase()}`,
    email: `${role}@example.com`,
    phone: '+91 98765 43210',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Authentication Navigation & Route Protection System', () => {
  describe('1. URL Path & View Mapping', () => {
    it('correctly maps URL paths to views', () => {
      assert.equal(getViewFromPath('/customer/login'), 'customer_login');
      assert.equal(getViewFromPath('/chef/login'), 'chef_login');
      assert.equal(getViewFromPath('/admin/login'), 'admin_login');
      assert.equal(getViewFromPath('/login'), 'login_hub');
      assert.equal(getViewFromPath('/customer/dashboard'), 'customer_dashboard');
      assert.equal(getViewFromPath('/chef/dashboard'), 'chef_dashboard');
      assert.equal(getViewFromPath('/admin/dashboard'), 'admin_portal');
      assert.equal(getViewFromPath('/chefs'), 'chefs');
      assert.equal(getViewFromPath('/'), 'landing');
    });

    it('correctly maps views to canonical URL paths', () => {
      assert.equal(getPathFromView('customer_login'), '/customer/login');
      assert.equal(getPathFromView('chef_login'), '/chef/login');
      assert.equal(getPathFromView('admin_login'), '/admin/login');
      assert.equal(getPathFromView('customer_dashboard'), '/customer/dashboard');
      assert.equal(getPathFromView('chef_dashboard'), '/chef/dashboard');
      assert.equal(getPathFromView('admin_portal'), '/admin/dashboard');
      assert.equal(getPathFromView('landing'), '/');
    });
  });

  describe('2. Role-Based Dashboard Mapping', () => {
    it('maps customer to Customer Dashboard only', () => {
      assert.equal(getDashboardViewForRole('customer'), 'customer_dashboard');
      assert.equal(getDashboardPathForRole('customer'), '/customer/dashboard');
    });

    it('maps chef to Chef Dashboard only', () => {
      assert.equal(getDashboardViewForRole('chef'), 'chef_dashboard');
      assert.equal(getDashboardPathForRole('chef'), '/chef/dashboard');
    });

    it('maps admin to Admin Dashboard only', () => {
      assert.equal(getDashboardViewForRole('admin'), 'admin_portal');
      assert.equal(getDashboardPathForRole('admin'), '/admin/dashboard');
    });
  });

  describe('3. Route Categorization (Guest-Only vs Protected vs Public)', () => {
    it('identifies guest-only login routes', () => {
      assert.ok(isGuestOnlyRoute('customer_login'));
      assert.ok(isGuestOnlyRoute('chef_login'));
      assert.ok(isGuestOnlyRoute('admin_login'));
      assert.ok(isGuestOnlyRoute('login_hub'));
      assert.ok(!isGuestOnlyRoute('customer_dashboard'));
      assert.ok(!isGuestOnlyRoute('landing'));
    });

    it('identifies protected dashboard routes', () => {
      assert.ok(isProtectedRoute('customer_dashboard'));
      assert.ok(isProtectedRoute('chef_dashboard'));
      assert.ok(isProtectedRoute('admin_portal'));
      assert.ok(!isProtectedRoute('customer_login'));
      assert.ok(!isProtectedRoute('landing'));
    });

    it('defines strict role authorization lists for protected views', () => {
      assert.deepEqual(getAllowedRolesForView('customer_dashboard'), ['customer', 'admin']);
      assert.deepEqual(getAllowedRolesForView('chef_dashboard'), ['chef', 'admin']);
      assert.deepEqual(getAllowedRolesForView('admin_portal'), ['admin']);
    });
  });

  describe('4. Before Login: Unauthenticated Access & Protection', () => {
    const unauthenticatedUser = null;

    it('allows unauthenticated users to access public landing and chefs directory', () => {
      const landingDecision = resolveGuardedNavigation('landing', unauthenticatedUser);
      assert.ok(landingDecision.allowed);

      const chefsDecision = resolveGuardedNavigation('chefs', unauthenticatedUser);
      assert.ok(chefsDecision.allowed);
    });

    it('allows unauthenticated users to access login and registration pages', () => {
      const customerLogin = resolveGuardedNavigation('customer_login', unauthenticatedUser);
      assert.ok(customerLogin.allowed);

      const chefLogin = resolveGuardedNavigation('chef_login', unauthenticatedUser);
      assert.ok(chefLogin.allowed);

      const adminLogin = resolveGuardedNavigation('admin_login', unauthenticatedUser);
      assert.ok(adminLogin.allowed);
    });

    it('blocks unauthenticated access to Customer Dashboard and redirects to Customer Login with replace', () => {
      const decision = resolveGuardedNavigation('customer_dashboard', unauthenticatedUser);
      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'customer_login');
      assert.equal(decision.targetPath, '/customer/login');
      assert.equal(decision.shouldReplace, true);
    });

    it('blocks unauthenticated access to Chef Dashboard and redirects to Chef Login with replace', () => {
      const decision = resolveGuardedNavigation('chef_dashboard', unauthenticatedUser);
      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'chef_login');
      assert.equal(decision.targetPath, '/chef/login');
      assert.equal(decision.shouldReplace, true);
    });

    it('blocks unauthenticated access to Admin Dashboard and redirects to Admin Login with replace', () => {
      const decision = resolveGuardedNavigation('admin_portal', unauthenticatedUser);
      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'admin_login');
      assert.equal(decision.targetPath, '/admin/login');
      assert.equal(decision.shouldReplace, true);
    });
  });

  describe('5. Prevent Back Navigation to Login for Logged-In Users', () => {
    it('redirects authenticated Customer trying to visit Customer Login to Customer Dashboard with replace', () => {
      const customer = createMockProfile('customer');
      const decision = resolveGuardedNavigation('customer_login', customer, { isPopState: true });

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'customer_dashboard');
      assert.equal(decision.targetPath, '/customer/dashboard');
      assert.equal(decision.shouldReplace, true, 'Must replace history to prevent Back button re-entry');
    });

    it('redirects authenticated Chef trying to visit Chef Login to Chef Dashboard with replace', () => {
      const chef = createMockProfile('chef');
      const decision = resolveGuardedNavigation('chef_login', chef, { isPopState: true });

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'chef_dashboard');
      assert.equal(decision.targetPath, '/chef/dashboard');
      assert.equal(decision.shouldReplace, true);
    });

    it('redirects authenticated Admin trying to visit Admin Login to Admin Dashboard with replace', () => {
      const admin = createMockProfile('admin');
      const decision = resolveGuardedNavigation('admin_login', admin, { isPopState: true });

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'admin_portal');
      assert.equal(decision.targetPath, '/admin/dashboard');
      assert.equal(decision.shouldReplace, true);
    });

    it('redirects authenticated user trying to visit Login Hub to their specific role dashboard', () => {
      const customer = createMockProfile('customer');
      const decisionCustomer = resolveGuardedNavigation('login_hub', customer);
      assert.equal(decisionCustomer.redirectToView, 'customer_dashboard');

      const chef = createMockProfile('chef');
      const decisionChef = resolveGuardedNavigation('login_hub', chef);
      assert.equal(decisionChef.redirectToView, 'chef_dashboard');

      const admin = createMockProfile('admin');
      const decisionAdmin = resolveGuardedNavigation('login_hub', admin);
      assert.equal(decisionAdmin.redirectToView, 'admin_portal');
    });
  });

  describe('6. Role-Based Route Isolation & Unauthorized Access Prevention', () => {
    it('prevents customer from accessing Chef Workspace and redirects to Customer Dashboard', () => {
      const customer = createMockProfile('customer');
      const decision = resolveGuardedNavigation('chef_dashboard', customer);

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'customer_dashboard');
      assert.equal(decision.targetPath, '/customer/dashboard');
      assert.equal(decision.shouldReplace, true);
    });

    it('prevents customer from accessing Admin Console and redirects to Customer Dashboard', () => {
      const customer = createMockProfile('customer');
      const decision = resolveGuardedNavigation('admin_portal', customer);

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'customer_dashboard');
      assert.equal(decision.shouldReplace, true);
    });

    it('prevents chef from accessing Admin Console and redirects to Chef Dashboard', () => {
      const chef = createMockProfile('chef');
      const decision = resolveGuardedNavigation('admin_portal', chef);

      assert.equal(decision.allowed, false);
      assert.equal(decision.redirectToView, 'chef_dashboard');
      assert.equal(decision.shouldReplace, true);
    });

    it('allows Admin to access Admin Console, Customer Dashboard, and Chef Workspace (for oversight)', () => {
      const admin = createMockProfile('admin');
      assert.ok(resolveGuardedNavigation('admin_portal', admin).allowed);
      assert.ok(resolveGuardedNavigation('customer_dashboard', admin).allowed);
      assert.ok(resolveGuardedNavigation('chef_dashboard', admin).allowed);
    });
  });

  describe('7. Session Freshness and Expiration Handling', () => {
    it('validates active session timestamps', () => {
      const futureTime = Date.now() + 3600 * 1000;
      assert.equal(isSessionExpired(futureTime), false);
    });

    it('detects expired session timestamps and flags expiration', () => {
      const pastTime = Date.now() - 1000;
      assert.equal(isSessionExpired(pastTime), true);
    });

    it('handles undefined or null timestamps gracefully', () => {
      assert.equal(isSessionExpired(null), false);
      assert.equal(isSessionExpired(undefined), false);
    });
  });

  describe('8. After Logout: Back Navigation Protection', () => {
    it('when logged out, attempting to navigate back to protected dashboard is blocked and redirected to login', () => {
      // Simulate user logging out: currentUser becomes null
      const currentUserAfterLogout = null;

      // User presses browser Back to /customer/dashboard
      const decisionCustomer = resolveGuardedNavigation('customer_dashboard', currentUserAfterLogout, { isPopState: true });
      assert.equal(decisionCustomer.allowed, false);
      assert.equal(decisionCustomer.redirectToView, 'customer_login');
      assert.equal(decisionCustomer.shouldReplace, true);

      // User presses browser Back to /chef/dashboard
      const decisionChef = resolveGuardedNavigation('chef_dashboard', currentUserAfterLogout, { isPopState: true });
      assert.equal(decisionChef.allowed, false);
      assert.equal(decisionChef.redirectToView, 'chef_login');
      assert.equal(decisionChef.shouldReplace, true);

      // User presses browser Back to /admin/dashboard
      const decisionAdmin = resolveGuardedNavigation('admin_portal', currentUserAfterLogout, { isPopState: true });
      assert.equal(decisionAdmin.allowed, false);
      assert.equal(decisionAdmin.redirectToView, 'admin_login');
      assert.equal(decisionAdmin.shouldReplace, true);
    });
  });
});

