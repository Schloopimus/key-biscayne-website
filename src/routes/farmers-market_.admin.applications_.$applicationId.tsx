import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { PortalError, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { getApplicationForAdmin, reviewVendorApplication } from '../server/market-admin.functions'

export const Route = createFileRoute('/farmers-market_/admin/applications_/$applicationId')({
  head: () => ({ meta: [{ title: 'Review Vendor Application | Market Admin' }] }),
  loader: ({ params }) => getApplicationForAdmin({ data: { applicationId: params.applicationId } }),
  component: ApplicationReviewPage,
})

function ApplicationReviewPage() {
  const router = useRouter()
  const { application, history } = Route.useLoaderData()
  const [status, setStatus] = useState<'idle' | 'saving'>('idle')
  const [error, setError] = useState('')

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'saving') return
    const formData = new FormData(event.currentTarget)
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const decision = submitter instanceof HTMLButtonElement ? submitter.value : null
    if (decision !== 'approved' && decision !== 'rejected') return

    setStatus('saving')
    setError('')
    try {
      await reviewVendorApplication({
        data: {
          applicationId: application.id,
          decision,
          reason: String(formData.get('reason') ?? ''),
        },
      })
      await router.invalidate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The decision could not be saved.')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <>
      <PortalPageHeading
        eyebrow={`Application revision ${application.revision}`}
        title={application.businessName}
        body="Review the submitted business details and locally stored certificate before making a decision."
      />
      {error ? <PortalError message={error} /> : null}

      <div className="application-review-grid">
        <section className="portal-card">
          <div className="portal-card__heading">
            <h2>Application details</h2>
            <StatusPill status={application.status} />
          </div>
          <dl className="portal-details">
            <div><dt>Category</dt><dd>{application.productCategory}</dd></div>
            <div><dt>Contact</dt><dd>{application.contactName}</dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${application.email}`}>{application.email}</a></dd></div>
            <div><dt>Phone</dt><dd>{application.phone}</dd></div>
            <div><dt>Submitted</dt><dd>{new Date(application.submittedAt).toLocaleString()}</dd></div>
            <div><dt>Certificate</dt><dd>{application.certificateFileName} · {Math.ceil(application.certificateSize / 1024)} KB</dd></div>
          </dl>
          <div className="portal-prose">
            <h3>Business details</h3>
            <p>{application.details}</p>
          </div>
          <a className="button portal-button--secondary" href={`/api/local-demo/certificates/${application.id}`}>
            Download certificate
          </a>
        </section>

        <aside className="portal-stack">
          <section className="portal-card">
            <p className="eyebrow">Admin decision</p>
            <h2>{application.status === 'pending' ? 'Review application' : 'Decision recorded'}</h2>
            {application.status === 'pending' ? (
              <form className="portal-form" onSubmit={review}>
                <label>
                  <span>Rejection reason</span>
                  <textarea name="reason" rows={5} placeholder="Required only when rejecting. This is shown to the vendor." />
                </label>
                <div className="button-row">
                  <button className="button button--market-dark" name="decision" value="approved" type="submit" disabled={status === 'saving'}>
                    Approve
                  </button>
                  <button className="button portal-button--danger" name="decision" value="rejected" type="submit" disabled={status === 'saving'}>
                    Reject
                  </button>
                </div>
              </form>
            ) : (
              <div className="portal-callout">
                <StatusPill status={application.status} />
                {application.rejectionReason ? <p>{application.rejectionReason}</p> : <p>The vendor may now book an open stall.</p>}
              </div>
            )}
          </section>

          <section className="portal-card">
            <p className="eyebrow">Revision history</p>
            <h2>Application record</h2>
            <ol className="revision-list">
              {history.map((revision) => (
                <li key={revision.id}>
                  <div><strong>Revision {revision.revision}</strong><small>{new Date(revision.submittedAt).toLocaleString()}</small></div>
                  <StatusPill status={revision.status} />
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      <a className="arrow-link" href="/farmers-market/admin/applications"><span>Back to applications</span><span>→</span></a>
    </>
  )
}
