ALTER TABLE attempts ADD COLUMN state text NOT NULL DEFAULT 'RUNNING'
  CHECK (state IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED'));
ALTER TABLE attempts ADD COLUMN queue_digest text CHECK (queue_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE attempts ADD COLUMN end_reason text;
UPDATE attempts a SET state=CASE
  WHEN EXISTS (SELECT 1 FROM operations o WHERE o.attempt_id=a.id AND o.kind='complete_node' AND o.state='succeeded')
    OR EXISTS (SELECT 1 FROM command_receipts r WHERE r.attempt_id=a.id AND r.command_name='commit_task_turn' AND r.response->>'status'='committed') THEN 'SUCCEEDED'
  WHEN EXISTS (SELECT 1 FROM task_events e WHERE e.attempt_id=a.id AND e.kind='missing_formal_outcome') THEN 'FAILED'
  WHEN EXISTS (SELECT 1 FROM operations o WHERE o.attempt_id=a.id AND o.kind='complete_node' AND o.state<>'succeeded') THEN 'RUNNING'
  WHEN NOT a.mutation_allowed THEN 'CANCELLED'
  ELSE 'RUNNING' END;
ALTER TABLE attempts ADD CHECK (state<>'QUEUED' OR (process_released AND NOT mutation_allowed AND NOT started));
CREATE UNIQUE INDEX one_queued_owner ON attempts(owner_key) WHERE state='QUEUED';
CREATE INDEX queued_runner_attempts ON attempts(runner_id,created_at,id) WHERE state='QUEUED';
CREATE UNIQUE INDEX one_start_intent ON outbox(attempt_id) WHERE kind='start';

CREATE TABLE task_runner_locality (
  task_id text PRIMARY KEY REFERENCES tasks(id),
  runner_id text NOT NULL REFERENCES runners(id)
);
-- Only pin an unambiguous recorded host. Conflicting legacy placement remains
-- visible through Attempts and is rejected by the promotion guard for reconciliation.
INSERT INTO task_runner_locality(task_id,runner_id)
SELECT task_id,min(runner_id) FROM attempts GROUP BY task_id HAVING count(DISTINCT runner_id)=1;
