-- Migration 004: Add BTW Verification Fields
-- 
-- Adds fields to store VIES (EU VAT Information Exchange System) verification data
-- from Stripe tax ID validation webhooks.
-- 
-- These fields store the OFFICIAL company name and address returned by the
-- European Commission's VIES database, which can be used for:
-- - Compliance audit trail
-- - Verification that customer-submitted data matches government records
-- - Display of official company name on invoices

-- Add VIES verification data columns to users table
ALTER TABLE users ADD COLUMN btw_verified_name TEXT;
ALTER TABLE users ADD COLUMN btw_verified_address TEXT;
ALTER TABLE users ADD COLUMN btw_verified_at TEXT;
ALTER TABLE users ADD COLUMN btw_number_validated INTEGER DEFAULT 0 CHECK(btw_number_validated IN (0, 1));


-- Add index for querying verified users
CREATE INDEX IF NOT EXISTS idx_users_btw_verified ON users(btw_number_validated, btw_verified_at);
