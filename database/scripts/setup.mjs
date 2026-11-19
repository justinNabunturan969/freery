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
  const client = new Client({
    host: HOST,
    port: PORT,
    user: SUPERUSER,
    password: await readSuperuserPassword(),
    database,
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
  console.log(`  host ${HOST}:${PORT} as ${SUPERUSER}`);

  const roles = await loadRoles();

  // 1. Database
  const admin = await connect("postgres");
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
  // The database works in Philippine time, so the boarding date and the
  // time range in the admin console mean the same thing as the clock on the
  // wall at the station.
  await admin.query(`ALTER DATABASE "${DATABASE}" SET timezone TO 'Asia/Manila'`);
  console.log("  set the database timezone to Asia/Manila");

  await admin.end();

  // 2. Schema, views, roles
  const db = await connect(DATABASE);
  await applySqlFile(db, "001_schema.sql");

  // The receiver's own quality numbers, the HDOP and the satellite count.
  // It runs right after the table it adds the columns to.
  await applySqlFile(db, "008_gps_quality.sql");

  // The receiver test bench. It adds the receiver to a position and makes the
  // boat optional, so a receiver on the bench has a record of its own.
  await applySqlFile(db, "009_gps_receiver.sql");

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

  // Roles are created and given their passwords here, not inside a SQL DO
  // block. PostgreSQL does not apply a password change made inside a DO
  // block, which leaves the role with a password nobody knows.
  //
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

  await applySqlFile(db, "003_grants.sql");

  // 3. Seed
  await applySqlFile(db, "004_seed.sql");

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

  // The master administrator, and one station administrator for every station
  // on the route. The station accounts all share the example password, which
  // the master administrator changes from the accounts page.
  const accounts = [
    ["admin", "Master administrator", "ADMIN", null, adminHash],
    ...Array.from({ length: 8 }, (_, i) => [
      `station${i + 1}`,
      `Station ${i + 1} administrator`,
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
  return `postgresql://${role}:${password}@${HOST}:${PORT}/${DATABASE}`;
}

async function writeEnv(path, values) {
  const body = Object.entries(values)
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
