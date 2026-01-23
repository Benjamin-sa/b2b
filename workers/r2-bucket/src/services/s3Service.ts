/**
 * AWS S3/R2 Service Configuration
 * Handles all S3-compatible storage operations
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../types';

/**
 * Create S3 client instance
 */
export function createS3Client(env: Env): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate a presigned URL for file upload
 */
export async function generatePresignedUrl(
  s3Client: S3Client,
  bucketName: string,
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate public URL for uploaded file
 */
export function generatePublicUrl(publicR2Url: string, key: string): string {
  return `${publicR2Url}/${key}`;
}

/**
 * Generate storage key with proper structure
 */
export function generateStorageKey(filename: string, folder: string = 'products'): string {
  return `${folder}/${filename}`;
}
