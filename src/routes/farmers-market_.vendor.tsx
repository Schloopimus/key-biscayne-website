import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { MarketPortalLayout } from '../components/MarketPortal'

export const Route = createFileRoute('/farmers-market_/vendor')({
  component: VendorPortalLayout,
})

function VendorPortalLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <MarketPortalLayout area="vendor" active={pathname}>
      <Outlet />
    </MarketPortalLayout>
  )
}
