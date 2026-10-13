import { createHash } from 'node:crypto';
import { readJSON, writeJSON } from './store';

// The site address follows the project's production domain: a custom domain once one is added, else the vercel.app one.
const PROD = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE = process.env.SITE_URL || (PROD ? `https://${PROD}` : 'https://shiplog-tan.vercel.app');
const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
export const hasBot = () => Boolean(TOKEN());
export const webhookSecret = () => createHash('sha256').update(TOKEN()).digest('hex').slice(0, 32);

export const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export async function tg(method, body) {
  if (!hasBot()) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export function send(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}

export async function getSubs() {
  const doc = await readJSON('telegram.json', { chats: {} });
  return doc.chats ? doc : { chats: {} };
}

export async function saveSubs(doc) {
  await writeJSON('telegram.json', doc);
}

function signalText(sig, state) {
  const b = state.builders?.[sig.token];
  const m = b?.meta || {};
  const name = esc(m.name || m.symbol || sig.token.slice(0, 10));
  const sym = m.symbol ? ` ($${esc(m.symbol)})` : '';
  const repo = b?.github?.[0] ? `github.com/${esc(b.github[0].owner)}${b.github[0].repo ? '/' + esc(b.github[0].repo) : ''}` : '';
  const link = `${SITE}/scan?address=${sig.token}`;
  if (sig.type === 'builder') return `🚩 <b>New builder on Pons</b>\n${name}${sym} links ${repo}\n${link}`;
  if (sig.type === 'graduated') return `🎓 <b>${name}${sym} graduated on Pons</b>\nThe bonding curve filled and the token moved to its DEX pool.\n${link}`;
  if (sig.type === 'contract') return `📜 <b>${name}${sym} deployed a new contract</b>\n${esc(sig.title || '')}\n${link}`;
  if (sig.type === 'liqgone') return `🫗 <b>Liquidity gone on ${name}${sym}</b>\n${esc(sig.title || '')}\n${link}`;
  if (sig.type === 'devsold') return `⚠️ <b>Deployer of ${name}${sym} sold</b>\n${esc(sig.title || '')}\n${link}`;
  return null;
}

// Sends new signals to every chat that follows them.
export async function notifySignals(signals, state) {
  if (!hasBot() || !signals.length) return;
  const { chats } = await getSubs();
  const jobs = [];
  for (const [chatId, sub] of Object.entries(chats)) {
    for (const sig of signals) {
      if (!(sub.all || (sub.tokens || []).includes(sig.token))) continue;
      const text = signalText(sig, state);
      if (text) jobs.push(send(chatId, text));
    }
  }
  await Promise.allSettled(jobs.slice(0, 60));
}

// Points the bot at the current site address. Runs once per server start, so a new domain is picked up by itself.
let webhookChecked = false;
export async function ensureWebhook() {
  if (webhookChecked || !hasBot()) return null;
  webhookChecked = true;
  const want = `${SITE}/api/telegram`;
  const info = await tg('getWebhookInfo', {});
  if (info?.ok && info.result?.url === want) return 'ok';
  const set = await tg('setWebhook', { url: want, secret_token: webhookSecret(), allowed_updates: ['message', 'channel_post'] });
  return set?.ok ? 'updated' : 'failed';
}
