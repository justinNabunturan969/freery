/**
 * One command database setup.
 *
 *   node scripts/setup.mjs            create or update the freery database
 *   node scripts/setup.mjs --reset    drop it first and start clean
 *
 * It needs the PostgreSQL superuser password. It reads it from
 * PG_PASSWORD, or from .secrets/postgres-superuser.txt in the repository
 * root. The three application role passwords are generated once and kept in
 * .roles.json, so every run is repeatable.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Client } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "..", "..");

const HOST = process.env.PGHOST ?? "127.0.0.1";
const PORT = Number(process.env.PGPORT ?? 5432);
const SUPERUSER = process.env.PGUSER ?? "postgres";
const DATABASE = process.env.PGDATABASE ?? "freery";
const RESET = process.argv.includes("--reset");

/**
 * The whole connection string, when the database is somewhere else.
 *
 * The head station PC uses the four PGHOST style values above. A database in
 * the cloud is reached with one connection string instead, and that string
 * also names the database, so the other values are not needed.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "";

/**
 * The pooled connection string, when there is one.
 *
 * The setup itself talks to the database directly, because a pooled address
 * cannot carry a schema change. The apps that run afterwards use the pooled
 * address, because they open connections many times.
 */
const POOLED_DATABASE_URL = process.env.POOLED_DATABASE_URL ?? "";

/**
 * The database the script opens first, to create the Freery database and to
 * set its timezone. A hosted database has no "postgres" database to open, so
 * this can be pointed at another one.
 */
const MAINTENANCE_DATABASE = process.env.PG_MAINTENANCE_DB ?? "postgres";

/**
 * TLS, for a database that is not on this computer.
 *
 * "require" and "prefer" ask for an encrypted connection without checking the
 * certificate, which is what a hosted database usually needs.
 */
const SSL_MODES = new Set(["require", "prefer", "verify-ca", "verify-full"]);
const useSsl = SSL_MODES.has(String(process.env.PGSSLMODE ?? "").toLowerCase());

const SUPERUSER_SECRET_FILE = join(repoRoot, ".secrets", "postgres-superuser.txt");
const ROLES_FILE = join(packageRoot, ".roles.json");
const ADMIN_SECRET_FILE = join(repoRoot, ".secrets", "admin-login.txt");

const ROLES = ["freery_station", "freery_staff", "freery_public"];

/**
 * The role was called freery_counter when the counter app could only count
 * passengers. The station app now does more than that, so the role was
 * renamed. A rename in PostgreSQL keeps the password and every grant that
 * was already on the role.
 */
const LEGACY_ROLE = "freery_counter";

function randomSecret(length = 48) {
  return randomBytes(length).toString("base64url").slice(0, length);
}

async function readSuperuserPassword() {
  if (process.env.PG_PASSWORD) return process.env.PG_PASSWORD.trim();
  if (existsSync(SUPERUSER_SECRET_FILE)) {
    return (await readFile(SUPERUSER_SECRET_FILE, "utf8")).trim();
  }
  throw new Error(
    `No superuser password found. Set PG_PASSWORD or create ${SUPERUSER_SECRET_FILE}`,
  );
}

async function loadRoles() {
  if (existsSync(ROLES_FILE)) {
    const roles = JSON.parse(await readFile(ROLES_FILE, "utf8"));
    let changed = false;
    if (!roles.freery_staff && roles[LEGACY_ROLE]) {
      roles.freery_staff = roles[LEGACY_ROLE];
      changed = true;
    }
    // The old key is dropped, otherwise every run creates a dead role that
    // nobody uses and that nobody remembers to clean up.
    if (roles[LEGACY_ROLE]) {
      delete roles[LEGACY_ROLE];
      changed = true;
    }
    if (changed) {
      await writeFile(ROLES_FILE, JSON.stringify(roles, null, 2), "utf8");
    }
    return roles;
  }
  const roles = {};
  for (const role of ROLES) roles[role] = randomSecret(32);
  await writeFile(ROLES_FILE, JSON.stringify(roles, null, 2), "utf8");
  return roles;
}

