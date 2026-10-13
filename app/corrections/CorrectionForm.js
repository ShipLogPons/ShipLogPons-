'use client';

import { useState } from 'react';

export default function CorrectionForm() {
  const [form, setForm] = useState({ page: '', what: '', contact: '', website: '' });
  const [state, setState] = useState({ busy: false, error: '', id: null });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: '', id: null });
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.ok) setState({ busy: false, error: j.error || 'The report was not sent. Try again.', id: null });
      else {
        setState({ busy: false, error: '', id: j.id });
        setForm({ page: '', what: '', contact: '', website: '' });
      }
    } catch {
      setState({ busy: false, error: 'Shiplog could not be reached. Check your connection and send again.', id: null });
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="c-page">Page link (optional)</label>
        <input id="c-page" value={form.page} onChange={set('page')} placeholder="shiplog…/project/…" autoComplete="off" spellCheck={false} />
      </div>
      <div className="field">
        <label htmlFor="c-what">What is wrong</label>
        <textarea id="c-what" value={form.what} onChange={set('what')} rows={4} required minLength={10} maxLength={1200} placeholder="What the page says, and what is correct" />
      </div>
      <div className="field">
        <label htmlFor="c-contact">Your X or Telegram handle (optional)</label>
        <input id="c-contact" value={form.contact} onChange={set('contact')} placeholder="@name" autoComplete="off" />
        <span className="help">Only used to ask you a question about the report. Never published.</span>
      </div>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} name="website" />
      <div>
        <button className="btn" type="submit" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send report'}</button>
      </div>
      {state.error && <p className="alert" role="alert">{state.error}</p>}
      {state.id != null && (
        <p className="alert ok" role="status">Report #{state.id} sent. Once it is fixed it will be listed on this page.</p>
      )}
    </form>
  );
}
