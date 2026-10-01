import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { Tabs } from '../components/ui/Tabs'

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

type Tab = 'overview' | 'build' | 'runtime' | 'request' | 'events'

type Status = 'live' | 'suspended' | 'building' | 'failed' | 'pending' | 'unknown'

const deployStatusConfig: Record<string, { status: Status; label: string }> = {
  live: { status: 'live', label: 'Live' },
  build_failed: { status: 'failed', label: 'Build Failed' },
  update_failed: { status: 'failed', label: 'Update Failed' },
  canceled: { status: 'suspended', label: 'Canceled' },
  build_in_progress: { status: 'building', label: 'Building' },
  update_in_progress: { status: 'building', label: 'Updating' },
  queued: { status: 'pending', label: 'Queued' },
  created: { status: 'pending', label: 'Created' },
  pre_deploy_in_progress: { status: 'building', label: 'Preparing' },
  pre_deploy_failed: { status: 'failed', label: 'Pre-Deploy Failed' },
  deactivated: { status: 'suspended', label: 'Deactivated' },
}

const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDuration(started?: string, finished?: string): string {
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
      return <span key={i} className="text-emerald-400">{part}</span>
    }
    return <span key={i} className="text-text-secondary">{part}</span>
  })
}

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
      <div className="page-container">
        <p className="text-sm text-danger">Missing deployment ID.</p>
        <Link to="/deployments" className="mt-4 inline-block text-sm text-info hover:underline">
          Back to deployments
        </Link>
      </div>
    )
  }

  if (isLoading) return <div className="page-container text-sm text-text-muted">Loading deployment...</div>
  if (error) return <div className="page-container text-sm text-danger">Failed to load deployment: {(error as Error).message}</div>
  if (!deploy) return <div className="page-container text-sm text-danger">Deployment not found</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'build', label: 'Build Logs' },
    { key: 'runtime', label: 'Runtime Logs' },
    { key: 'request', label: 'Request Logs' },
    { key: 'events', label: 'Events' },
  ]

  const renderLogs = (logs?: LogsResponse) => {
    if (!logs?.logs?.length) return <p className="text-sm text-text-muted">No logs found.</p>
    return (
      <div className="space-y-1">
        {logs.logs.map((log) => {
          const time = new Date(log.timestamp).toLocaleTimeString()
          return (
            <div key={log.id} className="log-row">
              <span className="w-20 shrink-0 text-text-muted">{time}</span>
              <span className="w-10 shrink-0 text-text-muted">{log.labels.find((l) => l.name === 'level')?.value?.toUpperCase().slice(0, 5) ?? 'INFO'}</span>
              <span className="flex-1 break-all text-text-secondary">{highlight(log.message)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderEvents = () => {
    if (!events?.length) return <p className="text-sm text-text-muted">No events found.</p>
    return (
      <div className="space-y-2">
        {events.map(({ event }) => (
          <Card key={event.id} variant="elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">{event.type}</span>
              <span className="text-xs text-text-muted">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
            <pre className="mt-2 overflow-x-auto text-xs text-text-secondary">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </Card>
        ))}
      </div>
    )
  }

  const deployStatus = deployStatusConfig[deploy.status]
  const ds = deployStatus ?? { status: 'unknown' as Status, label: formatStatus(deploy.status) }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">{deploymentName}</h2>
          <p className="page-subtitle">
            Deployment #{deploy.id} · Status: {formatStatus(deploy.status)} · Trigger: {deploy.trigger}
          </p>
        </div>
        <StatusIndicator status={ds.status} label={ds.label} size="md" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <h3 className="label text-text-muted">Timing</h3>
          <div className="mt-2 space-y-1 text-xs text-text-secondary">
            <p>Started: {deploy.startedAt ? new Date(deploy.startedAt).toLocaleString() : '—'}</p>
            <p>Finished: {deploy.finishedAt ? new Date(deploy.finishedAt).toLocaleString() : '—'}</p>
            <p>Duration: {formatDuration(deploy.startedAt, deploy.finishedAt)}</p>
          </div>
        </Card>
        <Card>
          <h3 className="label text-text-muted">Commit</h3>
          <div className="mt-2 space-y-1 text-xs text-text-secondary">
            <p>SHA: {deploy.commit?.id ?? '—'}</p>
            <p>Message: {deploy.commit?.message ?? '—'}</p>
            <p>Created: {deploy.commit?.createdAt ? new Date(deploy.commit.createdAt).toLocaleString() : '—'}</p>
          </div>
        </Card>
        <Card>
          <h3 className="label text-text-muted">Service</h3>
          <div className="mt-2 space-y-1 text-xs">
            {service ? (
              <Link to={`/services/${service.id}`} className="text-info hover:underline">
                {service.name}
              </Link>
            ) : resolvedServiceId ? (
              <Link to={`/services/${resolvedServiceId}`} className="text-info hover:underline">
                View service
              </Link>
            ) : (
              <span className="text-text-muted">Unknown service</span>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Tabs
          tabs={tabs.map((t) => ({ key: t.key, label: t.label }))}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as Tab)}
        />
        <div className="py-6">
          {activeTab === 'overview' && (
            <p className="text-sm text-text-muted">
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
