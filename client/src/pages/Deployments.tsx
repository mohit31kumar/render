import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatusIndicator } from '../components/ui/StatusIndicator'
import { Badge } from '../components/ui/Badge'

type Deploy = {
  id: string
  status: string
  trigger: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  commit?: { id: string; message?: string }
  serviceId?: string
}

type DeploysResponse = Array<{ deploy: Deploy; cursor: string }>

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

export default function Deployments() {
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<Array<{ service: { id: string; name: string } }>>('/services', { limit: 50 }),
  })

  const serviceMap = new Map((services ?? []).map((s) => [s.service.id, s.service.name]))
  const serviceIds = (services ?? []).map((s) => s.service.id)

  const { data: deploysMap, isLoading } = useQuery({
    queryKey: ['all-deploys', serviceIds],
    queryFn: async () => {
      const entries = await Promise.all(
        serviceIds.slice(0, 20).map(async (serviceId) => {
          const deploys = await get<DeploysResponse>(`/services/${serviceId}/deploys`, { limit: 5 })
          return { serviceId, deploys }
        }),
      )
      return entries
    },
    enabled: serviceIds.length > 0,
  })

  const allDeploys = deploysMap
    ?.flatMap((entry) =>
      entry.deploys.map((d) => ({
        ...d.deploy,
        serviceId: entry.serviceId,
        serviceName: serviceMap.get(entry.serviceId),
      })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="page-container">
      <h2 className="page-title">Deployments</h2>
      <p className="page-subtitle">Recent deploys across all services</p>

      {isLoading && (
        <div className="mt-6 space-y-2">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {allDeploys?.length === 0 && (
          <p className="text-sm text-text-muted">No deployments found.</p>
        )}
        {allDeploys?.map((deploy) => {
          const ds = deployStatusConfig[deploy.status]
          return (
            <Link
              key={`${deploy.serviceId}-${deploy.id}`}
              to={`/deployments/${deploy.id}?serviceId=${deploy.serviceId}`}
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
                    {deploy.serviceName ? `${deploy.serviceName} · ` : ''}#{deploy.id}
                  </p>
                  <p className="text-xs text-text-muted">
                    {deploy.trigger} · {deploy.createdAt ? new Date(deploy.createdAt).toLocaleString() : ''}
                  </p>
                  {deploy.commit && (
                    <p className="text-xs text-text-muted">
                      {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                    </p>
                  )}
                </div>
              </div>
              <Rocket size={16} className="text-text-muted shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
