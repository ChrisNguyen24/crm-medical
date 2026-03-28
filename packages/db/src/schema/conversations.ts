import { pgTable, uuid, text, pgEnum, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { contacts } from "./contacts";
import { users } from "./users";

export const channelEnum = pgEnum("channel", ["facebook", "zalo", "tiktok", "instagram"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["open", "pending", "resolved", "spam"]);

export const conversations = pgTable("conversations", {
  id:               uuid("id").primaryKey().defaultRandom(),
  contactId:        uuid("contact_id").notNull().references(() => contacts.id),
  channel:          channelEnum("channel").notNull(),
  externalThreadId: text("external_thread_id").notNull(),
  status:           conversationStatusEnum("status").notNull().default("open"),
  assignedAgent:    uuid("assigned_agent").references(() => users.id, { onDelete: "set null" }),
  lastMessageAt:    timestamp("last_message_at", { withTimezone: true }),
  lastMessageText:  text("last_message_text"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Prevent duplicate conversations per channel thread
  uniqueThread: uniqueIndex("conversations_channel_thread_idx").on(t.channel, t.externalThreadId),
  // Fast inbox queries
  agentStatusIdx: index("conversations_agent_status_idx").on(t.assignedAgent, t.status, t.lastMessageAt),
  contactIdx: index("conversations_contact_idx").on(t.contactId),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
