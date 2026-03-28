import { eq, sql } from "drizzle-orm";
import { db, contacts, type NewContact } from "@crm/db";
import type { MessageEvent, Platform } from "@crm/types";
import { createLogger } from "@crm/logger";

const log = createLogger("conversation-service:contact");

/**
 * Upsert a contact from an inbound MessageEvent.
 * Lookup by platform sender ID first. If not found, create a new contact.
 * Returns the contact ID.
 */
export async function upsertContact(event: MessageEvent): Promise<string> {
  const { platform, senderId, senderName, senderAvatar } = event;
  const platformKey = `platform_ids->>'${platform}'` as const;

  // Look up existing contact by platform sender ID
  const existing = await db
    .select({ id: contacts.id, platformIds: contacts.platformIds })
    .from(contacts)
    .where(sql`${contacts.platformIds}->>${platform} = ${senderId}`)
    .limit(1);

  if (existing.length > 0) {
    const contact = existing[0];

    // Update display name / avatar if we have better data and they were blank
    if (senderName || senderAvatar) {
      await db
        .update(contacts)
        .set({
          displayName: senderName ?? undefined,
          avatarUrl: senderAvatar ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contact.id));
    }

    log.debug({ contactId: contact.id, platform, senderId }, "Found existing contact");
    return contact.id;
  }

  // Create new contact
  const newContact: NewContact = {
    displayName: senderName ?? `${platform} user ${senderId.slice(-6)}`,
    avatarUrl: senderAvatar,
    platformIds: { [platform]: senderId },
    tags: [],
  };

  const [created] = await db.insert(contacts).values(newContact).returning({ id: contacts.id });
  log.info({ contactId: created.id, platform, senderId }, "Created new contact");
  return created.id;
}
