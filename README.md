# CRM Medical — Omnichannel CRM for Clinics

Multi-channel messaging + custom CRM for medical clinics. Handles inbound messages from Facebook Messenger, Zalo OA, TikTok, and Instagram in a unified agent inbox.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Inbound Channels                   │
│  Facebook Messenger · Zalo OA · TikTok · IG DM  │
└────────────────────┬─────────────────────────────┘
                     │ webhooks
                     ▼
┌──────────────────────────────────────────────────┐
│              Gateway Service  :3000              │
│  • Signature verify (HMAC-SHA256)                │
│  • Normalize → common MessageEvent               │
│  • Publish to Redis Stream                       │
└────────────────────┬─────────────────────────────┘
                     │ Redis Stream
          ┌──────────┼──────────────┐
          ▼          ▼              ▼
┌──────────────┐ ┌───────────┐ ┌──────────────────┐
│ Conversation │ │    CRM    │ │   Notification   │
│ Service :3001│ │ Svc :3003 │ │   Service :3002  │
│              │ │           │ │                  │
│ • Upsert     │ │ • OAuth   │ │ • WebSocket push │
│   contact    │ │   flows   │ │   to agents      │
│ • Find/create│ │ • Channel │ │                  │
│   convo      │ │   mgmt    │ │                  │
│ • Auto-assign│ │ • Send    │ │                  │
│ • Save msgs  │ │   msgs    │ │                  │
└──────┬───────┘ └─────┬─────┘ └──────────────────┘
       │               │
       └───────┬────────┘
               ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL + Redis                  │
│  contacts · conversations · messages             │
│  channel_configs · deals · pipeline_stages       │
└──────────────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────┐
│               Web App  :3004  (Next.js)          │
│  Unified Inbox · CRM Panel · Manager Dashboard  │
└──────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Port | Role |
|---|---|---|
| `apps/gateway` | 3000 | Receives all platform webhooks; verifies signatures; normalizes to `MessageEvent`; publishes to Redis Stream |
| `apps/conversation-service` | 3001 | Consumes stream; upserts contacts; creates/finds conversations; saves messages; auto-assigns to agents |
| `apps/notification-service` | 3002 | Pushes real-time events to agent browsers via Socket.io |
| `apps/crm-service` | 3003 | OAuth flows; channel management; outbound message sending; contacts/deals CRUD |
| `apps/web` | 3004 | Next.js agent UI — unified inbox, CRM panel, settings |

### Shared Packages

| Package | Purpose |
|---|---|
| `packages/db` | Drizzle ORM schema + migrations (PostgreSQL) |
| `packages/redis` | Redis client singleton |
| `packages/auth` | JWT helpers |
| `packages/types` | Shared TypeScript types (`MessageEvent`, etc.) |
| `packages/logger` | Pino logger |
| `packages/config` | Environment variable loading |

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

