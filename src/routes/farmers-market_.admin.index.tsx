import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminSummaryTabs, PortalEmptyState, PortalError, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { getAdminDashboard, reviewVendorApplication } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/')({
  head: () => ({ meta: [{ title: 'Market Admin | Key Biscayne Farmers Market' }] }),
  loader: () => getAdminDashboard(),
  component: AdminDashboard,
})

function AdminDashboard() {
  const dashboard = Route.useLoaderData()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function decide(applicationId: string, decision: 'approved' | 'rejected') {
    const reason = decision === 'rejected' ? window.prompt('Rejection reason for the vendor:')?.trim() : undefined
    if (decision === 'rejected' && !reason) return
    setBusyId(applicationId)
    setError('')
    try {
      await reviewVendorApplication({ data: { applicationId, decision, reason } })
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The application decision could not be saved.')
      setBusyId('')
    }
  }

  return (
    <section className="admin-dashboard-screen">
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dashboard"
        action={<a className="portal-back-link" href="/farmers-market">← Log out</a>}
      />
      {error ? <PortalError message={error} /> : null}
      <AdminSummaryTabs counts={dashboard.counts} active="applications" />

      {dashboard.pendingApplications.length === 0 ? (
        <PortalEmptyState title="Queue is clear" body="New local vendor applications will appear here." />
      ) : (
        <section className="admin-review-list" aria-label="Pending vendor applications">
          {dashboard.pendingApplications.map((application) => (
            <article key={application.id} className="admin-review-row">
              <div>
                <div className="admin-review-row__title">
                  <h2>{application.businessName}</h2>
                  <StatusPill status="pending" />
                </div>
                <p>{application.productCategory} · {application.contactName} · {application.email}</p>
                <a href={`/farmers-market/admin/applications/${application.id}`}>view application</a>
              </div>
              <div className="button-row">
                <button className="button button--market-dark" type="button" onClick={() => decide(application.id, 'approved')} disabled={busyId === application.id}>
                  Approve
                </button>
                <button className="button portal-button--danger" type="button" onClick={() => decide(application.id, 'rejected')} disabled={busyId === application.id}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  )
}
