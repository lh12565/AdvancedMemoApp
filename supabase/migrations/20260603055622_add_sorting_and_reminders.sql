/*
  # Add Sorting and Reminders Support

  1. New Columns
    - `tasks` table:
      - `sort_order` (integer) - Position for drag-and-drop sorting
      - `reminder_time` (timestamptz, nullable) - Optional reminder time
      - `reminder_enabled` (boolean) - Whether reminder is active
    
    - `diary_entries` table:
      - `sort_order` (integer) - Position for sorting
      - `reminder_time` (timestamptz, nullable) - Optional reminder time
      - `reminder_enabled` (boolean) - Whether reminder is active

  2. Modified Tables
    - Added sort tracking for ordering
    - Added reminder timestamp and enabled flag
    - All new columns have appropriate defaults

  3. Indexes
    - Index on sort_order for efficient sorting queries
    - Index on reminder_time for reminder queries

  4. Important Notes
    - sort_order starts at 0 and increments for each new item
    - reminder_enabled defaults to false (reminders off by default)
    - reminder_time can be null if no reminder is set
*/

DO $$
BEGIN
  -- Add columns to tasks table if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE tasks ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reminder_enabled'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_enabled boolean DEFAULT false;
  END IF;

  -- Add columns to diary_entries table if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diary_entries' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diary_entries' AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN reminder_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diary_entries' AND column_name = 'reminder_enabled'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN reminder_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for sorting and reminders
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(memo_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_time) WHERE reminder_enabled = true;

CREATE INDEX IF NOT EXISTS idx_diary_sort_order ON diary_entries(memo_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_diary_reminder ON diary_entries(reminder_time) WHERE reminder_enabled = true;
