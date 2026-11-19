/**
 * Remove the probe ferries left behind by testing.
 *
 *   node scripts/cleanup-probes.mjs
 *
 * A probe ferry is one whose name starts with "Probe". It is only removed when
 * it has never counted a passenger and never taken a GPS packet, so nothing
 * real can be lost by accident.
 *
 * The script also moves the ferry id sequence back behind the highest real
 * ferry. The application roles are not allowed to touch the sequences on
 * purpose, so this runs as the PostgreSQL superuser. The password comes from
 * PG_PASSWORD, or from .secrets/postgres-superuser.txt in the repository root.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "..", "..");

const SUPERUSER = process.env.PGUSER ?? "postgres";
const DATABASE = process.env.PGDATABASE ?? "freery";
const SUPERUSER_SECRET_FILE = join(repoRoot, ".secrets", "postgres-superuser.txt");

async function superuserPassword() {
  if (process.env.PG_PASSWORD) return process.env.PG_PASSWORD;
  if (existsSync(SUPERUSER_SECRET_FILE)) {
    return (await readFile(SUPERUSER_SECRET_FILE, "utf8")).trim();
  }
  throw new Error(
    `No superuser password found. Set PG_PASSWORD or create ${SUPERUSER_SECRET_FILE}`,
  );
}

async function main() {
  const password = await superuserPassword();
  const db = new Client({
    connectionString: `postgresql://${SUPERUSER}:${encodeURIComponent(password)}@127.0.0.1:5432/${DATABASE}`,
  });
  await db.connect();

  try {
    const deleted = await db.query(
      `DELETE FROM "Ferry" f
        WHERE f.name LIKE 'Probe%'
          AND NOT EXISTS (SELECT 1 FROM "PassengerEvent" e WHERE e."ferryId" = f.id)
          AND NOT EXISTS (SELECT 1 FROM "GpsLog" g WHERE g."ferryId" = f.id)
        RETURNING f.id, f.name`,
    );

    if (deleted.rowCount === 0) {
      console.log("No probe ferries to remove.");
    } else {
      console.log(
        `Removed ${deleted.rowCount} probe ferries:`,
        deleted.rows.map((r) => `${r.id} ${r.name}`).join(", "),
      );
    }

    // The id sequence has to stay behind the highest real ferry, or the next
    // ferry added from the console fails with a duplicate key error.
    const sequence = await db.query(
      `SELECT setval(pg_get_serial_sequence('"Ferry"', 'id'),
                      (SELECT COALESCE(MAX(id), 1) FROM "Ferry")) AS "ferrySeq"`,
    );
    console.log(`The ferry id sequence is now ${sequence.rows[0].ferrySeq}.`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
