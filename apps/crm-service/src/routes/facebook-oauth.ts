import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db, channelConfigs } from "@crm/db";
import { getRedis } from "@crm/redis";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { requireAuth, type JwtPayload } from "../middleware/auth";

const log = createLogger("crm-service:facebook-oauth");
const FB_API = "https://graph.facebook.com/v19.0";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3004";

const SCOPES = [
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
].join(",");

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
}

interface FbPageSession {
  userId: string;
  pages: FbPage[];
}

export async function facebookOAuthRoutes(app: FastifyInstance) {
  const redis = getRedis();

  /**
   * GET /v1/facebook/oauth/url
   * Returns the Facebook OAuth dialog URL for the logged-in user.
   */
  app.get("/url", { onRequest: [requireAuth] }, async (req) => {
    const user = req.user as JwtPayload;

    // Store nonce → userId for CSRF verification (10 min TTL)
    const nonce = crypto.randomBytes(16).toString("hex");
    await redis.set(`fb_oauth:${nonce}`, user.sub, "EX", 600);

    const params = new URLSearchParams({
      client_id:     env.FACEBOOK_APP_ID,
      redirect_uri:  env.FACEBOOK_REDIRECT_URI,
      scope:         SCOPES,
      state:         nonce,
      response_type: "code",
    });

    return { url: `https://www.facebook.com/v19.0/dialog/oauth?${params}` };
  });

  /**
   * GET /v1/facebook/oauth/callback
   * Facebook redirects here after the user grants permissions.
   * No JWT auth — user identity is recovered from the state nonce stored in Redis.
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>("/callback", async (req, reply) => {
    const { code, state, error } = req.query;

    if (error || !code || !state) {
      log.warn({ error }, "Facebook OAuth denied or missing params");
      return reply.redirect(`${WEB_URL}/settings/channels?error=access_denied`);
    }

    // Verify CSRF state
    const userId = await redis.get(`fb_oauth:${state}`);
    if (!userId) {
      return reply.redirect(`${WEB_URL}/settings/channels?error=invalid_state`);
    }
    await redis.del(`fb_oauth:${state}`);

    // Exchange code → short-lived user token
    const tokenRes = await fetch(
      `${FB_API}/oauth/access_token?` +
        new URLSearchParams({
          client_id:     env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET ?? "",
          redirect_uri:  env.FACEBOOK_REDIRECT_URI,
          code,
        }),
    );
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      log.error({ status: tokenRes.status, body }, "Token exchange failed");
      return reply.redirect(`${WEB_URL}/settings/channels?error=token_exchange`);
    }
    const { access_token: shortToken } = (await tokenRes.json()) as { access_token: string };

    // Exchange short-lived → long-lived user token (60 days)
    const longRes = await fetch(
      `${FB_API}/oauth/access_token?` +
        new URLSearchParams({
          grant_type:       "fb_exchange_token",
          client_id:        env.FACEBOOK_APP_ID,
          client_secret:    env.FACEBOOK_APP_SECRET ?? "",
          fb_exchange_token: shortToken,
        }),
    );
    if (!longRes.ok) {
      const body = await longRes.text();
      log.error({ status: longRes.status, body }, "Long token exchange failed");
      return reply.redirect(`${WEB_URL}/settings/channels?error=token_exchange`);
    }
    const { access_token: longToken } = (await longRes.json()) as { access_token: string };

    // Fetch the pages this user manages (each page has its own permanent page token)
    const pagesRes = await fetch(
      `${FB_API}/me/accounts?fields=id,name,access_token,category&access_token=${longToken}`,
    );
    if (!pagesRes.ok) {
      log.error({ status: pagesRes.status }, "Failed to fetch managed pages");
      return reply.redirect(`${WEB_URL}/settings/channels?error=pages_fetch`);
    }
    const { data: pages } = (await pagesRes.json()) as { data: FbPage[] };

    if (!pages || pages.length === 0) {
      return reply.redirect(`${WEB_URL}/settings/channels?error=no_pages`);
    }

    // Store pages list in Redis session (10 min) so the frontend can pick
    const sessionKey = crypto.randomBytes(16).toString("hex");
    await redis.set(
      `fb_pages:${sessionKey}`,
      JSON.stringify({ userId, pages } satisfies FbPageSession),
      "EX",
      600,
    );

    log.info({ userId, pageCount: pages.length }, "Facebook OAuth complete, awaiting page selection");
    return reply.redirect(`${WEB_URL}/settings/channels/facebook/select?session=${sessionKey}`);
  });

  /**
   * GET /v1/facebook/oauth/pages?session=...
   * Returns the list of pages stored in the Redis session.
   */
  app.get<{ Querystring: { session: string } }>(
    "/pages",
    { onRequest: [requireAuth] },
    async (req, reply) => {
      const raw = await redis.get(`fb_pages:${req.query.session}`);
      if (!raw) return reply.code(404).send({ error: "Session expired or not found" });

      const { pages } = JSON.parse(raw) as FbPageSession;
      return {
        data: pages.map(({ id, name, category }) => ({ id, name, category })),
      };
    },
  );

  /**
   * POST /v1/facebook/oauth/connect
   * Saves the selected page into channel_configs and subscribes it to webhooks.
   */
  app.post<{
    Body: { session: string; pageId: string; label?: string };
  }>("/connect", { onRequest: [requireAuth] }, async (req, reply) => {
    const { session, pageId, label } = req.body;

    const raw = await redis.get(`fb_pages:${session}`);
    if (!raw) return reply.code(400).send({ error: "Session expired" });

    const { pages } = JSON.parse(raw) as FbPageSession;
    const page = pages.find((p) => p.id === pageId);
    if (!page) return reply.code(400).send({ error: "Page not in session" });

    // Subscribe the page to the app's webhook
    try {
      await subscribePageWebhook(page.id, page.access_token);
    } catch (err) {
      log.error({ err, pageId }, "Webhook subscription failed");
      return reply.code(502).send({ error: "Failed to subscribe page to webhook" });
    }

    // Upsert into channel_configs (update token if page already connected)
    const [existing] = await db
      .select({ id: channelConfigs.id })
      .from(channelConfigs)
      .where(
        and(
          eq(channelConfigs.channel, "facebook"),
          eq(channelConfigs.externalAccountId, page.id),
        ),
      )
      .limit(1);

    let row: { id: string; label: string };

    if (existing) {
      const [updated] = await db
        .update(channelConfigs)
        .set({
          label:          label || page.name,
          accessTokenEnc: page.access_token,
          isActive:       "true",
          updatedAt:      new Date(),
        })
        .where(eq(channelConfigs.id, existing.id))
        .returning({ id: channelConfigs.id, label: channelConfigs.label });
      row = updated;
    } else {
      const [inserted] = await db
        .insert(channelConfigs)
        .values({
          channel:           "facebook",
          externalAccountId: page.id,
          label:             label || page.name,
          accessTokenEnc:    page.access_token,
          webhookSecret:     env.FACEBOOK_APP_SECRET,
          isActive:          "true",
        })
        .returning({ id: channelConfigs.id, label: channelConfigs.label });
      row = inserted;
    }

    await redis.del(`fb_pages:${session}`);
    log.info({ pageId, channelId: row.id }, "Facebook page connected");
    return row;
  });
}

async function subscribePageWebhook(pageId: string, pageAccessToken: string) {
  const res = await fetch(`${FB_API}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      subscribed_fields: "messages,messaging_postbacks,messaging_optins,message_reads",
      access_token:      pageAccessToken,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FB webhook subscription error: ${body}`);
  }
}
