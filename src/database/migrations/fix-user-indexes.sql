-- Fix User Index Conflicts
-- This script resolves the duplicate index issue for the users table

-- Drop the conflicting index if it exists
DROP INDEX IF EXISTS "IDX_196ef3e52525d3cd9e203bdb1d";

-- Drop other potentially conflicting indexes
DROP INDEX IF EXISTS "users_wallet_address_unique";
DROP INDEX IF EXISTS "users_email_unique";
DROP INDEX IF EXISTS "users_username_unique";

-- Clean up any orphaned data or constraints if needed
-- (Add any additional cleanup queries here if needed)

-- The indexes will be recreated by TypeORM during synchronization 