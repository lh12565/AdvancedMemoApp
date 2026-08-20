/*
  # Add metadata fields to diary_entries

  1. Changes
    - Add `environment` column (text: home, office, cafe, other)
    - Add `location` column (text, nullable)
    - Add `mood` column (text: happy, neutral, sad, nullable)
    - Add `tags` column (text array, nullable)
    - Add `weather` column (text, nullable) for future use
*/

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'home'
  CHECK (environment = ANY (ARRAY['home'::text, 'office'::text, 'cafe'::text, 'other'::text]));

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS mood text
  CHECK (mood = ANY (ARRAY['happy'::text, 'neutral'::text, 'sad'::text, NULL::text]));

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS weather text;