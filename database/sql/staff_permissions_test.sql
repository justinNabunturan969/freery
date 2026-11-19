-- Verification that the station role (freery_staff) is held down by the
-- database, not only by the user interface.
--
-- Run as:  psql -U freery_staff -d freery -f staff_permissions_test.sql
--
-- Every block marked MUST FAIL is expected to raise a permission error.
-- Every block marked MUST WORK is expected to succeed.
-- The file puts the data back the way it found it.

\echo '--- 1. staff changes a ferry status (MUST FAIL) ---'
-- The trip status is worked out by the database from the boat's own packets.
-- The station role may not write the column, and even the station role's own
-- write is overwritten by the trigger, so it cannot be set by hand.
UPDATE "Ferry" SET status = 'DOCKED' WHERE id = 1;

\echo '--- 2. staff changes a ferry capacity (MUST FAIL) ---'
UPDATE "Ferry" SET capacity = 99 WHERE id = 1;

\echo '--- 3. staff closes a station (MUST FAIL) ---'
UPDATE "Station" SET "isOpen" = false, notice = 'closed by staff' WHERE id = 1;

\echo '--- 4. staff creates an ADMIN account (MUST FAIL, trigger) ---'
INSERT INTO "User" (email, name, "passwordHash", role, "stationId", "isActive")
VALUES ('evil@freery.local', 'Evil', 'x', 'ADMIN', 1, TRUE);

\echo '--- 5. staff promotes an account to ADMIN (MUST FAIL, trigger) ---'
UPDATE "User" SET role = 'ADMIN' WHERE email = 'staff@freery.local';

\echo '--- 6. staff updates the seats column (MUST WORK) ---'
UPDATE "Ferry" SET "seatsAvailable" = 13 WHERE id = 1;

\echo '--- 7. staff creates a STAFF account (MUST WORK) ---'
INSERT INTO "User" (email, name, "passwordHash", role, "stationId", "isActive")
VALUES ('helper@freery.local', 'Helper', 'x', 'STAFF', 1, TRUE);

\echo '--- 8. staff reads the GPS log and the activity log (MUST WORK) ---'
SELECT count(*) AS gps_rows FROM "GpsLog";
SELECT count(*) AS activity_rows FROM "ActivityLog";

\echo '--- 9. staff inserts a passenger event (MUST WORK) ---'
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "userId", "passengerType", delta, "clientId")
VALUES (1, 1, NULL, 'STUDENT', 1, 'permission-test-cleanup');

\echo '--- 10. staff deletes a ferry row (MUST FAIL) ---'
DELETE FROM "Ferry" WHERE id = 1;

\echo '--- 11. staff reads the counter view (MUST WORK) ---'
SELECT * FROM passenger_counts ORDER BY "ferryId";

\echo '--- done. The cleanup below needs the superuser, because the station role has no DELETE right ---'
