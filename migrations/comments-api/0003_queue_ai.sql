ALTER TABLE ai_jobs ADD COLUMN reply_id TEXT;
ALTER TABLE ai_jobs ADD COLUMN updated_at TEXT;

ALTER TABLE replies ADD COLUMN ai_job_id TEXT REFERENCES ai_jobs(id);

CREATE UNIQUE INDEX replies_ai_job_id_unique
  ON replies(ai_job_id)
  WHERE ai_job_id IS NOT NULL;

CREATE INDEX ai_jobs_status_updated_idx
  ON ai_jobs(status, updated_at);
