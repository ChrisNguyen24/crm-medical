import { db } from "./client";
import { pipelineStages, users } from "./schema";
import { createLogger } from "@crm/logger";
import bcrypt from "bcryptjs";

const log = createLogger("db:seed");

async function seed() {
  log.info("Seeding database...");

  // Default pipeline stages for a medical clinic
  await db.insert(pipelineStages).values([
    { name: "Mới",            orderIndex: 0, color: "#6B7280" },
    { name: "Đang tư vấn",   orderIndex: 1, color: "#3B82F6" },
    { name: "Đã đặt lịch",   orderIndex: 2, color: "#F59E0B" },
    { name: "Đã khám",        orderIndex: 3, color: "#10B981" },
    { name: "Đã đóng",        orderIndex: 4, color: "#6B7280", isWon: true },
    { name: "Huỷ",            orderIndex: 5, color: "#EF4444", isLost: true },
  ]).onConflictDoNothing();

  // Default admin account
  const hash = await bcrypt.hash("Admin@123", 12);
  await db.insert(users).values({
    email: "admin@crm-medical.vn",
    name: "Admin",
    passwordHash: hash,
    role: "admin",
  }).onConflictDoNothing();

  log.info("Seed complete");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
