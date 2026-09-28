CREATE TABLE runners (
  id text PRIMARY KEY, credential_hash text NOT NULL UNIQUE,
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 32),
  incarnation bigint NOT NULL DEFAULT 0 CHECK (incarnation BETWEEN 0 AND 9007199254740991),
  connected boolean NOT NULL DEFAULT false, ready boolean NOT NULL DEFAULT false,
  boot_id text, last_seen timestamptz
);
CREATE TABLE tasks (
  id text PRIMARY KEY, resource_id text NOT NULL,
  control_version bigint NOT NULL DEFAULT 1 CHECK (control_version BETWEEN 1 AND 9007199254740991),
  event_sequence bigint NOT NULL DEFAULT 0,
  specification_id text NOT NULL, plan_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('RUNNING','REVIEW','BLOCKED'))
);
CREATE TABLE specification_revisions (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id), content jsonb NOT NULL
);
CREATE TABLE plan_revisions (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id), content jsonb NOT NULL
);
ALTER TABLE tasks ADD FOREIGN KEY (specification_id) REFERENCES specification_revisions(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tasks ADD FOREIGN KEY (plan_id) REFERENCES plan_revisions(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE nodes (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id),
  activation bigint NOT NULL CHECK (activation BETWEEN 1 AND 9007199254740991),
  state text NOT NULL CHECK (state IN ('RUNNING','BLOCKED','COMPLETED')),
  result jsonb
);
CREATE TABLE attempts (
  id text PRIMARY KEY, runner_id text NOT NULL REFERENCES runners(id), task_id text NOT NULL REFERENCES tasks(id),
  node_id text REFERENCES nodes(id), owner_key text NOT NULL, dispatch_id text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('node','planner')),
  fencing_generation bigint NOT NULL CHECK (fencing_generation BETWEEN 1 AND 9007199254740991),
  node_activation bigint NOT NULL CHECK (node_activation BETWEEN 0 AND 9007199254740991),
  mutation_allowed boolean NOT NULL DEFAULT true, process_released boolean NOT NULL DEFAULT false,
  process_absent boolean NOT NULL DEFAULT false, started boolean NOT NULL DEFAULT false,
  launch jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'node' AND node_id IS NOT NULL AND node_activation > 0) OR (kind = 'planner' AND node_id IS NULL AND node_activation = 0))
);
CREATE UNIQUE INDEX one_unresolved_owner ON attempts(owner_key) WHERE NOT process_released;
CREATE TABLE operations (
  id text PRIMARY KEY, attempt_id text NOT NULL REFERENCES attempts(id),
  schema_version integer NOT NULL CHECK (schema_version = 1),
  kind text NOT NULL CHECK (kind IN ('open_workspace','inspect_repository','complete_node','stop')),
  request_id text NOT NULL, state text NOT NULL CHECK (state IN ('admitted','succeeded','recovery')),
  resource_id text NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_completion_per_attempt ON operations(attempt_id) WHERE kind = 'complete_node';
CREATE TABLE command_receipts (
  attempt_id text NOT NULL REFERENCES attempts(id), scope_id text NOT NULL REFERENCES tasks(id), request_id text NOT NULL,
  command_name text NOT NULL, digest text NOT NULL, schema_version integer NOT NULL CHECK (schema_version = 1),
  envelope_json text NOT NULL, response jsonb NOT NULL, operation_id text REFERENCES operations(id),
  PRIMARY KEY (attempt_id, scope_id, request_id)
);
CREATE TABLE outbox (
  id text PRIMARY KEY, runner_id text NOT NULL REFERENCES runners(id), attempt_id text NOT NULL REFERENCES attempts(id),
  kind text NOT NULL CHECK (kind IN ('start','effect')), operation_id text REFERENCES operations(id),
  done boolean NOT NULL DEFAULT false, last_sent_at timestamptz,
  CHECK ((kind = 'start' AND operation_id IS NULL) OR (kind = 'effect' AND operation_id IS NOT NULL))
);
CREATE TABLE runtime_events (
  attempt_id text NOT NULL REFERENCES attempts(id), stream_id text NOT NULL,
  sequence bigint NOT NULL CHECK (sequence BETWEEN 1 AND 9007199254740991),
  digest text NOT NULL, body jsonb NOT NULL,
  PRIMARY KEY (attempt_id, stream_id, sequence)
);
CREATE TABLE task_events (
  task_id text NOT NULL REFERENCES tasks(id), sequence bigint NOT NULL,
  kind text NOT NULL, attempt_id text NOT NULL REFERENCES attempts(id), operation_id text REFERENCES operations(id), body jsonb NOT NULL,
  PRIMARY KEY (task_id, sequence)
);
CREATE UNIQUE INDEX one_node_activation_completion ON task_events((body->>'node_id'), (body->>'node_activation')) WHERE kind = 'node_completed';
