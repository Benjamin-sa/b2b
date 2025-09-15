/**
 * Webhook validation utilities for Shopify webhooks
 */

/**
 * Validates Shopify webhook signature using HMAC-SHA256
 * @param signature - The signature from X-Shopify-Hmac-Sha256 header
 * @param body - The raw request body as string
 * @param secret - The webhook secret from environment
 * @returns Promise<boolean> - True if signature is valid
 */
export async function validateShopifyWebhook(
  signature: string | null,
  body: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  try {
    // Convert secret to Uint8Array
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);
    
    // Import the secret as a CryptoKey
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the body
    const bodyBytes = encoder.encode(body);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBytes);
    
    // Convert to base64
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    // Shopify signatures are base64 encoded, so compare directly
    return signature === computedSignature;
  } catch (error) {
    console.error('Webhook validation error:', error);
    return false;
  }
}

/**
 * Validates webhook signature with error message response
 * @param signature - The signature from header
 * @param body - Raw request body
 * @param secret - Webhook secret
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateWebhookWithResponse(
  signature: string | null,
  body: string,
  secret: string
): Promise<{ isValid: boolean; error?: string; statusCode?: number }> {
  if (!signature) {
    return {
      isValid: false,
      error: 'Missing webhook signature in X-Shopify-Hmac-Sha256 header',
      statusCode: 401
    };
  }

  if (!secret) {
    return {
      isValid: false,
      error: 'Webhook secret not configured on server',
      statusCode: 500
    };
  }

  const isValid = await validateShopifyWebhook(signature, body, secret);
  
  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid webhook signature',
      statusCode: 401
    };
  }

  return { isValid: true };
}
