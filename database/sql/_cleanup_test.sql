-- Cleanup for the station permission test. Run as the owner.
--
--   node .briefs\query-neon.mjs C:\freery\packages\database\sql\_cleanup_test.sql
--
-- The test in `staff_permissions_test.sql` puts a couple of rows in, and the
-- station role has no DELETE right, so it cannot take them out again. This
-- does it. `.briefs\check-staff-permissions.mjs` does the same thing on its
-- own, so this file is only needed when the test is run by hand.

DELETE FROM "PassengerEvent" WHERE "clientId" = 'permission-test-cleanup';
DELETE FROM "User" WHERE username = 'helper-freery';
DELETE FROM "User" WHERE username = 'evil-freery';

SELECT count(*) AS passenger_events FROM "PassengerEvent";
SELECT username, name, role, "stationId" FROM "User" ORDER BY id;
SELECT id, name, status, "seatsAvailable", capacity FROM "Ferry" ORDER BY id;
