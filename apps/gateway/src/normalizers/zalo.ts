import { randomUUID } from "crypto";
import type { MessageEvent, Attachment } from "@crm/types";

interface ZaloAttachment {
  type: "image" | "video" | "audio" | "file" | "gif" | "sticker";
  payload: {
    url?: string;
    thumbnail?: string;
    name?: string;
    size?: number;
    checksum?: string;
    token?: string;
  };
}

interface ZaloMessage {
  msg_id: string;
  text?: string;
  attachments?: ZaloAttachment[];
}

interface ZaloSender {
  id: string;
  display_name?: string;
  avatar?: string;
}

interface ZaloRecipient { id: string }

export interface ZaloWebhookPayload {
  app_id: string;
  mac: string;
  event_name: string;
  timestamp: string;
  sender: ZaloSender;
  recipient: ZaloRecipient;
  message: ZaloMessage;
}

function mapZaloAttachment(z: ZaloAttachment): Attachment | null {
  const typeMap: Record<string, Attachment["type"]> = {
    image: "image",
    gif:   "image",
    video: "video",
    audio: "audio",
    file:  "file",
    sticker: "sticker",
  };

  const type = typeMap[z.type];
  if (!type) return null;

  return {
    type,
    url: z.payload.url ?? z.payload.thumbnail ?? "",
    name: z.payload.name,
    size: z.payload.size,
  };
}

/**
 * Normalize a Zalo OA webhook payload into a MessageEvent.
 * Zalo sends one message per webhook call (no batching).
 */
export function normalizeZalo(payload: ZaloWebhookPayload): MessageEvent | null {
  // Only handle inbound user messages
  if (!["user_send_text", "user_send_image", "user_send_file", "user_send_audio", "user_send_video", "user_send_sticker"].includes(payload.event_name)) {
    return null;
  }

  if (!payload.message?.msg_id) return null;

  const attachments: Attachment[] = (payload.message.attachments ?? [])
    .map(mapZaloAttachment)
    .filter((a): a is Attachment => a !== null);

  return {
    eventId: randomUUID(),
    platform: "zalo",
    senderId: payload.sender.id,
    senderName: payload.sender.display_name,
    senderAvatar: payload.sender.avatar,
    threadId: payload.sender.id, // Zalo OA: thread = sender user ID
    messageId: payload.message.msg_id,
    text: payload.message.text,
    attachments,
    timestamp: Number(payload.timestamp),
    raw: payload,
  };
}
