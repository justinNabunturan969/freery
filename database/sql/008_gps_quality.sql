-- The receiver's own quality numbers.
--
-- The position on its own says where the boat was. These two say how much the
-- receiver trusted that position: the horizontal dilution of precision (HDOP)
-- and the number of satellites it was using.
--
-- They are worth keeping because the field test has to report the accuracy of
-- the GPS, not only the accuracy of the receiver's own opinion about it. A
-- point with an HDOP of 1.2 and nine satellites is a point the receiver is
-- sure about. A point with an HDOP of 4.8 and three satellites is a point that
-- has to be shown with its doubt attached.
--
-- They are null when the packet did not carry them. The first version of the
-- radio packet had only five fields, and the port station still accepts those,
-- so every older row has nothing here and says so.

ALTER TABLE "GpsLog" ADD COLUMN IF NOT EXISTS hdop DOUBLE PRECISION;
ALTER TABLE "GpsLog" ADD COLUMN IF NOT EXISTS sats INTEGER;

-- A HDOP that is not a number, or a satellite count that is not a count, is a
-- mistake in the sketch rather than a reading. The database refuses it.
ALTER TABLE "GpsLog"
  DROP CONSTRAINT IF EXISTS "GpsLog_hdop_check";
ALTER TABLE "GpsLog"
  ADD CONSTRAINT "GpsLog_hdop_check"
  CHECK (hdop IS NULL OR (hdop >= 0 AND hdop <= 50));

ALTER TABLE "GpsLog"
  DROP CONSTRAINT IF EXISTS "GpsLog_sats_check";
ALTER TABLE "GpsLog"
  ADD CONSTRAINT "GpsLog_sats_check"
  CHECK (sats IS NULL OR (sats >= 0 AND sats <= 64));
