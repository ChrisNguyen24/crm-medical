import { pgTable, uuid, text, pgEnum, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { deals } from "./pipeline";
import { conversations } from "./conversations";
import { users } from "./users";

export const actorTypeEnum = pgEnum("actor_type", ["agent", "system", "bot"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "message",
  "note",
  "call",
  "deal_created",
  "deal_stage_changed",
  "contact_created",
  "contact_updated",
  "conversation_assigned",
  "conversation_resolved",
]);

export const activities = pgTable("activities", {
  id:             uuid("id").primaryKey().defaultRandom(),
  contactId:      uuid("contact_id").references(() => contacts.id),
  dealId:         uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  actorId:        uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorType:      actorTypeEnum("actor_type").notNull().default("system"),
  type:           activityTypeEnum("type").notNull(),
  summary:        text("summary").notNull(),
  metadata:       jsonb("metadata"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  contactTimeIdx: index("activities_contact_time_idx").on(t.contactId, t.createdAt),
  dealTimeIdx:    index("activities_deal_time_idx").on(t.dealId, t.createdAt),
}));

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
