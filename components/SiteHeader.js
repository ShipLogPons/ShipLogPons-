'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Wordmark } from './Logo';
import { NAV_GROUPS, PRIMARY, BOT_URL, X_URL, GITHUB_URL } from '@/lib/nav';
import './header-extra.css';

const isExternal = (href) => /^https?:/.test(href);
const NavLink = ({ href, children, ...rest }) =>
  isExternal(href) || href.startsWith('/api/') ? (
    <a href={href} {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>{children}</a>
  ) : (
    <Link href={href} {...rest}>{children}</Link>
  );

export const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" />
  </svg>
);

export const GitHubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
);

export const PlaneIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M21.4 3.6 2.9 10.8c-1.1.4-1.1 1.9 0 2.3l4.6 1.6 1.8 5.4c.3.9 1.4 1.1 2 .5l2.6-2.4 4.7 3.5c.8.6 1.9.1 2.1-.8l3-15.1c.2-1.2-.9-2.1-2.3-1.6Zm-3.5 4.2-8.1 7.3-.3 3.2-1.3-4 9.2-6.9c.4-.3.8.1.5.4Z" />
  </svg>
);

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const btn = useRef(null);

  useEffect(() => setTheme(currentTheme()), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('shiplog.theme', next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  }

  return (
    <header className="site-head">
      <div className="wrap head-inner">
        <Link href="/" className="wordmark" aria-label="Shiplog home">
          <Wordmark size={30} />
        </Link>
        <nav className="head-nav" aria-label="Main">
          {PRIMARY.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="head-tools">
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
            )}
          </button>
          <Link href="/explore" className="icon-btn search" aria-label="Search builders">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          </Link>
          <a href={GITHUB_URL} className="icon-btn gh" target="_blank" rel="noopener noreferrer" aria-label="Shiplog source code on GitHub">
            <GitHubIcon size={19} />
          </a>
          <a href={X_URL} className="icon-btn x" target="_blank" rel="noopener noreferrer" aria-label="Shiplog on X">
            <XIcon size={18} />
          </a>
          <a href={BOT_URL} className="icon-btn tg" target="_blank" rel="noopener noreferrer" aria-label="Open Shiplog in Telegram">
            <span className="tg-dot" style={{ width: 26, height: 26 }}><PlaneIcon size={14} /></span>
          </a>
          <button ref={btn} type="button" className="icon-btn" aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="menu-panel" id="site-menu">
          <div className="menu-sheet">
            <nav className="menu-groups" aria-label="All pages">
              {NAV_GROUPS.map((g) => (
                <div key={g.title}>
                  <h3>{g.title}</h3>
                  <ul>
                    {g.links.map(([href, label]) => (
                      <li key={href}><NavLink href={href}>{label}</NavLink></li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <a className="menu-tg" href={BOT_URL} target="_blank" rel="noopener noreferrer">
              <span className="tg-dot"><PlaneIcon /></span>
              <span>
                <strong>Open Shiplog in Telegram</strong>
                <small>@ShipLogPonsBot</small>
              </span>
            </a>
            <a className="menu-tg" href={X_URL} target="_blank" rel="noopener noreferrer">
              <span className="tg-dot"><XIcon /></span>
              <span>
                <strong>Follow Shiplog on X</strong>
                <small>@ShipLogPons</small>
              </span>
            </a>
            <a className="menu-tg" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <span className="tg-dot"><GitHubIcon /></span>
              <span>
                <strong>Source code on GitHub</strong>
                <small>ShipLogPons/shiplogpons-</small>
              </span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
