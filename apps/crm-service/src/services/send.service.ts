import { createLogger } from "@crm/logger";

const log = createLogger("crm-service:send");

export interface AttachmentPayload {
  buffer:   Buffer;
  mimetype: string;
  filename: string;
}

interface SendOptions {
  platform:    "facebook" | "zalo";
  recipientId: string;
  text?:       string;
  accessToken: string;
  attachment?: AttachmentPayload;
}

export interface SendResult {
  ok:         boolean;
  messageId?: string;
  attachmentUrl?: string;
  error?:     string;
}

/**
 * Send outbound message to a platform.
 */
export async function sendToPlatform(opts: SendOptions): Promise<SendResult> {
  switch (opts.platform) {
    case "facebook": return sendFacebook(opts);
    case "zalo":     return sendZalo(opts);
    default:
      return { ok: false, error: `Unsupported platform: ${opts.platform}` };
  }
}

// ─── Facebook Messenger ───────────────────────────────────────────────────────

async function sendFacebook({ recipientId, text, accessToken, attachment }: SendOptions): Promise<SendResult> {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;

  if (attachment) {
    // Determine Facebook attachment type from mimetype
    const fbType = attachment.mimetype.startsWith("image/") ? "image"
      : attachment.mimetype.startsWith("video/") ? "video"
      : attachment.mimetype.startsWith("audio/") ? "audio"
      : "file";

    const form = new FormData();
    form.append("recipient",      JSON.stringify({ id: recipientId }));
    form.append("messaging_type", "RESPONSE");
    form.append("message",        JSON.stringify({
      attachment: { type: fbType, payload: { is_reusable: true } },
    }));
    form.append("filedata", new Blob([attachment.buffer], { type: attachment.mimetype }), attachment.filename);

    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json() as any;

    if (!res.ok) {
      log.error({ error: data.error, recipientId }, "Facebook attachment send failed");
      return { ok: false, error: data.error?.message ?? "Facebook API error" };
    }

    log.info({ messageId: data.message_id, recipientId, fbType }, "Facebook attachment sent");
    return { ok: true, messageId: data.message_id };
  }

  // Text message
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient:      { id: recipientId },
      message:        { text },
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
  if (data.error !== 0) {
    log.error({ error: data.message, code: data.error, recipientId }, "Zalo send failed");
    return { ok: false, error: data.message ?? "Zalo API error" };
  }

  log.info({ msgId: data.data?.message_id, recipientId }, "Zalo message sent");
  return { ok: true, messageId: data.data?.message_id };
}