async function connect(database) {
  const client = DATABASE_URL
    ? new Client({
        connectionString: DATABASE_URL,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      })
    : new Client({
        host: HOST,
        port: PORT,
        user: SUPERUSER,
        password: await readSuperuserPassword(),
        database,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      });
  await client.connect();
  return client;
}

async function applySqlFile(client, file) {
  const sql = await readFile(join(packageRoot, "sql", file), "utf8");
  await client.query(sql);
  console.log(`  applied ${file}`);
}

async function main() {
  console.log("Freery database setup");
  if (DATABASE_URL) {
    const url = new URL(DATABASE_URL);
    console.log(`  using the connection string for ${url.username} at ${url.hostname}`);
  } else {
    console.log(`  host ${HOST}:${PORT} as ${SUPERUSER}`);
  }

  const roles = await loadRoles();

  // 1. Database
  const admin = await connect(MAINTENANCE_DATABASE);

  // A connection string names its own database, so there is nothing to create
  // and nothing to drop. The database is already there.
  const databaseName = DATABASE_URL
    ? new URL(DATABASE_URL).pathname.replace(/^\//, "") || DATABASE
    : DATABASE;

  if (!DATABASE_URL) {
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DATABASE],
    );

    if (RESET && exists.rowCount) {
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [DATABASE],
      );
      await admin.query(`DROP DATABASE "${DATABASE}"`);
      console.log(`  dropped database ${DATABASE}`);
    }

    if (!exists.rowCount || RESET) {
      await admin.query(`CREATE DATABASE "${DATABASE}"`);
      console.log(`  created database ${DATABASE}`);
    } else {
      console.log(`  database ${DATABASE} already exists`);
    }
  } else {
    console.log(`  using the database ${databaseName} from the connection string`);
  }

  // The database works in Philippine time, so the boarding date and the
  // time range in the admin console mean the same thing as the clock on the
  // wall at the station.
  await admin.query(`ALTER DATABASE "${databaseName}" SET timezone TO 'Asia/Manila'`);
  console.log("  set the database timezone to Asia/Manila");

  await admin.end();

  // 2. The roles come first.
  //
  // The schema files give rights to these roles, and PostgreSQL refuses a
  // grant to a role that does not exist yet. On the head station PC the roles
  // were already there from an earlier run, so the order did not matter. A
  // new database, such as one in the cloud, has none of them.
  const db = await connect(DATABASE);

  // The old counter role is renamed first, so its password and its grants
  // carry over instead of leaving a dead role behind.
  const legacy = await db.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [
    LEGACY_ROLE,
  ]);
  if (legacy.rowCount) {
    const renamed = await db.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      ["freery_staff"],
    );
    if (!renamed.rowCount) {
      await db.query(`ALTER ROLE "${LEGACY_ROLE}" RENAME TO "freery_staff"`);
      console.log(`  renamed role ${LEGACY_ROLE} to freery_staff`);
    }
  }

  for (const [role, password] of Object.entries(roles)) {
    const existing = await db.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [role],
    );
    if (existing.rowCount) {
      await db.query(`ALTER ROLE "${role}" LOGIN PASSWORD '${password}'`);
      console.log(`  reset password for ${role}`);
    } else {
      await db.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}'`);
      console.log(`  created role ${role}`);
    }
  }

  // 3. Schema, views and grants
  await applySqlFile(db, "001_schema.sql");

  // The receiver's own quality numbers, the HDOP and the satellite count.
  // It runs right after the table it adds the columns to.
  await applySqlFile(db, "008_gps_quality.sql");

  // The receiver test bench. It adds the receiver to a position and makes the
  // boat optional, so a receiver on the bench has a record of its own.
  await applySqlFile(db, "009_gps_receiver.sql");

  // The receiver's network. The board is told a new Wi-Fi name and password
  // from the console instead of from secrets.h, so the board does not have to
  // be flashed again every time the network changes.
  await applySqlFile(db, "010_receiver_network.sql");

  // The ferry identity colour. It runs before the views, because
  // public_ferry_state carries the colour, and before the seed, because the
  // seed writes the colours of the reference screens.
  await applySqlFile(db, "006_ferry_color.sql");

  // The trip status is worked out from the boat's own data. It runs before the
  // seed, because the seed lets the trigger fill the status in.
  await applySqlFile(db, "007_derived_ferry_status.sql");

  await applySqlFile(db, "002_views.sql");

  // The accounts move from an email address to a username, and the researcher
  // role goes away. This runs before the grants, because the grants name the
  // columns of the user table.
  await applySqlFile(db, "005_username.sql");

  await applySqlFile(db, "003_grants.sql");

  // 4. Seed
  await applySqlFile(db, "004_seed.sql");

  /*
   * The id sequences are put back in step with the rows that are there.
   *
   * The seed uses fixed ids and moves the sequences itself, but a row added by
   * hand afterwards does not. Ferry 5 carries the id 21, and the Ferry
   * sequence was left at 4, so every ferry added from the console took the
   * next number and eventually the sequence handed out 21 again. Adding a
   * ferry then failed with a duplicate key error.
   *
   * This runs last, so it always ends up past whatever is really in the
   * tables.
   */
  await applySqlFile(db, "011_sequence_sync.sql");

  // 4. Users, with bcrypt hashes. The admin password is generated and shown
  //    once, then stored in .secrets/admin-login.txt for this machine only.
  let adminPassword = process.env.ADMIN_PASSWORD;
  let adminPasswordIsNew = false;
  if (!adminPassword) {
    const secretPath = join(repoRoot, ".secrets", "admin-login.json");
    if (existsSync(secretPath)) {
      adminPassword = JSON.parse(await readFile(secretPath, "utf8")).password;
    } else {
      adminPassword = randomSecret(16);
      adminPasswordIsNew = true;
    }
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const staffPassword = process.env.STAFF_PASSWORD ?? "station123";
  const staffHash = await bcrypt.hash(staffPassword, 12);

  /*
   * The master administrator, and one station administrator for every station
   * on the route. The station accounts all share the example password, which
   * the master administrator changes from the accounts page.
   *
   * The name of a station account is taken from the station it works at, so
   * it reads "Guadalupe Ferry Station administrator" and not "Station 1
   * administrator". The names are read out of the Station table, which the
   * seed has just filled, so a route that is renamed later needs nothing
   * changed here.
   */
  const stationNames = new Map(
    (await db.query('SELECT id, name FROM "Station" ORDER BY id')).rows.map((row) => [
      row.id,
      row.name,
    ]),
  );

  const accounts = [
    ["admin", "Master administrator", "ADMIN", null, adminHash],
    ...Array.from({ length: 8 }, (_, i) => [
      `station${i + 1}`,
      `${stationNames.get(i + 1) ?? `Station ${i + 1}`} administrator`,
      "STAFF",
      i + 1,
      staffHash,
    ]),
  ];

  for (const [username, name, role, stationId, hash] of accounts) {
    await db.query(
      `INSERT INTO "User" (username, name, "passwordHash", role, "stationId", "isActive")
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (username) DO UPDATE
         SET name = EXCLUDED.name,
             role = EXCLUDED.role,
             "stationId" = EXCLUDED."stationId",
             "passwordHash" = EXCLUDED."passwordHash",
             "isActive" = TRUE`,
      [username, name, hash, role, stationId],
    );
  }
  console.log(`  seeded ${accounts.length} accounts`);

  // 5. A first activity log entry so the dashboard is not empty.
  await db.query(
    `INSERT INTO "ActivityLog" ("userName", action, "entityType", "entityId", details)
     SELECT 'System', 'Database seeded', 'System', NULL, jsonb_build_object('source', 'setup')
     WHERE NOT EXISTS (SELECT 1 FROM "ActivityLog" WHERE action = 'Database seeded')`,
  );

  await db.end();

  // 6. Write the environment files for the three programs.
  const authSecret = process.env.AUTH_SECRET ?? randomSecret(48);
  const deviceKey = process.env.DEVICE_API_KEY ?? randomSecret(32);
  const apiSecret = process.env.API_SECRET ?? randomSecret(32);

  await writeEnv(join(repoRoot, "apps", "admin", ".env.local"), {
    ADMIN_MODE: "admin",
    DATABASE_URL: dbUrl("freery_station", roles.freery_station),
    AUTH_SECRET: authSecret,
    DEVICE_API_KEY: deviceKey,
    ADMIN_ALLOWED_HOSTS: "127.0.0.1,localhost,::1",
  });

  await writeEnv(join(repoRoot, "apps", "admin", ".env.counter.local"), {
    ADMIN_MODE: "counter",
    DATABASE_URL: dbUrl("freery_staff", roles.freery_staff),
    AUTH_SECRET: authSecret,
    ADMIN_ALLOWED_HOSTS: "127.0.0.1,localhost,::1",
  });

  await writeEnv(join(repoRoot, "apps", "readonly-api", ".env.local"), {
    PORT: "4000",
    DATABASE_URL: dbUrl("freery_public", roles.freery_public),
    API_SECRET: apiSecret,
  });

  await writeEnv(join(repoRoot, "apps", "public-web", ".env.local"), {
    USE_MOCK: "false",
    PC_API_URL: "http://127.0.0.1:4000",
    API_SECRET: apiSecret,
    NEXT_PUBLIC_POLL_MS: "5000",
    NEXT_PUBLIC_STALE_SECONDS: "60",
    NEXT_PUBLIC_MOCK_TIME_SCALE: "4",
  });

  await mkdir(dirname(ADMIN_SECRET_FILE), { recursive: true });
  await writeFile(
    ADMIN_SECRET_FILE,
    [
      "Freery admin login (local development only)",
      "",
      "URL:      http://localhost:3001/login",
      "Username: admin",
      `Password: ${adminPassword}`,
      "",
      "Station administrator accounts for the phone app:",
      "Username: station1 to station8",
      `Password: ${staffPassword}`,
      "",
    ].join("\n"),
    "utf8",
  );

  if (adminPasswordIsNew) {
    await writeFile(
      join(repoRoot, ".secrets", "admin-login.json"),
      JSON.stringify({ username: "admin", password: adminPassword }, null, 2),
      "utf8",
    );
  }

  console.log("\nDone.");
  console.log(`  admin login: admin / ${adminPassword}`);
  console.log(`  station login: station1 to station8 / ${staffPassword}`);
  console.log(`  details:     ${ADMIN_SECRET_FILE}`);
}

function researchPassword() {
  return process.env.RESEARCH_PASSWORD ?? "research123";
}

function dbUrl(role, password) {
  const template = POOLED_DATABASE_URL || DATABASE_URL;
  if (template) {
    const url = new URL(template);
    url.username = role;
    url.password = password;
    return url.toString();
  }
  return `postgresql://${role}:${password}@${HOST}:${PORT}/${DATABASE}`;
}

async function writeEnv(path, values) {
  // The values that are already in the file are kept, so the login secret and
  // the device key survive a rerun. The device key is in the firmware of the
  // port station, so a new one would stop the hardware from being heard.
  const existing = {};
  if (existsSync(path)) {
    for (const rawLine of (await readFile(path, "utf8")).split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const split = line.indexOf("=");
      if (split === -1) continue;
      existing[line.slice(0, split).trim()] = line.slice(split + 1).trim();
    }
  }

  const merged = { ...existing, ...values };
  const body = Object.entries(merged)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${body}\n`, "utf8");
  console.log(`  wrote ${path.replace(repoRoot, ".")}`);
}

main().catch((error) => {
  console.error("\nSetup failed:", error.message);
  process.exitCode = 1;
});
