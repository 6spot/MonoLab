ALTER TABLE roles ADD COLUMN execution_policy jsonb;
CREATE TABLE execution_policies (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), policies jsonb NOT NULL DEFAULT '{}'
);
INSERT INTO execution_policies DEFAULT VALUES;
CREATE TABLE github_configuration (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  app_id text NOT NULL, installation_id text NOT NULL,
  encrypted_key text NOT NULL, key_fingerprint text NOT NULL
);
CREATE TABLE runtime_installations (
  runner_id text NOT NULL REFERENCES runners(id), runtime_id text NOT NULL,
  incarnation bigint NOT NULL, observation jsonb NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(runner_id,runtime_id)
);
