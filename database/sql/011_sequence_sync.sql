-- Puts every id sequence back in step with the rows that are actually there.
--
-- The seed uses fixed ids, so it moves the sequences itself. But a row added
-- by hand afterwards does not: Ferry 5 carries the id 21, because 5 was
-- already taken by a boat that was removed. The seed set the Ferry sequence to
-- 4, and every ferry added from the console since then took 5, 6, 7 and so on.
-- When the sequence reached 21 it handed out an id that Ferry 5 already had,
-- and adding a ferry from the console failed with a duplicate key error.
--
-- This file moves each sequence past the largest id in its own table, so that
-- cannot happen again. It is safe to run as many times as you like, and it
-- never moves a sequence backwards past a row that is still there.

SELECT setval(pg_get_serial_sequence('"Station"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "Station"), 1));
SELECT setval(pg_get_serial_sequence('"Ferry"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "Ferry"), 1));
SELECT setval(pg_get_serial_sequence('"User"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "User"), 1));
SELECT setval(pg_get_serial_sequence('"GpsLog"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "GpsLog"), 1));
SELECT setval(pg_get_serial_sequence('"PassengerEvent"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "PassengerEvent"), 1));
SELECT setval(pg_get_serial_sequence('"ActivityLog"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "ActivityLog"), 1));
SELECT setval(pg_get_serial_sequence('"GpsReference"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "GpsReference"), 1));
SELECT setval(pg_get_serial_sequence('"ReceiverNetworkCommand"', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM "ReceiverNetworkCommand"), 1));
