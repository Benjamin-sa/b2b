/**
 * Product Codes Service
 *
 * Automatic generation of B2B SKUs and EAN-13 barcodes
 *
 * Migrated from inventory-service for consolidated architecture.
 */

import { createDb } from '@b2b/db';
import { and, isNotNull, like, desc } from '@b2b/db';
import { schema } from '@b2b/db';
import type { D1Database } from '@cloudflare/workers-types';

const { products } = schema;

/**
 * Generate next B2B SKU
 * Format: TP-00001, TP-00002, etc.
 *
 * Finds the highest existing SKU number and increments it.
 * If no SKUs exist, starts at TP-00001.
 */
export async function generateNextB2BSku(db: D1Database): Promise<string> {
  try {
    const client = createDb(db);
    const result = await client
      .select({ b2b_sku: products.b2b_sku })
      .from(products)
      .where(and(isNotNull(products.b2b_sku), like(products.b2b_sku, 'TP-%')))
      .orderBy(desc(products.b2b_sku))
      .limit(1)
      .get();

    if (!result || !result.b2b_sku) {
      // No existing SKUs, start at TP-00001
      return 'TP-00001';
    }

    // Extract the numeric part from format TP-00001
    const currentSku = result.b2b_sku as string;
    const numericPart = currentSku.replace('TP-', '');
    const currentNumber = parseInt(numericPart, 10);

    // Increment and pad with zeros (5 digits)
    const nextNumber = currentNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');

    return `TP-${paddedNumber}`;
  } catch (error) {
    console.error('[Product Codes] Error generating B2B SKU:', error);
    // Fallback to a random SKU if query fails
    const randomNumber = Math.floor(Math.random() * 99999) + 1;
    return `TP-${randomNumber.toString().padStart(5, '0')}`;
  }
}

/**
 * Calculate EAN-13 check digit
 * Uses the standard EAN-13 checksum algorithm
 */
function calculateEAN13CheckDigit(first12Digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i], 10);
    // Odd positions (1st, 3rd, 5th...) multiply by 1, even positions by 3
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Generate EAN-13 barcode
 * Format: 2XXXXXXXXXXXC (13 digits)
 * - First digit: 2 (internal product identifier)
 * - Next 11 digits: zero-padded sequential number
 * - Last digit: EAN-13 check digit
 *
 * Example: 2000000000017 (product #1 with check digit 7)
 */
export async function generateNextBarcode(db: D1Database): Promise<string> {
  try {
    const client = createDb(db);
    const result = await client
      .select({ barcode: products.barcode })
      .from(products)
      .where(and(isNotNull(products.barcode), like(products.barcode, '2%')))
      .orderBy(desc(products.barcode))
      .limit(1)
      .get();

    let sequenceNumber = 1;

    if (result && result.barcode) {
      // Extract sequence number (skip first digit '2', take next 11 digits, ignore check digit)
      const existingBarcode = result.barcode as string;
      const sequencePart = existingBarcode.substring(1, 12);
      sequenceNumber = parseInt(sequencePart, 10) + 1;
    }

    // Build first 12 digits: '2' + 11-digit sequence number
    const first12 = '2' + sequenceNumber.toString().padStart(11, '0');

    // Calculate check digit
    const checkDigit = calculateEAN13CheckDigit(first12);

    // Return complete 13-digit barcode
    return first12 + checkDigit;
  } catch (error) {
    console.error('[Product Codes] Error generating barcode:', error);
    // Fallback to random barcode if query fails
    const randomSeq = Math.floor(Math.random() * 99999999999) + 1;
    const first12 = '2' + randomSeq.toString().padStart(11, '0');
    const checkDigit = calculateEAN13CheckDigit(first12);
    return first12 + checkDigit;
  }
}

/**
 * Validate EAN-13 barcode format and checksum
 */
export function validateEAN13Barcode(barcode: string): boolean {
  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  // Verify check digit
  const first12 = barcode.substring(0, 12);
  const checkDigit = barcode[12];
  const calculatedCheckDigit = calculateEAN13CheckDigit(first12);

  return checkDigit === calculatedCheckDigit;
}
