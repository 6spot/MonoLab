CREATE TABLE owner_sessions (
  id text PRIMARY KEY,
  token_digest text NOT NULL UNIQUE CHECK (token_digest ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE task_command_proposals (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id),
  action text NOT NULL CHECK (action IN ('apply_specification_revision','apply_rework','accept_delivery')),
  content jsonb NOT NULL, content_digest text NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  basis jsonb NOT NULL, expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE authorization_receipts (
  id text PRIMARY KEY, proposal_id text NOT NULL UNIQUE REFERENCES task_command_proposals(id),
  created_at timestamptz NOT NULL DEFAULT now(), consumed_by text
);
CREATE TABLE owner_command_receipts (
  scope_id text NOT NULL REFERENCES tasks(id), request_id text NOT NULL,
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  envelope_json text NOT NULL, response jsonb NOT NULL,
  PRIMARY KEY (scope_id, request_id)
);
