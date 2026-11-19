/**
 * Freery read-only API.
 *
 * Runs on the head station PC, listens on 127.0.0.1 only, and serves the
 * public data to the public website through the Cloudflare Tunnel. It is GET
 * only: there is no write route here, and the database account it uses
 * (freery_public) can only read.
 *
 * Every request must carry the x-api-secret header. The secret stays on the
 * server, it is never sent to a browser.
 */

import { timingSafeEqual } from "node:crypto";
import express from "express";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT ?? 4000);
const API_SECRET = process.env.API_SECRET ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const BIND = process.env.BIND ?? "127.0.0.1";

if (!API_SECRET) {
  console.error("API_SECRET is not set. Refusing to start.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Refusing to start.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

const app = express();
app.disable("x-powered-by");

/** Constant time comparison so the secret cannot be guessed by timing. */
function secretMatches(candidate) {
  const expected = Buffer.from(API_SECRET);
  const given = Buffer.from(candidate ?? "");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** Simple per process rate limit, enough for a tunnel in front of it. */
const hits = new Map();
function rateLimit(windowMs = 60_000, max = 120) {
  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    return next();
  };
}

/** Every route needs the secret. */
app.use((req, res, next) => {
  const key = req.header("x-api-secret");
  if (!secretMatches(key)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.use(rateLimit());

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT now() AS now");
    res.json({
      ok: true,
      service: "freery-readonly-api",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: "Database unreachable" });
  }
});

app.get("/ferries", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, status, lat, lon, speed,
              "seatsAvailable", capacity, "receivedAt", color
       FROM public_ferry_state
       ORDER BY id`,
    );
    res.json({ servedAt: new Date().toISOString(), ferries: result.rows });
  } catch (error) {
    console.error("GET /ferries failed:", error.message);
    res.status(503).json({ error: "Database unreachable" });
  }
});

app.get("/stations", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, lat, lon, "order", "isOpen", notice
       FROM "Station"
       ORDER BY "order"`,
    );
    res.json({ stations: result.rows });
  } catch (error) {
    console.error("GET /stations failed:", error.message);
    res.status(503).json({ error: "Database unreachable" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(PORT, BIND, () => {
  console.log(`Freery read-only API listening on http://${BIND}:${PORT}`);
  console.log("Routes: GET /health, GET /ferries, GET /stations");
});

function shutdown(signal) {
  console.log(`\n${signal} received, closing.`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
