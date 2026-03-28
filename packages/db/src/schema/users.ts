import { pgTable, uuid, text, pgEnum, timestamp } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["agent", "manager", "admin"]);

export const users = pgTable("users", {
  id:         uuid("id").primaryKey().defaultRandom(),
  email:      text("email").notNull().unique(),
  name:       text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role:       userRoleEnum("role").notNull().default("agent"),
  avatarUrl:  text("avatar_url"),
  isOnline:   text("is_online").default("false"),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
