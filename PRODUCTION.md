# Render Control Center — Production Setup

## Backend

### Render service type
- **Web Service**
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
- **Plan**: Starter or higher

### Required environment variables
| Name | Value |
|------|-------|
| `RENDER_API_KEY` | Your Render API key from dashboard.render.com/u/settings |
| `NODE_ENV` | `production` |
| `PORT` | Automatically set by Render |

### Notes
- Do NOT set `PORT` manually unless you have a reason; Render injects it.
- `RENDER_API_KEY` must be set in the Render dashboard under **Environment**.
- The backend listens on the port Render provides and proxies all Render API calls.

---

## Frontend

### Render service type
- **Static Site** (recommended)
  - **Build Command**: `cd client && npm install && npm run build`
  - **Publish Directory**: `client/dist`
  - No start command needed.

### OR

### Render service type
- **Web Service**
  - **Runtime**: Node
  - **Build Command**: `cd client && npm install && npm run build`
  - **Start Command**: `npm run preview`
  - **Plan**: Starter or higher

### Required environment variables
| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://<your-backend-service>.onrender.com/api/render` |
| `VITE_WS_URL` | `https://<your-backend-service>.onrender.com` |
| `VITE_APP_ENV` | `production` |

### Notes
- For static sites, Render exposes `VITE_*` variables at build time.
- For web services, Render exposes them at runtime; Vite embeds them during build.
- Replace `<your-backend-service>` with your actual backend Render hostname.
- Do NOT include a trailing slash.

---

## Example production URLs

```
Backend:  https://render-backend-abc1.onrender.com
Frontend: https://render-frontend-xyz2.onrender.com
```

Frontend API config:
```
VITE_API_URL=https://render-backend-abc1.onrender.com/api/render
VITE_WS_URL=https://render-backend-abc1.onrender.com
```

---

## Verification

1. Backend health:
   ```
   curl https://<backend>/health
   ```
   Expected: `{"status":"ok"}`

2. Backend connection:
   ```
   curl https://<backend>/api/render/connection/status
   ```
   Expected: `{"connected":true}`

3. Frontend:
   Open `https://<frontend>/` and confirm the dashboard loads without proxy errors.

---

## Security

- `RENDER_API_KEY` is server-side only. Never expose it to the frontend.
- All `/api/render/*` requests from the browser go through your backend.
- The browser never calls `https://api.render.com` directly.

---

## Free-Tier Keep-Alive

Render suspends free-tier web services after a period of inactivity. To keep the backend awake at no cost, a GitHub Actions workflow pings the `/health` endpoint every 5 minutes.

### Setup

1. Ensure the workflow file exists at `.github/workflows/render-keep-alive.yml`.
2. In your GitHub repository, go to **Settings → Secrets and variables → Actions**.
3. Create a new repository secret named `RENDER_URL`.
4. Set its value to your backend Render service URL (e.g. `https://render-backend-abc1.onrender.com`).
5. Do NOT include a trailing slash.

### How it works

- The workflow runs on a 5-minute schedule via cron (`*/5 * * * *`).
- It executes `curl -fsS -o /dev/null "${{ secrets.RENDER_URL }}/health"`.
- The `/health` endpoint is unauthenticated and lightweight — it returns immediately with no database or session overhead.

### Verification

1. Open the **Actions** tab in your GitHub repository.
2. Confirm the `Render Keep-Alive` workflow appears and runs successfully.
3. After 15+ minutes of no other traffic, verify the Render service is still responsive:
   ```
   curl https://<backend>/health
   ```

