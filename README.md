# Smart Support System

A full-stack help-desk platform: customers open support tickets, agents claim and respond to them, and admins manage users and the operation as a whole. Built with NestJS (backend), React + Vite (frontend), and PostgreSQL.

This README walks through the project end-to-end: what's inside, how to run it locally, how to set up the external APIs it depends on, and how to deploy it to Render.com with HTTPS.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [API setup — Resend (email)](#api-setup--resend-email)
- [API setup — Hugging Face (AI chat)](#api-setup--hugging-face-ai-chat)
- [Deploying to Render.com](#deploying-to-rendercom)
- [Creating the first admin account](#creating-the-first-admin-account)
- [Common deployment issues](#common-deployment-issues)
- [Environment variables reference](#environment-variables-reference)

---

## Features

- **Authentication** with JWT and bcrypt-hashed passwords. Three roles: USER, AGENT, ADMIN.
- **Account approval flow** — new signups start pending until an admin approves them. The admin can override the role at approval time.
- **Tickets** with status (Open / In Progress / Resolved), priority (Low / Medium / High), and archive support.
- **Multi-agent assignment** — admins can assign one or more agents per ticket; agents can also self-claim from an unassigned pool.
- **Per-ticket conversation** — threaded message history between requester and agents.
- **In-app notifications** for account approval, ticket creation, assignment, claim, and resolution. Each notification also sends a transactional email.
- **AI Support Assistant** — a floating chat popup powered by Hugging Face, with role-aware system prompts so it behaves like a customer-support assistant for users but a task helper for agents and admins.
- **HTTPS** handled automatically by Render's edge in production; optional dual-mode HTTPS for local dev.

## Tech stack

| Layer       | Technology                                                                |
| ----------- | ------------------------------------------------------------------------- |
| Backend     | NestJS 11, TypeORM 0.3, Passport JWT, class-validator                     |
| Database    | PostgreSQL 15+                                                            |
| Frontend    | React 19, Vite, react-router-dom 7, axios                                 |
| Email       | Resend (REST API, no SDK)                                                 |
| AI chat     | Hugging Face Inference Providers (OpenAI-compatible REST API, no SDK)     |
| Hosting     | Render.com (web service + static site + managed Postgres)                 |

The backend uses Node's built-in `fetch` for the Resend and Hugging Face integrations — no SDK dependencies for either.

## Project structure

```
.
├── backend/                NestJS API
│   ├── src/
│   │   ├── ai-chat/        AI assistant: HF integration + session storage
│   │   ├── auth/           Signup, login, JWT strategy, guards, decorators
│   │   ├── mail/           Resend REST client (low-level send)
│   │   ├── messages/       In-ticket conversation
│   │   ├── notifications/  Unified facade: persist row + send email
│   │   ├── tickets/        Ticket CRUD, assignment, archive
│   │   ├── users/          User management, approval flow
│   │   ├── app.module.ts   Root module — DB config, all feature modules
│   │   ├── main.ts         Bootstrap — CORS, validation, HTTPS toggle
│   │   └── seed.ts         Local-dev demo data script
│   ├── .env                Local-dev secrets (gitignored)
│   └── package.json
│
├── frontend/               React SPA
│   ├── src/
│   │   ├── components/     Layout, NotificationBell, ProfileMenu, AiChatPopup, TicketCard
│   │   ├── context/        AuthContext (JWT in localStorage)
│   │   ├── hooks/          useAuth
│   │   ├── pages/          Login, Register, Dashboard, Tickets, etc.
│   │   ├── pages/dashboards/  Role-specific dashboards
│   │   ├── routes/         AppRoutes (router config), ProtectedRoute (auth gate)
│   │   ├── services/       API clients (one file per backend module)
│   │   ├── App.tsx, main.tsx  Entry points
│   ├── public/_redirects   SPA fallback for Render's static-site router
│   ├── .env                Local-dev VITE_ vars (gitignored)
│   └── package.json
│
├── render.yaml             Blueprint for one-shot Render deploy
└── docker-compose.yml      Local Postgres (optional convenience)
```

## Running locally

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ running somewhere (local install or via the included `docker-compose.yml`)

### One-time setup

```bash
# Clone the repo
git clone <your-fork-url>
cd smart-support-system

# Start Postgres via Docker (optional — skip if you have your own)
docker compose up -d

# Install backend deps and create the env file
cd backend
npm install
cp .env.example .env       # then edit; defaults match docker-compose
# At minimum, set JWT_SECRET to a long random string.

# Install frontend deps and create its env file
cd ../frontend
npm install
# Create frontend/.env with:
#   VITE_API_URL=http://localhost:3000/api/v1
```

### Run

In two terminals:

```bash
# Terminal 1 — backend
cd backend
npm run start:dev          # http://localhost:3000

# Terminal 2 — frontend
cd frontend
npm run dev                # http://localhost:5173
```

The backend uses TypeORM's `synchronize: true` in development, so the database schema is created automatically on first boot. Visit the frontend, register an account, and you're running.

### Optional: seed demo accounts

```bash
cd backend
npm run seed:demo
```

This wipes any existing tickets and creates five users with various roles. Useful for testing. **Do NOT run this against a production database** — it deletes data.

## API setup — Resend (email)

The notification system sends transactional emails (account approved, ticket resolved, etc.) via [Resend](https://resend.com). Free tier: 3,000 emails per month, 100 per day, no credit card required.

### Step 1 — Get an API key

1. Go to [resend.com](https://resend.com) and sign up. The email you sign up with becomes important later — see step 3.
2. Once signed in, navigate to **API Keys** in the left sidebar.
3. Click **Create API Key**, give it a name like "smart-support-prod", choose **Sending access** as the permission level, and click Add.
4. Copy the key (starts with `re_`). It's only shown once.

### Step 2 — Set the environment variable

Add to `backend/.env`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=Smart Support <onboarding@resend.dev>
```

`onboarding@resend.dev` is Resend's reserved test sender — anyone can send from it without setup, with one important caveat below.

### Step 3 — Understand the sender restriction

When using `onboarding@resend.dev` as the sender, **Resend will only deliver emails to the address you signed up with**. This is a deliberate spam-protection measure for unverified senders.

For local development and initial testing this is fine — just register your test accounts using your own email address, and you'll receive every notification. For real production use with arbitrary recipients, complete Step 4.

### Step 4 — Verify a domain (for production)

1. In the Resend dashboard, go to **Domains** → **Add Domain**.
2. Enter your domain (e.g. `your-company.com`).
3. Resend gives you a list of DNS records (SPF, DKIM, DMARC). Add them to your DNS provider.
4. Click **Verify**. It usually takes a few minutes for DNS to propagate.
5. Once verified, change `MAIL_FROM` to use your domain:
   ```
   MAIL_FROM=Smart Support <noreply@your-company.com>
   ```
6. Now you can send to any recipient.

## API setup — Hugging Face (AI chat)

The AI Support Assistant uses Hugging Face's [Inference Providers](https://huggingface.co/docs/inference-providers) — a unified API for hosted open models with an OpenAI-compatible chat endpoint. Free tier: a small monthly credit pool for signed-in users, no credit card required.

### Step 1 — Create a Hugging Face account

1. Go to [huggingface.co](https://huggingface.co) and sign up.
2. Verify your email.

### Step 2 — Generate an access token

1. Click your avatar (top right) → **Settings**.
2. In the left sidebar, click **Access Tokens**.
3. Click **Create new token**.
4. Token type: **Read** is enough for inference calls. Give it a name, and click Create.
5. Copy the token (starts with `hf_`). You can re-view it later, but copy it now to be safe.

### Step 3 — Set the environment variables

Add to `backend/.env`:

```
HF_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_ENDPOINT=https://router.huggingface.co/v1/chat/completions
```

The default model (Llama 3.1 8B Instruct) works well for support tasks. Alternatives that are tested-good on the free tier:

| Model                                  | Best for                                 |
| -------------------------------------- | ---------------------------------------- |
| `meta-llama/Llama-3.1-8B-Instruct`     | General balanced quality (default)       |
| `Qwen/Qwen2.5-7B-Instruct`             | Strong reasoning, good summarisation     |
| `mistralai/Mistral-7B-Instruct-v0.3`   | Smaller and faster                       |

Just swap the value of `HF_MODEL` — no code change needed.

### Step 4 — Test it

Run the backend (`npm run start:dev`), log in to the frontend, and click the "AI Support Chat" button at the bottom of the left sidebar. Send a message — the assistant should reply within a few seconds.

If you see "AI assistant is not configured", the token isn't being picked up — restart the backend after editing `.env`.

## Deploying to Render.com

Render handles HTTPS automatically (TLS terminated at the edge), so the deployed app gets `https://*.onrender.com` URLs without any cert management on your side. The repo ships a `render.yaml` Blueprint that provisions all three resources (database, backend, frontend) in one shot.

### Step 1 — Push your code to a Git provider

Render deploys from a Git repository. Push the project to GitHub, GitLab, or Bitbucket. Make sure `render.yaml` is at the repo root.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/smart-support-system.git
git push -u origin main
```

Verify that `backend/package-lock.json` and `frontend/package-lock.json` are committed (some `.gitignore` templates exclude them). If they're missing, `npm ci` on Render fails:

```bash
git check-ignore -v backend/package-lock.json frontend/package-lock.json
# Should output nothing — if a rule matches, edit .gitignore to remove it,
# then `git add backend/package-lock.json frontend/package-lock.json && git commit`.
```

### Step 2 — Sign up for Render

1. Go to [render.com](https://render.com) and sign up. You'll be asked for a credit card for a $1 authorization check (refunded immediately).
2. After verification, you land on the dashboard.

### Step 3 — Deploy the Blueprint

1. From the Render dashboard, click **New** (top right) → **Blueprint**.
2. Connect your Git provider account if you haven't already, then select your repo.
3. Render reads `render.yaml` and shows what it's about to create:
   - **`smart-support-db`** — managed PostgreSQL (free tier)
   - **`smart-support-api`** — backend web service (free tier)
   - **`smart-support-frontend`** — frontend static site (always free)
4. Give the Blueprint a name (e.g. "smart-support") and click **Apply**.

Render starts provisioning. The database comes up first, then the two services build in parallel. The first build typically takes 3–5 minutes.

### Step 4 — Add your secrets

The Blueprint marks two environment variables as `sync: false` so they don't end up committed to your repo. After the first deploy, set them in the dashboard:

1. Click on `smart-support-api` in your dashboard.
2. Click **Environment** in the left sidebar.
3. You'll see `RESEND_API_KEY` and `HF_API_TOKEN` listed with empty values. Click the pencil icon next to each and paste your keys (from the API setup sections above).
4. Render auto-redeploys the backend with the new env vars.

### Step 5 — Note your service URLs

Once everything is "Live" (green badge), your services have public URLs. Open each service in the dashboard and look for the URL at the top of the page:

- Backend: something like `https://smart-support-api.onrender.com` (or with a suffix like `-xxxx` if the name was already taken)
- Frontend: something like `https://smart-support-frontend.onrender.com`

### Step 6 — If your URLs have suffixes, fix the CORS and API URL settings

The Blueprint hard-codes the expected URLs in two env vars. If Render appended suffixes (because the names were already taken), you need to update these:

1. **Backend's `CORS_ORIGINS`** — set to the *exact* frontend URL (no trailing slash). In `smart-support-api` → Environment, edit `CORS_ORIGINS`. Save.
2. **Frontend's `VITE_API_URL`** — set to the *exact* backend URL with `/api/v1` appended. In `smart-support-frontend` → Environment, edit `VITE_API_URL`. Save.

The frontend rebuild is critical here: **Vite bakes env vars into the JavaScript at build time**, so changing `VITE_API_URL` requires a fresh build. Click **Manual Deploy** → **Clear build cache & deploy** on the frontend service.

### Step 7 — Disable schema sync after first deploy

The Blueprint sets `DB_SYNCHRONIZE=true` on the backend so TypeORM auto-creates all the tables on first boot. Once the schema exists, you should turn this off — leaving it on means TypeORM will keep altering your tables on every deploy, which can drop data.

1. `smart-support-api` → Environment.
2. Edit `DB_SYNCHRONIZE` from `true` to `false`.
3. Save. Render redeploys.

For schema changes later, use TypeORM migrations rather than re-enabling sync.

### Step 8 — Create the first admin (see next section)

Your deployed app is live, but new signups create pending accounts that need admin approval. Since no admin exists yet, you need to bootstrap the first one — covered in the next section.

## Creating the first admin account

Because all new accounts default to pending, you need to promote one user to admin manually. The cleanest way is to sign up normally (which handles bcrypt password hashing for you) then flip one row in the database.

### Step 1 — Sign up through the frontend

Visit your deployed frontend URL and click Register. Use the email and password you want for your admin account. The form will say "pending approval" — that's expected.

### Step 2 — Connect to the database

In the Render dashboard, click `smart-support-db`. Scroll to the **Connections** section and copy the **External Database URL** (starts with `postgres://`). This is for one-off access from your local machine.

You have two ways to connect:

**Option A — `psql` (command line, fastest)**

If `psql` is installed locally:

```bash
psql "postgres://...your-external-url...?sslmode=require"
```

The `?sslmode=require` is critical — Render Postgres rejects unencrypted external connections. Without it, you'll get `read ECONNRESET`.

If you don't have psql:
- **macOS**: `brew install libpq && brew link --force libpq`
- **Ubuntu/WSL**: `sudo apt install postgresql-client`
- **Windows**: install Postgres from postgresql.org (just the client tools) or use WSL

**Option B — Beekeeper Studio (GUI, cross-platform, free)**

Download from [beekeeperstudio.io](https://www.beekeeperstudio.io/). New Connection → Postgres → paste the URL. **Enable SSL** in the connection settings (Beekeeper doesn't infer it from the URL). Leave "Reject Unauthorized" unchecked.

### Step 3 — Promote your account

Run this SQL, replacing the email with the one you registered:

```sql
UPDATE users
SET role = 'admin',
    "isActive" = true,
    "isPending" = false
WHERE email = 'your-email@example.com';
```

Expected output: `UPDATE 1`. If it says `UPDATE 0`, the email didn't match — run `SELECT id, email, role FROM users;` to see what's actually there.

Note the camelCase columns need double quotes (`"isActive"`, `"isPending"`) in Postgres. The role values are lowercase strings (`'admin'`, `'agent'`, `'user'`).

### Step 4 — Log in

Go back to the login page and sign in with the same credentials. You should land on the admin dashboard, with a "Pending Account Approvals" section showing any other accounts waiting.

From here on, you approve users from the UI — no more SQL needed.

## Common deployment issues

A walk through every error encountered while deploying this project for the first time:

### `services[1].plan no such plan free for service type web`

Render's Blueprint validator rejects `plan: free` on static-site services. Static sites are always free on Render and don't accept a `plan` field. Remove the line — `render.yaml` in this repo already has it removed.

### `npm error code EUSAGE — The npm ci command can only install with an existing package-lock.json`

`npm ci` requires the lockfile to be committed to Git. Check that `backend/package-lock.json` and `frontend/package-lock.json` aren't gitignored, then commit them. Alternatively, change `npm ci` to `npm install` in the Blueprint — the current Blueprint uses `npm ci --include=dev` which works once the lockfile is present.

### `sh: 1: nest: not found` (or `vite: not found`)

Render sets `NODE_ENV=production` during builds, and that tells npm to skip `devDependencies`. The `nest` CLI lives in devDependencies. Fix: use `npm ci --include=dev && npm run build` (or `npm install --include=dev`). This is what the Blueprint does.

### "Registration failed" with no backend logs

The frontend isn't reaching the right backend URL. Two common causes:

1. **`VITE_API_URL` was wrong at build time** — Vite bakes env vars into the JS at build time. Open DevTools → Network → click Register → check the Request URL. If it points at localhost or a wrong host, fix the env var on the frontend service and **Clear build cache & deploy**.
2. **Service URL has a suffix** — Render appends `-xxxx` to service names that are already taken. Check both services' actual URLs in the dashboard and update `CORS_ORIGINS` (backend) and `VITE_API_URL` (frontend) to match exactly.

### Database connection `read ECONNRESET`

Render Postgres external connections require SSL. Add `?sslmode=require` to the URL when using psql. In a GUI client, enable SSL explicitly in the connection settings.

### Service stuck "waking up" indefinitely

Free Render web services sleep after 15 minutes idle and take 30–60 seconds to cold-start. If a service is still showing the "waking up" page after 2+ minutes, it's crashing on startup. Check the **Events** tab on the service for "Service exited with status 1" or similar, and the top of the Logs tab for the actual error.

## Environment variables reference

### Backend (`backend/.env` locally, Render dashboard in prod)

| Variable             | Required | Default                  | Notes                                                      |
| -------------------- | -------- | ------------------------ | ---------------------------------------------------------- |
| `NODE_ENV`           | No       | `development`            | Set to `production` on Render                              |
| `PORT`               | No       | `3000`                   | Render injects this automatically                          |
| `DATABASE_URL`       | Option A | —                        | Single connection string. Takes precedence if set.         |
| `DB_HOST`            | Option B | `localhost`              | Used when `DATABASE_URL` is absent                         |
| `DB_PORT`            | Option B | `5432`                   |                                                            |
| `DB_USERNAME`        | Option B | `user`                   |                                                            |
| `DB_PASSWORD`        | Option B | `password`               |                                                            |
| `DB_NAME`            | Option B | `support_system`         |                                                            |
| `DB_SSL`             | No       | `false`                  | Set `true` for managed Postgres over the public internet   |
| `DB_SYNCHRONIZE`     | No       | `true` in dev            | First deploy only; flip to `false` once schema exists      |
| `JWT_SECRET`         | **Yes**  | —                        | Long random string. Render generates one via Blueprint.    |
| `JWT_EXPIRES_IN`     | No       | `8h`                     | JWT lifetime                                               |
| `CORS_ORIGINS`       | **Yes**  | `localhost:5173` variants| Comma-separated list of allowed frontend origins           |
| `HTTPS_KEY_PATH`     | No       | —                        | Local-dev only — path to self-signed cert key              |
| `HTTPS_CERT_PATH`    | No       | —                        | Local-dev only — path to self-signed cert                  |
| `RESEND_API_KEY`     | Yes*     | —                        | If unset, in-app notifications work but emails are skipped |
| `MAIL_FROM`          | No       | `onboarding@resend.dev`  | Sender address                                             |
| `HF_API_TOKEN`       | Yes*     | —                        | If unset, the AI chat returns a friendly "not configured"  |
| `HF_MODEL`           | No       | `meta-llama/Llama-3.1-8B-Instruct` |                                                  |
| `HF_ENDPOINT`        | No       | Hugging Face router URL  | Override only for self-hosted endpoints                    |

*The Resend and HF keys are technically optional — the system degrades gracefully without them — but the corresponding features won't work.

### Frontend (`frontend/.env` locally, Render dashboard in prod)

| Variable          | Required | Default                          | Notes                                              |
| ----------------- | -------- | -------------------------------- | -------------------------------------------------- |
| `VITE_API_URL`    | **Yes**  | `http://localhost:3000/api/v1`   | Baked into JS at BUILD time, not read at runtime   |
| `HTTPS_KEY_PATH`  | No       | —                                | Local-dev only — for `vite.config.ts`              |
| `HTTPS_CERT_PATH` | No       | —                                | Local-dev only                                     |