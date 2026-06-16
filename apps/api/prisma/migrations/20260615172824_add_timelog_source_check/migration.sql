ALTER TABLE time_logs ADD CONSTRAINT time_log_source_check 
CHECK (source IN ('manual', 'timer', 'timer_autostopped'));