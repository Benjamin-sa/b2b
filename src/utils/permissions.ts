// Security guards and middleware for role-based access control
import { useAuthStore } from '../stores/auth';

export type UserRole = 'admin' | 'customer';
export type Permission = 'read' | 'write' | 'delete' | 'manage_users' | 'verify_users';

// Role-based permissions
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: ['read', 'write', 'delete', 'manage_users', 'verify_users'],
  customer: ['read'],
};

export const usePermissions = () => {
  const authStore = useAuthStore();

  const hasPermission = (permission: Permission): boolean => {
    if (!authStore.isAuthenticated || !authStore.userProfile) {
      return false;
    }

    const userPermissions = rolePermissions[authStore.userProfile.role];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return authStore.userProfile?.role === role;
  };

  const canAccessAdminPanel = (): boolean => {
    return authStore.isAdmin && authStore.isActiveUser;
  };

  const canMakeOrders = (): boolean => {
    return authStore.isAuthenticated && authStore.isActiveUser && authStore.isVerified;
  };

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users');
  };

  const canVerifyUsers = (): boolean => {
    return hasPermission('verify_users');
  };

  return {
    hasPermission,
    hasRole,
    canAccessAdminPanel,
    canMakeOrders,
    canManageUsers,
    canVerifyUsers,
  };
};

// Route guard for Vue Router
export const requireAuth = () => {
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated) {
    throw new Error('Authentication required');
  }

  if (!authStore.isActiveUser) {
    throw new Error('Your account has been deactivated');
  }
};

export const requireAdmin = () => {
  requireAuth();
  const authStore = useAuthStore();

  if (!authStore.isAdmin) {
    throw new Error('Admin access required');
  }
};

export const requireVerified = () => {
  requireAuth();
  const authStore = useAuthStore();

  if (!authStore.isVerified && !authStore.isAdmin) {
    throw new Error('Account verification required');
  }
};

// Component wrapper for conditional rendering
export const withPermission = (permission: Permission, component: any, fallback?: any) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission) ? component : fallback || null;
};

export const withRole = (role: UserRole, component: any, fallback?: any) => {
  const { hasRole } = usePermissions();
  return hasRole(role) ? component : fallback || null;
};
