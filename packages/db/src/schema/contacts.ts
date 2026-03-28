import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const contacts = pgTable("contacts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  displayName:  text("display_name").notNull(),
  phone:        text("phone"),         // E.164 normalized, unique when set
  email:        text("email"),
  /**
   * Platform-specific user IDs: { facebook: "psid", zalo: "uid", ... }
   * Indexed with GIN for fast lookup by platform sender ID.
   */
  platformIds:  jsonb("platform_ids").notNull().default({}),
  avatarUrl:    text("avatar_url"),
  tags:         text("tags").array().notNull().default([]),
  notes:        text("notes"),
  assignedAgent: uuid("assigned_agent").references(() => users.id, { onDelete: "set null" }),
  deletedAt:    timestamp("deleted_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  platformIdsIdx: index("contacts_platform_ids_gin_idx").on(t.platformIds),
  phoneIdx: index("contacts_phone_idx").on(t.phone),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
