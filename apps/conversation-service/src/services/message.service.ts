import { db, messages, type NewMessage } from "@crm/db";
import type { MessageEvent } from "@crm/types";
import { createLogger } from "@crm/logger";

const log = createLogger("conversation-service:message");

/**
 * Persist an inbound MessageEvent as a message row.
 * Uses ON CONFLICT DO NOTHING for idempotency — safe to call twice.
 */
export async function saveInboundMessage(
  event: MessageEvent,
  conversationId: string,
  contactId: string,
): Promise<string | null> {
  const newMsg: NewMessage = {
    conversationId,
    direction: "inbound",
    channel: event.platform,
    externalMsgId: event.messageId,
    senderType: "contact",
    senderId: contactId,
    contentType: event.attachments.length > 0 ? event.attachments[0].type : "text",
    text: event.text,
    attachments: event.attachments,
    metadata: event.raw as any,
    createdAt: new Date(event.timestamp),
  };

  const [saved] = await db
    .insert(messages)
    .values(newMsg)
    .onConflictDoNothing()
    .returning({ id: messages.id });

  if (!saved) {
    log.debug({ messageId: event.messageId }, "Message already saved (dedup)");
    return null;
  }

  log.debug({ dbMessageId: saved.id, platform: event.platform }, "Message saved");
  return saved.id;
}
