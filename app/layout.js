import Link from 'next/link';
import './globals.css';
import './features.css';
import './polish.css';
import SiteHeader from '@/components/SiteHeader';
import { Wordmark } from '@/components/Logo';
import { NAV_GROUPS } from '@/lib/nav';
import { SITE } from '@/lib/telegram';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Shiplog: who is really building on Pons', template: '%s | Shiplog' },
  description:
    'Shiplog reads every Pons launch on Robinhood Chain from the chain itself and shows which ones have a builder shipping real code, with a link to the proof.',
  twitter: { card: 'summary_large_image', site: '@ShipLogPons', creator: '@ShipLogPons' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f4f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1114' },
  ],
};

// Applies the saved theme before first paint, so there is no flash.
const THEME_SCRIPT = "try{var t=localStorage.getItem('shiplog.theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@400..600&display=swap" />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <nav className="foot-groups" aria-label="Footer">
              {NAV_GROUPS.map((g) => (
                <div key={g.title}>
                  <h3>{g.title}</h3>
                  <ul>
                    {g.links.map(([href, label]) => (
                      <li key={href}>
                        {/^https?:/.test(href) || href.startsWith('/api/') ? (
                          <a href={href} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
                        ) : (
                          <Link href={href}>{label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="foot-meta">
              <div>
                <Wordmark size={26} />
                <p>
                  Every launch is read from the Pons contracts. Builders are verified by their own GitHub README. Market numbers
                  come from DexScreener and are context only. Community tool, not affiliated with Pons or Robinhood. Not
                  financial advice.
                </p>
              </div>
              <p className="foot-chain">Robinhood Chain, chain ID 4663</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
