import { pgTable, uuid, text, pgEnum, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { channelEnum } from "./conversations";

export const directionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const senderTypeEnum = pgEnum("message_sender_type", ["contact", "agent", "bot"]);
export const contentTypeEnum = pgEnum("content_type", ["text", "image", "video", "file", "sticker", "audio"]);

export const messages = pgTable("messages", {
  id:             uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  direction:      directionEnum("direction").notNull(),
  channel:        channelEnum("channel").notNull(),
  externalMsgId:  text("external_msg_id").notNull(),
  senderType:     senderTypeEnum("sender_type").notNull(),
  senderId:       uuid("sender_id"),  // FK to contacts or users depending on senderType
  contentType:    contentTypeEnum("content_type").notNull().default("text"),
  text:           text("text"),
  attachments:    jsonb("attachments").notNull().default([]),
  metadata:       jsonb("metadata"),  // raw platform payload for audit
  readAt:         timestamp("read_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull(),   // platform timestamp
  receivedAt:     timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // Dedup: one row per platform message
  uniqueMsg: uniqueIndex("messages_channel_external_idx").on(t.channel, t.externalMsgId),
  convTimeIdx: index("messages_conv_time_idx").on(t.conversationId, t.createdAt),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
