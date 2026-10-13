import { readJSON, writeJSON } from './store';
import { send, esc, hasBot, SITE } from './telegram';

const EMPTY = { admin: null, seq: 0, items: [] };

export async function getCorrections() {
  const doc = await readJSON('corrections', EMPTY);
  return { ...EMPTY, ...doc, items: doc.items || [] };
}

export const saveCorrections = (doc) => writeJSON('corrections', { ...doc, items: doc.items.slice(0, 500) });

const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function addCorrection({ page, what, contact }) {
  const item = { page: clean(page, 300), what: clean(what, 1200), contact: clean(contact, 80) };
  if (item.what.length < 10) return { ok: false, error: 'Describe what is wrong in at least a few words.' };
  const doc = await getCorrections();
  doc.seq = (doc.seq || 0) + 1;
  const saved = { id: doc.seq, at: new Date().toISOString(), status: 'open', ...item };
  doc.items.unshift(saved);
  await saveCorrections(doc);
  if (hasBot() && doc.admin) {
    await send(
      doc.admin,
      [
        `<b>Correction #${saved.id}</b>`,
        saved.page ? `Page: ${esc(saved.page)}` : '',
        esc(saved.what),
        saved.contact ? `From: ${esc(saved.contact)}` : '',
        '',
        `Reply /fixed ${saved.id} what you changed, or /reject ${saved.id} why.`,
      ]
        .filter((x, i) => x !== '' || i === 4)
        .join('\n'),
    ).catch(() => {});
  }
  return { ok: true, id: saved.id };
}

// Bot commands for the chat that claimed /admin.
export async function correctionCommand(chatId, cmd, args) {
  const doc = await getCorrections();
  if (cmd === '/admin') {
    if (!doc.admin) {
      doc.admin = chatId;
      await saveCorrections(doc);
      return 'This chat now receives correction reports from the website. Commands: /reports, /fixed ID note, /reject ID note.';
    }
    return doc.admin === chatId ? 'This chat already receives correction reports.' : 'Correction reports already go to another chat.';
  }
  if (doc.admin !== chatId) return 'Only the Shiplog admin chat can use this command.';
  if (cmd === '/reports') {
    const open = doc.items.filter((i) => i.status === 'open').slice(0, 10);
    if (!open.length) return 'No open correction reports.';
    return ['<b>Open corrections</b>', ...open.map((i) => `#${i.id} ${i.page ? `${esc(i.page)}: ` : ''}${esc(i.what.slice(0, 200))}`), '', `${SITE}/corrections`].join('\n\n');
  }
  const id = Number(args[0]);
  const item = doc.items.find((i) => i.id === id);
  if (!item) return `Send it like this: ${cmd} 12 what you changed`;
  item.status = cmd === '/fixed' ? 'fixed' : 'rejected';
  item.note = clean(args.slice(1).join(' '), 600);
  item.resolvedAt = new Date().toISOString();
  await saveCorrections(doc);
  return `Correction #${id} marked ${item.status}.${item.status === 'fixed' ? ` It now shows on ${SITE}/corrections` : ''}`;
}
