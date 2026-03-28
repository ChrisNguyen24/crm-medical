import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const cannedResponses = pgTable("canned_responses", {
  id:        uuid("id").primaryKey().defaultRandom(),
  shortcut:  text("shortcut").notNull().unique(),  // e.g. "/chao", "/gia"
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  channel:   text("channel").notNull().default("all"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CannedResponse = typeof cannedResponses.$inferSelect;
