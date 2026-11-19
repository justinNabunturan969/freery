-- Read-only views.
--
-- public_ferry_state is what the public read-only API selects from with the
-- freery_public role. It never exposes the admin columns.

CREATE OR REPLACE VIEW public_ferry_state AS
SELECT
  f.id,
  f.name,
  f.status,
  f.lat,
  f.lon,
  f.speed,
  f."seatsAvailable",
  f.capacity,
  f."receivedAt",
  f.color
FROM "Ferry" f
WHERE f."inOperation" IS TRUE;

-- On board totals per ferry and passenger type, derived from the event log.
CREATE OR REPLACE VIEW passenger_counts AS
SELECT
  e."ferryId",
  e."passengerType",
  SUM(e.delta)::INTEGER AS "onBoard"
FROM "PassengerEvent" e
GROUP BY e."ferryId", e."passengerType";

-- Station totals for the passenger manifest.
CREATE OR REPLACE VIEW station_manifest AS
SELECT
  e."stationId",
  e."passengerType",
  SUM(e.delta)::INTEGER AS "onBoard",
  MAX(e."createdAt") AS "lastBoarding"
FROM "PassengerEvent" e
GROUP BY e."stationId", e."passengerType";
