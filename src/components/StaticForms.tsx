import { useState, type FormEvent, type ReactNode } from 'react'
import { submitPublicForm } from '../server/submissions.functions'

type FormShellProps = {
  children: ReactNode
  submissionType: 'contact' | 'volunteer' | 'school'
  successMessage: string
  className?: string
}

function FormShell({ children, submissionType, successMessage, className = '' }: FormShellProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    const form = event.currentTarget
    setStatus('submitting')
    setError('')

    try {
      await submitPublicForm({ data: new FormData(form) })
      form.reset()
      setStatus('submitted')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The response could not be saved.')
      setStatus('idle')
    }
  }

  if (status === 'submitted') {
    return (
      <div className={`form-success ${className}`} role="status">
        <span aria-hidden="true">✓</span>
        <h3>Thank you for reaching out.</h3>
        <p>{successMessage}</p>
        <button className="text-link" type="button" onClick={() => setStatus('idle')}>
          Send another response →
        </button>
      </div>
    )
  }

  return (
    <form className={`static-form ${className}`} onSubmit={submit} aria-busy={status === 'submitting'}>
      <input type="hidden" name="submissionType" value={submissionType} />
      {children}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {status === 'submitting' ? <p className="form-progress" role="status">Saving locally…</p> : null}
    </form>
  )
}

export function ContactForm() {
  return (
    <FormShell
      submissionType="contact"
      successMessage="Your message is saved in the local demo inbox. Email delivery is not connected."
    >
      <div className="field-row">
        <label>
          <span>First name *</span>
          <input name="firstName" autoComplete="given-name" required />
        </label>
        <label>
          <span>Last name *</span>
          <input name="lastName" autoComplete="family-name" required />
        </label>
      </div>
      <label>
        <span>Email address *</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>I’d like more information on</span>
        <select name="topic" defaultValue="">
          <option value="" disabled>
            Choose a topic
          </option>
          <option>Sunday worship</option>
          <option>Community School</option>
          <option>Farmers Market</option>
          <option>Outreach & volunteering</option>
          <option>Something else</option>
        </select>
      </label>
      <label>
        <span>Subject</span>
        <input name="subject" />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={4} />
      </label>
      <button className="button button--gold" type="submit">
        Send a message <span aria-hidden="true">→</span>
      </button>
    </FormShell>
  )
}

export function VolunteerForm() {
  return (
    <FormShell
      submissionType="volunteer"
      className="static-form--sand"
      successMessage="Your volunteer interest is saved in the local demo inbox. Email delivery is not connected."
    >
      <div className="field-row">
        <label>
          <span>First name *</span>
          <input name="firstName" autoComplete="given-name" required />
        </label>
        <label>
          <span>Last name *</span>
          <input name="lastName" autoComplete="family-name" required />
        </label>
      </div>
      <label>
        <span>Email address *</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>I’d like to help with</span>
        <select name="helpArea" defaultValue="">
          <option value="" disabled>
            Choose an area
          </option>
          <option>Worship team</option>
          <option>Youth ministry</option>
          <option>Outreach</option>
          <option>Wherever needed most</option>
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={5} />
      </label>
      <button className="button button--gold" type="submit">
        Send a message <span aria-hidden="true">→</span>
      </button>
    </FormShell>
  )
}

const programmes = ['Day School (Ages 2–5)', 'After-School Enrichment', 'Summer Camp'] as const

export function SchoolInterestForm() {
  const [selected, setSelected] = useState<ReadonlyArray<string>>([programmes[0]])

  function toggle(programme: string) {
    setSelected((items) =>
      items.includes(programme) ? items.filter((item) => item !== programme) : [...items, programme],
    )
  }

  function choose(programme: string) {
    setSelected([programme])
    document.getElementById('registration-fields')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <div className="school-registration">
      <div className="programme-tabs" aria-label="Choose a programme">
        {programmes.map((programme) => (
          <button
            key={programme}
            className={selected.includes(programme) ? 'is-active' : undefined}
            type="button"
            onClick={() => choose(programme)}
          >
            {programme.replace(' (Ages 2–5)', '')}
          </button>
        ))}
      </div>
      <FormShell
        submissionType="school"
        className="static-form--dark"
        successMessage="Your registration interest is saved in the local demo inbox. Email delivery is not connected."
      >
        <div id="registration-fields" className="field-group">
          <p>Child’s name</p>
          <div className="field-row">
            <label>
              <span>First name *</span>
              <input name="childFirstName" required />
            </label>
            <label>
              <span>Last name *</span>
              <input name="childLastName" required />
            </label>
          </div>
        </div>
        <div className="field-group">
          <p>Parent / guardian contact</p>
          <div className="field-row">
            <label>
              <span>Email address *</span>
              <input name="guardianEmail" type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Phone number *</span>
              <input name="guardianPhone" type="tel" autoComplete="tel" required />
            </label>
          </div>
        </div>
        <label>
          <span>Child’s age / grade *</span>
          <input name="ageOrGrade" placeholder="e.g. Age 4, or Grade 2" required />
        </label>
        <fieldset>
          <legend>Programme of interest</legend>
          <div className="checkbox-list">
            {programmes.map((programme) => (
              <label key={programme}>
                <input
                  type="checkbox"
                  name="programmes"
                  value={programme}
                  checked={selected.includes(programme)}
                  onChange={() => toggle(programme)}
                />
                <span>{programme}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          <span>Desired start date</span>
          <input name="desiredStartDate" type="date" />
        </label>
        <label>
          <span>Anything else we should know?</span>
          <textarea name="notes" rows={4} placeholder="Questions or scheduling needs…" />
        </label>
        <button className="button button--gold" type="submit">
          Submit registration interest <span aria-hidden="true">→</span>
        </button>
      </FormShell>
    </div>
  )
}
