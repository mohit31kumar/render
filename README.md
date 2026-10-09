# Render Monitor

A read-only monitoring dashboard for your [Render](https://render.com) infrastructure. Render Monitor gives you a single, focused view of your services, deployments, logs, and metrics without ever exposing your Render API key to the browser.

> **Internal code name:** This project is internally named **Render Control Center** (see `package.json` and `PRODUCTION.md`). The user-facing product is **Render Monitor**.

> **Not affiliated with Render.** This is an independent community dashboard and does not perform any write or destructive operations.

---

## Overview

Render Monitor is a self-hostable web application that proxies the Render REST and WebSocket APIs through a small backend. The frontend is a fast React single-page app; the backend keeps your `RENDER_API_KEY` server-side and forwards requests to `https://api.render.com`.

It is designed for developers and small teams who want a lighter-weight, read-only alternative to the Render dashboard for day-to-day monitoring.

---

## Features

- **Dashboard** — service counts, live/suspended status, latest deployments per service, and recent build/update failures at a glance.
- **Services** — browse every service type (web service, private service, worker, cron job, static site) with region, runtime, and plan.
- **Service detail** — per-service overview, events, and deployment history.
- **Deployments** — recent deploys across all services with status, trigger, commit, and timing.
- **Deployment detail** — inspect a single deploy including its commit and status transitions.
- **Logs** — query historical logs with time-range presets and filters, plus a live WebSocket log stream.
- **Metrics** — charts for CPU, memory, HTTP requests, HTTP latency, bandwidth, disk usage, and instance count.
- **Settings** — verify the current Render API connection status.

---

## Architecture

Render Monitor uses a proxy model so the API key never reaches the browser.

```
┌──────────────┐        ┌────────────────────┐        ┌────────────────────┐
│   Browser    │  HTTP  │   Backend (Express)│  HTTPS │  Render REST API   │
│  React SPA   │ ─────► │  /api/render/*     │ ─────► │  api.render.com/v1 │
│              │        │                    │        │                    │
│              │   WS   │                    │  WSS   │                    │
│              │ ─────► │ /logs/stream       │ ─────► │ /logs/subscribe    │
└──────────────┘        └────────────────────┘        └────────────────────┘
                              │
                              └─ RENDER_API_KEY (server-side only)
```

- Every browser request goes to the backend under `/api/render/*`.
- The backend attaches `Authorization: Bearer <RENDER_API_KEY>` and calls Render.
- The WebSocket log stream is proxied the same way at `/api/render/logs/stream`.
- The browser **never** calls `https://api.render.com` directly.

### Security model

- `RENDER_API_KEY` is read from the server environment only.
- No write operations are exposed — the proxy is read-only by design.
- Log streaming is unidirectional (Render → browser); client messages are ignored.

---

## Tech Stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts  |
| Backend    | Node.js, Express, TypeScript, WebSocket (`ws`), Undici              |
| Deployment | Render (Web Service + Static Site), GitHub Actions (keep-alive)    |

---

## Quick Start

### Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm**
- A **Render API key** from [dashboard.render.com/u/settings](https://dashboard.render.com/u/settings) (Account Settings → API Keys)

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# edit .env and set RENDER_API_KEY
npm run dev
```

The backend listens on `http://localhost:3001` by default.

### Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# .env should point at the local backend
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the backend.

### Verify

1. Backend health:

   ```bash
   curl http://localhost:3001/health
   # {"status":"ok"}
   ```

2. Backend connection to Render:

   ```bash
   curl http://localhost:3001/api/render/connection/status
   # {"connected":true}
   ```

3. Open `http://localhost:5173` and confirm the dashboard loads without proxy errors.

---

## Environment Variables

### Backend (`server/.env`)

| Name             | Required | Default       | Description                                        |
| ---------------- | -------- | ------------- | -------------------------------------------------- |
| `RENDER_API_KEY` | Yes      | —             | Render API key. Keep secret; server-side only.     |
| `PORT`           | No       | `3001`        | Port to listen on. Render injects this in production. |
| `NODE_ENV`       | No       | `development` | `development` or `production`.                     |

### Frontend (`client/.env`)

| Name           | Required | Description                                                 |
| -------------- | -------- | ----------------------------------------------------------- |
| `VITE_API_URL` | Yes      | Backend API base, e.g. `https://<backend>.onrender.com/api/render`. |
| `VITE_WS_URL`  | Yes      | Backend origin for the log stream, e.g. `https://<backend>.onrender.com`. |
| `VITE_APP_ENV` | No       | `development` or `production`.                              |

> Do **not** add a trailing slash to `VITE_API_URL` or `VITE_WS_URL`.

---

## Deployment (Render)

Full instructions live in the [deployment guide](docs/deployment.html) and [`PRODUCTION.md`](PRODUCTION.md).

### Backend Service

- Type: **Web Service** (Node)
- Build: `cd server && npm install && npm run build`
- Start: `node server/dist/index.js`
- Env: `RENDER_API_KEY`, `NODE_ENV=production` (leave `PORT` to Render)

### Frontend (Static Site or Web Service)

**Static Site (recommended):**

- Build: `cd client && npm install && npm run build`
- Publish directory: `client/dist`

**Web Service:**

- Build: `cd client && npm install && npm run build`
- Start: `npm run preview` (from the `client` directory)

Set `VITE_API_URL` and `VITE_WS_URL` to your backend URL before building.

### GitHub Keep-Alive

Free-tier Render services sleep after inactivity. The workflow at [`.github/workflows/render-keep-alive.yml`](.github/workflows/render-keep-alive.yml) pings the backend every 5 minutes.

1. Add a repository secret `RENDER_URL` = your backend URL (no trailing slash).
2. Optionally add `FRONTEND_URL` if the frontend is a Web Service.

---

## API Endpoints

All application endpoints are served under `/api/render`. See the [API reference](docs/api.html) for parameters and examples.

| Method | Path                                  | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/health`                             | Backend liveness check.                  |
| GET    | `/api/render/connection/status`       | Verify the Render API connection.        |
| GET    | `/api/render/services`                | List services.                           |
| GET    | `/api/render/services/:id`            | Get a service.                           |
| GET    | `/api/render/services/:id/deploys`    | List deployments for a service.          |
| GET    | `/api/render/deploys/:id`             | Get a deployment (requires `serviceId`). |
| GET    | `/api/render/services/:id/events`     | List events for a service.               |
| GET    | `/api/render/logs`                    | Query historical logs.                   |
| GET    | `/api/render/logs/values`             | List available log filter values.        |
| GET    | `/api/render/logs/stream/info`        | Info about the WebSocket log stream.     |
| WS     | `/api/render/logs/stream`             | Live log stream proxy.                   |
| GET    | `/api/render/metrics/cpu`             | CPU metrics.                             |
| GET    | `/api/render/metrics/memory`          | Memory metrics.                          |
| GET    | `/api/render/metrics/http-requests`   | HTTP request metrics.                    |
| GET    | `/api/render/metrics/http-latency`    | HTTP latency metrics.                    |
| GET    | `/api/render/metrics/bandwidth`       | Bandwidth metrics.                       |
| GET    | `/api/render/metrics/bandwidth-sources` | Bandwidth source breakdown.            |
| GET    | `/api/render/metrics/disk-usage`      | Disk usage metrics.                      |
| GET    | `/api/render/metrics/instance-count`  | Instance count metrics.                  |
| GET    | `/api/render/workspaces`              | List Render workspaces (owners).         |

---

## Project Structure

```
.
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/ui/  # Reusable UI primitives
│   │   ├── pages/          # Route pages
│   │   ├── api.ts          # API + WebSocket client
│   │   ├── App.tsx         # Layout and sidebar navigation
│   │   └── router.tsx      # Route definitions
│   └── index.html
├── server/                 # Express + WebSocket backend
│   └── src/
│       ├── index.ts        # Server setup + WS proxy
│       ├── routes.ts       # /api/render routes
│       ├── renderApi.ts    # Render API client
│       ├── owners.ts       # Default workspace resolution
│       └── env.ts          # Environment config
├── docs/                   # GitHub Pages documentation site
├── .github/workflows/      # Keep-alive workflow
├── PRODUCTION.md           # Production deployment notes
└── README.md
```

---

## Documentation Site

A full documentation site is published from the [`docs/`](docs/) directory via GitHub Pages:

**https://mohit31kumar.github.io/render/**

To enable it, open **Settings → Pages** in the repository and set **Source** to
**Deploy from a branch**, branch **main**, folder **/docs**. Updates publish on the
next push to `main`.

- [Overview](docs/index.html)
- [Setup guide](docs/guide.html)
- [Architecture](docs/architecture.html)
- [API reference](docs/api.html)
- [Deployment](docs/deployment.html)

To view locally, open `docs/index.html` in a browser, or serve the folder:

```bash
npx serve docs
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing code style (TypeScript, Tailwind design tokens).
3. Run type checks before opening a PR:

   ```bash
   cd server && npm run typecheck
   cd client && npm run build
   ```

4. Open a pull request describing your change.

---

## License

No license has been specified for this project. Contact the repository owner before reuse.

---

## Disclaimer

Render Monitor is an independent, read-only monitoring tool. It is **not affiliated with, endorsed by, or sponsored by Render**. All Render trademarks belong to their respective owners. The application only reads data exposed by the Render API and does not perform deployments, scaling, or any destructive actions.
