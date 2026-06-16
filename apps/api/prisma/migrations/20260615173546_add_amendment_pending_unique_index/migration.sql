CREATE UNIQUE INDEX amendment_one_pending_per_period 
ON timesheet_amendment_requests (period_id) 
WHERE status = 'PENDING';