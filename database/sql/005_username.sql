-- Move the accounts from an email address to a username.
--
-- The admin app is private to the station network and is never shown on the
-- public website, so an email address is not needed. A username is enough to
-- sign in, and the master administrator hands the password over.
--
-- This file is safe to run on a database that is already on usernames: every
-- statement checks whether there is something to do first.

-- 1. The column.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. The old accounts keep the part of the email address in front of the @.
DO $$
DECLARE
  row RECORD;
  candidate TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'User' AND column_name = 'email'
  ) THEN
    FOR row IN SELECT id, email FROM "User" WHERE username IS NULL LOOP
      candidate := lower(split_part(row.email, '@', 1));
      -- Two accounts from the same local part would collide, so the id is
      -- added to the name until the username is free.
      WHILE EXISTS (SELECT 1 FROM "User" WHERE lower(username) = candidate) LOOP
        candidate := lower(split_part(row.email, '@', 1)) || '-' || row.id;
      END LOOP;
      UPDATE "User" SET username = candidate WHERE id = row.id;
    END LOOP;
  END IF;
END $$;

-- 3. Any account without a username is removed, it cannot sign in anyway.
DELETE FROM "User" WHERE username IS NULL;

-- 4. The researcher role is gone: only the master administrator opens the
--    admin console, and the station administrators count passengers.
DELETE FROM "User" WHERE role = 'RESEARCHER';

ALTER TABLE "User" ALTER COLUMN username SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_username_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE (username);
  END IF;
END $$;

-- 5. The role check is narrowed to the two roles that are left.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_role_check";
ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK (role IN ('ADMIN','STAFF'));

-- 6. The email address column is no longer needed.
ALTER TABLE "User" DROP COLUMN IF EXISTS email;
