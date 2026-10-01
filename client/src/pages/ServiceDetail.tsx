import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatusIndicator } from '../components/ui/StatusIndicator'

type Service = {
  id: string
  name: string
  type: string
  suspended: string
  ownerId: string
  createdAt: string
  updatedAt: string
  dashboardUrl: string
  branch?: string
  repo?: string
  autoDeployTrigger?: string
  serviceDetails: {
    url?: string
    region?: string
    runtime?: string
    plan?: string
    numInstances?: number
    schedule?: string
    healthCheckPath?: string
    buildCommand?: string
    startCommand?: string
    publishPath?: string
    [key: string]: unknown
  }
}

type Deploy = {
  id: string
  status: string
  trigger: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  commit?: { id: string; message?: string; createdAt?: string }
}

type DeploysResponse = Array<{ deploy: Deploy; cursor: string }>

type Status = 'live' | 'suspended' | 'building' | 'failed' | 'pending' | 'unknown'

const statusMap = (suspended: string): 'live' | 'suspended' | 'failed' => {
  if (suspended === 'not_suspended') return 'live'
  return 'suspended'
}

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

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => get<Service>(`/services/${id}`),
    enabled: Boolean(id),
  })

  const { data: deploys, isLoading: deploysLoading } = useQuery({
    queryKey: ['service-deploys', id],
    queryFn: () => get<DeploysResponse>(`/services/${id}/deploys`, { limit: 20 }),
    enabled: Boolean(id),
  })

  if (serviceLoading) return <div className="page-container text-sm text-text-muted">Loading service...</div>
  if (!service) return <div className="page-container text-sm text-danger">Service not found</div>

  const latestDeploy = deploys?.[0]?.deploy
  const latestStatus = latestDeploy ? deployStatusConfig[latestDeploy.status] : null

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">{service.name}</h2>
          <p className="page-subtitle">
            {service.type} · {service.serviceDetails.region} · {service.serviceDetails.runtime} · {service.serviceDetails.plan}
          </p>
        </div>
        <StatusIndicator status={statusMap(service.suspended)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <h3 className="label text-text-muted">Service</h3>
          <div className="mt-2 space-y-1 text-xs text-text-secondary">
            <p>ID: {service.id}</p>
            <p>Owner: {service.ownerId}</p>
            <p>Branch: {service.branch ?? '—'}</p>
            <p>Autodeploy: {service.autoDeployTrigger ?? '—'}</p>
          </div>
        </Card>
        <Card>
          <h3 className="label text-text-muted">Runtime</h3>
          <div className="mt-2 space-y-1 text-xs text-text-secondary">
            <p>Runtime: {service.serviceDetails.runtime ?? '—'}</p>
            <p>Plan: {service.serviceDetails.plan ?? '—'}</p>
            <p>Instances: {service.serviceDetails.numInstances ?? '—'}</p>
            {service.serviceDetails.schedule && <p>Schedule: {service.serviceDetails.schedule}</p>}
          </div>
        </Card>
        <Card>
          <h3 className="label text-text-muted">Links</h3>
          <div className="mt-2 space-y-1 text-xs">
            {service.serviceDetails.url && (
              <a href={service.serviceDetails.url} target="_blank" rel="noreferrer" className="block text-info hover:underline">
                Service URL
              </a>
            )}
            <a href={service.dashboardUrl} target="_blank" rel="noreferrer" className="block text-info hover:underline">
              Render Dashboard
            </a>
            {service.repo && (
              <a href={service.repo} target="_blank" rel="noreferrer" className="block text-info hover:underline">
                Repository
              </a>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <h3 className="section-heading">Latest Deployment</h3>
        {deploysLoading && <p className="mt-2 text-sm text-text-muted">Loading...</p>}
        {latestDeploy && latestStatus && (
          <Link
            to={`/deployments/${latestDeploy.id}?serviceId=${service.id}`}
            className="list-row-interactive mt-3"
          >
            <StatusIndicator status={latestStatus.status} label={latestStatus.label} size="md" />
            <div className="flex-1 ml-3">
              <p className="text-sm text-text-primary">
                {service.name} · #{latestDeploy.id}
              </p>
              <p className="text-xs text-text-muted">
                Triggered {latestDeploy.createdAt ? new Date(latestDeploy.createdAt).toLocaleString() : ''}
              </p>
            </div>
            <Rocket size={16} className="text-text-muted shrink-0" />
          </Link>
        )}
      </div>

      <div className="mt-10">
        <h3 className="section-heading">Recent Deployments</h3>
        <div className="mt-3 space-y-2">
          {deploysLoading && <p className="text-sm text-text-muted">Loading...</p>}
          {deploys?.map(({ deploy }) => {
            const ds = deployStatusConfig[deploy.status]
            return (
              <Link
                key={deploy.id}
                to={`/deployments/${deploy.id}?serviceId=${service.id}`}
                className="list-row-interactive"
              >
                <div className="flex items-center gap-3">
                  <StatusIndicator
                    status={ds?.status ?? 'unknown'}
                    label={ds?.label ?? formatStatus(deploy.status)}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {service.name} · #{deploy.id}
                    </p>
                    <p className="text-xs text-text-muted">
                      {deploy.trigger} · {deploy.createdAt ? new Date(deploy.createdAt).toLocaleString() : ''}
                    </p>
                    {deploy.commit && (
                      <p className="text-xs text-text-muted">
                        Commit {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
