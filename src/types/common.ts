/**
 * Common Types - Re-exports from @b2b/types
 *
 * DEPRECATED: Import directly from '@b2b/types' or '@b2b/types/common' instead.
 */

// Re-export all common types from @b2b/types
export type {
  ApiError,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  ValidationError,
  FormState,
  LoadingState,
  ISODateString,
  SQLiteBoolean,
  RequireFields,
  OptionalFields,
  CreateInput,
  UpdateInput,
} from '@b2b/types';

// UI-specific types (frontend only, not in shared package)
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  badge?: string;
  children?: NavItem[];
  requires_auth?: boolean;
  requires_admin?: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
