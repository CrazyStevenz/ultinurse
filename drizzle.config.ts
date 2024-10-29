import { type Config } from "drizzle-kit";

import { env } from "@/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
  },
  casing: "snake_case", // https://orm.drizzle.team/docs/sql-schema-declaration#camel-and-snake-casing
} satisfies Config;
