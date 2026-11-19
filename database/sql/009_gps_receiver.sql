-- The receiver test bench.
--
-- A GPS packet used to belong to a boat and to nothing else, because the
-- packets came from the boats on the route. The researchers also connect a
-- receiver on the bench, on its own, with no boat anywhere near it, and they
-- want to measure the accuracy of the GPS inside that receiver.
--
-- So a packet may now name a receiver instead of a boat, or both:
--
--   "ferryId"   the boat, when the packet came from a boat on the route.
--               It is what feeds the fleet preview. It is optional now.
--   "deviceId"  the receiver that produced the position. This is what the
--               bench measures.
--
-- A packet without either one is refused: a position has to belong to
-- something.

-- The receiver that produced the position.
ALTER TABLE "GpsLog" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;

-- A position does not have to belong to a boat.
ALTER TABLE "GpsLog" ALTER COLUMN "ferryId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "GpsLog_deviceId_receivedAt_idx"
  ON "GpsLog" ("deviceId", "receivedAt" DESC);

-- The receivers themselves: one row per receiver, holding what it last
-- reported and the packet number the PC has already seen from it.
CREATE TABLE IF NOT EXISTS "GpsDevice" (
  "deviceId"   TEXT PRIMARY KEY,
  "lastSeq"    INTEGER NOT NULL DEFAULT 0,
  lat          DOUBLE PRECISION,
  lon          DOUBLE PRECISION,
  speed        DOUBLE PRECISION,
  hdop         DOUBLE PRECISION,
  sats         INTEGER,
  rssi         INTEGER,
  snr          DOUBLE PRECISION,
  "lastSeenAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Where the receiver really is.
--
-- This is the ground truth the accuracy is measured against. The researcher
-- stands the receiver at a point whose position they know and marks it on the
-- map, and the page then measures every fix against that point. There is one
-- reference per receiver, and setting it again replaces it.
CREATE TABLE IF NOT EXISTS "GpsReference" (
  id          SERIAL PRIMARY KEY,
  "deviceId"  TEXT NOT NULL,
  label       TEXT NOT NULL,
  lat         DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon         DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "GpsReference_deviceId_idx"
  ON "GpsReference" ("deviceId");

-- The station role may read the bench, the same way it may read the GPS log.
-- It may not write a reference point: that is the researcher's own mark.
GRANT SELECT ON "GpsDevice", "GpsReference" TO freery_staff;
