import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Deployments from './pages/Deployments'
import DeploymentDetail from './pages/DeploymentDetail'
import Logs from './pages/Logs'
import Metrics from './pages/Metrics'
import Settings from './pages/Settings'

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/services', element: <Services /> },
      { path: '/services/:id', element: <ServiceDetail /> },
      { path: '/deployments', element: <Deployments /> },
      { path: '/deployments/:id', element: <DeploymentDetail /> },
      { path: '/logs', element: <Logs /> },
      { path: '/metrics', element: <Metrics /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
