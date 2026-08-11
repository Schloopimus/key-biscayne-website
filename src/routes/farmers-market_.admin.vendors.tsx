import { createFileRoute } from '@tanstack/react-router'
import { PortalEmptyState, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { listAdminVendors } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/vendors')({
  head: () => ({ meta: [{ title: 'Vendors | Market Admin' }] }),
  loader: () => listAdminVendors(),
  component: AdminVendorsPage,
})

function AdminVendorsPage() {
  const vendors = Route.useLoaderData()

  return (
    <>
      <PortalPageHeading
        eyebrow="Market admin"
        title="Vendor directory"
        body="Local vendor identities and their latest immutable application revision."
      />
      {vendors.length === 0 ? (
        <PortalEmptyState title="No vendors yet" body="The directory is created as local vendor applications are submitted." />
      ) : (
        <section className="portal-table-card" aria-label="Vendor directory">
          <div className="portal-table portal-table--vendors" role="table">
            <div className="portal-table__header" role="row">
              <span role="columnheader">Business</span>
              <span role="columnheader">Contact</span>
              <span role="columnheader">Email</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Application</span>
            </div>
            {vendors.map((vendor) => (
              <div className="portal-table__row" role="row" key={vendor.id}>
                <span role="cell" data-label="Business"><strong>{vendor.application?.businessName ?? 'Application incomplete'}</strong><small>{vendor.application?.productCategory}</small></span>
                <span role="cell" data-label="Contact">{vendor.contactName}</span>
                <span role="cell" data-label="Email"><a href={`mailto:${vendor.email}`}>{vendor.email}</a></span>
                <span role="cell" data-label="Status"><StatusPill status={vendor.application?.status ?? 'not-applied'} /></span>
                <span role="cell" data-label="Application">
                  {vendor.application ? <a href={`/farmers-market/admin/applications/${vendor.application.id}`}>Revision {vendor.application.revision} →</a> : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
