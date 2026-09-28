-- Keep the system failure class on its original operation so infrastructure
-- repair can settle only the Node activation that this capture failure blocked.
ALTER TABLE operations ADD COLUMN failure_kind text
  CHECK (failure_kind IN ('recoverable','capture_hard_limit','invalid_finalization'));
