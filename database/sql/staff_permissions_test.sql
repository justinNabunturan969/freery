-- Verification that the station role (freery_staff) is held down by the
-- database, not only by the user interface.
--
-- Run it with:
--
--     node .briefs\check-staff-permissions.mjs
--
-- Every block marked `expect fail` has to raise a permission error. Every
-- block marked `expect work` has to succeed. The rows the working blocks put
-- in are removed again by the script, with the owner account.
--
-- The format is one block after another:
--
--     -- @label   what it is
--     -- @expect  fail | work
--     the statement;
--
-- The statement is run on its own, so a block that is refused does not put
-- the ones after it in trouble.

-- @label   staff changes a ferry status
-- @expect  fail
-- The trip status is worked out by the database from the boat's own packets.
-- The station role may not write the column, and even the station role's own
-- write is overwritten by the trigger, so it cannot be set by hand.
UPDATE "Ferry" SET status = 'DOCKED' WHERE id = 1;

-- @label   staff changes a ferry capacity
-- @expect  fail
UPDATE "Ferry" SET capacity = 99 WHERE id = 1;

-- @label   staff closes a station
-- @expect  fail
UPDATE "Station" SET "isOpen" = false, notice = 'closed by staff' WHERE id = 1;

-- @label   staff creates an ADMIN account
-- @expect  fail
INSERT INTO "User" (username, name, "passwordHash", role, "stationId", "isActive")
VALUES ('evil-freery', 'Evil', 'x', 'ADMIN', 1, TRUE);

-- @label   staff promotes an account to ADMIN
-- @expect  fail
UPDATE "User" SET role = 'ADMIN' WHERE username = 'staff';

-- @label   staff deletes a ferry row
-- @expect  fail
DELETE FROM "Ferry" WHERE id = 1;

-- @label   staff updates the seats column
-- @expect  work
UPDATE "Ferry" SET "seatsAvailable" = 13 WHERE id = 1;

-- @label   staff creates a STAFF account
-- @expect  work
INSERT INTO "User" (username, name, "passwordHash", role, "stationId", "isActive")
VALUES ('helper-freery', 'Helper', 'x', 'STAFF', 1, TRUE);

-- @label   staff reads the GPS log
-- @expect  work
SELECT count(*) AS gps_rows FROM "GpsLog";

-- @label   staff reads the activity log
-- @expect  work
SELECT count(*) AS activity_rows FROM "ActivityLog";

-- @label   staff inserts a passenger event
-- @expect  work
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "userId", "passengerType", delta, "clientId")
VALUES (1, 1, NULL, 'STUDENT', 1, 'permission-test-cleanup');

-- @label   staff reads the counter view
-- @expect  work
SELECT * FROM passenger_counts ORDER BY "ferryId";
