const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '/api/render'
const WS_BASE = (import.meta as any).env?.VITE_WS_URL ?? '/api/render/logs/stream'

export async function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export function createLogStreamUrl(params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(WS_BASE, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}
