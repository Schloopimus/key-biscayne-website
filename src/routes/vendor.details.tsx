import { createFileRoute } from '@tanstack/react-router'
import { signedIn } from '../components/market/MarketShell'
import { StatusBadge, statusKey } from '../components/market/StatusBadge'
import { DocumentList, FieldList, documentRows } from '../components/market/VendorRecord'
import { ACKS, ackKeys, vendorTypeLabel } from '../market/rules'
import { getVendorProfile } from '../server/market-vendor.functions'

export const Route = createFileRoute('/vendor/details')({
  head: () => ({ meta: [{ title: 'Vendor details | Farmers Market' }] }),
  loader: () => signedIn(() => getVendorProfile(), 'vendor'),
  component: VendorDetailsPage,
})

function VendorDetailsPage() {
  const { me } = Route.useLoaderData()
  const incomplete = me.status === 'in_progress'

  return (
    <main id="main-content" className="fm-screen fm-screen--page fm-bg-paper">
      <div className="fm-wrap-980">
        <div className="fm-details__head">
          <div>
            <div className="mk-eyebrow fm-gap-12">YOUR APPLICATION</div>
            <h1 className="fm-title-48">Vendor details</h1>
          </div>
          <StatusBadge status={statusKey(me)} />
        </div>
        {incomplete ? (
          <div className="fm-infobar">
            <span>Some details will appear here once you finish your application.</span>
            <a href="/vendor/application">{me.detailsDone ? 'Continue application →' : 'Finish application →'}</a>
          </div>
        ) : null}
        <div className="ad-split">
          <div className="fm-stack-18">
            <div className="fm-panel-sm">
              <div className="ad-section fm-gap-16">Contact</div>
              <div className="mk-g2 fm-fields-grid">
                <FieldList
                  strong
                  fields={[
                    ['NAME', me.name],
                    ['BUSINESS OR FARM', me.business],
                    ['EMAIL', me.email],
                    ['TELEPHONE', me.phone],
                    ['CATEGORY', me.category],
                    ['VENDOR TYPE', me.category ? vendorTypeLabel(me.category) : ''],
                  ]}
                />
              </div>
            </div>
            <div className="fm-panel-sm">
              <div className="ad-section fm-gap-16">Business</div>
              <div className="fm-stack-14">
                <FieldList
                  fields={[
                    ['BUSINESS ADDRESS', me.address],
                    ['WEBSITE OR SOCIAL MEDIA', me.website],
                    ['PRODUCTS', me.products],
                    ['PRICE RANGE', me.priceRange],
                    ['TARGET MARKET', me.targetMarket],
                    ['NOTES', me.notes],
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="fm-stack-18">
            <div className="fm-panel-sm">
              <div className="ad-section fm-gap-16">Documents</div>
              <DocumentList rows={documentRows(me)} missing="Not provided yet" missingTone="muted" />
            </div>
            <div className="fm-panel-sm">
              <div className="ad-section fm-gap-12">Agreements</div>
              <ul className="fm-agreements">
                {ackKeys(me.category).map((k) => {
                  const ok = me.acks.includes(k)
                  return (
                    <li key={k}>
                      <span>{ACKS[k].title}</span>
                      <span className={ok ? 'is-ok' : undefined}>{ok ? 'Agreed ✓' : 'Not yet'}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
        <p className="fm-viewonly">These details are view only. To change them, contact the market office.</p>
        <a className="fm-link-green fm-mt-18 fm-inline-block" href="/vendor">
          ← Back to dashboard
        </a>
      </div>
    </main>
  )
}
