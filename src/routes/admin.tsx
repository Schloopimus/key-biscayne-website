import { Outlet, createFileRoute } from '@tanstack/react-router'
import { MarketError, MarketShell } from '../components/market/MarketShell'

export const Route = createFileRoute('/admin')({
  component: () => (
    <MarketShell session={null} admin>
      <Outlet />
    </MarketShell>
  ),
  errorComponent: ({ error }) => (
    <MarketShell session={null} admin>
      <MarketError error={error} />
    </MarketShell>
  ),
})
