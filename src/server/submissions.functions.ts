import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { getDatabase } from './db'
import { formSubmissions } from './db/schema'

type SubmissionType = 'contact' | 'volunteer' | 'school'

type PublicSubmissionInput = {
  type: SubmissionType
  submitterName: string
  email: string
  phone: string | null
  topic: string | null
  subject: string | null
  message: string | null
  detailsJson: string
}

function requiredField(formData: FormData, name: string, label: string, maximum = 200) {
  const value = formData.get(name)
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} is required.`)
  if (value.trim().length > maximum) throw new Error(`${label} is too long.`)
  return value.trim()
}

function optionalField(formData: FormData, name: string, maximum = 2_000) {
  const value = formData.get(name)
  if (typeof value !== 'string' || value.trim().length === 0) return null
  if (value.trim().length > maximum) throw new Error(`${name} is too long.`)
  return value.trim()
}

function validateSubmission(formData: FormData): PublicSubmissionInput {
  const type = requiredField(formData, 'submissionType', 'Submission type')
  if (type !== 'contact' && type !== 'volunteer' && type !== 'school') {
    throw new Error('Unknown submission type.')
  }

  const emailField = type === 'school' ? 'guardianEmail' : 'email'
  const email = requiredField(formData, emailField, 'Email address', 320)
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.')

  if (type === 'contact') {
    return {
      type,
      submitterName: `${requiredField(formData, 'firstName', 'First name')} ${requiredField(formData, 'lastName', 'Last name')}`,
      email,
      phone: null,
      topic: optionalField(formData, 'topic', 100),
      subject: optionalField(formData, 'subject', 200),
      message: optionalField(formData, 'message'),
      detailsJson: '{}',
    }
  }

  if (type === 'volunteer') {
    return {
      type,
      submitterName: `${requiredField(formData, 'firstName', 'First name')} ${requiredField(formData, 'lastName', 'Last name')}`,
      email,
      phone: null,
      topic: optionalField(formData, 'helpArea', 100),
      subject: 'Volunteer interest',
      message: optionalField(formData, 'message'),
      detailsJson: '{}',
    }
  }

  const programmes = formData
    .getAll('programmes')
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (programmes.length === 0) throw new Error('Choose at least one programme.')

  const phone = requiredField(formData, 'guardianPhone', 'Phone number', 60)
  const ageOrGrade = requiredField(formData, 'ageOrGrade', 'Age or grade', 100)
  const desiredStartDate = optionalField(formData, 'desiredStartDate', 20)
  const notes = optionalField(formData, 'notes')

  return {
    type,
    submitterName: `${requiredField(formData, 'childFirstName', 'Child first name')} ${requiredField(formData, 'childLastName', 'Child last name')}`,
    email,
    phone,
    topic: programmes.join(', '),
    subject: 'School registration interest',
    message: notes,
    detailsJson: JSON.stringify({ ageOrGrade, programmes, desiredStartDate }),
  }
}

export const submitPublicForm = createServerFn({ method: 'POST' })
  .validator(validateSubmission)
  .handler(async ({ data }) => {
    
    const createdAt = new Date().toISOString()
    const id = `submission-${crypto.randomUUID()}`

    getDatabase().insert(formSubmissions).values({ id, ...data, status: 'new', createdAt }).run()
    return { id, createdAt }
  })

export const listPublicSubmissions = createServerFn({ method: 'GET' }).handler(async () => {
  

  return getDatabase().select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt)).limit(100).all()
})

export const archivePublicSubmission = createServerFn({ method: 'POST' })
  .validator((data: { submissionId: string }) => {
    if (!data.submissionId.startsWith('submission-')) throw new Error('Invalid submission.')
    return data
  })
  .handler(async ({ data }) => {
    

    getDatabase()
      .update(formSubmissions)
      .set({ status: 'archived' })
      .where(eq(formSubmissions.id, data.submissionId))
      .run()

    return { submissionId: data.submissionId }
  })
