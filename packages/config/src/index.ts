import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Encryption
  MASTER_KEY: z.string().min(32),

  // Facebook
  FACEBOOK_APP_ID: z.string().min(1).default(""),
  FACEBOOK_VERIFY_TOKEN: z.string().min(1).default("my_fb_verify_token"),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  FACEBOOK_PAGE_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_REDIRECT_URI: z.string().url().default("http://localhost:3003/v1/facebook/oauth/callback"),

  // Zalo
  ZALO_APP_ID: z.string().optional(),
  ZALO_APP_SECRET: z.string().optional(),
  ZALO_OA_ACCESS_TOKEN: z.string().optional(),

  // S3
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Ports
  GATEWAY_PORT: z.coerce.number().default(3000),
  CONVERSATION_SERVICE_PORT: z.coerce.number().default(3001),
  NOTIFICATION_SERVICE_PORT: z.coerce.number().default(3002),
  CRM_SERVICE_PORT: z.coerce.number().default(3003),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
