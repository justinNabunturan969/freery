-- Cleanup for the station permission test. Run as the superuser.
DELETE FROM "PassengerEvent" WHERE "clientId" = 'permission-test-cleanup';
DELETE FROM "User" WHERE email = 'helper@freery.local';
UPDATE "Ferry" SET "seatsAvailable" = 14 WHERE id = 1;

SELECT count(*) AS passenger_events FROM "PassengerEvent";
SELECT id, email, role, "stationId" FROM "User" ORDER BY id;
SELECT id, name, status, "seatsAvailable", capacity FROM "Ferry" ORDER BY id;
