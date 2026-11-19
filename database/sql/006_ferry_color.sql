-- The ferry identity colour.
--
-- A boat keeps one colour for as long as it is in the fleet, so a passenger
-- can tell the boats apart at a glance. The console hands a new boat the
-- first colour nobody is using, and the colour lives on the boat row, so it
-- never moves from one boat to another.
--
-- The list of colours is the same one in packages/shared/ferryColors.ts and
-- in apps/public-web/lib/constants.ts. The check below keeps the database
-- from accepting a colour the interface does not know.

ALTER TABLE "Ferry"
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'gray';

-- The boats that were already in the fleet are given the colours of the
-- reference screens, in the order the boats were added: orange, purple,
-- green, gray, and then blue and pink for the boats after those.
UPDATE "Ferry" f
   SET color = p.name
  FROM (
    SELECT id,
           (ARRAY['orange', 'purple', 'green', 'gray', 'blue', 'pink'])[
             1 + ((row_number() OVER (ORDER BY id) - 1) % 6)
           ]::text AS name
    FROM "Ferry"
  ) p
 WHERE f.id = p.id;

-- The check is added after the backfill, so the rows above are valid.
ALTER TABLE "Ferry"
  DROP CONSTRAINT IF EXISTS "Ferry_color_check";

ALTER TABLE "Ferry"
  ADD CONSTRAINT "Ferry_color_check"
  CHECK (color IN ('orange', 'purple', 'green', 'gray', 'blue', 'pink'));
