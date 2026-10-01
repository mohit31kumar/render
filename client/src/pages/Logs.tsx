import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { get, createLogStreamUrl } from '../api'
import { Play, Pause, Trash2, Circle } from 'lucide-react'

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
      // keep current manual values; user will edit them directly
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
      const { scrollTop, scrollHeight, clientHeight } = document.getElementById('log-container')!
      autoScrollRef.current = scrollTop + clientHeight >= scrollHeight - 40
    }
  }

  const logs = live ? liveLogs : logsData?.logs ?? []
  const hasMore = !live && (logsData?.hasMore ?? false)

  const highlight = (message: string) => {
    const stripped = message.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    const httpStatusColor = (code: string) => {
      const num = Number(code)
      if (num >= 500) return 'text-red-400'
      if (num >= 400) return 'text-orange-400'
      if (num >= 300) return 'text-yellow-400'
      if (num >= 200) return 'text-green-400'
      return 'text-gray-300'
    }
    const parts = stripped.split(/(ERROR|WARN|INFO|FATAL|DEBUG|500|502|503|504|[1-9]\d{2})/gi)
    return parts.map((part, i) => {
      if (['ERROR', 'FATAL', '500', '502', '503', '504'].includes(part)) {
        return <span key={i} className="text-red-400 font-semibold">{part}</span>
      }
      if (part === 'WARN') {
        return <span key={i} className="text-yellow-400 font-semibold">{part}</span>
      }
      if (part === 'INFO') {
        return <span key={i} className="text-blue-400 font-semibold">{part}</span>
      }
      if (part === 'DEBUG') {
        return <span key={i} className="text-gray-400">{part}</span>
      }
      if (/^[1-9]\d{2}$/.test(part)) {
        return <span key={i} className={httpStatusColor(part)}>{part}</span>
      }
      return <span key={i} className="text-gray-300">{part}</span>
    })
  }

  const levelClass: Record<string, string> = {
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    fatal: 'bg-red-500/20 text-red-300 border-red-500/30',
    warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    debug: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    default: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  }

  const typeIndicator: Record<string, string> = {
    app: 'bg-blue-500/10 text-blue-300',
    build: 'bg-purple-500/10 text-purple-300',
    request: 'bg-emerald-500/10 text-emerald-300',
  }

  const logTypeLabel = (log: LogEntry) => {
    const typeLabel = log.labels.find((l) => l.name === 'type')?.value ?? 'app'
    const statusCode = log.labels.find((l) => l.name === 'statusCode')?.value
    const method = log.labels.find((l) => l.name === 'method')?.value
    if (typeLabel === 'request' && statusCode) {
      const num = Number(statusCode)
      let color = 'text-gray-300'
      if (num >= 500) color = 'text-red-400'
      else if (num >= 400) color = 'text-orange-400'
      else if (num >= 300) color = 'text-yellow-400'
      else if (num >= 200) color = 'text-green-400'
      return (
        <span className="text-xs">
          {method && <span className="mr-1 text-gray-400">{method}</span>}
          <span className={color}>{statusCode}</span>
        </span>
      )
    }
    return (
      <span className={`text-xs ${typeIndicator[typeLabel] ?? 'text-gray-400'}`}>
        {typeLabel}
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">Logs</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLive}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs ${
              live ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
            }`}
          >
            <Circle size={12} className={live ? 'fill-red-400 text-red-400' : 'fill-green-400 text-green-400'} />
            {live ? 'Stop Live' : 'Live'}
          </button>
          {live && (
            <>
              <button
                onClick={() => setPaused(!paused)}
                className="flex items-center gap-1 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300"
              >
                {paused ? <Play size={12} /> : <Pause size={12} />}
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={clearLogs}
                className="flex items-center gap-1 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300"
              >
                <Trash2 size={12} /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Service</label>
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          >
            <option value="">All services</option>
            {services?.map(({ service }) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Type</label>
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          >
            <option value="">All</option>
            {logTypes?.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          >
            <option value="">All</option>
            {logLevels?.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'backward' | 'forward')}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          >
            <option value="backward">Newest first</option>
            <option value="forward">Oldest first</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Time range</label>
          <select
            value={rangePreset}
            onChange={(e) => handlePresetChange(e.target.value as RangePreset)}
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-gray-500">Start time</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => handleManualStartChange(e.target.value)}
            placeholder="2024-01-01T00:00:00Z"
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">End time</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => handleManualEndChange(e.target.value)}
            placeholder="2024-01-01T01:00:00Z"
            className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 outline-none"
          />
        </div>
      </div>

      {!live && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => {
              setPageToken(null)
              refetch()
            }}
            className="rounded-md bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-200"
          >
            Refresh
          </button>
          {hasMore && logsData?.nextStartTime && (
            <button
              onClick={() => setPageToken({ startTime: logsData.nextStartTime, endTime: logsData.nextEndTime })}
              className="rounded-md border border-gray-700 px-4 py-1.5 text-xs text-gray-300 hover:border-gray-600"
            >
              Next page
            </button>
          )}
          {pageToken && (
            <button
              onClick={() => setPageToken(null)}
              className="rounded-md border border-gray-700 px-4 py-1.5 text-xs text-gray-300 hover:border-gray-600"
            >
              Reset range
            </button>
          )}
          {isFetching && <span className="text-xs text-gray-500">Loading...</span>}
        </div>
      )}

      <div
        id="log-container"
        onScroll={handleScroll}
        className="mt-4 h-[600px] overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 font-mono"
      >
        <div className="sticky top-0 z-10 flex gap-3 border-b border-gray-800 bg-gray-900/95 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 backdrop-blur">
          <span className="w-20 shrink-0">Time</span>
          <span className="w-10 shrink-0">Level</span>
          <span className="w-28 shrink-0">Type</span>
          <span className="flex-1">Message</span>
        </div>
        <div className="p-4">
          {!resource ? (
            <p className="text-xs text-gray-500">Select a service to view logs.</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-500">No logs found.</p>
          ) : null}
          {!paused &&
            resource &&
            logs.map((log) => {
              const levelLabel = log.labels.find((l) => l.name === 'level')?.value ?? 'info'
              const time = new Date(log.timestamp).toLocaleTimeString()
              const badgeClass = levelClass[levelLabel] ?? levelClass.default
              return (
                <div key={log.id} className="flex gap-3 border-b border-gray-800/50 py-1.5 text-xs hover:bg-gray-800/30">
                  <span className="w-20 shrink-0 text-gray-500">{time}</span>
                  <span className={`w-10 shrink-0 rounded border px-1 py-0.5 text-center text-[10px] font-medium ${badgeClass}`}>
                    {levelLabel.toUpperCase().slice(0, 5)}
                  </span>
                  <span className="w-28 shrink-0">{logTypeLabel(log)}</span>
                  <span className="flex-1 break-all">{highlight(log.message)}</span>
                </div>
              )
            })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
