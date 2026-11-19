-- Seed data for the prototype.
--
-- Station names and coordinates are placeholders until the real surveyed
-- values are supplied. They match the placeholders used by the public
-- website so both sides agree on the route.

TRUNCATE TABLE "ActivityLog", "GpsLog", "PassengerEvent", "User", "Ferry", "Station"
  RESTART IDENTITY CASCADE;

INSERT INTO "Station" (id, name, lat, lon, "order", "isOpen", notice,
                       "operatingHours", "boardingInfo", "mapsUrl")
VALUES
  (1, 'Station 1', 14.6, 120.9500, 1, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (2, 'Station 2', 14.6, 120.9797, 2, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (3, 'Station 3', 14.6, 121.0094, 3, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (4, 'Station 4', 14.6, 121.0391, 4, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (5, 'Station 5', 14.6, 121.0688, 5, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (6, 'Station 6', 14.6, 121.0985, 6, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (7, 'Station 7', 14.6, 121.1282, 7, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL),
  (8, 'Station 8', 14.6, 121.1579, 8, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.', NULL);

-- Every ferry carries a position, the same rule the console follows when a
-- boat is added: it starts at the first station on the route. Ferry 4 is out
-- of service, so it sits at Station 1 with its engine off.
--
-- Every ferry also carries an identity colour, the same rule the console
-- follows when a boat is added: the first colour nobody is using. The seed
-- hands out the colours of the reference screens in the order the boats were
-- added.
--
-- The trip status is not in the list, because it is not something the seed
-- decides. The trigger in 007_derived_ferry_status.sql works it out from the
-- speed and from whether the boat is in the fleet.
INSERT INTO "Ferry" (id, name, lat, lon, speed, "seatsAvailable",
                     capacity, "inOperation", "receivedAt", "lastSeq", "color")
VALUES
  (1, 'Ferry 1', 14.6, 120.9657, 18, 14, 40, TRUE,  now(), 1042, 'orange'),
  (2, 'Ferry 2', 14.6, 121.0429, 21, 22, 40, TRUE,  now(), 2098, 'purple'),
  (3, 'Ferry 3', 14.6, 121.1579,  0, 40, 40, TRUE,  now(),  991, 'green'),
  (4, 'Ferry 4', 14.6, 120.9500,  0,  0, 40, FALSE, NULL,  510, 'gray');

-- Passenger events for the manifest. 26 aboard Ferry 1 at Station 1 and
-- 18 aboard Ferry 2 at Station 6, which is 44 passengers in total.
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 1, 1, 'STUDENT', 1, 'seed-s1-stu-' || g, now() - interval '35 minutes' FROM generate_series(1, 8) g;
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 1, 1, 'REGULAR', 1, 'seed-s1-reg-' || g, now() - interval '34 minutes' FROM generate_series(1, 14) g;
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 1, 1, 'SENIOR', 1, 'seed-s1-sen-' || g, now() - interval '33 minutes' FROM generate_series(1, 4) g;
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 2, 6, 'STUDENT', 1, 'seed-s6-stu-' || g, now() - interval '12 minutes' FROM generate_series(1, 6) g;
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 2, 6, 'REGULAR', 1, 'seed-s6-reg-' || g, now() - interval '11 minutes' FROM generate_series(1, 10) g;
INSERT INTO "PassengerEvent" ("ferryId", "stationId", "passengerType", delta, "clientId", "createdAt")
SELECT 2, 6, 'SENIOR', 1, 'seed-s6-sen-' || g, now() - interval '10 minutes' FROM generate_series(1, 2) g;

-- Recent GPS packets, used by the hardware page and the log export.
INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 1, 14.6, 120.9500 + (g * 0.00295), 18, 1040 + g, -88 - (g % 7), 7.8 - (g % 4) * 0.4,
       now() - interval '3 minutes' + (g * 5) * interval '1 second'
FROM generate_series(1, 12) g;

INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 2, 14.6, 121.0094 + (g * 0.00295), 21, 2090 + g, -92 - (g % 5), 7.2 - (g % 3) * 0.5,
       now() - interval '2 minutes' + (g * 4) * interval '1 second'
FROM generate_series(1, 10) g;

INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 3, 14.6, 121.1579, 0, 985 + g, -95 - (g % 4), 6.4 - (g % 3) * 0.3,
       now() - interval '90 seconds' + (g * 10) * interval '1 second'
FROM generate_series(1, 8) g;

-- The seed uses fixed ids so the example data keeps its references, which
-- leaves the id sequences behind. Without moving them past the seeded rows,
-- the first ferry or station added from the console fails with a duplicate
-- key error.
SELECT setval(pg_get_serial_sequence('"Station"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "Station"));
SELECT setval(pg_get_serial_sequence('"Ferry"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "Ferry"));
SELECT setval(pg_get_serial_sequence('"User"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "User"));
SELECT setval(pg_get_serial_sequence('"GpsLog"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "GpsLog"));
SELECT setval(pg_get_serial_sequence('"PassengerEvent"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "PassengerEvent"));
SELECT setval(pg_get_serial_sequence('"ActivityLog"', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM "ActivityLog"));
