ALTER TABLE tasks ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN resource_id DROP NOT NULL;
ALTER TABLE tasks DROP CONSTRAINT tasks_state_check;
ALTER TABLE tasks ADD CHECK (state IN ('PLANNING','RUNNING','BLOCKED','REPLAN_REQUIRED','REVIEW','COMPLETED','CANCELLED'));
ALTER TABLE nodes DROP CONSTRAINT nodes_state_check;
ALTER TABLE nodes ADD CHECK (state IN ('PENDING','RUNNING','BLOCKED','COMPLETED','CANCELLED'));

ALTER TABLE specification_revisions ADD UNIQUE(task_id,id);
ALTER TABLE plan_revisions ADD UNIQUE(task_id,id);
ALTER TABLE nodes ADD UNIQUE(task_id,id);
ALTER TABLE specification_revisions ADD COLUMN parent_id text;
ALTER TABLE specification_revisions ADD COLUMN content_digest text CHECK (content_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE specification_revisions ADD COLUMN authorization_id text REFERENCES authorization_receipts(id);
ALTER TABLE specification_revisions ADD FOREIGN KEY(task_id,parent_id) REFERENCES specification_revisions(task_id,id);
ALTER TABLE specification_revisions ADD CHECK (parent_id IS NULL OR parent_id<>id);
ALTER TABLE plan_revisions ADD COLUMN specification_id text;
ALTER TABLE plan_revisions ADD COLUMN content_digest text CHECK (content_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE plan_revisions ADD FOREIGN KEY(task_id,specification_id) REFERENCES specification_revisions(task_id,id);
ALTER TABLE tasks ADD FOREIGN KEY(id,specification_id) REFERENCES specification_revisions(task_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE tasks ADD FOREIGN KEY(id,plan_id) REFERENCES plan_revisions(task_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE attempts ADD FOREIGN KEY(task_id,node_id) REFERENCES nodes(task_id,id);
ALTER TABLE attempts ADD COLUMN specification_id text;
ALTER TABLE attempts ADD COLUMN plan_id text;
ALTER TABLE attempts ADD FOREIGN KEY(task_id,specification_id) REFERENCES specification_revisions(task_id,id);
ALTER TABLE attempts ADD FOREIGN KEY(task_id,plan_id) REFERENCES plan_revisions(task_id,id);

CREATE TABLE plan_nodes (
  task_id text NOT NULL, plan_id text NOT NULL, node_id text NOT NULL,
  definition jsonb NOT NULL,
  PRIMARY KEY(plan_id,node_id),
  FOREIGN KEY(task_id,plan_id) REFERENCES plan_revisions(task_id,id),
  FOREIGN KEY(task_id,node_id) REFERENCES nodes(task_id,id)
);
CREATE TABLE node_activations (
  task_id text NOT NULL, node_id text NOT NULL,
  activation bigint NOT NULL CHECK (activation BETWEEN 1 AND 9007199254740991),
  specification_id text NOT NULL, plan_id text NOT NULL,
  basis_source text NOT NULL CHECK (basis_source IN ('recorded','legacy_current')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(node_id,activation),
  FOREIGN KEY(task_id,node_id) REFERENCES nodes(task_id,id),
  FOREIGN KEY(task_id,specification_id) REFERENCES specification_revisions(task_id,id),
  FOREIGN KEY(plan_id,node_id) REFERENCES plan_nodes(plan_id,node_id)
);
CREATE TABLE node_completions (
  node_id text NOT NULL, activation bigint NOT NULL,
  attempt_id text NOT NULL REFERENCES attempts(id),
  operation_id text NOT NULL UNIQUE REFERENCES operations(id),
  result jsonb NOT NULL,
  PRIMARY KEY(node_id,activation),
  FOREIGN KEY(node_id,activation) REFERENCES node_activations(node_id,activation)
);

-- Preserve legacy content; only reconstruct the currently observable graph/basis.
INSERT INTO plan_nodes(task_id,plan_id,node_id,definition)
SELECT p.task_id,p.id,n.id,jsonb_build_object('node_id',n.id,'dependencies',jsonb_build_array(),'legacy',true)
FROM plan_revisions p JOIN nodes n ON n.task_id=p.task_id
WHERE p.content->'node_ids' ? n.id;
INSERT INTO node_activations(task_id,node_id,activation,specification_id,plan_id,basis_source)
SELECT n.task_id,n.id,n.activation,t.specification_id,t.plan_id,'legacy_current'
FROM nodes n JOIN tasks t ON t.id=n.task_id
JOIN plan_nodes pn ON pn.plan_id=t.plan_id AND pn.node_id=n.id;
INSERT INTO node_completions(node_id,activation,attempt_id,operation_id,result)
SELECT n.id,n.activation,a.id,o.id,o.result
FROM nodes n JOIN attempts a ON a.node_id=n.id AND a.node_activation=n.activation
JOIN operations o ON o.attempt_id=a.id AND o.kind='complete_node' AND o.state='succeeded'
JOIN node_activations na ON na.node_id=n.id AND na.activation=n.activation
WHERE n.state='COMPLETED';

CREATE FUNCTION reject_immutable_record_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable execution record cannot be changed' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER immutable_specification BEFORE UPDATE OR DELETE ON specification_revisions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
CREATE TRIGGER immutable_plan BEFORE UPDATE OR DELETE ON plan_revisions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
CREATE TRIGGER immutable_plan_node BEFORE UPDATE OR DELETE ON plan_nodes FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
CREATE TRIGGER immutable_activation BEFORE UPDATE OR DELETE ON node_activations FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
CREATE TRIGGER immutable_completion BEFORE UPDATE OR DELETE ON node_completions FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

-- A graph must be complete in its revision-creation transaction. Forbid adding
-- members to an already committed revision, including a no-longer-current Plan.
CREATE FUNCTION require_new_plan_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM plan_revisions WHERE id=NEW.plan_id AND xmin=pg_current_xact_id()::text::xid) THEN
    RAISE EXCEPTION 'members must be inserted with the immutable Plan revision' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER immutable_plan_membership BEFORE INSERT ON plan_nodes FOR EACH ROW EXECUTE FUNCTION require_new_plan_revision();
