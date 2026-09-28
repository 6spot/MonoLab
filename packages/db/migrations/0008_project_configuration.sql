CREATE TABLE configuration_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  version bigint NOT NULL DEFAULT 0 CHECK(version BETWEEN 0 AND 9007199254740991)
);
INSERT INTO configuration_control DEFAULT VALUES;
CREATE TABLE configuration_receipts (
  request_id text PRIMARY KEY, digest text NOT NULL, response jsonb NOT NULL
);
CREATE TRIGGER immutable_configuration_receipt BEFORE UPDATE OR DELETE ON configuration_receipts FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
CREATE TABLE roles (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  instructions text NOT NULL, archived boolean NOT NULL DEFAULT false
);
CREATE TABLE projects (
  id text PRIMARY KEY, name text NOT NULL, context text NOT NULL,
  archived boolean NOT NULL DEFAULT false
);
CREATE TABLE project_roles (
  project_id text NOT NULL REFERENCES projects(id), role_id text NOT NULL REFERENCES roles(id),
  PRIMARY KEY(project_id,role_id)
);
CREATE TABLE project_resources (
  id text PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id),
  repository_identity text NOT NULL, remote_url text NOT NULL,
  settings jsonb NOT NULL, active boolean NOT NULL DEFAULT true,
  UNIQUE(project_id,repository_identity)
);
CREATE FUNCTION preserve_repository_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id<>OLD.id OR NEW.project_id<>OLD.project_id OR NEW.repository_identity<>OLD.repository_identity OR NEW.remote_url<>OLD.remote_url THEN
    RAISE EXCEPTION 'repository identity cannot be changed' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_repository_identity BEFORE UPDATE ON project_resources FOR EACH ROW EXECUTE FUNCTION preserve_repository_identity();
ALTER TABLE tasks ADD COLUMN project_id text REFERENCES projects(id);
CREATE INDEX tasks_project ON tasks(project_id);
