import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { and, eq, gt, lt } from 'drizzle-orm'
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDatabase } from '../db'
import * as schema from '../db/schema'

const VENDOR_COOKIE = 'kbfm_vendor'
const ADMIN_COOKIE = 'kbfm_admin'
const VENDOR_SESSION_MS = 30 * 24 * 60 * 60 * 1000
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString('base64')}:${key.toString('base64')}`
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  const [scheme, saltText, keyText] = stored.split(':')
  if (scheme !== 'scrypt' || !saltText || !keyText) return false
  const expected = Buffer.from(keyText, 'base64')
  const actual = scryptSync(password, Buffer.from(saltText, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

type Kind = 'vendor' | 'admin'

const cookieName = (kind: Kind) => (kind === 'vendor' ? VENDOR_COOKIE : ADMIN_COOKIE)

export function startSession(kind: Kind, subjectId: string) {
  const token = newToken()
  const lifetime = kind === 'vendor' ? VENDOR_SESSION_MS : ADMIN_SESSION_MS
  const database = getDatabase()
  database.delete(schema.marketSessions).where(lt(schema.marketSessions.expiresAt, Date.now())).run()
  database
    .insert(schema.marketSessions)
    .values({
      tokenHash: hashToken(token),
      kind,
      subjectId,
      expiresAt: Date.now() + lifetime,
      createdAt: new Date().toISOString(),
    })
    .run()
  setCookie(cookieName(kind), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(lifetime / 1000),
  })
}

export function endSession(kind: Kind) {
  const token = getCookie(cookieName(kind))
  if (token) {
    getDatabase().delete(schema.marketSessions).where(eq(schema.marketSessions.tokenHash, hashToken(token))).run()
  }
  deleteCookie(cookieName(kind), { path: '/' })
}

export function endAllSessions(kind: Kind, subjectId: string) {
  getDatabase()
    .delete(schema.marketSessions)
    .where(and(eq(schema.marketSessions.kind, kind), eq(schema.marketSessions.subjectId, subjectId)))
    .run()
}

export function sessionSubject(kind: Kind) {
  const token = getCookie(cookieName(kind))
  if (!token) return null
  const session = getDatabase()
    .select()
    .from(schema.marketSessions)
    .where(
      and(
        eq(schema.marketSessions.tokenHash, hashToken(token)),
        eq(schema.marketSessions.kind, kind),
        gt(schema.marketSessions.expiresAt, Date.now()),
      ),
    )
    .get()
  return session?.subjectId ?? null
}

export class SignedOutError extends Error {
  constructor(kind: Kind) {
    super(kind === 'vendor' ? 'Please log in to continue.' : 'Please sign in as a market admin.')
  }
}

export function currentVendor() {
  const id = sessionSubject('vendor')
  if (!id) return null
  return getDatabase().select().from(schema.marketVendors).where(eq(schema.marketVendors.id, id)).get() ?? null
}

export function requireVendor() {
  const vendor = currentVendor()
  if (!vendor) throw new SignedOutError('vendor')
  return vendor
}

export function requireAdmin() {
  const id = sessionSubject('admin')
  const admin = id
    ? getDatabase().select().from(schema.marketAdmins).where(eq(schema.marketAdmins.id, id)).get()
    : null
  if (!admin) throw new SignedOutError('admin')
  return admin
}

// Market admins come from KBCC_ADMIN_EMAIL / KBCC_ADMIN_PASSWORD. The account is created the first time
// those credentials are used, so no admin password is ever stored in the repository.
export function ensureConfiguredAdmin(email: string) {
  const configuredEmail = process.env.KBCC_ADMIN_EMAIL?.trim().toLowerCase()
  const configuredPassword = process.env.KBCC_ADMIN_PASSWORD
  const database = getDatabase()
  const existing = database.select().from(schema.marketAdmins).where(eq(schema.marketAdmins.email, email)).get()
  if (existing) return existing
  if (!configuredEmail || !configuredPassword || configuredEmail !== email) return null
  const admin = {
    id: `admin-${crypto.randomUUID()}`,
    email,
    passwordHash: hashPassword(configuredPassword),
    createdAt: new Date().toISOString(),
  }
  database.insert(schema.marketAdmins).values(admin).run()
  return admin
}

export function adminConfigured() {
  const database = getDatabase()
  const any = database.select({ id: schema.marketAdmins.id }).from(schema.marketAdmins).limit(1).get()
  return !!any || (!!process.env.KBCC_ADMIN_EMAIL && !!process.env.KBCC_ADMIN_PASSWORD)
}
