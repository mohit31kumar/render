import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Server, Activity, Rocket } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { StatCard, Card } from '../components/ui/Card'
import { StatusIndicator } from '../components/ui/StatusIndicator'

type Service = {
  id: string
  name: string
  type: string
  suspended: string
  ownerId: string
  updatedAt: string
  serviceDetails: {
    url?: string
    region?: string
    runtime?: string
    plan?: string
    [key: string]: unknown
  }
  branch?: string
}

type Deploy = {
  id: string
  status: string
  trigger: string
  createdAt: string
  finishedAt?: string
  startedAt?: string
  commit?: { id: string; message?: string }
}

const statusToStatus = (suspended: string): 'live' | 'suspended' | 'failed' => {
  if (suspended === 'not_suspended') return 'live'
  return 'suspended'
}

const deployStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
  if (['build_failed', 'update_failed'].includes(status)) return 'danger'
  if (['build_in_progress', 'update_in_progress', 'pre_deploy_in_progress'].includes(status)) return 'info'
  if (['live'].includes(status)) return 'success'
  return 'default'
}

const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function Dashboard() {
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<Array<{ service: Service }>>('/services', { limit: 100 }),
  })

  const serviceIds = (services ?? []).map((s) => s.service.id)
  const serviceNameMap = new Map((services ?? []).map((s) => [s.service.id, s.service.name]))

  const { data: latestDeploys } = useQuery({
    queryKey: ['dashboard-deploys', serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0) return [] as { serviceId: string; deploy: Deploy }[]
      const entries = await Promise.all(
        serviceIds.slice(0, 20).map(async (serviceId) => {
          const deploys = await get<Array<{ deploy: Deploy }>>(`/services/${serviceId}/deploys`, { limit: 1 })
          return { serviceId, deploy: deploys[0]?.deploy }
        }),
      )
      return entries
    },
    enabled: serviceIds.length > 0,
  })

  const serviceList = services ?? []
  const liveCount = serviceList.filter((s) => s.service.suspended === 'not_suspended').length
  const failedCount = serviceList.filter((s) => s.service.suspended !== 'not_suspended').length

  const recentErrors = latestDeploys
    ?.filter((e) => ['build_failed', 'update_failed'].includes(e.deploy?.status ?? ''))
    .slice(0, 5)

  return (
    <div className="page-container">
      <div>
        <h2 className="page-title">Dashboard</h2>
        <p className="page-subtitle">Overview of your Render infrastructure</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Services"
          value={serviceList.length}
          icon={<Server size={14} />}
        />
        <StatCard
          label="Live Services"
          value={liveCount}
          icon={<Activity size={14} className="text-success" />}
        />
        <StatCard
          label="Suspended / Failed"
          value={failedCount}
          icon={<Activity size={14} className="text-danger" />}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="section-heading">Production</h3>
          <div className="mt-3 space-y-2">
            {servicesLoading && <p className="text-sm text-text-muted">Loading...</p>}
            {serviceList.map(({ service }) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="list-row-interactive"
              >
                <div>
                  <p className="text-sm text-text-primary">{service.name}</p>
                  <p className="text-xs text-text-muted">
                    {service.type} · {service.serviceDetails.region} · {service.serviceDetails.runtime}
                  </p>
                </div>
                <StatusIndicator
                  status={statusToStatus(service.suspended)}
                  size="sm"
                />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="section-heading">Latest Deployments</h3>
          <div className="mt-3 space-y-2">
            {latestDeploys?.length === 0 && (
              <p className="text-sm text-text-muted">No deployments found.</p>
            )}
            {latestDeploys?.map(({ serviceId, deploy }) => (
              <Link
                key={`${serviceId}-${deploy?.id}`}
                to={`/deployments/${deploy?.id}?serviceId=${serviceId}`}
                className="list-row-interactive"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {serviceNameMap.get(serviceId) ? `${serviceNameMap.get(serviceId)} · ` : ''}#{deploy?.id}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatStatus(deploy?.status ?? '')} · {deploy?.createdAt ? new Date(deploy.createdAt).toLocaleString() : ''}
                  </p>
                  {deploy?.commit && (
                    <p className="text-xs text-text-muted">
                      {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                    </p>
                  )}
                </div>
                <Rocket size={16} className="text-text-muted shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {recentErrors && recentErrors.length > 0 && (
        <div className="mt-10">
          <h3 className="section-heading">Recent Errors</h3>
          <div className="mt-3 space-y-2">
            {recentErrors.map(({ serviceId, deploy }) => (
              <Link
                key={`${serviceId}-${deploy?.id}`}
                to={`/deployments/${deploy?.id}?serviceId=${serviceId}`}
                className="list-row-interactive"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="danger" dot>Error</Badge>
                    <p className="text-sm text-text-primary truncate">{deploy?.status}</p>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {serviceNameMap.get(serviceId) ? `${serviceNameMap.get(serviceId)} · ` : ''}#{deploy?.id} · {deploy?.createdAt ? new Date(deploy.createdAt).toLocaleString() : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
