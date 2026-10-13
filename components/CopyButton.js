'use client';

import { useState } from 'react';

export default function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button type="button" className="btn btn-quiet" onClick={copy} aria-live="polite">
      {copied ? 'Copied' : label}
    </button>
  );
}
