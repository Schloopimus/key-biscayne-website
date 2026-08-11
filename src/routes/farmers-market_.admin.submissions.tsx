import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { PortalEmptyState, PortalError, PortalPageHeading, StatusPill } from '../components/MarketPortal'
import { archivePublicSubmission, listPublicSubmissions } from '../server/submissions.functions'

export const Route = createFileRoute('/farmers-market_/admin/submissions')({
  head: () => ({ meta: [{ title: 'Public Form Inbox | Local Admin' }] }),
  loader: () => listPublicSubmissions(),
  component: PublicSubmissionsPage,
})

function PublicSubmissionsPage() {
  const router = useRouter()
  const submissions = Route.useLoaderData()
  const [filter, setFilter] = useState<'all' | 'contact' | 'volunteer' | 'school'>('all')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const visibleSubmissions = submissions.filter(
    (submission) => filter === 'all' || submission.type === filter,
  )

  async function archive(submissionId: string) {
    setBusyId(submissionId)
    setError('')
    try {
      await archivePublicSubmission({ data: { submissionId } })
      await router.invalidate()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The submission could not be archived.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <PortalPageHeading
        eyebrow="Local public inbox"
        title="Church form submissions"
        body="Contact, volunteer, and school-interest forms persist here because email delivery is not connected."
      />
      {error ? <PortalError message={error} /> : null}
      <div className="portal-toolbar">
        <label>
          <span>Submission type</span>
          <select value={filter} onChange={(event) => setFilter(event.currentTarget.value as typeof filter)}>
            <option value="all">All forms</option>
            <option value="contact">Contact</option>
            <option value="volunteer">Volunteer</option>
            <option value="school">School interest</option>
          </select>
        </label>
        <span>{visibleSubmissions.length} saved locally</span>
      </div>

      {visibleSubmissions.length === 0 ? (
        <PortalEmptyState title="Inbox is empty" body="Submit one of the public forms to exercise the local persistence flow." />
      ) : (
        <div className="portal-stack">
          {visibleSubmissions.map((submission) => {
            let details: Record<string, unknown> = {}
            try {
              details = JSON.parse(submission.detailsJson) as Record<string, unknown>
            } catch {
              details = {}
            }

            return (
              <article key={submission.id} className="portal-card submission-card">
                <div className="portal-card__heading">
                  <div>
                    <p className="eyebrow">{submission.type}</p>
                    <h2>{submission.submitterName}</h2>
                  </div>
                  <StatusPill status={submission.status} />
                </div>
                <dl className="portal-details">
                  <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
                  {submission.phone ? <div><dt>Phone</dt><dd>{submission.phone}</dd></div> : null}
                  {submission.topic ? <div><dt>Topic</dt><dd>{submission.topic}</dd></div> : null}
                  {submission.subject ? <div><dt>Subject</dt><dd>{submission.subject}</dd></div> : null}
                  <div><dt>Saved</dt><dd>{new Date(submission.createdAt).toLocaleString()}</dd></div>
                  {typeof details.ageOrGrade === 'string' ? <div><dt>Age / grade</dt><dd>{details.ageOrGrade}</dd></div> : null}
                  {typeof details.desiredStartDate === 'string' && details.desiredStartDate ? <div><dt>Desired date</dt><dd>{details.desiredStartDate}</dd></div> : null}
                </dl>
                {submission.message ? <p className="submission-message">{submission.message}</p> : null}
                {submission.status === 'new' ? (
                  <button className="text-link" type="button" onClick={() => archive(submission.id)} disabled={busyId === submission.id}>
                    {busyId === submission.id ? 'Archiving…' : 'Mark archived →'}
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
