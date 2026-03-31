/*
  # Create Sync Logs Table for Data Update Tracking
  
  ## Overview
  This migration creates a sync_logs table to track all data synchronization operations,
  including medication imports, drug interaction updates, and other reference data changes.
  
  ## Use Cases
  1. Track when medications database was last updated
  2. Track when drug interactions were last synced
  3. Monitor data import operations for auditing
  4. Prevent duplicate imports with idempotency checks
  5. Debug data sync issues
  
  ## Table Structure
  - id: Unique identifier for each sync operation
  - sync_type: Type of sync (medications, interactions, patients, etc.)
  - status: Status of the sync (pending, in_progress, completed, failed)
  - records_affected: Number of records created/updated/deleted
  - source: Where the data came from (csv, api, manual, etc.)
  - error_message: Error details if sync failed
  - metadata: Additional JSON data about the sync
  - started_at: When the sync started
  - completed_at: When the sync completed
  - created_by: User who triggered the sync (NULL for automated)
  
  ## Security
  - RLS enabled
  - Only authenticated users can view sync logs
  - Only service role can insert/update sync logs
*/

-- ============================================================================
-- 1. CREATE SYNC_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL CHECK (sync_type IN (
    'medications',
    'drug_interactions',
    'patients',
    'consultations',
    'full_sync',
    'partial_sync',
    'manual_import'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),
  records_affected jsonb DEFAULT '{"created": 0, "updated": 0, "deleted": 0, "skipped": 0}'::jsonb,
  source text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_by ON sync_logs(created_by);

-- Add comments for documentation
COMMENT ON TABLE sync_logs IS 'Tracks all data synchronization operations for auditing and monitoring';
COMMENT ON COLUMN sync_logs.sync_type IS 'Type of data being synchronized';
COMMENT ON COLUMN sync_logs.records_affected IS 'JSON object with counts: {created, updated, deleted, skipped}';
COMMENT ON COLUMN sync_logs.metadata IS 'Additional metadata about the sync operation (file name, API endpoint, etc.)';

-- ============================================================================
-- 2. ENABLE RLS ON SYNC_LOGS
-- ============================================================================

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all sync logs
CREATE POLICY "Authenticated users can view sync logs"
  ON sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update sync logs
-- (This happens automatically as service role bypasses RLS)

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR SYNC OPERATIONS
-- ============================================================================

-- Function to start a new sync operation
CREATE OR REPLACE FUNCTION start_sync(
  p_sync_type text,
  p_source text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync_id uuid;
BEGIN
  INSERT INTO sync_logs (sync_type, status, source, created_by, metadata, started_at)
  VALUES (p_sync_type, 'in_progress', p_source, p_created_by, p_metadata, now())
  RETURNING id INTO v_sync_id;
  
  RETURN v_sync_id;
END;
$$;

-- Function to complete a sync operation
CREATE OR REPLACE FUNCTION complete_sync(
  p_sync_id uuid,
  p_records_affected jsonb DEFAULT '{"created": 0, "updated": 0, "deleted": 0, "skipped": 0}'::jsonb,
  p_status text DEFAULT 'completed',
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sync_logs
  SET 
    status = p_status,
    records_affected = p_records_affected,
    error_message = p_error_message,
    completed_at = now()
  WHERE id = p_sync_id;
END;
$$;

-- Function to check if a sync is already running
CREATE OR REPLACE FUNCTION is_sync_running(p_sync_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM sync_logs 
    WHERE sync_type = p_sync_type 
      AND status = 'in_progress'
      AND started_at > now() - interval '1 hour'
  );
END;
$$;

-- Function to get last successful sync
CREATE OR REPLACE FUNCTION get_last_sync(p_sync_type text)
RETURNS TABLE(
  sync_id uuid,
  completed_at timestamptz,
  records_affected jsonb,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    sync_logs.completed_at,
    sync_logs.records_affected,
    sync_logs.source
  FROM sync_logs
  WHERE sync_type = p_sync_type
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- 4. CREATE VIEW FOR SYNC STATISTICS
-- ============================================================================

CREATE OR REPLACE VIEW sync_statistics AS
SELECT
  sync_type,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_syncs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_syncs,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_syncs,
  MAX(completed_at) as last_successful_sync,
  SUM((records_affected->>'created')::int) as total_records_created,
  SUM((records_affected->>'updated')::int) as total_records_updated
FROM sync_logs
GROUP BY sync_type;

COMMENT ON VIEW sync_statistics IS 'Aggregated statistics for all sync operations by type';

-- ============================================================================
-- 5. INITIAL SYNC LOG FOR EXISTING DATA
-- ============================================================================

-- Log the initial migration as a completed sync
INSERT INTO sync_logs (
  sync_type,
  status,
  records_affected,
  source,
  metadata,
  started_at,
  completed_at
)
VALUES (
  'medications',
  'completed',
  '{"created": 13, "updated": 0, "deleted": 0, "skipped": 0}'::jsonb,
  'initial_migration',
  '{"migration": "recreate_complete_business_schema_v2", "note": "Initial seed data"}'::jsonb,
  now() - interval '1 minute',
  now()
);

INSERT INTO sync_logs (
  sync_type,
  status,
  records_affected,
  source,
  metadata,
  started_at,
  completed_at
)
VALUES (
  'drug_interactions',
  'completed',
  '{"created": 4, "updated": 0, "deleted": 0, "skipped": 0}'::jsonb,
  'initial_migration',
  '{"migration": "recreate_complete_business_schema_v2", "note": "Initial seed data"}'::jsonb,
  now() - interval '1 minute',
  now()
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  sync_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sync_count FROM sync_logs;
  
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'SYNC_LOGS TABLE CREATED SUCCESSFULLY';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Initial sync logs recorded: %', sync_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  ✓ start_sync() - Begin a new sync operation';
  RAISE NOTICE '  ✓ complete_sync() - Mark sync as complete';
  RAISE NOTICE '  ✓ is_sync_running() - Check if sync is in progress';
  RAISE NOTICE '  ✓ get_last_sync() - Get last successful sync info';
  RAISE NOTICE '';
  RAISE NOTICE 'View created:';
  RAISE NOTICE '  ✓ sync_statistics - Aggregated sync stats';
  RAISE NOTICE '========================================================';
END $$;
