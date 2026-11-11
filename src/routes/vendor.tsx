import { Outlet, createFileRoute } from '@tanstack/react-router'
import { MarketError, MarketShell } from '../components/market/MarketShell'
import { getVendorSession } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor')({
  loader: () => getVendorSession(),
  component: VendorLayout,
  errorComponent: ({ error }) => (
    <MarketShell session={null}>
      <MarketError error={error} />
    </MarketShell>
  ),
})

function VendorLayout() {
  const session = Route.useLoaderData()
  return (
    <MarketShell session={session}>
      <Outlet />
    </MarketShell>
  )
}