This starts PostgreSQL on `5432` and Redis on `6379`.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — see [Environment Variables](#environment-variables) below.

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Start all services

```bash
pnpm dev
```

Turbo runs all services in parallel. Services hot-reload on file changes.

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm_medical

# Redis
REDIS_URL=redis://localhost:6379

# Auth (generate with: openssl rand -base64 64)
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Token encryption (generate with: openssl rand -hex 32)
MASTER_KEY=

# Facebook / Meta
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_VERIFY_TOKEN=        # Custom string — set same value in Meta dashboard
FACEBOOK_REDIRECT_URI=http://localhost:3003/v1/facebook/oauth/callback

# Service ports
GATEWAY_PORT=3000
CONVERSATION_SERVICE_PORT=3001
NOTIFICATION_SERVICE_PORT=3002
CRM_SERVICE_PORT=3003
WEB_PORT=3004

# Frontend
WEB_URL=http://localhost:3004
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
```

---

## Facebook Channel Setup

### Step 1 — Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose **Business** type
3. Add **Messenger** product to the app
4. From **App Settings → Basic**, copy:
   - **App ID** → `FACEBOOK_APP_ID`
   - **App Secret** → `FACEBOOK_APP_SECRET`

### Step 2 — Configure OAuth Redirect URI

In the Meta dashboard:

1. **Facebook Login → Settings → Valid OAuth Redirect URIs**
2. Add your callback URL:
   - Dev: `http://localhost:3003/v1/facebook/oauth/callback`
   - Prod: `https://your-domain.com/v1/facebook/oauth/callback`
3. Set `FACEBOOK_REDIRECT_URI` in `.env` to match exactly.

### Step 3 — Configure the Webhook

You need a public URL for Meta to call. In development, use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
# Copy the https URL, e.g. https://abc123.ngrok.io
```

In Meta dashboard → **Messenger → Webhooks**:

1. **Callback URL**: `https://abc123.ngrok.io/webhooks/facebook`
2. **Verify Token**: same value as `FACEBOOK_VERIFY_TOKEN` in `.env`
3. Click **Verify and Save**
4. Subscribe to fields: `messages`, `messaging_postbacks`, `messaging_optins`, `message_reads`

### Step 4 — Connect a Facebook Page (OAuth Flow)

Once the app is running, connect a page through the UI:

1. Go to **Settings → Channels** in the web app
2. Click **Connect Facebook**
3. You'll be redirected to Facebook's OAuth dialog — approve the permissions
4. Select which Facebook Page to connect
5. Click **Connect** — the page is now active

**What happens under the hood:**

```
User clicks Connect
  → GET /v1/facebook/oauth/url          (CRM service generates OAuth URL + CSRF nonce)
  → Redirect to Facebook dialog
  → Facebook redirects to /v1/facebook/oauth/callback
      - Verifies CSRF nonce
      - Exchanges code for short-lived token
      - Extends to 60-day long-lived token
      - Fetches pages user manages (/me/accounts)
      - Stores pages in Redis session
  → Redirect to /settings/channels/facebook/select?session=...
  → User selects page
  → POST /v1/facebook/oauth/connect
      - Subscribes page to webhook events
      - Stores page access token in channel_configs table
```

### Step 5 — Test It

Send a message to your connected Facebook Page. You should see:

1. The webhook fires to `/webhooks/facebook`
2. Gateway verifies HMAC-SHA256 signature and publishes to Redis Stream
3. Conversation service creates a contact + conversation
4. Message appears in the unified inbox
5. You can reply from the inbox — message sends via Graph API

### Permissions Required

Your Meta app needs these permissions approved for production:

| Permission | Why |
|---|---|
| `pages_manage_metadata` | Subscribe page to webhook |
| `pages_messaging` | Send messages via Graph API |
| `pages_read_engagement` | Read incoming messages |

In development with a test page, permissions work without App Review. For production, submit for **App Review** in the Meta dashboard.

### Troubleshooting

**Webhook verification fails (403)**
- `FACEBOOK_VERIFY_TOKEN` in `.env` must exactly match what you entered in Meta dashboard
- Gateway service must be running and reachable at the callback URL

**Messages not appearing**
- Check that the page webhook subscription is active (Meta dashboard → Webhooks)
- Verify `FACEBOOK_APP_SECRET` is correct (used to verify HMAC signatures)
- Check gateway logs for signature verification errors

**OAuth callback fails**
- `FACEBOOK_REDIRECT_URI` must exactly match the URI registered in Meta dashboard (including trailing slash)
- Redis must be running (stores CSRF nonces with 10-minute TTL)

**Cannot send messages**
- Ensure the page access token is stored: check `channel_configs` table, `isActive = 'true'`
- The contact must have a `platformIds.facebook` PSID (set on first inbound message)

---

## API Reference

### OAuth (CRM Service — port 3003)

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/facebook/oauth/url` | Get Facebook OAuth dialog URL |
| `GET` | `/v1/facebook/oauth/callback` | OAuth callback — exchanges code, stores token |
| `GET` | `/v1/facebook/oauth/pages` | List pages from session |
| `POST` | `/v1/facebook/oauth/connect` | Connect selected page |

### Channels

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/channels` | List connected channels |
| `POST` | `/v1/channels` | Manually add channel |
| `PATCH` | `/v1/channels/:id` | Update channel |
| `DELETE` | `/v1/channels/:id` | Remove channel |

### Conversations & Messages

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/conversations` | List conversations |
| `GET` | `/v1/conversations/:id/messages` | Get message history |
| `POST` | `/v1/conversations/:id/messages` | Send message (outbound) |

### Webhooks (Gateway — port 3000)

| Method | Path | Description |
|---|---|---|
| `GET` | `/webhooks/facebook` | Meta webhook verification handshake |
| `POST` | `/webhooks/facebook` | Receive incoming messages/events |

---

## Database Schema

Key tables in PostgreSQL:

```
contacts          — normalized profiles with platformIds JSONB map
conversations     — one per (channel, externalThreadId)
messages          — all messages, deduped by (channel, externalMsgId)
channel_configs   — OAuth tokens and config per connected page/channel
deals             — CRM pipeline deals
pipeline_stages   — configurable deal stages
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API services | Node.js + Fastify |
| Frontend | Next.js 14 + React |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / Queue | Redis 7 (Streams for async messaging, pub/sub for notifications) |
| Realtime | Socket.io |
| Monorepo | Turborepo + pnpm workspaces |
| Auth | JWT (access + refresh tokens) |
| Container | Docker Compose (dev) |
