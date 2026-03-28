import type { FastifyInstance } from "fastify";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { publishMessageEvent } from "@crm/redis";
import { verifyZaloSignature } from "../../middleware/verify-signature";
import { normalizeZalo, type ZaloWebhookPayload } from "../../normalizers/zalo";

const log = createLogger("gateway:zalo");

export async function zaloRoutes(app: FastifyInstance) {
  /**
   * POST /webhooks/zalo
   * Receive incoming events from Zalo OA.
   *
   * Zalo sends a MAC in the body (not a header):
   *   mac = HMAC-SHA256(app_id + JSON.stringify(data), app_secret)
   *
   * Note: Zalo does NOT have a GET challenge handshake.
   * Register the URL directly in the Zalo OA developer portal.
   */
  app.post("/", async (req, reply) => {
    const body = req.body as ZaloWebhookPayload;

    // 1. Verify Zalo MAC signature
    const appId     = env.ZALO_APP_ID ?? "";
    const appSecret = env.ZALO_APP_SECRET ?? "";

    if (appId && appSecret) {
      // Zalo MAC = HMAC(app_id + raw_data_string, app_secret)
      // The raw data string is the JSON-stringified `message` field
      const dataStr = JSON.stringify(body.message ?? {});
      const isValid = verifyZaloSignature(appId, dataStr, body.mac, appSecret);

      if (!isValid) {
        log.warn({ ip: req.ip }, "Invalid Zalo signature");
        return reply.code(401).send({ error: "Invalid signature" });
      }
    } else {
      log.warn("ZALO_APP_ID / ZALO_APP_SECRET not set — skipping signature verification");
    }

    // 2. Respond 200 fast
    reply.code(200).send({ error: 0 });

    // 3. Normalize and publish
    const event = normalizeZalo(body);
    if (!event) {
      log.debug({ event_name: body.event_name }, "Zalo event ignored (not a message type)");
      return;
    }

    try {
      const entryId = await publishMessageEvent(event);
      if (entryId) {
        log.info({ platform: "zalo", messageId: event.messageId, entryId }, "Published");
      }
    } catch (err) {
      log.error({ err, messageId: event.messageId }, "Failed to publish Zalo event");
    }
  });
}
