import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { get } from '../api'
import { Activity } from 'lucide-react'
import { Card } from '../components/ui/Card'
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

const typeLabel: Record<string, string> = {
  web_service: 'Web Service',
  private_service: 'Private Service',
  background_worker: 'Worker',
  cron_job: 'Cron Job',
  static_site: 'Static Site',
}

const statusMap = (suspended: string): 'live' | 'suspended' => {
  return suspended === 'not_suspended' ? 'live' : 'suspended'
}

export default function Services() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<ServicesResponse>('/services', { limit: 100 }),
  })

  const services = data ?? []

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Services</h2>
        <span className="text-xs text-text-muted">{services.length} total</span>
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      )}
      {error && (
        <div className="mt-4">
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">Failed to load services</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {services.map(({ service }) => (
          <Link
            key={service.id}
            to={`/services/${service.id}`}
            className="card-interactive block"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="card text-text-primary">{service.name}</h3>
                <p className="mt-1 text-xs text-text-muted">
                  {typeLabel[service.type] ?? service.type} · {service.serviceDetails.region ?? '—'} · {service.serviceDetails.runtime ?? '—'} · {service.serviceDetails.plan ?? '—'}
                </p>
              </div>
              <StatusIndicator status={statusMap(service.suspended)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-muted">
              {service.serviceDetails.url && (
                <a href={service.serviceDetails.url} target="_blank" rel="noreferrer" className="text-info hover:underline">
                  {service.serviceDetails.url}
                </a>
              )}
              <a href={service.dashboardUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">
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
