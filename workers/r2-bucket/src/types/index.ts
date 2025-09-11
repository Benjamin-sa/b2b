/**
 * TypeScript type definitions for Cloudflare Workers
 */

export interface Env {
  // R2 Storage
  IMAGE_BUCKET: any; // R2Bucket type from @cloudflare/workers-types
  R2_BUCKET_NAME: string;
  
  // R2 Credentials
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
  PUBLIC_R2_URL: string;
}

export interface ImageUploadRequest {
  filename: string;
  contentType: string;
}

export interface ImageUploadResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
}
