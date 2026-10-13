import { getIndex, weekBoard } from './data';
import { getSubs, saveSubs, send, esc, hasBot, SITE, ensureWebhook } from './telegram';
import { ago } from './format';

const EVERY = 6 * 3600 * 1000;
const KIND = { release: 'release', code: 'code changes', contract: 'new contract' };

// Every 6 hours, chats that follow everything get a short "Building now" digest.
export async function maybeSendDigest() {
  if (!hasBot()) return { sent: 0, reason: 'no-bot' };
  await ensureWebhook().catch(() => null);
  const doc = await getSubs();
  if (Date.now() - (doc.lastDigest || 0) < EVERY) return { sent: 0, reason: 'not-due' };
  const targets = Object.entries(doc.chats || {}).filter(([, sub]) => sub.all);
  if (!targets.length) return { sent: 0, reason: 'no-chats' };

  // Claim the slot first, so two visits at once do not both post.
  doc.lastDigest = Date.now();
  await saveSubs(doc);

  const idx = await getIndex();
  const live = idx.projects.filter((p) => ['shipping', 'resumed'].includes(p.status)).slice(0, 6);
  if (!live.length) return { sent: 0, reason: 'nothing-shipping' };
  const [top] = weekBoard(idx.projects, 1);

  const lines = ['🚩 <b>Building now on Pons</b>', ''];
  live.forEach((p, i) => {
    const last = p.lastShip ? `${KIND[p.lastShip.kind] || 'ship'} ${ago(p.lastShip.date)}` : '';
    lines.push(`${i + 1}. <a href="${SITE}/project/${p.slug}">${esc(p.name)}</a>${p.symbol ? ` $${esc(p.symbol)}` : ''}${last ? `: ${last}` : ''}`);
  });
  if (top) lines.push('', `🏆 Builder of the week: <a href="${SITE}/project/${top.p.slug}">${esc(top.p.name)}</a>, ${top.points} points`);
  lines.push('', `${SITE}/explore`);

  const res = await Promise.allSettled(targets.map(([chatId]) => send(chatId, lines.join('\n'))));
  return { sent: res.filter((r) => r.status === 'fulfilled').length };
}
