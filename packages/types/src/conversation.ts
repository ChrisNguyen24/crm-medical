import type { Platform } from "./platform";

export type ConversationStatus = "open" | "pending" | "resolved" | "spam";

export type MessageDirection = "inbound" | "outbound";

export type ContentType = "text" | "image" | "video" | "file" | "sticker" | "audio";

export interface ConversationSummary {
  id: string;
  contactId: string;
  channel: Platform;
  status: ConversationStatus;
  assignedAgent?: string;
  lastMessageAt?: Date;
  lastMessageText?: string;
}
