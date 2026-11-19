import "server-only";

/**
 * Server only configuration.
 *
 * The values here must never reach the browser. Importing this file from a
 * client component fails at build time, which is the point.
 */

/**
 * Mock mode is on unless it is explicitly turned off.
 *
 * When it is on, the app's own routes return generated data instead of
 * calling the read-only API on the station PC.
 */
export const USE_MOCK = process.env.USE_MOCK !== "false";

/**
 * The address of the read-only API, reached through the Cloudflare Tunnel.
 * Server side only, never prefixed with NEXT_PUBLIC_.
 */
export const PC_API_URL = process.env.PC_API_URL ?? "";

/**
 * The value of the x-api-secret header. Server side only.
 */
export const API_SECRET = process.env.API_SECRET ?? "";
