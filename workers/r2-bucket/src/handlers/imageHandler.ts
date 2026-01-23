/**
 * Image Handler
 * Processes image upload requests and generates presigned URLs
 */

import type { Env, ImageUploadRequest, ImageUploadResponse } from '../types';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '../utils/response';
import {
  validateImageUploadRequest,
  generateUniqueFilename,
  validateFileSize,
} from '../utils/validation';
import { isOriginAllowed } from '../utils/cors';
import {
  createS3Client,
  generatePresignedUrl,
  generatePublicUrl,
  generateStorageKey,
} from '../services/s3Service';

/**
 * Handle image-related requests
 */
export async function handleImageRequest(request: Request, env: Env): Promise<Response> {
  // Check if origin is allowed
  if (!isOriginAllowed(request)) {
    return createErrorResponse('Origin not allowed', 403, request);
  }

  // Only allow POST requests for image uploads
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, request);
  }

  try {
    // Parse and validate request body
    const requestData = await request.json();

    if (!validateImageUploadRequest(requestData)) {
      return createValidationError(
        'Invalid request data. Required: filename (string), contentType (string)',
        request
      );
    }

    const { filename, contentType } = requestData as ImageUploadRequest;

    // Validate file size if content-length header is present
    const contentLength = request.headers.get('content-length');
    if (!validateFileSize(contentLength)) {
      return createValidationError('File size exceeds maximum allowed (10MB)', request);
    }

    // Generate unique filename and storage key
    const uniqueFilename = generateUniqueFilename(filename);
    const storageKey = generateStorageKey(uniqueFilename);

    // Create S3 client and generate presigned URL
    const s3Client = createS3Client(env);
    const uploadUrl = await generatePresignedUrl(
      s3Client,
      env.R2_BUCKET_NAME,
      storageKey,
      contentType
    );

    // Generate public URL
    const publicUrl = generatePublicUrl(env.PUBLIC_R2_URL, storageKey);

    // Prepare response data
    const responseData: ImageUploadResponse = {
      uploadUrl,
      publicUrl,
    };

    return createSuccessResponse(responseData, request);
  } catch (error) {
    console.error('Image upload error:', error);

    // Handle specific errors
    if (error instanceof SyntaxError) {
      return createValidationError('Invalid JSON in request body', request);
    }

    return createErrorResponse('Failed to generate upload URL', 500, request);
  }
}
