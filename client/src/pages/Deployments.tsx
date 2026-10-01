import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'

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

export default function Deployments() {
  // For MVP, show latest deploys across services.
  // In a fuller implementation, we'd list all services then fetch deploys per service.
  // Here we surface the most recently updated services' latest deploys.
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<Array<{ service: { id: string; name: string } }>>('/services', { limit: 50 }),
  })

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
      })),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-xl font-semibold text-gray-100">Deployments</h2>
      <p className="mt-1 text-xs text-gray-500">Recent deploys across all services</p>

      {isLoading && <p className="mt-4 text-sm text-gray-400">Loading deployments...</p>}

      <div className="mt-6 space-y-2">
        {allDeploys?.length === 0 && (
          <p className="text-sm text-gray-500">No deployments found.</p>
        )}
        {allDeploys?.map((deploy) => (
          <Link
            key={`${deploy.serviceId}-${deploy.id}`}
            to={`/deployments/${deploy.id}?serviceId=${deploy.serviceId}`}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${statusColor[deploy.status] ?? 'bg-gray-500'}`} />
              <div>
                <p className="text-sm text-gray-200">#{deploy.id}</p>
                <p className="text-xs text-gray-500">
                  {deploy.status} · {deploy.trigger} · {new Date(deploy.createdAt).toLocaleString()}
                </p>
                {deploy.commit && (
                  <p className="text-xs text-gray-500">
                    {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                  </p>
                )}
              </div>
            </div>
            <Rocket size={16} className="text-gray-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
