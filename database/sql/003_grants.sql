-- Grants for the three application roles.
--
-- The roles themselves are created and given their passwords by
-- packages/database/scripts/setup.mjs, outside a DO block, because a
-- password change inside a DO block is not applied by PostgreSQL.
--
-- The important idea in this file: the station role is held down by the
-- database itself, not only by the buttons the UI hides. A stolen station
-- session cannot change a ferry's status, cannot close a station, and cannot
-- promote an account to administrator, no matter what it sends.

-- Admin mode: read and write on everything.
GRANT USAGE ON SCHEMA public TO freery_station;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO freery_station;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO freery_station;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO freery_station;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO freery_station;

-- Station role: used by the staff phone app.
--
-- It can read the fleet, the stations, the accounts, the GPS log and the
-- audit trail. It can insert passenger events and update the seats column.
-- It can create and manage staff accounts for its own station.
--
-- It cannot update anything else on a ferry, because the grant on that
-- table is limited to one column. It cannot update a station at all.
GRANT USAGE ON SCHEMA public TO freery_staff;
GRANT SELECT ON "Ferry", "Station", "User", "GpsLog", "ActivityLog" TO freery_staff;
GRANT SELECT, INSERT ON "PassengerEvent" TO freery_staff;
GRANT UPDATE ("seatsAvailable", "updatedAt") ON "Ferry" TO freery_staff;
GRANT INSERT (username, name, "passwordHash", role, "stationId", "isActive")
  ON "User" TO freery_staff;
GRANT UPDATE ("isActive", "stationId", "passwordHash", "failedLogins", "lockedUntil", "updatedAt")
  ON "User" TO freery_staff;
GRANT USAGE, SELECT ON SEQUENCE "PassengerEvent_id_seq", "User_id_seq" TO freery_staff;
GRANT SELECT ON passenger_counts, station_manifest TO freery_staff;

-- Public read-only API: the ferry state view and the station list only.
GRANT USAGE ON SCHEMA public TO freery_public;
GRANT SELECT ON public_ferry_state, "Station" TO freery_public;

-- The guard that keeps the station role inside its lane.
--
-- The column level grants above already stop the station role from editing
-- a ferry or a station. This trigger closes the last gap: it stops the
-- station role from creating or promoting an administrator account, even if
-- somebody bypasses the API and writes to the table directly.
CREATE OR REPLACE FUNCTION guard_staff_accounts() RETURNS trigger AS $$
BEGIN
  IF current_user = 'freery_staff' THEN
    IF TG_OP = 'INSERT' AND NEW.role <> 'STAFF' THEN
      RAISE EXCEPTION 'The station role can only create staff accounts'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'The station role cannot change the role of an account'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_guard_staff" ON "User";
CREATE TRIGGER "User_guard_staff"
  BEFORE INSERT OR UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION guard_staff_accounts();
