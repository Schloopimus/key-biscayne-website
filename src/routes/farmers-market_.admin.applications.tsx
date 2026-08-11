import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PortalEmptyState, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { listVendorApplications } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/applications')({
  head: () => ({ meta: [{ title: 'Vendor Applications | Market Admin' }] }),
  loader: () => listVendorApplications(),
  component: ApplicationsQueue,
})

function ApplicationsQueue() {
  const applications = Route.useLoaderData()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const visibleApplications = applications.filter(
    (application) => filter === 'all' || application.status === filter,
  )

  return (
    <>
      <PortalPageHeading
        eyebrow="Market admin"
        title="Vendor applications"
        body="Review every immutable application revision and its current decision."
      />
      <div className="portal-toolbar">
        <label>
          <span>Filter status</span>
          <select value={filter} onChange={(event) => setFilter(event.currentTarget.value as typeof filter)}>
            <option value="all">All applications</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <span>{visibleApplications.length} shown</span>
      </div>

      {visibleApplications.length === 0 ? (
        <PortalEmptyState title="No matching applications" body="Change the status filter or submit a vendor application from the local vendor demo." />
      ) : (
        <section className="portal-table-card" aria-label="Vendor applications">
          <div className="portal-table portal-table--applications" role="table">
            <div className="portal-table__header" role="row">
              <span role="columnheader">Business</span>
              <span role="columnheader">Contact</span>
              <span role="columnheader">Revision</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Submitted</span>
              <span role="columnheader">Action</span>
            </div>
            {visibleApplications.map((application) => (
              <div className="portal-table__row" role="row" key={application.id}>
                <span role="cell" data-label="Business"><strong>{application.businessName}</strong><small>{application.productCategory}</small></span>
                <span role="cell" data-label="Contact">{application.contactName}<small>{application.email}</small></span>
                <span role="cell" data-label="Revision">#{application.revision}</span>
                <span role="cell" data-label="Status"><StatusPill status={application.status} /></span>
                <span role="cell" data-label="Submitted">{new Date(application.submittedAt).toLocaleDateString()}</span>
                <span role="cell" data-label="Action"><a href={`/farmers-market/admin/applications/${application.id}`}>View application →</a></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
