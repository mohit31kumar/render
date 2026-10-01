import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Activity } from 'lucide-react'

type Service = {
  id: string
  name: string
  type: string
  suspended: string
  ownerId: string
  createdAt: string
  updatedAt: string
  dashboardUrl: string
  serviceDetails: {
    url?: string
    region?: string
    runtime?: string
    plan?: string
    numInstances?: number
    schedule?: string
    [key: string]: unknown
  }
  branch?: string
}

type ServicesResponse = Array<{ service: Service; cursor: string }>

export default function Services() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<ServicesResponse>('/services', { limit: 100 }),
  })

  const services = data ?? []

  const typeLabel: Record<string, string> = {
    web_service: 'Web Service',
    private_service: 'Private Service',
    background_worker: 'Worker',
    cron_job: 'Cron Job',
    static_site: 'Static Site',
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">Services</h2>
        <span className="text-xs text-gray-500">{services.length} total</span>
      </div>

      {isLoading && <p className="mt-4 text-sm text-gray-400">Loading services...</p>}
      {error && <p className="mt-4 text-sm text-red-400">Failed to load services</p>}

      <div className="mt-6 grid gap-4">
        {services.map(({ service }) => (
          <Link
            key={service.id}
            to={`/services/${service.id}`}
            className="block rounded-lg border border-gray-800 bg-gray-900 p-4 hover:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-100">{service.name}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {typeLabel[service.type] ?? service.type} · {service.serviceDetails.region ?? '—'} · {service.serviceDetails.runtime ?? '—'} · {service.serviceDetails.plan ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${service.suspended === 'not_suspended' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">
                  {service.suspended === 'not_suspended' ? 'Live' : 'Suspended'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              {service.serviceDetails.url && (
                <a href={service.serviceDetails.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  {service.serviceDetails.url}
                </a>
              )}
              <a href={service.dashboardUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                Dashboard
              </a>
              {service.branch && <span>Branch: {service.branch}</span>}
              {service.serviceDetails.schedule && <span>Schedule: {service.serviceDetails.schedule}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
