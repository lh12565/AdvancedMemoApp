-- Allow memo_id to be nullable for aggregated cross-memo reports
-- and add period_key to deduplicate same-period reports

ALTER TABLE reports ALTER COLUMN memo_id DROP NOT NULL;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS period_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_period
  ON reports(report_type, period_key)
  WHERE memo_id IS NULL;
