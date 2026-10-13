'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SubmitForm() {
  const [form, setForm] = useState({ repo: '', token: '', name: '' });
  const [state, setState] = useState({ busy: false, error: '', done: null });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: '', done: null });
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.ok) setState({ busy: false, error: j.error || 'Submission failed. Try again.', done: null });
      else setState({ busy: false, error: '', done: j });
    } catch {
      setState({ busy: false, error: 'Shiplog could not be reached. Check your connection and submit again.', done: null });
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="repo">GitHub repository</label>
        <input id="repo" value={form.repo} onChange={set('repo')} placeholder="github.com/owner/repo" required autoComplete="off" spellCheck={false} />
      </div>
      <div className="field">
        <label htmlFor="token">Pons token address (optional)</label>
        <input id="token" value={form.token} onChange={set('token')} placeholder="0x…" autoComplete="off" spellCheck={false} />
        <span className="help">Leave empty if the project has no token.</span>
      </div>
      <div className="field">
        <label htmlFor="name">Project name (optional)</label>
        <input id="name" value={form.name} onChange={set('name')} placeholder="Taken from the token if empty" autoComplete="off" />
      </div>
      <div>
        <button className="btn" type="submit" disabled={state.busy}>
          {state.busy ? 'Checking README…' : 'Submit project'}
        </button>
      </div>
      {state.error && (
        <p className="alert" role="alert">{state.error}</p>
      )}
      {state.done && (
        <p className="alert ok" role="status">
          Submitted and verified: github.com/{state.done.repo}
          {state.done.token ? ' is tied to its Pons token.' : ' is listed as a Robinhood Chain builder.'} It appears in{' '}
          <Link href="/explore?status=verified">Builders</Link> within a few minutes.
        </p>
      )}
    </form>
  );
}
