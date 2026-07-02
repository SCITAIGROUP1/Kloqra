-- F19: backfill maxReportingApiKeys on plan catalog JSON (no schema change)
UPDATE "plans"
SET "limits" = "limits" || '{"maxReportingApiKeys": 50}'::jsonb
WHERE "id" = '00000000-0000-4000-8000-000000000001';

UPDATE "plans"
SET "limits" = "limits" || '{"maxReportingApiKeys": 5}'::jsonb
WHERE "id" = '00000000-0000-4000-8000-000000000002';

UPDATE "plans"
SET "limits" = "limits" || '{"maxReportingApiKeys": 25}'::jsonb
WHERE "id" = '00000000-0000-4000-8000-000000000003';
