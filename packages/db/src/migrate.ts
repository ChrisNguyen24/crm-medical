import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";

const log = createLogger("db:migrate");

async function runMigrations() {
  log.info("Running migrations...");
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./src/migrations" });

  log.info("Migrations complete");
  await client.end();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
