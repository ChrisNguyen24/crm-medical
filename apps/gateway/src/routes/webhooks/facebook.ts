import type { FastifyInstance } from "fastify";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { publishMessageEvent } from "@crm/redis";
import { verifyMetaSignature } from "../../middleware/verify-signature";
import { normalizeFacebook } from "../../normalizers/facebook";

const log = createLogger("gateway:facebook");

export async function facebookRoutes(app: FastifyInstance) {
  /**
   * GET /webhooks/facebook
   * Meta webhook verification handshake.
   * Called once when you register the webhook URL in the Meta App dashboard.
   */
  app.get("/", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          "hub.mode":         { type: "string" },
          "hub.verify_token": { type: "string" },
          "hub.challenge":    { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const query = req.query as Record<string, string>;
    const mode    = query["hub.mode"];
    const token   = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && token === env.FACEBOOK_VERIFY_TOKEN) {
      log.info("Facebook webhook verified");
      return reply.code(200).send(challenge);
    }

    log.warn({ mode, token }, "Facebook webhook verification failed");
    return reply.code(403).send({ error: "Forbidden" });
  });

  /**
   * POST /webhooks/facebook
   * Receive incoming events from Meta (messages, reactions, reads, etc.)
   */
  app.post("/", async (req, reply) => {
    // 1. Verify HMAC-SHA256 signature first — before touching payload
    if (!verifyMetaSignature(req, env.FACEBOOK_APP_SECRET)) {
      log.warn({ ip: req.ip }, "Invalid Facebook signature");
      return reply.code(401).send({ error: "Invalid signature" });
    }

    // 2. Respond 200 immediately — Meta expects a fast response
    reply.code(200).send({ status: "ok" });

    // 3. Process asynchronously
    const payload = req.body as any;

    if (payload?.object !== "page") {
      log.debug({ object: payload?.object }, "Ignoring non-page webhook object");
      return;
    }

    const events = normalizeFacebook(payload);

    for (const event of events) {
      try {
        const entryId = await publishMessageEvent(event);
        if (entryId) {
          log.info({ platform: "facebook", messageId: event.messageId, entryId }, "Published");
        }
      } catch (err) {
        log.error({ err, messageId: event.messageId }, "Failed to publish Facebook event");
      }
    }
  });
}
