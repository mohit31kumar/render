import { Router, Response } from 'express'
import { renderApi } from './renderApi.js'
import { env } from './env.js'
import { getDefaultOwnerId } from './owners.js'

export const router = Router()

// Health / connection
router.get('/connection/status', async (_req, res: Response) => {
  try {
    await renderApi<unknown>(_req, { path: '/services', query: { limit: 1 } })
    res.json({ connected: true })
  } catch (err: any) {
    const status = err.status ?? 500
    res.status(status).json({
      connected: false,
      message: err.message,
      code: err.code,
    })
  }
})

// Services
router.get('/services', async (req, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 100)
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined
  const ownerId = req.query.ownerId ? String(req.query.ownerId) : undefined

  const params: Record<string, string | number | boolean | undefined> = { limit }
  if (cursor) params.cursor = cursor
  if (ownerId) params.ownerId = ownerId

  const data = await renderApi<unknown>(req, { path: '/services', query: params })
  res.json(data)
})

router.get('/services/:id', async (req, res: Response) => {
  const data = await renderApi<unknown>(req, { path: `/services/${req.params.id}` })
  res.json(data)
})

router.get('/services/:id/deploys', async (req, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100)
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined
  const statuses = req.query.status
    ? String(req.query.status).split(',')
    : undefined

  const params: Record<string, string | number | boolean | undefined> = { limit }
  if (cursor) params.cursor = cursor
  if (statuses?.length) {
    statuses.forEach((s, i) => {
      params[`status[${i}]`] = s
    })
  }

  const data = await renderApi<unknown>(req, {
    path: `/services/${req.params.id}/deploys`,
    query: params,
  })
  res.json(data)
})

router.get('/deploys/:id', async (req, res: Response) => {
  const { serviceId } = req.query as { serviceId?: string }
  if (!serviceId) {
    return res.status(400).json({ message: 'Missing serviceId query param' })
  }
  const data = await renderApi<unknown>(req, {
    path: `/services/${serviceId}/deploys/${req.params.id}`,
  })
  res.json(data)
})

// Events
router.get('/services/:id/events', async (req, res: Response) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100)
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined
  const eventType = req.query.eventType ? String(req.query.eventType) : undefined

  const params: Record<string, string | number | boolean | undefined> = { limit }
  if (cursor) params.cursor = cursor
  if (eventType) params.eventType = eventType

  const data = await renderApi<unknown>(req, {
    path: `/services/${req.params.id}/events`,
    query: params,
  })
  res.json(data)
})

// Logs — list
router.get('/logs', async (req, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 100)
    const ownerId = req.query.ownerId ? String(req.query.ownerId) : await getDefaultOwnerId()
    const resources = req.query.resource
      ? String(req.query.resource).split(',')
      : undefined
    const types = req.query.type ? String(req.query.type).split(',') : undefined
    const levels = req.query.level ? String(req.query.level).split(',') : undefined
    const startTime = req.query.startTime ? String(req.query.startTime) : undefined
    const endTime = req.query.endTime ? String(req.query.endTime) : undefined
    const direction = req.query.direction ? String(req.query.direction) : undefined
    const text = req.query.text ? String(req.query.text) : undefined
    const path = req.query.path ? String(req.query.path) : undefined
    const statusCode = req.query.statusCode ? String(req.query.statusCode) : undefined
    const method = req.query.method ? String(req.query.method) : undefined
    const host = req.query.host ? String(req.query.host) : undefined
    const instance = req.query.instance ? String(req.query.instance) : undefined
    const task = req.query.task ? String(req.query.task) : undefined
    const taskRun = req.query.taskRun ? String(req.query.taskRun) : undefined
    const sandbox = req.query.sandbox ? String(req.query.sandbox) : undefined

    if (!resources?.length) {
      return res.status(400).json({ message: 'Missing required query param: resource' })
    }

    const params: Record<string, string | number | boolean | (string | number | boolean)[] | undefined> = { limit }
    if (ownerId) params.ownerId = ownerId
    if (resources?.length) {
      params.resource = resources
    }
    if (types?.length) {
      params.type = types
    }
    if (levels?.length) {
      params.level = levels
    }
    if (startTime) params.startTime = startTime
    if (endTime) params.endTime = endTime
    if (direction) params.direction = direction
    if (text) params.text = text
    if (path) params.path = path
    if (statusCode) params.statusCode = statusCode
    if (method) params.method = method
    if (host) params.host = host
    if (instance) params.instance = instance
    if (task) params.task = task
    if (taskRun) params.taskRun = taskRun
    if (sandbox) params.sandbox = sandbox

    const data = await renderApi<unknown>(req, { path: '/logs', query: params })
    res.json(data)
  } catch (err: any) {
    const status = err.status ?? 400
    res.status(status).json({ message: err.message ?? 'Bad request', code: err.code })
  }
})

