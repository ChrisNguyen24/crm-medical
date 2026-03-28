import { randomUUID } from "crypto";
import type { MessageEvent, Attachment } from "@crm/types";

interface FbAttachment {
  type: string;
  payload?: { url?: string };
  sticker_id?: number;
}

interface FbMessage {
  mid: string;
  text?: string;
  attachments?: FbAttachment[];
  sticker_id?: number;
}

interface FbSender { id: string }
interface FbRecipient { id: string }

interface FbMessagingEntry {
  sender: FbSender;
  recipient: FbRecipient;
  timestamp: number;
  message?: FbMessage;
  postback?: { payload: string; title: string };
}

interface FbEntry {
  id: string;
  time: number;
  messaging?: FbMessagingEntry[];
}

interface FbWebhookPayload {
  object: string;
  entry: FbEntry[];
}

function mapAttachment(fb: FbAttachment): Attachment | null {
  const typeMap: Record<string, Attachment["type"]> = {
    image: "image",
    video: "video",
    audio: "audio",
    file: "file",
  };

  if (fb.type === "template") return null; // skip templates
  if (fb.sticker_id || fb.type === "sticker") {
    return { type: "sticker", url: fb.payload?.url ?? "" };
  }

  const type = typeMap[fb.type];
  if (!type) return null;

  return { type, url: fb.payload?.url ?? "" };
}

/**
 * Normalize a Facebook Messenger webhook payload into MessageEvent[].
 * One Facebook webhook call can contain multiple entries and multiple messages each.
 */
export function normalizeFacebook(payload: FbWebhookPayload): MessageEvent[] {
  const events: MessageEvent[] = [];

  for (const entry of payload.entry ?? []) {
    for (const msg of entry.messaging ?? []) {
      if (!msg.message) continue; // skip postbacks, reads, etc.

      const attachments: Attachment[] = (msg.message.attachments ?? [])
        .map(mapAttachment)
        .filter((a): a is Attachment => a !== null);

      events.push({
        eventId: randomUUID(),
        platform: "facebook",
        senderId: msg.sender.id,
        threadId: msg.sender.id, // In Messenger, thread = sender PSID (1:1)
        messageId: msg.message.mid,
        text: msg.message.text,
        attachments,
        timestamp: msg.timestamp,
        raw: msg,
      });
    }
  }

  return events;
}
