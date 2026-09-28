-- A restarted backend must not use a recently persisted heartbeat as proof that
-- it owns a live Runner control channel. Existing receipt/recovery reads remain valid.
ALTER TABLE runners ADD COLUMN connection_instance text;
