import { useEffect, useState } from 'react'
import { get } from '../api'

type ConnectionStatus = { connected: boolean; message?: string }

export default function Settings() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    get<ConnectionStatus>('/connection/status').then(setStatus).catch(() => setStatus({ connected: false }))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    // In a real implementation, this would call the backend to update the stored key.
    // For now, we just attempt to verify it immediately.
    try {
      const result = await fetch('/api/render/connection/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await result.json()
      setStatus(data)
      setSaved(true)
    } catch {
      setStatus({ connected: false, message: 'Failed to verify' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h2 className="text-xl font-semibold text-gray-100">Settings</h2>
      <p className="mt-1 text-sm text-gray-400">Manage your Render API connection.</p>

      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-200">API Connection</h3>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={status?.connected ? 'text-green-400' : 'text-red-400'}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {status?.message && (
          <p className="mt-1 text-xs text-red-400">{status.message}</p>
        )}
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Render API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="rnd_..."
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Stored server-side only. Never exposed to the browser.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
        >
          Verify & Save
        </button>
        {saved && status?.connected && (
          <p className="text-sm text-green-400">API key verified successfully.</p>
        )}
      </form>
    </div>
  )
}
