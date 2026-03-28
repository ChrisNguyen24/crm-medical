import { eq, and } from "drizzle-orm";
import { db, conversations, type NewConversation } from "@crm/db";
import type { MessageEvent } from "@crm/types";
import { createLogger } from "@crm/logger";

const log = createLogger("conversation-service:conversation");

/**
 * Find or create a conversation for an inbound event.
 * Unique per (channel, externalThreadId).
 */
export async function findOrCreateConversation(
  event: MessageEvent,
  contactId: string,
): Promise<{ id: string; isNew: boolean }> {
  const { platform, threadId } = event;

  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.channel, platform),
        eq(conversations.externalThreadId, threadId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, isNew: false };
  }

  const newConv: NewConversation = {
    contactId,
    channel: platform,
    externalThreadId: threadId,
    status: "open",
    lastMessageAt: new Date(event.timestamp),
    lastMessageText: event.text?.slice(0, 200),
  };

  const [created] = await db
    .insert(conversations)
    .values(newConv)
    .onConflictDoNothing()
    .returning({ id: conversations.id });

  // Handle race condition: if onConflictDoNothing swallowed the insert
  if (!created) {
    const race = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.channel, platform),
          eq(conversations.externalThreadId, threadId),
        ),
      )
      .limit(1);
    return { id: race[0].id, isNew: false };
  }

  log.info({ conversationId: created.id, platform, threadId }, "Created conversation");
  return { id: created.id, isNew: true };
}

/**
 * Update conversation last_message metadata after a new message arrives.
 */
export async function touchConversation(
  conversationId: string,
  text: string | undefined,
  timestamp: number,
): Promise<void> {
  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(timestamp),
      lastMessageText: text?.slice(0, 200),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}
