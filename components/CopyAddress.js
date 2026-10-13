'use client';

import { useState } from 'react';

// A contract address in mono, with copy and explorer buttons.
export default function CopyAddress({ address, href }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <span className="addr">
      <span className="addr-chip" title={address}>{address.slice(0, 6)}…{address.slice(-4)}</span>
      <button type="button" className="addr-btn" onClick={copy} aria-label={copied ? 'Address copied' : 'Copy contract address'}>
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></svg>
        )}
      </button>
      {href && (
        <a className="addr-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label="Open in explorer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>
        </a>
      )}
      <span className="sr" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </span>
  );
}
