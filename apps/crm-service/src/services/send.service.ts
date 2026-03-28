import { createLogger } from "@crm/logger";
import { getRedis } from "@crm/redis";

const log = createLogger("crm-service:send");

interface SendOptions {
  platform:    "facebook" | "zalo";
  recipientId: string;   // PSID (Facebook) hoặc user_id (Zalo)
  text:        string;
  accessToken: string;
}

interface SendResult {
  ok:        boolean;
  messageId?: string;
  error?:    string;
}

/**
 * Send outbound message to a platform.
 * Called after saving the outbound message row to DB.
 */
export async function sendToPlatform(opts: SendOptions): Promise<SendResult> {
  switch (opts.platform) {
    case "facebook":  return sendFacebook(opts);
    case "zalo":      return sendZalo(opts);
    default:
      return { ok: false, error: `Unsupported platform: ${opts.platform}` };
  }
}

// ─── Facebook Messenger ───────────────────────────────────────────────────────

async function sendFacebook({ recipientId, text, accessToken }: SendOptions): Promise<SendResult> {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message:   { text },
      messaging_type: "RESPONSE",
    }),
  });

  const data = await res.json() as any;

  if (!res.ok) {
    log.error({ error: data.error, recipientId }, "Facebook send failed");
    return { ok: false, error: data.error?.message ?? "Facebook API error" };
  }

  log.info({ messageId: data.message_id, recipientId }, "Facebook message sent");
  return { ok: true, messageId: data.message_id };
}

// ─── Zalo OA ─────────────────────────────────────────────────────────────────

async function sendZalo({ recipientId, text, accessToken }: SendOptions): Promise<SendResult> {
  const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": accessToken,
    },
    body: JSON.stringify({
      recipient: { user_id: recipientId },
      message:   { text },
    }),
  });

  const data = await res.json() as any;

  // Zalo returns error: 0 on success
  if (data.error !== 0) {
    log.error({ error: data.message, code: data.error, recipientId }, "Zalo send failed");
    return { ok: false, error: data.message ?? "Zalo API error" };
  }

  log.info({ msgId: data.data?.message_id, recipientId }, "Zalo message sent");
  return { ok: true, messageId: data.data?.message_id };
}
