import { useNavigate, useRouter } from '@tanstack/react-router'
import { redirect } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { logOutVendor } from '../../server/market-vendor.functions'

export const SIGNUP_STORAGE_KEY = 'kbfm-signup'

// ---------- Toast ----------
// A single message shared across market screens, so a toast survives client-side navigation.

let toastMessage = ''
let toastTimer: ReturnType<typeof setTimeout> | undefined
const toastListeners = new Set<(message: string) => void>()

export function showToast(message: string) {
  toastMessage = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => showToastNow(''), 6000)
  toastListeners.forEach((listener) => listener(message))
}

function showToastNow(message: string) {
  toastMessage = message
  toastListeners.forEach((listener) => listener(message))
}

function MarketToast() {
  const [message, setMessage] = useState(toastMessage)
  useEffect(() => {
    toastListeners.add(setMessage)
    return () => {
      toastListeners.delete(setMessage)
    }
  }, [])
  return (
    <div className="fm-toast-region" aria-live="polite">
      {message ? (
        <div className="fm-toast" role="status">
          <span>{message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => showToastNow('')}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}

// ---------- Confirmation dialog ----------

export type ConfirmRequest = {
  title: string
  body: string
  keepLabel: string
  confirmLabel: string
  danger: boolean
  run: () => void | Promise<void>
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  if (!request) return null
  return (
    <div className="fm-modal" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <button type="button" className="fm-modal__scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="fm-modal__panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <h2 id="confirm-title" className="fm-modal__title">
          {request.title}
        </h2>
        <p id="confirm-body" className="fm-modal__body">
          {request.body}
        </p>
        <div className="fm-modal__actions">
          <button type="button" autoFocus className="fm-btn-keep" onClick={onClose}>
            {request.keepLabel}
          </button>
          <button
            type="button"
            className={request.danger ? 'fm-btn-confirm fm-btn-confirm--danger' : 'fm-btn-confirm'}
            onClick={() => {
              onClose()
              void request.run()
            }}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Header ----------

export type MarketSession = { name: string; email: string } | null

type Surface = 'info' | 'light'

const infoLinks = [
  ['market-story', 'Our Story'],
  ['market-find', 'At Market'],
  ['market-vendors', 'Vendors'],
  ['market-booking', 'Booking'],
  ['market-visit', 'Visit'],
] as const

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('') || 'V'
  )
}

function AccountMenu({ session }: { session: NonNullable<MarketSession> }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const router = useRouter()

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (open && !root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function signOut() {
    setOpen(false)
    await logOutVendor()
    await navigate({ to: '/' })
    await router.invalidate()
    showToast("You've signed out.")
  }

  const name = session.name || 'Vendor'
  return (
    <div className="fm-account" ref={root} onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className="fm-account__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        {initials(name)}
      </button>
      {open ? (
        <div className="fm-account__menu" role="menu" aria-label="Account">
          <div className="fm-account__who">
            <div className="fm-account__name">{name}</div>
            <div className="fm-account__email">{session.email}</div>
          </div>
          <a role="menuitem" className="mk-menuitem" href="/vendor/account" onClick={() => setOpen(false)}>
            Account details
          </a>
          <a role="menuitem" className="mk-menuitem" href="/vendor/details" onClick={() => setOpen(false)}>
            Vendor details
          </a>
          <button type="button" role="menuitem" className="mk-menuitem mk-menuitem--danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Logo() {
  return (
    <a className="fm-logo" href="/" aria-label="Farmers Market home">
      <span className="fm-logo__mark" aria-hidden="true">
        <span className="fm-logo__tower" />
        <span className="fm-logo__beam" />
      </span>
      <span className="mk-logotext">
        <span className="fm-logo__name">KEY BISCAYNE</span>
        <span className="fm-logo__sub">COMMUNITY CHURCH</span>
      </span>
    </a>
  )
}

export function MarketHeader({ surface, session, admin = false }: { surface: Surface; session: MarketSession; admin?: boolean }) {
  return (
    <header className={`mk-header fm-header fm-header--${surface}`}>
      <Logo />
      <div className="fm-header__end">
        {surface === 'info' ? (
          <nav aria-label="Market page" className="fm-header__nav">
            {infoLinks.map(([id, label]) => (
              <button key={id} type="button" className="mk-navlink" onClick={() => scrollToSection(id)}>
                {label}
              </button>
            ))}
            <button type="button" className="fm-header__apply" onClick={() => scrollToSection('market-apply')}>
              <span className="mk-long">Apply as a Vendor</span>
              <span className="mk-short">Apply</span>
            </button>
          </nav>
        ) : (
          <nav aria-label="Market" className="fm-header__nav">
            <a className="fm-header__home" href="/">
              Market home
            </a>
          </nav>
        )}
        {session && !admin ? <AccountMenu session={session} /> : null}
      </div>
    </header>
  )
}

export function MarketShell({
  surface = 'light',
  session,
  admin,
  children,
}: {
  surface?: Surface
  session: MarketSession
  admin?: boolean
  children: ReactNode
}) {
  return (
    <div className="fm">
      <MarketHeader surface={surface} session={session} admin={admin} />
      {children}
      <MarketToast />
    </div>
  )
}

// ---------- Loading helpers ----------

const SIGNED_OUT = /Please log in to continue|Please sign in as a market admin/

// Turns a signed-out server error into a redirect to the right login page.
export async function signedIn<T>(load: () => Promise<T>, area: 'vendor' | 'admin'): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof Error && SIGNED_OUT.test(error.message)) {
      throw redirect({ to: area === 'vendor' ? '/vendor/login' : '/admin/login' })
    }
    throw error
  }
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') =>
  error instanceof Error && error.message ? error.message : fallback

export function MarketError({ error }: { error: unknown }) {
  return (
    <div className="fm-screen fm-screen--center">
      <div className="fm-narrow">
        <div className="mk-eyebrow fm-gap-16">FARMERS MARKET</div>
        <h1 className="fm-title-38">This page isn’t available</h1>
        <p className="fm-lede">{errorMessage(error)}</p>
        <a className="fm-link-back" href="/vendor">
          ← Back to dashboard
        </a>
      </div>
    </div>
  )
}
