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
 * purpose, so this runs with the **owner** account, which is the only account
 * that may.
 *
 * The connection comes from the repository's .env.local, because the database
 * is Neon and there is no server on this computer. The **direct** address is
 * used, not the pooled one, because a pooled address cannot carry a schema
 * change.
 *
 * Set DATABASE_URL_UNPOOLED in the environment to point it at a branch.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "..", "..");

/** Reads a plain KEY=value file into an object. */
function readEnvFile(path) {
  const values = {};
  if (!existsSync(path)) return values;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const split = line.indexOf("=");
    if (split === -1) continue;
    let value = line.slice(split + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[line.slice(0, split).trim()] = value;
  }
  return values;
}

const repoEnv = readEnvFile(join(repoRoot, ".env.local"));
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ??
  repoEnv.DATABASE_URL_UNPOOLED ??
  repoEnv.DATABASE_URL ??
  "";

if (!connectionString) {
  console.error(
    "No connection string was found in .env.local, so there is no database to clean.\n" +
      "The database is Neon. Put DATABASE_URL_UNPOOLED in the repository's .env.local.",
  );
  process.exit(1);
}

async function main() {
  const db = new Client({ connectionString });
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
