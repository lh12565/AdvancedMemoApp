/*
  # Add Image Support to Diary Entries

  1. New Columns
    - `diary_entries` table:
      - `image_urls` (text array, nullable) - Array of image URLs for rich content

  2. Modified Tables
    - Added image_urls column to diary_entries for storing multiple images
    - Defaults to empty array

  3. Important Notes
    - Stores images as array of URLs
    - Can support multiple images per diary entry
    - Images are stored as external URLs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diary_entries' AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN image_urls text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_diary_images ON diary_entries(memo_id) WHERE array_length(image_urls, 1) > 0;
