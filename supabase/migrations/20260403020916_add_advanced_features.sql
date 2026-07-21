/*
  # Add Advanced Features to Memos and Tasks

  1. Modified Tables
    - `memos` - Add: priority, deadline, tags, suggested_time
    - `tasks` - Add: priority, environment, mood, completed_at
    - New: `diary_entries` - For diary/journal entries
    - New: `reminders` - For reminder notifications
    - New: `reports` - For weekly/monthly/yearly reports

  2. New Tables
    - `diary_entries` - Markdown journal entries for each memo
    - `reminders` - Reminder notifications for memos and tasks
    - `reports` - Weekly, monthly, yearly reports
    - `mood_stats` - Analytics for mood tracking
    - `environment_stats` - Analytics for where tasks are completed

  3. Security
    - Enable RLS on all new tables
    - Policies for public access
*/

-- Add columns to memos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memos' AND column_name = 'priority'
  ) THEN
    ALTER TABLE memos ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memos' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE memos ADD COLUMN deadline timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memos' AND column_name = 'tags'
  ) THEN
    ALTER TABLE memos ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memos' AND column_name = 'suggested_time'
  ) THEN
    ALTER TABLE memos ADD COLUMN suggested_time text;
  END IF;
END $$;

-- Add columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'environment'
  ) THEN
    ALTER TABLE tasks ADD COLUMN environment text DEFAULT 'home' CHECK (environment IN ('home', 'office', 'cafe', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'mood'
  ) THEN
    ALTER TABLE tasks ADD COLUMN mood text CHECK (mood IN ('happy', 'neutral', 'sad', null));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'tags'
  ) THEN
    ALTER TABLE tasks ADD COLUMN tags text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE tasks ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid REFERENCES memos(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_time timestamptz NOT NULL,
  reminder_type text CHECK (reminder_type IN ('one_time', 'daily', 'weekly')),
  is_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  report_type text CHECK (report_type IN ('weekly', 'monthly', 'yearly')),
  report_date date NOT NULL,
  content jsonb NOT NULL,
  stats jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create mood_stats table
CREATE TABLE IF NOT EXISTS mood_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  mood text NOT NULL,
  count integer DEFAULT 1,
  date date DEFAULT CURRENT_DATE,
  UNIQUE(memo_id, mood, date)
);

-- Create environment_stats table
CREATE TABLE IF NOT EXISTS environment_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  environment text NOT NULL,
  count integer DEFAULT 1,
  date date DEFAULT CURRENT_DATE,
  UNIQUE(memo_id, environment, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_diary_entries_memo_id ON diary_entries(memo_id);
CREATE INDEX IF NOT EXISTS idx_reminders_memo_id ON reminders(memo_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reports_memo_id ON reports(memo_id);
CREATE INDEX IF NOT EXISTS idx_mood_stats_memo_id ON mood_stats(memo_id);
CREATE INDEX IF NOT EXISTS idx_environment_stats_memo_id ON environment_stats(memo_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_memos_priority ON memos(priority);

-- Enable RLS
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public to read diary entries"
  ON diary_entries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert diary entries"
  ON diary_entries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update diary entries"
  ON diary_entries FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete diary entries"
  ON diary_entries FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public to read reminders"
  ON reminders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert reminders"
  ON reminders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update reminders"
  ON reminders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete reminders"
  ON reminders FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public to read reports"
  ON reports FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert reports"
  ON reports FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to read mood stats"
  ON mood_stats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert mood stats"
  ON mood_stats FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update mood stats"
  ON mood_stats FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to read environment stats"
  ON environment_stats FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert environment stats"
  ON environment_stats FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update environment stats"
  ON environment_stats FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);