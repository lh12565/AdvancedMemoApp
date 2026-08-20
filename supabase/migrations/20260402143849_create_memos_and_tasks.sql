/*
  # Create Memos and Tasks Tables

  1. New Tables
    - `memos`
      - `id` (uuid, primary key) - Unique identifier for each memo
      - `name` (text) - Name of the memo
      - `created_at` (timestamptz) - Timestamp when memo was created
    
    - `tasks`
      - `id` (uuid, primary key) - Unique identifier for each task
      - `memo_id` (uuid, foreign key) - Reference to parent memo
      - `content` (text) - Task description text
      - `image_url` (text, nullable) - Optional image URL for the task
      - `completed` (boolean) - Task completion status
      - `created_at` (timestamptz) - Timestamp when task was created
  
  2. Security
    - Enable RLS on both tables
    - Allow public access for all operations (since this is a local app without auth)
  
  3. Indexes
    - Index on memo_id in tasks table for faster queries
*/

-- Create memos table
CREATE TABLE IF NOT EXISTS memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_memo_id ON tasks(memo_id);

-- Enable RLS
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public to read memos"
  ON memos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert memos"
  ON memos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update memos"
  ON memos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete memos"
  ON memos FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public to read tasks"
  ON tasks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert tasks"
  ON tasks FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update tasks"
  ON tasks FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete tasks"
  ON tasks FOR DELETE
  TO public
  USING (true);