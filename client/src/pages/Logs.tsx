import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { get, createLogStreamUrl } from '../api'
import { Play, Pause, Trash2, Circle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'

type LogEntry = {
  id: string
  message: string
  timestamp: string
  labels: Array<{ name: string; value: string }>
}

type LogsResponse = {
  hasMore: boolean
  nextStartTime?: string
  nextEndTime?: string
  logs: LogEntry[]
}

type Service = { id: string; name: string; type: string }

type RangePreset = '15m' | '1h' | '6h' | '24h' | '7d' | 'custom'

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'custom', label: 'Custom' },
]

function toIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function applyPreset(preset: RangePreset): { startTime: string; endTime: string } {
  const now = new Date()
  const end = toIso(now)
  let start = new Date()

  switch (preset) {
    case '15m':
      start = new Date(now.getTime() - 15 * 60 * 1000)
      break
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case '6h':
      start = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      break
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    default:
      break
  }

  return {
    startTime: toIso(start),
    endTime: end,
  }
}

const levelBadgeVariant = (level: string): 'danger' | 'warning' | 'info' | 'default' => {
  const l = level.toLowerCase()
  if (['error', 'fatal'].includes(l)) return 'danger'
  if (['warn', 'warning'].includes(l)) return 'warning'
  if (['info'].includes(l)) return 'info'
  return 'default'
}

const typeBadgeVariant = (type: string): 'info' | 'success' | 'warning' | 'default' => {
  if (type === 'app') return 'info'
  if (type === 'build') return 'warning'
  if (type === 'request') return 'success'
  return 'default'
}

