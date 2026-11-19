-- Freery core schema.
--
-- Applied by packages/database/scripts/setup.mjs.
-- Every table lives in the public schema of the "freery" database.

CREATE TABLE IF NOT EXISTS "Station" (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lon             DOUBLE PRECISION NOT NULL,
  "order"         INTEGER NOT NULL,
  "isOpen"        BOOLEAN NOT NULL DEFAULT TRUE,
  notice          TEXT,
  "operatingHours" TEXT,
  "boardingInfo"  TEXT,
  "mapsUrl"       TEXT,
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Ferry" (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  -- The trip status is worked out from the boat's own data, never set by
  -- hand. 007_derived_ferry_status.sql adds the trigger that fills it in and
  -- narrows the check to the three values the system can actually know.
  status          TEXT NOT NULL
                    CHECK (status IN ('DOCKED','IN_TRANSIT','OFFLINE')),
  lat             DOUBLE PRECISION,
  lon             DOUBLE PRECISION,
  speed           DOUBLE PRECISION,
  "seatsAvailable" INTEGER NOT NULL DEFAULT 0 CHECK ("seatsAvailable" >= 0),
  capacity        INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
  "inOperation"   BOOLEAN NOT NULL DEFAULT TRUE,
  "receivedAt"    TIMESTAMPTZ,
  "lastSeq"       INTEGER NOT NULL DEFAULT 0,
  -- The identity colour of the boat. It lives on the boat, so it never moves
  -- from one boat to another. 006_ferry_color.sql adds this column to a
  -- database that was made before the colour existed, and adds the check.
  color         TEXT NOT NULL DEFAULT 'gray',
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "User" (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN','STAFF')),
  "stationId"   INTEGER REFERENCES "Station"(id) ON DELETE SET NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "failedLogins" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PassengerEvent" (
  id            SERIAL PRIMARY KEY,
  "ferryId"     INTEGER NOT NULL REFERENCES "Ferry"(id) ON DELETE CASCADE,
  "stationId"   INTEGER NOT NULL REFERENCES "Station"(id) ON DELETE CASCADE,
  "userId"      INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  "passengerType" TEXT NOT NULL
                    CHECK ("passengerType" IN ('STUDENT','REGULAR','SENIOR','PWD')),
  delta         INTEGER NOT NULL CHECK (delta IN (-1, 1)),
  "clientId"    TEXT NOT NULL UNIQUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "GpsLog" (
  id            SERIAL PRIMARY KEY,
  "ferryId"     INTEGER NOT NULL REFERENCES "Ferry"(id) ON DELETE CASCADE,
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  speed         DOUBLE PRECISION NOT NULL,
  seq           INTEGER NOT NULL,
  rssi          INTEGER,
  snr           DOUBLE PRECISION,
  "receivedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  id            SERIAL PRIMARY KEY,
  "userId"      INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  "userName"    TEXT,
  action        TEXT NOT NULL,
  "entityType"  TEXT NOT NULL,
  "entityId"    INTEGER,
  reason        TEXT,
  details       JSONB,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "GpsLog_ferryId_receivedAt_idx" ON "GpsLog" ("ferryId", "receivedAt" DESC);
CREATE INDEX IF NOT EXISTS "PassengerEvent_ferryId_createdAt_idx" ON "PassengerEvent" ("ferryId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PassengerEvent_stationId_createdAt_idx" ON "PassengerEvent" ("stationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt" DESC);
