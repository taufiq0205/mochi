import { logger } from "@sentry/core"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

const { DATABASE_URL, SUPABASE_DATABASE_URL, SUPABASE_CA_CERT } = process.env

if (SUPABASE_DATABASE_URL && !SUPABASE_CA_CERT?.trim()) {
  throw new Error("SUPABASE_CA_CERT is required with SUPABASE_DATABASE_URL")
}

let connectionString = DATABASE_URL
if (SUPABASE_DATABASE_URL) {
  const url = new URL(SUPABASE_DATABASE_URL)
  // pg URL SSL parameters override the explicit TLS options below.
  for (const option of ["sslmode", "sslrootcert", "sslcert", "sslkey", "ssl"]) {
    url.searchParams.delete(option)
  }
  connectionString = url.href
}
if (!connectionString) throw new Error("DATABASE_URL is required")

export const pool = new Pool({
  connectionString,
  ssl: SUPABASE_DATABASE_URL
    ? { ca: SUPABASE_CA_CERT, rejectUnauthorized: true }
    : undefined,
  idleTimeoutMillis: process.env.NODE_ENV === "development" ? 60_000 : 5_000,
  connectionTimeoutMillis: 10_000,
})
pool.on("error", () =>
  logger.error("Unexpected idle database connection error")
)

export const db = drizzle({ client: pool })
