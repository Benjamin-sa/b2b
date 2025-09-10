/**
 * 4Tparts Design System - Color Constants
 * Centralized color management for consistent theming across the application
 */

export const COLORS = {
  // Brand Colors
  brand: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryLight: '#dbeafe',
    secondary: '#64748b',
    accent: '#1d4ed8',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    dark: '#0f172a',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Text Colors
  text: {
    primary: '#1e293b',
    secondary: '#475569',
    muted: '#64748b',
    light: '#94a3b8',
    inverse: '#ffffff',
  },

  // Status Colors
  status: {
    success: '#22c55e',
    successLight: '#dcfce7',
    successDark: '#15803d',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    warningDark: '#b45309',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    dangerDark: '#b91c1c',
  },

  // Automotive Theme Colors
  automotive: {
    engine: '#2563eb',
    brake: '#dc2626',
    suspension: '#16a34a',
    tools: '#9333ea',
    oil: '#f59e0b',
  },

  // Gradients
  gradients: {
    brand: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    warm: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    engine: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.2) 100%)',
    brake: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.2) 100%)',
    suspension: 'linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%)',
    tools: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0.2) 100%)',
  },
} as const;

// Tailwind CSS class mappings for consistent usage
export const TAILWIND_COLORS = {
  // Primary brand colors
  primary: {
    bg: 'bg-primary-500',
    bgHover: 'hover:bg-primary-600',
    text: 'text-primary-500',
    textHover: 'hover:text-primary-600',
    border: 'border-primary-500',
    ring: 'ring-primary-500',
  },

  // Status colors
  success: {
    bg: 'bg-success-500',
    bgLight: 'bg-success-100',
    text: 'text-success-500',
    textDark: 'text-success-700',
    border: 'border-success-500',
  },

  warning: {
    bg: 'bg-warning-500',
    bgLight: 'bg-warning-100',
    text: 'text-warning-500',
    textDark: 'text-warning-700',
    border: 'border-warning-500',
  },

  danger: {
    bg: 'bg-danger-500',
    bgLight: 'bg-danger-100',
    text: 'text-danger-500',
    textDark: 'text-danger-700',
    border: 'border-danger-500',
  },

  // Automotive categories
  automotive: {
    engine: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-100',
      text: 'text-blue-500',
      textDark: 'text-blue-700',
    },
    brake: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-100',
      text: 'text-red-500',
      textDark: 'text-red-700',
    },
    suspension: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-100',
      text: 'text-green-500',
      textDark: 'text-green-700',
    },
    tools: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-100',
      text: 'text-purple-500',
      textDark: 'text-purple-700',
    },
  },
} as const;

// Helper functions for color manipulation
export const colorHelpers = {
  /**
   * Get category color based on product category
   */
  getCategoryColor: (category: string) => {
    const categoryLower = category.toLowerCase();
    switch (categoryLower) {
      case 'engine':
        return COLORS.automotive.engine;
      case 'brakes':
      case 'brake':
        return COLORS.automotive.brake;
      case 'suspension':
        return COLORS.automotive.suspension;
      case 'tools':
        return COLORS.automotive.tools;
      default:
        return COLORS.brand.primary;
    }
  },

  /**
   * Get category gradient based on product category
   */
  getCategoryGradient: (category: string) => {
    const categoryLower = category.toLowerCase();
    switch (categoryLower) {
      case 'engine':
        return COLORS.gradients.engine;
      case 'brakes':
      case 'brake':
        return COLORS.gradients.brake;
      case 'suspension':
        return COLORS.gradients.suspension;
      case 'tools':
        return COLORS.gradients.tools;
      default:
        return COLORS.gradients.brand;
    }
  },

  /**
   * Get status color based on status
   */
  getStatusColor: (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'verified':
      case 'active':
      case 'success':
        return COLORS.status.success;
      case 'pending':
      case 'warning':
        return COLORS.status.warning;
      case 'failed':
      case 'error':
      case 'danger':
        return COLORS.status.danger;
      default:
        return COLORS.brand.primary;
    }
  },
};

// Export individual color palettes for specific use cases
export const brandColors = COLORS.brand;
export const statusColors = COLORS.status;
export const automotiveColors = COLORS.automotive;
export const backgroundColors = COLORS.background;
export const textColors = COLORS.text;
