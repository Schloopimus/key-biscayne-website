import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { MarketPortalLayout } from '../components/MarketPortal'

export const Route = createFileRoute('/farmers-market_/admin')({
  component: AdminPortalLayout,
})

function AdminPortalLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <MarketPortalLayout area="admin" active={pathname}>
      <Outlet />
    </MarketPortalLayout>
  )
}
