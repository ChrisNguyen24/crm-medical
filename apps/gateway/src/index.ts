import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { facebookRoutes } from "./routes/webhooks/facebook";
import { zaloRoutes } from "./routes/webhooks/zalo";

const log = createLogger("gateway");

async function bootstrap() {
  const app = Fastify({ logger: false });

  // Override JSON parser to capture raw body buffer for HMAC verification.
  // Must be done before any route is registered.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      (_req as any).rawBody = body as Buffer;
      try {
        done(null, JSON.parse((body as Buffer).toString("utf8")));
      } catch (err: any) {
        done(err);
      }
    },
  );

  await app.register(helmet);
  await app.register(cors, { origin: false }); // webhook endpoints are not browser-facing
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: "1 minute",
  });

  // Health check
  app.get("/health", async () => ({ status: "ok", service: "gateway", ts: new Date().toISOString() }));

  // Webhook routes
  await app.register(facebookRoutes, { prefix: "/webhooks/facebook" });
  await app.register(zaloRoutes, { prefix: "/webhooks/zalo" });

  await app.listen({ port: env.GATEWAY_PORT, host: "0.0.0.0" });
  log.info(`Gateway listening on port ${env.GATEWAY_PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
