import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { get } from '../api'
import { Rocket } from 'lucide-react'

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

  if (serviceLoading) return <div className="p-10 text-sm text-gray-400">Loading service...</div>
  if (!service) return <div className="p-10 text-sm text-red-400">Service not found</div>

  const latestDeploy = deploys?.[0]?.deploy

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">{service.name}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {service.type} · {service.serviceDetails.region} · {service.serviceDetails.runtime} · {service.serviceDetails.plan}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${service.suspended === 'not_suspended' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {service.suspended === 'not_suspended' ? 'Live' : 'Suspended'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Service</h3>
          <div className="mt-2 space-y-1 text-xs text-gray-300">
            <p>ID: {service.id}</p>
            <p>Owner: {service.ownerId}</p>
            <p>Branch: {service.branch ?? '—'}</p>
            <p>Autodeploy: {service.autoDeployTrigger ?? '—'}</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Runtime</h3>
          <div className="mt-2 space-y-1 text-xs text-gray-300">
            <p>Runtime: {service.serviceDetails.runtime ?? '—'}</p>
            <p>Plan: {service.serviceDetails.plan ?? '—'}</p>
            <p>Instances: {service.serviceDetails.numInstances ?? '—'}</p>
            {service.serviceDetails.schedule && <p>Schedule: {service.serviceDetails.schedule}</p>}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Links</h3>
          <div className="mt-2 space-y-1 text-xs">
            {service.serviceDetails.url && (
              <a href={service.serviceDetails.url} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">
                Service URL
              </a>
            )}
            <a href={service.dashboardUrl} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">
              Render Dashboard
            </a>
            {service.repo && (
              <a href={service.repo} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">
                Repository
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-100">Latest Deployment</h3>
        {deploysLoading && <p className="mt-2 text-sm text-gray-400">Loading...</p>}
        {latestDeploy && (
          <Link
            to={`/deployments/${latestDeploy.id}?serviceId=${service.id}`}
            className="mt-3 flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
          >
            <span className={`h-2 w-2 rounded-full ${statusColor[latestDeploy.status] ?? 'bg-gray-500'}`} />
            <div className="flex-1">
              <p className="text-sm text-gray-200">#{latestDeploy.id}</p>
              <p className="text-xs text-gray-500">
                {latestDeploy.status} · Triggered {new Date(latestDeploy.createdAt).toLocaleString()}
              </p>
            </div>
            <Rocket size={16} className="text-gray-500" />
          </Link>
        )}
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-gray-100">Recent Deployments</h3>
        <div className="mt-3 space-y-2">
          {deploysLoading && <p className="text-sm text-gray-400">Loading...</p>}
          {deploys?.map(({ deploy }) => (
            <Link
              key={deploy.id}
              to={`/deployments/${deploy.id}?serviceId=${service.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${statusColor[deploy.status] ?? 'bg-gray-500'}`} />
                <div>
                  <p className="text-sm text-gray-200">{deploy.id}</p>
                  <p className="text-xs text-gray-500">
                    {deploy.status} · {deploy.trigger} · {new Date(deploy.createdAt).toLocaleString()}
                  </p>
                  {deploy.commit && (
                    <p className="text-xs text-gray-500">
                      Commit {deploy.commit.id.slice(0, 8)} · {deploy.commit.message}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
