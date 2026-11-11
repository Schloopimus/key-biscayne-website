import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { MarketShell } from '../components/market/MarketShell'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'The Key Biscayne Farmers Market' },
      {
        name: 'description',
        content: 'Local growers, bakers, and makers on the Key Biscayne Community Church plaza every Saturday, 9AM – 12PM.',
      },
      { name: 'theme-color', content: '#2f7a56' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <RootDocument>
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

function NotFound() {
  return (
    <MarketShell session={null}>
      <main id="main-content" className="fm-screen fm-screen--center fm-bg-mint">
        <div className="fm-narrow">
          <div className="mk-eyebrow fm-gap-16">404</div>
          <h1 className="fm-title-38 fm-gap-14">This page isn’t here</h1>
          <p className="fm-lede fm-gap-24">The link may be old. The market page has everything else.</p>
          <a className="fm-btn-primary fm-block" href="/">
            Back to the market →
          </a>
        </div>
      </main>
    </MarketShell>
  )
}
