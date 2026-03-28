import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fjwt from "@fastify/jwt";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";
import { authRoutes }         from "./routes/auth";
import { conversationRoutes } from "./routes/conversations";
import { contactRoutes }      from "./routes/contacts";
import { pipelineRoutes }     from "./routes/pipeline";
import { reportRoutes }       from "./routes/reports";
import { userRoutes }         from "./routes/users";
import { cannedRoutes }       from "./routes/canned";
import { channelRoutes }      from "./routes/channels";
import { facebookOAuthRoutes } from "./routes/facebook-oauth";

const log = createLogger("crm-service");

async function bootstrap() {
  const app = Fastify({ logger: false });

  await app.register(helmet);
  await app.register(cors, {
    origin:      process.env.WEB_URL ?? "http://localhost:3004",
    credentials: true,
  });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(fjwt, { secret: env.JWT_SECRET });

  app.get("/health", async () => ({ status: "ok", service: "crm-service" }));

  await app.register(authRoutes,         { prefix: "/v1/auth" });
  await app.register(conversationRoutes, { prefix: "/v1/conversations" });
  await app.register(contactRoutes,      { prefix: "/v1/contacts" });
  await app.register(pipelineRoutes,     { prefix: "/v1" });
  await app.register(reportRoutes,       { prefix: "/v1/reports" });
  await app.register(userRoutes,         { prefix: "/v1/users" });
  await app.register(cannedRoutes,       { prefix: "/v1/canned-responses" });
  await app.register(channelRoutes,      { prefix: "/v1/channels" });
  await app.register(facebookOAuthRoutes, { prefix: "/v1/facebook/oauth" });

  await app.listen({ port: env.CRM_SERVICE_PORT, host: "0.0.0.0" });
  log.info(`CRM service listening on port ${env.CRM_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
