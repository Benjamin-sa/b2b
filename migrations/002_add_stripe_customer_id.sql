-- ============================================
-- Migration 002: Add Stripe Customer ID
-- ============================================
-- Adds stripe_customer_id column to users table
-- Date: 2025-10-24
-- ============================================

-- Add stripe_customer_id column to users table
-- This allows us to link users with their Stripe customer records
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Add index for faster lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
