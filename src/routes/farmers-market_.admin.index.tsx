import { createFileRoute } from '@tanstack/react-router'
import { PortalEmptyState, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { getAdminDashboard } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/')({
  head: () => ({ meta: [{ title: 'Market Admin | Key Biscayne Farmers Market' }] }),
  loader: () => getAdminDashboard(),
  component: AdminDashboard,
})

function AdminDashboard() {
  const dashboard = Route.useLoaderData()
  const metrics = [
    { label: 'Vendor applications', value: dashboard.counts.pendingApplications, note: 'pending review' },
    { label: 'All vendors', value: dashboard.counts.approvedVendors, note: 'approved applications' },
    { label: 'Stall bookings', value: dashboard.counts.activeBookings, note: 'active reservations' },
    { label: 'Market dates', value: dashboard.counts.openDates, note: 'open for booking' },
  ]

  return (
    <>
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dashboard"
        body="Review applications, manage Saturday inventory, and inspect local reservations."
      />
      <section className="portal-metrics" aria-label="Market overview">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.note}</span>
          </article>
        ))}
      </section>

      <div className="portal-dashboard-grid">
        <section className="portal-card">
          <div className="portal-card__heading">
            <div>
              <p className="eyebrow">Vendor applications</p>
              <h2>Pending review</h2>
            </div>
            <a className="arrow-link" href="/farmers-market/admin/applications"><span>View all</span><span>→</span></a>
          </div>
          {dashboard.pendingApplications.length === 0 ? (
            <PortalEmptyState title="Queue is clear" body="New local vendor applications will appear here." />
          ) : (
            <div className="portal-list">
              {dashboard.pendingApplications.map((application) => (
                <a key={application.id} className="portal-list-row" href={`/farmers-market/admin/applications/${application.id}`}>
                  <div>
                    <strong>{application.businessName}</strong>
                    <span>{application.productCategory} · {application.contactName}</span>
                  </div>
                  <StatusPill status="pending" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="portal-card">
          <div className="portal-card__heading">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h2>Recent activity</h2>
            </div>
          </div>
          {dashboard.recentActivity.length === 0 ? (
            <p>No local activity has been recorded.</p>
          ) : (
            <ol className="activity-list">
              {dashboard.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{activity.summary}</strong>
                    <small>{new Date(activity.createdAt).toLocaleString()}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
