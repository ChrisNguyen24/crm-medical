import type { MessageEvent } from "@crm/types";
import { getRedis } from "@crm/redis";
import { createLogger } from "@crm/logger";
import { upsertContact } from "../services/contact.service";
import { findOrCreateConversation, touchConversation } from "../services/conversation.service";
import { saveInboundMessage } from "../services/message.service";
import { autoAssign } from "../services/assign.service";

const log = createLogger("conversation-service:handler");

/**
 * Main handler for every inbound MessageEvent from the Redis Stream.
 * Orchestrates: contact upsert → conversation find/create → save message
 *               → auto-assign → push notification event.
 */
export async function handleInboundMessage(event: MessageEvent): Promise<void> {
  log.info({ platform: event.platform, senderId: event.senderId, messageId: event.messageId }, "Handling inbound message");

  // 1. Upsert contact
  const contactId = await upsertContact(event);

  // 2. Find or create conversation
  const { id: conversationId, isNew } = await findOrCreateConversation(event, contactId);

  // 3. Save message (idempotent)
  const dbMessageId = await saveInboundMessage(event, conversationId, contactId);
  if (!dbMessageId) return; // Already processed

  // 4. Touch conversation timestamp
  await touchConversation(conversationId, event.text, event.timestamp);

  // 5. Auto-assign on new conversation
  let assignedAgent: string | null = null;
  if (isNew) {
    assignedAgent = await autoAssign(conversationId);
  }

  // 6. Publish notification event for WebSocket push (notification-service consumes this)
  const redis = getRedis();
  await redis.publish("notifications", JSON.stringify({
    type: "new_message",
    conversationId,
    contactId,
    dbMessageId,
    assignedAgent,
    platform: event.platform,
    text: event.text,
    attachments: event.attachments,
    timestamp: event.timestamp,
    isNewConversation: isNew,
  }));

  log.info({
    conversationId,
    contactId,
    dbMessageId,
    assignedAgent,
    isNew,
  }, "Inbound message processed");
}
