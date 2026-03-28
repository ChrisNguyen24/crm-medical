import { eq, sql } from "drizzle-orm";
import { db, contacts, channelConfigs, type NewContact } from "@crm/db";
import type { MessageEvent, Platform } from "@crm/types";
import { createLogger } from "@crm/logger";

interface FbProfile {
  name?: string;
  avatarUrl?: string;
  locale?: string;
  gender?: string;
}

async function fetchFacebookProfile(senderId: string): Promise<FbProfile> {
  try {
    const [channel] = await db
      .select({ token: channelConfigs.accessTokenEnc, externalAccountId: channelConfigs.externalAccountId })
      .from(channelConfigs)
      .where(eq(channelConfigs.channel, "facebook"))
      .limit(1);
    if (!channel?.token) return {};

    // Try direct PSID lookup first
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${senderId}?fields=name,profile_pic,locale,gender&access_token=${channel.token}`,
    );
    if (res.ok) {
      const data = await res.json() as { name?: string; profile_pic?: string; locale?: string; gender?: string };
      if (data.name) return { name: data.name, avatarUrl: data.profile_pic, locale: data.locale, gender: data.gender };
    }

    // Fallback: use the conversations API — works for privacy-restricted accounts
    if (!channel.externalAccountId) return {};
    const convRes = await fetch(
      `https://graph.facebook.com/v19.0/${channel.externalAccountId}/conversations?user_id=${senderId}&fields=participants&access_token=${channel.token}`,
    );
    if (!convRes.ok) return {};
    const convData = await convRes.json() as { data?: { participants?: { data?: { name: string; id: string }[] } }[] };
    const participant = convData.data?.[0]?.participants?.data?.find((p) => p.id === senderId);
    if (participant?.name) return { name: participant.name };
    return {};
  } catch {
    return {};
  }
}

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

  // Fetch real name from platform API if not provided by webhook
  let resolvedName = senderName;
  let resolvedAvatar = senderAvatar;
  let resolvedLocale: string | undefined;
  let resolvedGender: string | undefined;
  if (!resolvedName && platform === "facebook") {
    const fb = await fetchFacebookProfile(senderId);
    resolvedName = fb.name;
    resolvedAvatar = fb.avatarUrl ?? resolvedAvatar;
    resolvedLocale = fb.locale;
    resolvedGender = fb.gender;
  }

  // Create new contact
  const newContact: NewContact = {
    displayName: resolvedName ?? `${platform} user ${senderId.slice(-6)}`,
    avatarUrl: resolvedAvatar,
    locale: resolvedLocale,
    gender: resolvedGender,
    platformIds: { [platform]: senderId },
    tags: [],
  };

  const [created] = await db.insert(contacts).values(newContact).returning({ id: contacts.id });
  log.info({ contactId: created.id, platform, senderId }, "Created new contact");
  return created.id;
}
