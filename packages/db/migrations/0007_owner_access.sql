CREATE TABLE owner_access (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  password_salt text NOT NULL CHECK (password_salt ~ '^[0-9a-f]{64}$'),
  password_hash text NOT NULL CHECK (password_hash ~ '^[0-9a-f]{128}$'),
  failures integer NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 5),
  window_started timestamptz NOT NULL DEFAULT now()
);
