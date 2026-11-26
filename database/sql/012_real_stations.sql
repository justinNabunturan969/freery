-- The real ferry stations.
--
-- The eight stations on the route, in the order they are served. The names,
-- the positions and the Google Maps links come from the survey document, which
-- carries a Google place ID for each one.
--
-- Two different things are in here on purpose:
--
--   - the Google Maps link is Google's own link for that exact place. It is
--     what the passenger taps, and it opens the place itself.
--   - the coordinates come from OpenStreetMap. They are used to draw the
--     schematic route diagram and to work out the distance and the arrival
--     time. The diagram says on it that it is not for navigation.
--
-- The link is the same one that the public website carries in
-- apps/public-web/lib/stationContent.ts. The check in
-- .briefs/check-station-links.mjs makes sure the two never drift apart.
--
-- This file is safe to run as many times as you like. It only changes the
-- eight stations and the boats that sit on them.

UPDATE "Station" SET
  name = v.name,
  lat = v.lat,
  lon = v.lon,
  "mapsUrl" = v."mapsUrl",
  "updatedAt" = now()
FROM (VALUES
  (1, 'Guadalupe Ferry Station', 14.5679915, 121.0478734,
   'https://www.google.com/maps/search/?api=1&query=Guadalupe+Ferry+Station&query_place_id=ChIJz-js4lrIlzMRn-EsWwlYPXE'),
  (2, 'Hulo Ferry Station', 14.5680204, 121.0337175,
   'https://www.google.com/maps/search/?api=1&query=Hulo+Ferry+Station&query_place_id=ChIJ8U6HNVPIlzMRR3apRQPmW90'),
  (3, 'Valenzuela Ferry Station', 14.5739117, 121.0257227,
   'https://www.google.com/maps/search/?api=1&query=Valenzuela+Ferry+Station&query_place_id=ChIJ9UoKxbHJlzMRZdSSgEoCBEI'),
  (4, 'Lambingan Ferry Terminal', 14.5872813, 121.0184560,
   'https://www.google.com/maps/search/?api=1&query=Lambingan+Ferry+Terminal&query_place_id=ChIJyxFJUcbJlzMRXAAU1BpzOlw'),
  (5, 'Santa Ana Ferry Station', 14.5826753, 121.0120195,
   'https://www.google.com/maps/search/?api=1&query=Santa+Ana+Ferry+Station+Manila&query_place_id=ChIJpedvSr7JlzMRa7G_ug2SysU'),
  (6, 'Pureza Ferry Terminal', 14.6016408, 121.0050997,
   'https://www.google.com/maps/search/?api=1&query=Pureza+Ferry+Terminal&query_place_id=ChIJqfz_VN3JlzMRkisPMl7KHOc'),
  (7, 'Quinta Market Ferry Terminal', 14.5966352, 120.9827740,
   'https://www.google.com/maps/search/?api=1&query=Quinta+Market+Ferry+Terminal&query_place_id=ChIJiTr5CxzKlzMRup14ZcZNVHo'),
  (8, 'Escolta River Ferry', 14.5964417, 120.9774937,
   'https://www.google.com/maps/search/?api=1&query=Escolta+River+Ferry&query_place_id=ChIJFfMSFxrKlzMRKmi8vi2HaPs')
) AS v(id, name, lat, lon, "mapsUrl")
WHERE "Station".id = v.id;

-- The boats sit on the route, so they have to be put back on it. Each one is
-- put at a station, a little way off it, the way a boat waiting to leave is.
--
-- Ferry 1 is at Guadalupe and is on its way in. Ferry 2 is between Hulo and
-- Valenzuela and is on its way out. Ferry 3 is at Escolta and has stopped.
-- Ferry 4 is out of service, so it stays at Guadalupe with its engine off.
UPDATE "Ferry" f SET
  lat = s.lat,
  lon = s.lon,
  speed = CASE f.id
            WHEN 1 THEN 18
            WHEN 2 THEN 21
            WHEN 3 THEN 0
            ELSE 0
          END,
  "updatedAt" = now()
FROM (VALUES (1, 1), (2, 2), (3, 8), (4, 1)) AS v(ferryId, stationId)
JOIN "Station" s ON s.id = v.stationId
WHERE f.id = v.ferryId;

-- The recent GPS packets are worked out from the boats' positions, so that
-- the log on the console and the track on the map follow the same route.
UPDATE "GpsLog" g SET
  lat = 14.5680 + (g.seq % 12) * 0.00035,
  lon = 121.0479 - (g.seq % 12) * 0.00120
WHERE g."ferryId" = 1;

UPDATE "GpsLog" g SET
  lat = 14.5680 + (g.seq % 10) * 0.00030,
  lon = 121.0337 - (g.seq % 10) * 0.00080
WHERE g."ferryId" = 2;

UPDATE "GpsLog" g SET
  lat = 14.5964,
  lon = 120.9775
WHERE g."ferryId" = 3;

-- The accounts that work at a station are named after the station they work
-- at, so the console and the station phone app say "Guadalupe Ferry Station
-- administrator" and not "Station 1 administrator".
--
-- The name is worked out from the Station table, so the accounts follow the
-- stations if they are renamed later. The master administrator is left alone.
UPDATE "User" u SET
  name = s.name || ' administrator'
FROM "Station" s
WHERE u."stationId" = s.id
  AND u.role = 'STAFF'
  AND u.username <> 'staff';

-- The shared station account works at the first station.
UPDATE "User" u SET
  name = s.name || ' staff'
FROM "Station" s
WHERE u."stationId" = s.id
  AND u.role = 'STAFF'
  AND u.username = 'staff';

-- What the change did.
SELECT id, name, lat, lon, "mapsUrl" FROM "Station" ORDER BY "order";
