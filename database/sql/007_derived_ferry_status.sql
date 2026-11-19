-- The ferry status is worked out from the data. It is never set by hand.
--
-- The trip status used to be a choice on the console: docked, boarding,
-- underway, delayed, out of service. Nobody at the station can know those
-- things while the boat is on its way, so the administrator was asked to
-- guess, and the passenger website then showed the guess as if it were a
-- fact. Two screens could also disagree, because the guess was stored.
--
-- The status is now derived by the database from what the boat reports:
--
--   OFFLINE     the boat is out of the fleet
--   DOCKED      the boat is stopped, its last packet says it is not moving
--   IN_TRANSIT  the boat is moving
--
-- The trigger below writes the status on every insert and every update, so
-- no code path can set it by hand. Even an account with the full UPDATE
-- right on the table cannot put a status of its own choosing into a boat:
-- the trigger overwrites it.
--
-- The column itself stays, so every reader of it keeps working. The console,
-- the read-only API and the passenger website all read the same number, and
-- they read the number the database worked out rather than a guess.

CREATE OR REPLACE FUNCTION derive_ferry_status() RETURNS trigger AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW."inOperation" IS NOT TRUE THEN 'OFFLINE'
    WHEN COALESCE(NEW.speed, 0) < 1 THEN 'DOCKED'
    ELSE 'IN_TRANSIT'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Ferry_derive_status" ON "Ferry";
CREATE TRIGGER "Ferry_derive_status"
  BEFORE INSERT OR UPDATE ON "Ferry"
  FOR EACH ROW EXECUTE FUNCTION derive_ferry_status();

-- Bring the boats that are already in the table onto the new rule. The
-- trigger does the work, so one update fixes every row.
UPDATE "Ferry" SET "seatsAvailable" = "seatsAvailable";

-- The old check allowed five values. Only three are left, and the check is
-- dropped by its real name, which is not always the default one.
DO $$
DECLARE
  old_constraint TEXT;
BEGIN
  SELECT c.conname INTO old_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.conkey[1]
  WHERE t.relname = 'Ferry'
    AND a.attname = 'status'
    AND c.contype = 'c';

  IF old_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "Ferry" DROP CONSTRAINT %I', old_constraint);
  END IF;
END $$;

ALTER TABLE "Ferry" ADD CONSTRAINT "Ferry_status_check"
  CHECK (status IN ('DOCKED','IN_TRANSIT','OFFLINE'));
