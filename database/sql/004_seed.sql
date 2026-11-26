-- Seed data for the prototype.
--
-- The eight stations are the real ones, in the order they are served. Their
-- names, their positions and their Google Maps links come from the survey
-- document, which carries a Google place ID for each station. The links are
-- the same ones the public website carries in
-- apps/public-web/lib/stationContent.ts.
--
-- The coordinates come from OpenStreetMap. They draw the schematic route
-- diagram and work out the distance and the arrival time; the diagram says on
-- it that it is not for navigation. The Google Maps link is what takes a
-- passenger to the exact place.

TRUNCATE TABLE "ActivityLog", "GpsLog", "PassengerEvent", "User", "Ferry", "Station"
  RESTART IDENTITY CASCADE;

INSERT INTO "Station" (id, name, lat, lon, "order", "isOpen", notice,
                       "operatingHours", "boardingInfo", "mapsUrl")
VALUES
  (1, 'Guadalupe Ferry Station', 14.5679915, 121.0478734, 1, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Guadalupe+Ferry+Station&query_place_id=ChIJz-js4lrIlzMRn-EsWwlYPXE'),
  (2, 'Hulo Ferry Station', 14.5680204, 121.0337175, 2, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Hulo+Ferry+Station&query_place_id=ChIJ8U6HNVPIlzMRR3apRQPmW90'),
  (3, 'Valenzuela Ferry Station', 14.5739117, 121.0257227, 3, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Valenzuela+Ferry+Station&query_place_id=ChIJ9UoKxbHJlzMRZdSSgEoCBEI'),
  (4, 'Lambingan Ferry Terminal', 14.5872813, 121.0184560, 4, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Lambingan+Ferry+Terminal&query_place_id=ChIJyxFJUcbJlzMRXAAU1BpzOlw'),
  (5, 'Santa Ana Ferry Station', 14.5826753, 121.0120195, 5, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Santa+Ana+Ferry+Station+Manila&query_place_id=ChIJpedvSr7JlzMRa7G_ug2SysU'),
  (6, 'Pureza Ferry Terminal', 14.6016408, 121.0050997, 6, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Pureza+Ferry+Terminal&query_place_id=ChIJqfz_VN3JlzMRkisPMl7KHOc'),
  (7, 'Quinta Market Ferry Terminal', 14.5966352, 120.9827740, 7, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Quinta+Market+Ferry+Terminal&query_place_id=ChIJiTr5CxzKlzMRup14ZcZNVHo'),
  (8, 'Escolta River Ferry', 14.5964417, 120.9774937, 8, TRUE, NULL,
   'Daily, 05:00 AM to 09:00 PM',
   'Use the main boarding area. Please arrive 10 minutes before departure.',
   'https://www.google.com/maps/search/?api=1&query=Escolta+River+Ferry&query_place_id=ChIJFfMSFxrKlzMRKmi8vi2HaPs');

-- Every ferry carries a position on the route, the same rule the console
-- follows when a boat is added: it starts at a station on the route. Ferry 4 is
-- out of service, so it sits at Guadalupe with its engine off.
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
  (1, 'Ferry 1', 14.5679915, 121.0478734, 18, 14, 40, TRUE,  now(), 1042, 'orange'),
  (2, 'Ferry 2', 14.5680204, 121.0337175, 21, 22, 40, TRUE,  now(), 2098, 'purple'),
  (3, 'Ferry 3', 14.5964417, 120.9774937,  0, 40, 40, TRUE,  now(),  991, 'green'),
  (4, 'Ferry 4', 14.5679915, 121.0478734,  0,  0, 40, FALSE, NULL,  510, 'gray');

-- Passenger events for the manifest. 26 aboard Ferry 1 at Guadalupe and
-- 18 aboard Ferry 2 at Pureza, which is 44 passengers in total.
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

-- Recent GPS packets, used by the hardware page and the log export. They
-- follow the route, so the track on the map is the real one.
INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 1, 14.5680, 121.0479 - (g * 0.00120), 18, 1040 + g, -88 - (g % 7), 7.8 - (g % 4) * 0.4,
       now() - interval '3 minutes' + (g * 5) * interval '1 second'
FROM generate_series(1, 12) g;

INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 2, 14.5680, 121.0337 - (g * 0.00080), 21, 2090 + g, -92 - (g % 5), 7.2 - (g % 3) * 0.5,
       now() - interval '2 minutes' + (g * 4) * interval '1 second'
FROM generate_series(1, 10) g;

INSERT INTO "GpsLog" ("ferryId", lat, lon, speed, seq, rssi, snr, "receivedAt")
SELECT 3, 14.5964, 120.9775, 0, 985 + g, -95 - (g % 4), 6.4 - (g % 3) * 0.3,
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
