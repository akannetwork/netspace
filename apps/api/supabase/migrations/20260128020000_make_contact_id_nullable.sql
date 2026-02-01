-- Make contact_id nullable since transactions can now belong to personnel
ALTER TABLE transactions ALTER COLUMN contact_id DROP NOT NULL;
