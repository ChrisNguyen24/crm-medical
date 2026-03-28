import { randomUUID } from "crypto";
import type { MessageEvent } from "@crm/types";
import { getRedis } from "./client";
import { createLogger } from "@crm/logger";

const log = createLogger("redis:streams");

export const STREAM_KEY = "message-events";

export const CONSUMER_GROUPS = {
  conversation: "conversation-service",
  notification: "notification-service",
  crmSync: "crm-sync-service",
} as const;

/**
 * Publish a normalized MessageEvent to the Redis Stream.
 * Returns the stream entry ID.
 */
export async function publishMessageEvent(event: MessageEvent): Promise<string> {
  const redis = getRedis();

  // Idempotency check — skip if already published
  const dedupKey = `dedup:${event.platform}:${event.messageId}`;
  const isNew = await redis.set(dedupKey, "1", "EX", 86400, "NX"); // 24h TTL
  if (!isNew) {
    log.debug({ messageId: event.messageId }, "Duplicate event, skipping");
    return "";
  }

  const entryId = await redis.xadd(
    STREAM_KEY,
    "*",
    "eventId", event.eventId,
    "platform", event.platform,
    "senderId", event.senderId,
    "senderName", event.senderName ?? "",
    "senderAvatar", event.senderAvatar ?? "",
    "threadId", event.threadId,
    "messageId", event.messageId,
    "text", event.text ?? "",
    "attachments", JSON.stringify(event.attachments),
    "timestamp", String(event.timestamp),
    "raw", JSON.stringify(event.raw ?? null),
  );

  log.debug({ entryId, platform: event.platform, messageId: event.messageId }, "Published message event");
  return entryId ?? "";
}

export interface ConsumerOptions {
  group: string;
  consumer: string;
  count?: number;
  blockMs?: number;
}

/**
 * Read pending messages from a consumer group.
 * Returns parsed MessageEvent array with their stream entry IDs.
 */
export async function readMessages(
  opts: ConsumerOptions,
): Promise<Array<{ entryId: string; event: MessageEvent }>> {
  const redis = getRedis();
  const { group, consumer, count = 10, blockMs = 5000 } = opts;

  // Ensure consumer group exists
  await redis
    .xgroup("CREATE", STREAM_KEY, group, "$", "MKSTREAM")
    .catch((err) => {
      if (!err.message.includes("BUSYGROUP")) throw err;
    });

  const results = await redis.xreadgroup(
    "GROUP", group, consumer,
    "COUNT", String(count),
    "BLOCK", String(blockMs),
    "STREAMS", STREAM_KEY, ">",
  ) as Array<[string, Array<[string, string[]]>]> | null;

  if (!results) return [];

  const entries: Array<{ entryId: string; event: MessageEvent }> = [];

  for (const [, messages] of results) {
    for (const [entryId, fields] of messages) {
      const fieldMap: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        fieldMap[fields[i]] = fields[i + 1];
      }

      const event: MessageEvent = {
        eventId: fieldMap.eventId ?? randomUUID(),
        platform: fieldMap.platform as MessageEvent["platform"],
        senderId: fieldMap.senderId,
        senderName: fieldMap.senderName || undefined,
        senderAvatar: fieldMap.senderAvatar || undefined,
        threadId: fieldMap.threadId,
        messageId: fieldMap.messageId,
        text: fieldMap.text || undefined,
        attachments: JSON.parse(fieldMap.attachments ?? "[]"),
        timestamp: Number(fieldMap.timestamp),
        raw: JSON.parse(fieldMap.raw ?? "null"),
      };

      entries.push({ entryId, event });
    }
  }

  return entries;
}

/**
 * Acknowledge processed entries so they are removed from the PEL.
 */
export async function ackMessages(group: string, ...entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) return;
  const redis = getRedis();
  await redis.xack(STREAM_KEY, group, ...entryIds);
}

/**
 * High-level consumer loop. Calls handler for each event and ACKs on success.
 */
export function createConsumer(opts: ConsumerOptions) {
  return {
    async run(handler: (event: MessageEvent) => Promise<void>): Promise<never> {
      log.info({ group: opts.group, consumer: opts.consumer }, "Consumer started");

      while (true) {
        try {
          const messages = await readMessages(opts);
          for (const { entryId, event } of messages) {
            try {
              await handler(event);
              await ackMessages(opts.group, entryId);
            } catch (err) {
              log.error({ err, entryId, messageId: event.messageId }, "Handler failed, leaving in PEL for retry");
            }
          }
        } catch (err) {
          log.error({ err }, "Consumer read error, retrying in 1s");
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    },
  };
}
