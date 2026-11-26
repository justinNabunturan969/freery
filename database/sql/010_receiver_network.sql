-- The receiver's network.
--
-- The board at the head station used to carry its Wi-Fi name and password in
-- secrets.h. Changing the network meant changing the code and flashing the
-- board again, and the board could not be reached at all if the new network
-- was wrong.
--
-- Now the master administrator types the new network into the console. The
-- server keeps it until the board has taken it, and the board keeps it in its
-- own memory from then on, so the Arduino IDE is not opened again.
--
-- There are two tables here:
--
--   "PortStation"                what we last heard from a board that talks to
--                                this PC: the network it is on and when it
--                                was last seen.
--   "ReceiverNetworkCommand"     the networks boards are being asked to use.
--
-- The password lives in the second table, and only until the board has taken
-- it. The station role cannot read that table at all, so a station account
-- cannot read the station's Wi-Fi password.

-- What we last heard from each board that talks to this PC.
CREATE TABLE IF NOT EXISTS "PortStation" (
  "stationId"  TEXT PRIMARY KEY,
  -- The network the board says it is on. The name is not a secret.
  "wifiSsid"   TEXT,
  -- connected, failed or setup.
  "wifiStatus" TEXT,
  "wifiIp"     TEXT,
  "lastSeenAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The board only ever says one of these three things about its network.
ALTER TABLE "PortStation" DROP CONSTRAINT IF EXISTS "PortStation_wifiStatus_check";
ALTER TABLE "PortStation" ADD CONSTRAINT "PortStation_wifiStatus_check"
  CHECK ("wifiStatus" IS NULL OR "wifiStatus" IN ('connected', 'failed', 'setup'));

-- The network a board is being asked to use.
--
-- The life of a row:
--
--   pending    the console asked for it, the board has not taken it yet
--   delivered  the board has taken it, it has not said whether it worked
--   connected  the board is on that network
--   failed     the board tried it and could not get on
--   cancelled  the administrator took the request back, or made a newer one
--
-- The password is cleared as soon as the board has taken it, so the secret
-- does not sit in the database for longer than it has to.
CREATE TABLE IF NOT EXISTS "ReceiverNetworkCommand" (
  id            SERIAL PRIMARY KEY,
  "stationId"   TEXT NOT NULL,
  ssid          TEXT NOT NULL,
  password      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'delivered', 'connected', 'failed', 'cancelled')),
  -- What the board said when it answered. It never carries the password.
  message       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deliveredAt" TIMESTAMPTZ,
  "answeredAt"  TIMESTAMPTZ
);

-- The newest command for a board, and the open ones for it.
CREATE INDEX IF NOT EXISTS "ReceiverNetworkCommand_stationId_idx"
  ON "ReceiverNetworkCommand" ("stationId", "createdAt" DESC);

-- Only one network is being asked for at a time. A second request replaces the
-- first one that has not been answered yet.
CREATE UNIQUE INDEX IF NOT EXISTS "ReceiverNetworkCommand_one_open_idx"
  ON "ReceiverNetworkCommand" ("stationId")
  WHERE status IN ('pending', 'delivered');

-- The station role may read what the boards are and what they are on, so the
-- counter screen can say whether the receiver is alive. It may not read the
-- commands: they carry the station's Wi-Fi password.
GRANT SELECT ON "PortStation" TO freery_staff;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ReceiverNetworkCommand" TO freery_station;
GRANT USAGE, SELECT ON SEQUENCE "ReceiverNetworkCommand_id_seq" TO freery_station;
