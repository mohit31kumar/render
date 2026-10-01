import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'

type Deploy = {
  id: string
  status: string
  trigger: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  updatedAt?: string
  commit?: { id: string; message?: string; createdAt?: string }
}

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

type Event = {
  id: string
  timestamp: string
  type: string
  details: Record<string, unknown>
}

type EventsResponse = Array<{ event: Event; cursor: string }>

const statusColor: Record<string, string> = {
  live: 'bg-green-500',
  build_failed: 'bg-red-500',
  update_failed: 'bg-red-500',
  canceled: 'bg-gray-500',
  build_in_progress: 'bg-yellow-500',
  update_in_progress: 'bg-yellow-500',
  queued: 'bg-gray-400',
  created: 'bg-gray-400',
  pre_deploy_in_progress: 'bg-yellow-500',
  pre_deploy_failed: 'bg-red-500',
  deactivated: 'bg-gray-500',
}

function formatDuration(started?: string, finished?: string) {
  if (!started || !finished) return '—'
  const start = new Date(started).getTime()
  const end = new Date(finished).getTime()
  const diffMs = end - start
  if (diffMs < 0) return '—'
  const mins = Math.floor(diffMs / 60000)
  const secs = Math.floor((diffMs % 60000) / 1000)
  return `${mins}m ${secs}s`
}

function highlight(message: string) {
  const stripped = message.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
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
      return <span key={i} className="text-emerald-400">{part}</span>
    }
    return <span key={i} className="text-gray-300">{part}</span>
  })
}

type Tab = 'overview' | 'build' | 'runtime' | 'request' | 'events'

export default function DeploymentDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('serviceId')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

type Service = {
  id: string
  name: string
  type: string
}

const { data: services } = useQuery({
  queryKey: ['services'],
  queryFn: () => get<Array<{ service: Service }>>('/services', { limit: 100 }),
  enabled: !serviceId && Boolean(id),
})

const resolvedServiceId = serviceId ?? services?.[0]?.service.id

const { data: service } = useQuery({
  queryKey: ['service', resolvedServiceId],
  queryFn: () => get<Service>(`/services/${resolvedServiceId}`),
  enabled: Boolean(resolvedServiceId),
})

const { data: deploy, isLoading, error } = useQuery({
  queryKey: ['deploy', resolvedServiceId, id],
  queryFn: () => get<Deploy>(`/deploys/${id}`, { serviceId: resolvedServiceId ?? '' }),
  enabled: Boolean(id && resolvedServiceId),
})

