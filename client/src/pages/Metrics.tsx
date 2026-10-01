import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { get } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Activity } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

type MetricSeries = {
  labels: Array<{ field: string; value: string }>
  values: Array<{ timestamp: string; value: number; unit: string }>
  unit: string
}

function toChartData(series: MetricSeries[] | undefined) {
  if (!series?.length) return []
  const map = new Map<string, { timestamp: string; [key: string]: number | string }>()
  series.forEach((s, idx) => {
    const label = s.labels.map((l) => l.value).join('-') || `series-${idx + 1}`
    s.values.forEach((v) => {
      const key = v.timestamp
      const entry = map.get(key) ?? { timestamp: new Date(v.timestamp).toLocaleTimeString() }
      entry[label] = Number(v.value.toFixed(2))
      map.set(key, entry)
    })
  })
  return Array.from(map.values())
}

const metrics = [
  { key: 'cpu', label: 'CPU Usage' },
  { key: 'memory', label: 'Memory Usage' },
  { key: 'http-requests', label: 'HTTP Requests' },
  { key: 'http-latency', label: 'HTTP Latency' },
  { key: 'bandwidth', label: 'Bandwidth' },
  { key: 'disk-usage', label: 'Disk Usage' },
  { key: 'instance-count', label: 'Instance Count' },
] as const

export default function Metrics() {
  const [resource, setResource] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [metric, setMetric] = useState<string>('cpu')
  const [resolution, setResolution] = useState('60')

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => get<Array<{ service: { id: string; name: string } }>>('/services', { limit: 100 }),
  })

  const { data: metricData, isLoading, refetch } = useQuery({
    queryKey: ['metrics', metric, resource, startTime, endTime, resolution],
    queryFn: () => {
      const params: Record<string, string | number | boolean | undefined> = {
        resource: resource || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        resolutionSeconds: Number(resolution),
      }
      return get<MetricSeries[]>(`/metrics/${metric}`, params)
    },
    enabled: false,
  })

  function loadMetrics() {
    refetch()
  }

  const chartData = toChartData(metricData)

  return (
    <div className="page-container">
      <h2 className="page-title">Metrics</h2>
      <p className="page-subtitle">View resource metrics over time</p>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <Select label="Service / Resource" value={resource} onChange={(e) => setResource(e.target.value)}>
            <option value="">Select a service</option>
            {services?.map(({ service }) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Select label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label">Start time</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="2024-01-01T00:00:00Z"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">End time</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="2024-01-01T01:00:00Z"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Resolution (s)</label>
          <input
            type="number"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            min={30}
            className="form-input"
          />
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={loadMetrics} size="sm">Load Metrics</Button>
      </div>

      {isLoading && <p className="mt-4 text-sm text-text-muted">Loading metrics...</p>}

      {!isLoading && metricData && (
        <Card className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-text-muted" />
            <h3 className="card text-text-primary">
              {metrics.find((m) => m.key === metric)?.label ?? metric}
            </h3>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-text-muted">No data available for the selected time range.</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4DAD2" />
                  <XAxis dataKey="timestamp" stroke="#8C8282" fontSize={12} />
                  <YAxis stroke="#8C8282" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E4DAD2', borderRadius: 8 }}
                    labelStyle={{ color: '#292323' }}
                  />
                  <Legend />
                  {Object.keys(chartData[0] ?? {})
                    .filter((k) => k !== 'timestamp')
                    .map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 6]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
