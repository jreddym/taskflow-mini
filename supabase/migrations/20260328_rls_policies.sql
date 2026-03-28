-- Migration: Enable RLS and create anon policies
-- Applied: 2026-03-28
-- Reason: Replace service_role key with anon key — RLS must be enabled first

-- Enable RLS on all tables
ALTER TABLE sprint_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon role
-- (internal tool — anon key restricts to RLS-governed access, not a bypass)
CREATE POLICY "Allow anon full access to sprint_board"
  ON sprint_board FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to api_usage"
  ON api_usage FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to activity_log"
  ON activity_log FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE sprint_board;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