const deploymentName = service?.name ?? deploy?.id ?? 'Deployment'

  const { data: buildLogs } = useQuery({
    queryKey: ['deploy-logs', 'build', resolvedServiceId, id],
    queryFn: () =>
      get<LogsResponse>('/logs', {
        resource: resolvedServiceId ?? undefined,
        type: 'build',
        limit: 50,
        direction: 'backward',
      }),
    enabled: Boolean(resolvedServiceId && activeTab === 'build'),
  })

  const { data: runtimeLogs } = useQuery({
    queryKey: ['deploy-logs', 'runtime', resolvedServiceId, id],
    queryFn: () =>
      get<LogsResponse>('/logs', {
        resource: resolvedServiceId ?? undefined,
        type: 'app',
        limit: 50,
        direction: 'backward',
      }),
    enabled: Boolean(resolvedServiceId && activeTab === 'runtime'),
  })

  const { data: requestLogs } = useQuery({
    queryKey: ['deploy-logs', 'request', resolvedServiceId, id],
    queryFn: () =>
      get<LogsResponse>('/logs', {
        resource: resolvedServiceId ?? undefined,
        type: 'request',
        limit: 50,
        direction: 'backward',
      }),
    enabled: Boolean(resolvedServiceId && activeTab === 'request'),
  })

  const { data: events } = useQuery({
    queryKey: ['deploy-events', resolvedServiceId, id],
    queryFn: () =>
      get<EventsResponse>(`/services/${resolvedServiceId}/events`, { limit: 50 }),
    enabled: Boolean(resolvedServiceId && activeTab === 'events'),
  })

  if (!id) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-red-400">Missing deployment ID.</p>
        <Link to="/deployments" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
          Back to deployments
        </Link>
      </div>
    )
  }

  if (isLoading) return <div className="p-10 text-sm text-gray-400">Loading deployment...</div>
  if (error) return <div className="p-10 text-sm text-red-400">Failed to load deployment: {(error as Error).message}</div>
  if (!deploy) return <div className="p-10 text-sm text-red-400">Deployment not found</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'build', label: 'Build Logs' },
    { key: 'runtime', label: 'Runtime Logs' },
    { key: 'request', label: 'Request Logs' },
    { key: 'events', label: 'Events' },
  ]

  const renderLogs = (logs?: LogsResponse) => {
    if (!logs?.logs?.length) return <p className="text-sm text-gray-500">No logs found.</p>
    return (
      <div className="space-y-1">
        {logs.logs.map((log) => {
          const levelLabel = log.labels.find((l) => l.name === 'level')?.value ?? 'info'
          const time = new Date(log.timestamp).toLocaleTimeString()
          return (
            <div key={log.id} className="flex gap-3 border-b border-gray-800/50 py-1.5 text-xs hover:bg-gray-800/30">
              <span className="w-20 shrink-0 text-gray-500">{time}</span>
              <span className="w-10 shrink-0 text-gray-500">{levelLabel.toUpperCase().slice(0, 5)}</span>
              <span className="flex-1 break-all">{highlight(log.message)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderEvents = () => {
    if (!events?.length) return <p className="text-sm text-gray-500">No events found.</p>
    return (
      <div className="space-y-2">
        {events.map(({ event }) => (
          <div key={event.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-200">{event.type}</span>
              <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
            <pre className="mt-2 overflow-x-auto text-xs text-gray-400">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">{deploymentName}</h2>
          <p className="mt-1 text-xs text-gray-500">
            Deployment #{deploy.id} · Status: {deploy.status} · Trigger: {deploy.trigger}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusColor[deploy.status] ?? 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{deploy.status}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Timing</h3>
          <div className="mt-2 space-y-1 text-xs text-gray-300">
            <p>Started: {deploy.startedAt ? new Date(deploy.startedAt).toLocaleString() : '—'}</p>
            <p>Finished: {deploy.finishedAt ? new Date(deploy.finishedAt).toLocaleString() : '—'}</p>
            <p>Duration: {formatDuration(deploy.startedAt, deploy.finishedAt)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Commit</h3>
          <div className="mt-2 space-y-1 text-xs text-gray-300">
            <p>SHA: {deploy.commit?.id ?? '—'}</p>
            <p>Message: {deploy.commit?.message ?? '—'}</p>
            <p>Created: {deploy.commit?.createdAt ? new Date(deploy.commit.createdAt).toLocaleString() : '—'}</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Service</h3>
          <div className="mt-2 space-y-1 text-xs">
            {service ? (
              <Link to={`/services/${service.id}`} className="text-blue-400 hover:underline">
                {service.name}
              </Link>
            ) : resolvedServiceId ? (
              <Link to={`/services/${resolvedServiceId}`} className="text-blue-400 hover:underline">
                View service
              </Link>
            ) : (
              <span className="text-gray-500">Unknown service</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex gap-2 border-b border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-3 py-2 text-xs ${
                activeTab === tab.key
                  ? 'border-gray-100 text-gray-100'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="py-6">
          {activeTab === 'overview' && (
            <p className="text-sm text-gray-500">
              Deployment overview. Logs and events can be viewed from the service page or via the Logs section.
            </p>
          )}
          {activeTab === 'build' && renderLogs(buildLogs)}
          {activeTab === 'runtime' && renderLogs(runtimeLogs)}
          {activeTab === 'request' && renderLogs(requestLogs)}
          {activeTab === 'events' && renderEvents()}
        </div>
      </div>
    </div>
  )
}