// Logs — available filter values
router.get('/logs/values', async (req, res: Response) => {
  try {
    const label = String(req.query.label ?? '')
    const ownerId = req.query.ownerId ? String(req.query.ownerId) : await getDefaultOwnerId()
    const startTime = req.query.startTime ? String(req.query.startTime) : undefined
    const endTime = req.query.endTime ? String(req.query.endTime) : undefined
    const resources = req.query.resource
      ? String(req.query.resource).split(',')
      : undefined

    if (!resources?.length) {
      return res.status(400).json({ message: 'Missing required query param: resource' })
    }

    const params: Record<string, string | number | boolean | (string | number | boolean)[] | undefined> = { label }
    if (ownerId) params.ownerId = ownerId
    if (startTime) params.startTime = startTime
    if (endTime) params.endTime = endTime
    if (resources?.length) {
      params.resource = resources
    }

    const data = await renderApi<unknown>(req, { path: '/logs/values', query: params })
    res.json(data)
  } catch (err: any) {
    const status = err.status ?? 400
    res.status(status).json({ message: err.message ?? 'Bad request', code: err.code })
  }
})

// Metrics
router.get('/metrics/cpu', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const instance = req.query.instance ? String(req.query.instance) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (instance) params.instance = instance
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, { path: '/metrics/cpu', query: params })
  res.json(data)
})

router.get('/metrics/memory', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const instance = req.query.instance ? String(req.query.instance) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (instance) params.instance = instance
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, { path: '/metrics/memory', query: params })
  res.json(data)
})

router.get('/metrics/http-requests', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, {
    path: '/metrics/http-requests',
    query: params,
  })
  res.json(data)
})

router.get('/metrics/http-latency', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, {
    path: '/metrics/http-latency',
    query: params,
  })
  res.json(data)
})

router.get('/metrics/bandwidth', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, { path: '/metrics/bandwidth', query: params })
  res.json(data)
})

router.get('/metrics/bandwidth-sources', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, {
    path: '/metrics/bandwidth-sources',
    query: params,
  })
  res.json(data)
})

router.get('/metrics/disk-usage', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, {
    path: '/metrics/disk-usage',
    query: params,
  })
  res.json(data)
})

router.get('/metrics/instance-count', async (req, res: Response) => {
  const resource = req.query.resource ? String(req.query.resource) : undefined
  const startTime = req.query.startTime ? String(req.query.startTime) : undefined
  const endTime = req.query.endTime ? String(req.query.endTime) : undefined
  const resolutionSeconds = req.query.resolutionSeconds
    ? Number(req.query.resolutionSeconds)
    : undefined
  const aggregationMethod = req.query.aggregationMethod
    ? String(req.query.aggregationMethod)
    : undefined

  const params: Record<string, string | number | boolean | undefined> = {}
  if (resource) params.resource = resource
  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime
  if (resolutionSeconds) params.resolutionSeconds = resolutionSeconds
  if (aggregationMethod) params.aggregationMethod = aggregationMethod

  const data = await renderApi<unknown>(req, {
    path: '/metrics/instance-count',
    query: params,
  })
  res.json(data)
})

// Workspaces
router.get('/workspaces', async (req, res: Response) => {
  const data = await renderApi<unknown>(req, { path: '/owners' })
  res.json(data)
})

// Log stream proxy — handled in index.ts via ws server
// We expose a simple HTTP endpoint that upgrades or returns WS info if needed.
router.get('/logs/stream/info', (_req, res: Response) => {
  res.json({
    message: 'Use WebSocket connection to /api/render/logs/stream with the same query params as /logs/subscribe',
  })
})
