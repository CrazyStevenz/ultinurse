import * as path from "node:path";
import postgres from "postgres";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { env } from "@/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
};

const client =
  globalForDb.client ??
  postgres(env.DATABASE_URL, {
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
  });
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle({
  client,
  schema,
  casing: "snake_case", // https://orm.drizzle.team/docs/sql-schema-declaration#camel-and-snake-casing
});

if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "/src/server/db/migrations"),
  });
}
