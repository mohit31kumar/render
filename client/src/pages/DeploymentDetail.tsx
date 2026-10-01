import { useQuery } from '@tanstack/react-query'
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

export default function DeploymentDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const { data: deploy, isLoading } = useQuery({
    queryKey: ['deploy', serviceId, id],
    queryFn: () => get<Deploy>(`/deploys/${id}`, { serviceId: serviceId ?? '' }),
    enabled: Boolean(id && serviceId),
  })

  if (isLoading) return <div className="p-10 text-sm text-gray-400">Loading deployment...</div>
  if (!deploy) return <div className="p-10 text-sm text-red-400">Deployment not found</div>

  const tabs = [
    { label: 'Overview', href: '#' },
    { label: 'Build Logs', href: `#build` },
    { label: 'Runtime Logs', href: '#runtime' },
    { label: 'Request Logs', href: '#request' },
    { label: 'Events', href: '#events' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Deployment #{deploy.id}</h2>
          <p className="mt-1 text-xs text-gray-500">
            Status: {deploy.status} · Trigger: {deploy.trigger}
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
            <Link to={`/services/${serviceId}`} className="text-blue-400 hover:underline">
              View service
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex gap-2 border-b border-gray-800">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              to={tab.href}
              className="border-b-2 border-transparent px-3 py-2 text-xs text-gray-400 hover:text-gray-200"
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="py-6">
          <p className="text-sm text-gray-500">
            Deployment overview. Logs and events can be viewed from the service page or via the Logs section.
          </p>
        </div>
      </div>
    </div>
  )
}
