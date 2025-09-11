/**
 * Input validation utilities
 */

import type { ImageUploadRequest } from '../types';

/**
 * Validate image upload request data
 */
export function validateImageUploadRequest(data: any): data is ImageUploadRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const { filename, contentType } = data;

  // Check if required fields are present and valid
  if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
    return false;
  }

  if (!contentType || typeof contentType !== 'string' || contentType.trim().length === 0) {
    return false;
  }

  // Validate content type
  const allowedContentTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (!allowedContentTypes.includes(contentType)) {
    return false;
  }

  return true;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '')
    .replace(/\.+/g, '.') // Remove multiple consecutive dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .toLowerCase();
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  
  const extension = sanitized.split('.').pop() || '';
  const nameWithoutExt = sanitized.replace(`.${extension}`, '');
  
  return `${nameWithoutExt}-${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Validate file size (if provided in headers)
 */
export function validateFileSize(contentLength: string | null, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  if (!contentLength) return true; // Cannot validate, assume ok
  
  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxSizeBytes;
}
