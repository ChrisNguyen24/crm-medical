import type { Config } from "drizzle-kit";
import { env } from "@crm/config";

export default {
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
} satisfies Config;
