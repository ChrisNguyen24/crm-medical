import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db, channelConfigs } from "@crm/db";
import { requireManager } from "../middleware/auth";

/**
 * Manage platform channel credentials.
 * Access tokens are stored as-is during development.
 * In production: encrypt with AES-256-GCM before storing.
 */
export async function channelRoutes(app: FastifyInstance) {
  // GET /channels — list all configured channels
  app.get("/", { onRequest: [requireManager] }, async () => {
    const rows = await db
      .select({
        id:                channelConfigs.id,
        channel:           channelConfigs.channel,
        externalAccountId: channelConfigs.externalAccountId,
        label:             channelConfigs.label,
        isActive:          channelConfigs.isActive,
        tokenExpiresAt:    channelConfigs.tokenExpiresAt,
        createdAt:         channelConfigs.createdAt,
        // Never return the raw token
      })
      .from(channelConfigs);
    return { data: rows };
  });

  // POST /channels — register a new channel
  app.post<{
    Body: {
      channel:           "facebook" | "zalo" | "instagram" | "tiktok";
      externalAccountId: string;   // Facebook Page ID, Zalo OA ID, etc.
      label:             string;   // e.g. "Phòng khám Medica"
      accessToken:       string;   // Facebook Page Access Token or Zalo OA Access Token
      refreshToken?:     string;   // Zalo only
      webhookSecret?:    string;   // Facebook App Secret for HMAC
    };
  }>("/", { onRequest: [requireManager] }, async (req) => {
    const { channel, externalAccountId, label, accessToken, refreshToken, webhookSecret } = req.body;

    const [row] = await db.insert(channelConfigs).values({
      channel,
      externalAccountId,
      label,
      accessTokenEnc:  accessToken,   // TODO: encrypt in production
      refreshTokenEnc: refreshToken,
      webhookSecret,
      isActive: "true",
    }).returning({
      id: channelConfigs.id,
      channel: channelConfigs.channel,
      label: channelConfigs.label,
    });

    return row;
  });

  // PATCH /channels/:id — update token (e.g. after Zalo token refresh)
  app.patch<{
    Params: { id: string };
    Body: { accessToken?: string; refreshToken?: string; isActive?: boolean };
  }>("/:id", { onRequest: [requireManager] }, async (req, reply) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body.accessToken !== undefined)  updates.accessTokenEnc  = req.body.accessToken;
    if (req.body.refreshToken !== undefined) updates.refreshTokenEnc = req.body.refreshToken;
    if (req.body.isActive !== undefined)     updates.isActive = String(req.body.isActive);

    const [updated] = await db
      .update(channelConfigs)
      .set(updates as any)
      .where(eq(channelConfigs.id, req.params.id))
      .returning({ id: channelConfigs.id, isActive: channelConfigs.isActive });

    if (!updated) return reply.code(404).send({ error: "Not found" });
    return updated;
  });

  // DELETE /channels/:id
  app.delete<{ Params: { id: string } }>(
    "/:id", { onRequest: [requireManager] }, async (req, reply) => {
      const [deleted] = await db
        .delete(channelConfigs)
        .where(eq(channelConfigs.id, req.params.id))
        .returning({ id: channelConfigs.id });
      if (!deleted) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
