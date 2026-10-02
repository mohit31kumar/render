import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { env } from './env.js'
import { router } from './routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/render', router)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  const status = err.status ?? 500
  res.status(status).json({
    message: err.message ?? 'Internal server error',
    code: err.code,
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  })
})

const server = createServer(app)

const wss = new WebSocketServer({ server, path: '/api/render/logs/stream' })

wss.on('connection', async (ws: WebSocket, req) => {
  try {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`)
    const params = url.searchParams

    const queryString = new URLSearchParams()
    params.forEach((value, key) => {
      queryString.set(key, value)
    })

    const apiKey = process.env.RENDER_API_KEY ?? ''
    if (!apiKey) {
      ws.close(1008, 'Missing RENDER_API_KEY')
      return
    }

    const renderWsUrl = `wss://api.render.com/v1/logs/subscribe?${queryString.toString()}`

    ws.send(JSON.stringify({ type: 'info', message: 'Connecting to Render log stream...' }))

    const { fetch } = await import('undici')
    // @ts-ignore
    const renderWs = new WebSocket(renderWsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    renderWs.on('open', () => {
      ws.send(JSON.stringify({ type: 'info', message: 'Connected to Render log stream' }))
    })

    renderWs.on('message', (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString()
        ws.send(text)
      } catch {
        // ignore
      }
    })

    renderWs.on('error', (err) => {
      try {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: `Render stream error: ${err.message}`,
          }),
        )
      } catch {
        // ignore
      }
    })

    renderWs.on('close', (code, reason) => {
      try {
        ws.send(
          JSON.stringify({
            type: 'info',
            message: `Render stream closed (${code})`,
          }),
        )
      } catch {
        // ignore
      }
      ws.close(1000, 'Render stream closed')
    })

    ws.on('message', () => {
      // ignore client messages; Render stream is unidirectional
    })

    ws.on('close', () => {
      try {
        renderWs.close()
      } catch {
        // ignore
      }
    })
  } catch (err: any) {
    try {
      ws.send(JSON.stringify({ type: 'error', message: err.message }))
    } catch {
      // ignore
    }
    ws.close(1011, err.message)
  }
})

const port = env.port
server.listen(port, () => {
  console.log(`Render Control Center backend listening on :${port}`)
})
