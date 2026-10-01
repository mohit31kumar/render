import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Activity, Rocket, Server } from 'lucide-react'

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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-xl font-semibold text-gray-100">Dashboard</h2>
      <p className="mt-1 text-xs text-gray-500">Overview of your Render infrastructure</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Server size={14} /> Total services
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-100">{serviceList.length}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={14} className="text-green-500" /> Live
          </div>
          <p className="mt-2 text-2xl font-semibold text-green-400">{liveCount}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={14} className="text-red-500" /> Failed / Suspended
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-400">{failedCount}</p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Production</h3>
          <div className="mt-3 space-y-2">
            {servicesLoading && <p className="text-sm text-gray-400">Loading...</p>}
            {serviceList.map(({ service }) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700"
              >
                <div>
                  <p className="text-sm text-gray-200">{service.name}</p>
                  <p className="text-xs text-gray-500">
                    {service.type} · {service.serviceDetails.region} · {service.serviceDetails.runtime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${service.suspended === 'not_suspended' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-400">
                    {service.suspended === 'not_suspended' ? 'Live' : 'Suspended'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-100">Latest Deployments</h3>
          <div className="mt-3 space-y-2">
            {latestDeploys?.length === 0 && (
              <p className="text-sm text-gray-500">No deployments found.</p>
            )}
            {latestDeploys?.map(({ serviceId, deploy }) => (
              <Link
                key={`${serviceId}-${deploy?.id}`}
                to={`/deployments/${deploy?.id}?serviceId=${serviceId}`}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700"
              >
                <div>
                  <p className="text-sm text-gray-200">
                    {serviceNameMap.get(serviceId) ? `${serviceNameMap.get(serviceId)} · ` : ''}#{deploy?.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    {deploy?.status} · {new Date(deploy?.createdAt ?? '').toLocaleString()}
                  </p>
                  {deploy?.commit && (
                    <p className="text-xs text-gray-500">
                      {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                    </p>
                  )}
                </div>
                <Rocket size={16} className="text-gray-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {recentErrors && recentErrors.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-gray-100">Recent Errors</h3>
          <div className="mt-3 space-y-2">
            {recentErrors.map(({ serviceId, deploy }) => (
              <Link
                key={`${serviceId}-${deploy?.id}`}
                to={`/deployments/${deploy?.id}?serviceId=${serviceId}`}
                className="flex items-center justify-between rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 hover:border-red-900"
              >
                <div>
                  <p className="text-sm text-red-200">{deploy?.status}</p>
                  <p className="text-xs text-gray-500">
                    {serviceNameMap.get(serviceId) ? `${serviceNameMap.get(serviceId)} · ` : ''}#{deploy?.id} · {new Date(deploy?.createdAt ?? '').toLocaleString()}
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
