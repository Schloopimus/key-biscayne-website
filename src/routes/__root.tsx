import { useEffect, type ReactNode } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'Key Biscayne Community Church & Day School',
      },
      {
        name: 'description',
        content:
          'A sacred community on Key Biscayne gathering to worship, nurture, and serve.',
      },
      { name: 'theme-color', content: '#12496f' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:ital,wght@0,600;0,700;1,600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <RootDocument>
      <HashScrollManager />
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function HashScrollManager() {
  const href = useRouterState({ select: (state) => state.location.href })

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    const scrollToHash = () => {
      const target = document.getElementById(decodeURIComponent(hash))
      const scroller = target?.closest<HTMLElement>('.snap-page')
      if (!target || !scroller) return

      const previousBehavior = scroller.style.scrollBehavior
      scroller.style.scrollBehavior = 'auto'
      scroller.scrollTop = target.offsetTop
      scroller.style.scrollBehavior = previousBehavior
    }
    const frame = window.requestAnimationFrame(scrollToHash)
    const timeout = window.setTimeout(scrollToHash, 250)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [href])

  return null
}

function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>This page hasn’t found its place yet.</h1>
      <a className="button button--primary" href="/">
        Return home <span aria-hidden="true">→</span>
      </a>
    </main>
  )
}
