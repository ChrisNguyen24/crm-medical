import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyRequest } from "fastify";

/**
 * Verify HMAC-SHA256 signature for Meta (Facebook/Instagram) webhooks.
 * Meta sends: X-Hub-Signature-256: sha256=<hex>
 */
export function verifyMetaSignature(req: FastifyRequest, secret: string): boolean {
  const header = req.headers["x-hub-signature-256"] as string | undefined;
  if (!header?.startsWith("sha256=")) return false;

  const rawBody: Buffer = (req as any).rawBody;
  if (!rawBody) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Verify Zalo OA webhook signature.
 * Zalo sends mac in the POST body: HMAC-SHA256(app_id + data_string, app_secret)
 * where data_string is the JSON-stringified `data` field.
 */
export function verifyZaloSignature(
  appId: string,
  dataStr: string,
  receivedMac: string,
  appSecret: string,
): boolean {
  if (!receivedMac) return false;

  const expected = createHmac("sha256", appSecret)
    .update(appId + dataStr)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(receivedMac), Buffer.from(expected));
  } catch {
    return false;
  }
}
