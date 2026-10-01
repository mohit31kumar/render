import { useEffect, useState } from 'react'
import { get } from '../api'
import { Card } from '../components/ui/Card'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

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
    <div className="page-container max-w-2xl">
      <h2 className="page-title">Settings</h2>
      <p className="page-subtitle">Manage your Render API connection.</p>

      <Card className="mt-6">
        <h3 className="card text-text-primary">API Connection</h3>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <StatusIndicator
            status={status?.connected ? 'live' : 'failed'}
            label={status?.connected ? 'Connected' : 'Disconnected'}
            size="md"
            showDot
          />
        </div>
        {status?.message && (
          <p className="mt-1 text-xs text-danger">{status.message}</p>
        )}
      </Card>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <Input
          label="Render API Key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="rnd_..."
          hint="Stored server-side only. Never exposed to the browser."
        />
        <Button type="submit">Verify & Save</Button>
        {saved && status?.connected && (
          <p className="text-sm text-success">API key verified successfully.</p>
        )}
      </form>
    </div>
  )
}