export default function Logs() {
  const [resource, setResource] = useState('')
  const [logType, setLogType] = useState('')
  const [level, setLevel] = useState('')
  const [text, setText] = useState('')
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward')
  const [limit] = useState(100)
  const [rangePreset, setRangePreset] = useState<RangePreset>('1h')
  const [startTime, setStartTime] = useState(() => applyPreset('1h').startTime)
  const [endTime, setEndTime] = useState(() => applyPreset('1h').endTime)
  const [pageToken, setPageToken] = useState<{ startTime?: string; endTime?: string } | null>(null)

  const [live, setLive] = useState(false)
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<Array<{ service: Service }>>('/services', { limit: 100 }),
  })

  const { data: logTypes } = useQuery({
    queryKey: ['log-values', 'type', resource],
    queryFn: () => get<string[]>('/logs/values', { label: 'type', resource: resource || undefined }),
    enabled: Boolean(resource),
  })

  const { data: logLevels } = useQuery({
    queryKey: ['log-values', 'level', resource],
    queryFn: () => get<string[]>('/logs/values', { label: 'level', resource: resource || undefined }),
    enabled: Boolean(resource),
  })

  const { data: logsData, refetch, isFetching } = useQuery({
    queryKey: ['logs', resource, logType, level, text, direction, limit, startTime, endTime, pageToken],
    queryFn: () => {
      const params: Record<string, string | number | boolean | undefined> = {
        limit,
        direction,
        resource: resource || undefined,
        type: logType || undefined,
        level: level || undefined,
        text: text || undefined,
        startTime: pageToken?.startTime ?? startTime ?? undefined,
        endTime: pageToken?.endTime ?? endTime ?? undefined,
      }
      return get<LogsResponse>('/logs', params)
    },
    enabled: Boolean(resource) && !live,
  })

  useEffect(() => {
    if (logsData?.logs && autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logsData?.logs])

  useEffect(() => {
    if (!live || !resource) return

    const params: Record<string, string | number | boolean | undefined> = {
      resource,
      type: logType || undefined,
      level: level || undefined,
      text: text || undefined,
      direction,
      limit: 100,
    }
    if (startTime) params.startTime = startTime
    if (endTime) params.endTime = endTime

    const url = createLogStreamUrl(params)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Connected to Render log stream')
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'error') {
          console.error('Stream error:', data.message)
          return
        }
        setLiveLogs((prev) => {
          const next = [...prev, data]
          return next.length > 5000 ? next.slice(-5000) : next
        })
        if (autoScrollRef.current) {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      } catch {
        // ignore
      }
    }
    ws.onerror = () => {
      console.error('Log stream error')
    }
    ws.onclose = () => {
      console.log('Log stream closed')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [live, resource, logType, level, text, direction, startTime, endTime])

  function handlePresetChange(preset: RangePreset) {
    setRangePreset(preset)
    setPageToken(null)

    if (preset === 'custom') {
      return
    }

    const { startTime: newStart, endTime: newEnd } = applyPreset(preset)
    setStartTime(newStart)
    setEndTime(newEnd)
  }

  function handleManualStartChange(value: string) {
    setStartTime(value)
    setRangePreset('custom')
    setPageToken(null)
  }

  function handleManualEndChange(value: string) {
    setEndTime(value)
    setRangePreset('custom')
    setPageToken(null)
  }

  function toggleLive() {
    if (live) {
      wsRef.current?.close()
      setLive(false)
      setLiveLogs([])
    } else {
      setPageToken(null)
      setLive(true)
    }
  }

  function clearLogs() {
    setLiveLogs([])
  }

  function handleScroll() {
    if (bottomRef.current) {
      const el = document.getElementById('log-container')!
      autoScrollRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    }
  }

  const logs = live ? liveLogs : logsData?.logs ?? []
  const hasMore = !live && (logsData?.hasMore ?? false)

  const highlight = (message: string) => {
    const stripped = message.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    const httpStatusColor = (code: string) => {
      const num = Number(code)
      if (num >= 500) return 'text-danger'
      if (num >= 400) return 'text-orange-400'
      if (num >= 300) return 'text-warning'
      if (num >= 200) return 'text-success'
      return 'text-text-secondary'
    }
    const parts = stripped.split(/(ERROR|WARN|INFO|FATAL|DEBUG|500|502|503|504|[1-9]\d{2})/gi)
    return parts.map((part, i) => {
      if (['ERROR', 'FATAL', '500', '502', '503', '504'].includes(part)) {
        return <span key={i} className="text-danger font-semibold">{part}</span>
      }
      if (part === 'WARN') {
        return <span key={i} className="text-warning font-semibold">{part}</span>
      }
      if (part === 'INFO') {
        return <span key={i} className="text-info font-semibold">{part}</span>
      }
      if (part === 'DEBUG') {
        return <span key={i} className="text-text-disabled">{part}</span>
      }
      if (/^[1-9]\d{2}$/.test(part)) {
        return <span key={i} className={httpStatusColor(part)}>{part}</span>
      }
      return <span key={i} className="text-text-secondary">{part}</span>
    })
  }

  const levelClass: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
    error: 'danger',
    fatal: 'danger',
    warn: 'warning',
    warning: 'warning',
    info: 'info',
    debug: 'default',
    default: 'default',
  }

  const logTypeLabel = (log: LogEntry) => {
    const typeLabel = log.labels.find((l) => l.name === 'type')?.value ?? 'app'
    const statusCode = log.labels.find((l) => l.name === 'statusCode')?.value
    const method = log.labels.find((l) => l.name === 'method')?.value
    if (typeLabel === 'request' && statusCode) {
      const num = Number(statusCode)
      let color = 'text-text-secondary'
      if (num >= 500) color = 'text-danger'
      else if (num >= 400) color = 'text-orange-400'
      else if (num >= 300) color = 'text-warning'
      else if (num >= 200) color = 'text-success'
      return (
        <span className="text-xs">
          {method && <span className="mr-1 text-text-muted">{method}</span>}
          <span className={color}>{statusCode}</span>
        </span>
      )
    }
    return (
      <span className={`text-xs ${typeLabel === 'app' ? 'text-info' : typeLabel === 'build' ? 'text-warning' : 'text-success'}`}>
        {typeLabel}
      </span>
    )
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Logs</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={live ? 'danger' : 'primary'}
            size="sm"
            onClick={toggleLive}
            icon={<Circle size={12} />}
          >
            {live ? 'Stop Live' : 'Live'}
          </Button>
          {live && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setPaused(!paused)} icon={paused ? <Play size={12} /> : <Pause size={12} />}>
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="secondary" size="sm" onClick={clearLogs} icon={<Trash2 size={12} />}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="form-label">Service</label>
          <Select value={resource} onChange={(e) => setResource(e.target.value)}>
            <option value="">All services</option>
            {services?.map(({ service }) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label">Type</label>
          <Select value={logType} onChange={(e) => setLogType(e.target.value)}>
            <option value="">All</option>
            {logTypes?.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label">Level</label>
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All</option>
            {logLevels?.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label">Direction</label>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as 'backward' | 'forward')}>
            <option value="backward">Newest first</option>
            <option value="forward">Oldest first</option>
          </Select>
        </div>
        <div>
          <label className="form-label">Time range</label>
          <Select value={rangePreset} onChange={(e) => handlePresetChange(e.target.value as RangePreset)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="form-label">Start time</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => handleManualStartChange(e.target.value)}
            placeholder="2024-01-01T00:00:00Z"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">End time</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => handleManualEndChange(e.target.value)}
            placeholder="2024-01-01T01:00:00Z"
            className="form-input"
          />
        </div>
      </div>

      {!live && (
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => { setPageToken(null); refetch() }} size="sm">Refresh</Button>
          {hasMore && logsData?.nextStartTime && (
            <Button variant="secondary" size="sm" onClick={() => setPageToken({ startTime: logsData.nextStartTime, endTime: logsData.nextEndTime })}>
              Next page
            </Button>
          )}
          {pageToken && (
            <Button variant="secondary" size="sm" onClick={() => setPageToken(null)}>
              Reset range
            </Button>
          )}
          {isFetching && <span className="text-xs text-text-muted">Loading...</span>}
        </div>
      )}

      <div
        id="log-container"
        onScroll={handleScroll}
        className="mt-4 h-[600px] overflow-y-auto rounded-lg border border-border bg-surface font-mono scrollbar-thin"
      >
        <div className="sticky top-0 z-10 flex gap-5 border-b border-border bg-surface/95 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-text-muted backdrop-blur">
          <span className="w-20 shrink-0">Time</span>
          <span className="w-10 shrink-0">Level</span>
          <span className="w-28 shrink-0 ml-5">Type</span>
          <span className="flex-1">Message</span>
        </div>
        <div className="p-4">
          {!resource ? (
            <p className="text-xs text-text-muted">Select a service to view logs.</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-text-muted">No logs found.</p>
          ) : null}
          {!paused &&
            resource &&
            logs.map((log) => {
              const levelLabel = log.labels.find((l) => l.name === 'level')?.value ?? 'info'
              const time = new Date(log.timestamp).toLocaleTimeString()
              return (
                <div key={log.id} className="log-row gap-5">
                  <span className="w-20 shrink-0 text-text-muted">{time}</span>
                  <span className="w-10 shrink-0">
                    <Badge variant={levelBadgeVariant(levelLabel)} size="sm" dot>{levelLabel.toUpperCase().slice(0, 5)}</Badge>
                  </span>
                  <span className="w-28 shrink-0 ml-5">{logTypeLabel(log)}</span>
                  <span className="flex-1 break-all text-text-secondary">{highlight(log.message)}</span>
                </div>
              )
            })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
