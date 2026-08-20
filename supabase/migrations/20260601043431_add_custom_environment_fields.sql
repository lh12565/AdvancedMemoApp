/*
  # Add custom environment and location coordinates

  1. Changes
    - Add `custom_environment` column to tasks (text, nullable)
    - Add `custom_environment` column to diary_entries (text, nullable)
    - Add `latitude` column to tasks (double precision, nullable)
    - Add `longitude` column to tasks (double precision, nullable)
    - Add `latitude` column to diary_entries (double precision, nullable)
    - Add `longitude` column to diary_entries (double precision, nullable)
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_environment text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS custom_environment text;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS longitude double precision;