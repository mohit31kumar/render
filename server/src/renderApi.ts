import { Request } from 'express'

export interface RenderApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | boolean | (string | number | boolean)[] | undefined>
  body?: unknown
  bearer?: string
}

export async function renderApi<T>(req: Request, options: RenderApiOptions): Promise<T> {
  const { method = 'GET', path, query = {}, body, bearer } = options

  const apiKey = bearer ?? process.env.RENDER_API_KEY ?? ''
  if (!apiKey) {
    throw new Error('Missing RENDER_API_KEY')
  }

  const url = new URL(`https://api.render.com/v1${path}`)
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== '') {
          url.searchParams.append(key, String(item))
        }
      })
      return
    }
    url.searchParams.set(key, String(value))
  })

  const fetch = await import('undici').then((m) => m.fetch)

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const rateLimitLimit = res.headers.get('Rate-Limit')
  const rateLimitRemaining = res.headers.get('Ratelimit-Remaining')
  const rateLimitReset = res.headers.get('Ratelimit-Reset')

  if (!res.ok) {
    let payload: { message?: string; code?: string } = {}
    try {
      const parsed = await res.json()
      if (typeof parsed === 'object' && parsed !== null) {
        payload = parsed as { message?: string; code?: string }
      }
    } catch {
      // ignore
    }
    const error = new Error(
      `Render API error ${res.status}: ${payload.message ?? res.statusText}`,
    ) as Error & { status?: number; code?: string; rateLimit?: Record<string, string | null> }
    error.status = res.status
    error.code = payload.code
    error.rateLimit = {
      limit: rateLimitLimit,
      remaining: rateLimitRemaining,
      reset: rateLimitReset,
    }
    throw error
  }

  return res.json() as Promise<T>
}
