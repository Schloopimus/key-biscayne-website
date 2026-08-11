import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AdminSummaryTabs, PortalEmptyState, PortalPageHeading } from '../components/MarketPortal'
import { getAdminDashboard, listAdminVendors } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/vendors')({
  head: () => ({ meta: [{ title: 'Vendors | Market Admin' }] }),
  loader: async () => {
    const [vendors, dashboard] = await Promise.all([listAdminVendors(), getAdminDashboard()])
    return { vendors, dashboard }
  },
  component: AdminVendorsPage,
})

function AdminVendorsPage() {
  const { vendors, dashboard } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const filteredVendors = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return vendors
    return vendors.filter((vendor) =>
      [
        vendor.application?.businessName,
        vendor.application?.productCategory,
        vendor.contactName,
        vendor.email,
        vendor.application?.phone,
      ].some((value) => value?.toLowerCase().includes(normalized)),
    )
  }, [query, vendors])

  return (
    <section className="admin-vendors-screen">
      <PortalPageHeading
        eyebrow="Market admin"
        title="Dashboard"
        action={<a className="portal-back-link" href="/farmers-market">← Log out</a>}
      />
      <AdminSummaryTabs counts={dashboard.counts} active="vendors" />
      <label className="admin-search">
        <span className="sr-only">Search vendors</span>
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search by business, contact …" />
      </label>
      {vendors.length === 0 ? (
        <PortalEmptyState title="No vendors yet" body="The directory is created as local vendor applications are submitted." />
      ) : (
        <section className="portal-table-card" aria-label="Vendor directory">
          <div className="portal-table portal-table--vendors" role="table">
            <div className="portal-table__header" role="row">
              <span role="columnheader">Business name</span>
              <span role="columnheader">Product category</span>
              <span role="columnheader">Contact name</span>
              <span role="columnheader">Phone</span>
              <span role="columnheader">Health Dept. Certificate</span>
            </div>
            {filteredVendors.map((vendor) => (
              <div className="portal-table__row" role="row" key={vendor.id}>
                <span role="cell" data-label="Business name">{vendor.application?.businessName ?? 'Application incomplete'}</span>
                <span role="cell" data-label="Product category">{vendor.application?.productCategory ?? '—'}</span>
                <span role="cell" data-label="Contact name">{vendor.contactName}</span>
                <span role="cell" data-label="Phone">{vendor.application?.phone ?? '—'}</span>
                <span role="cell" data-label="Health Dept. Certificate">
                  {vendor.application?.certificateFileName ? (
                    <a href={`/api/local-demo/certificates/${vendor.application.id}`}>view dept. certificate</a>
                  ) : '—'}
                </span>
              </div>
            ))}
          </div>
          {filteredVendors.length === 0 ? <p className="admin-search-empty">No vendors match that search.</p> : null}
        </section>
      )}
      <p className="admin-pagination">Page 1/1 →</p>
    </section>
  )
}
