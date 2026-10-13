import { NextResponse } from 'next/server';
import { getIndex, weekBoard } from '@/lib/data';
import { scanToken } from '@/lib/scan';
import { STATUS } from '@/lib/score';
import { tg, send, esc, hasBot, webhookSecret, getSubs, saveSubs, SITE } from '@/lib/telegram';

const HELP = [
  '<b>Shiplog</b>: who is really building on Pons.',
  '',
  '/scan 0x… : is anyone building behind this token?',
  '/top : builders shipping right now',
  '/week : builders of the week',
  '/new : newest builders found on Pons',
  '/watch 0x… : get a message when this token graduates',
  '/watch all : get every new builder and graduation',
  '/unwatch 0x… or /unwatch all',
  '/list : what this chat follows',
].join('\n');

function fmtProject(p, i) {
  const status = STATUS[p.status]?.label || '';
  const momentum = p.momentum != null ? `, momentum ${p.momentum}` : '';
  return `${i + 1}. <a href="${SITE}/project/${p.slug}">${esc(p.name)}</a>${p.symbol ? ` $${esc(p.symbol)}` : ''}: ${status}${momentum}`;
}

async function handle(chatId, text) {
  const [rawCmd, ...args] = text.trim().split(/\s+/);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, '');
  const arg = (args[0] || '').toLowerCase();

  if (cmd === '/start' || cmd === '/help') return send(chatId, HELP);

  if (cmd === '/scan') {
    if (!/^0x[0-9a-f]{40}$/.test(arg)) return send(chatId, 'Send it like this: /scan 0x followed by the 40-character token address.');
    const r = await scanToken(arg);
    if (r.error) return send(chatId, esc(r.error));
    const lines = [`<b>${esc(r.verdict.title)}</b>`, esc(r.verdict.text), ''];
    if (r.token?.name) lines.push(`Token: ${esc(r.token.name)}${r.token.symbol ? ` ($${esc(r.token.symbol)})` : ''}`);
    if (r.launch) lines.push(`Pons ${r.launch.version.toUpperCase()}${r.launch.phase ? `, ${r.launch.phase}` : ''}${r.launch.progress != null && r.launch.progress < 100 ? ` (${r.launch.progress}% to graduation)` : ''}`);
    if (r.builder?.repos?.length) lines.push(`Repo: github.com/${esc(r.builder.repos[0])}`);
    if (r.builder?.momentum != null) lines.push(`Momentum: ${r.builder.momentum} of 100`);
    if (r.holders?.dev) lines.push(`Deployer wallet: ${{ holding: 'still holding', some: 'sold some', most: 'sold most', exited: 'fully out', never: 'never held' }[r.holders.dev.status]} (${r.holders.dev.nowPct}% of supply now, peak ${r.holders.dev.peakPct}%)`);
    if (r.holders) lines.push(`Top 10 wallets hold ${r.holders.top10Pct}% of circulating supply`);
    if (r.deployer) lines.push(`Deployer launched ${r.deployer.count} Pons token${r.deployer.count === 1 ? '' : 's'}`);
    lines.push('', `${SITE}/scan?address=${r.address}`);
    return send(chatId, lines.join('\n'));
  }

  if (cmd === '/top') {
    const { projects } = await getIndex();
    const top = projects.filter((p) => ['shipping', 'resumed', 'active'].includes(p.status)).slice(0, 8);
    if (!top.length) return send(chatId, 'No builder is shipping right now.');
    return send(chatId, ['<b>Shipping now on Pons</b>', ...top.map(fmtProject), '', `${SITE}/explore`].join('\n'));
  }

  if (cmd === '/week') {
    const { projects } = await getIndex();
    const board = weekBoard(projects, 10);
    if (!board.length) return send(chatId, 'No builder shipped this week yet.');
    return send(chatId, ['<b>Builders of the week</b>', ...board.map((x, i) => `${i + 1}. <a href="${SITE}/project/${x.p.slug}">${esc(x.p.name)}</a>: ${x.commits} commits${x.releases ? `, ${x.releases} release${x.releases > 1 ? 's' : ''}` : ''}`), '', `${SITE}/leaderboard`].join('\n'));
  }

  if (cmd === '/new') {
    const { projects } = await getIndex();
    const fresh = [...projects].filter((p) => p.launch?.block).sort((a, b) => b.launch.block - a.launch.block).slice(0, 8);
    if (!fresh.length) return send(chatId, 'No builders found yet.');
    return send(chatId, ['<b>Newest builders on Pons</b>', ...fresh.map(fmtProject), '', `${SITE}/signals`].join('\n'));
  }

  if (cmd === '/watch' || cmd === '/unwatch') {
    const doc = await getSubs();
    const sub = doc.chats[chatId] || { all: false, tokens: [] };
    if (arg === 'all') sub.all = cmd === '/watch';
    else if (/^0x[0-9a-f]{40}$/.test(arg)) {
      sub.tokens = sub.tokens.filter((t) => t !== arg);
      if (cmd === '/watch') sub.tokens.unshift(arg);
      sub.tokens = sub.tokens.slice(0, 50);
    } else return send(chatId, `Send it like this: ${cmd} 0x… (a token address) or ${cmd} all`);
    if (!sub.all && !sub.tokens.length) delete doc.chats[chatId];
    else doc.chats[chatId] = sub;
    await saveSubs(doc);
    return send(chatId, cmd === '/watch' ? `Following ${arg === 'all' ? 'every new builder and graduation' : arg}.` : `Stopped following ${arg}.`);
  }

  if (cmd === '/list') {
    const { chats } = await getSubs();
    const sub = chats[chatId];
    if (!sub) return send(chatId, 'This chat follows nothing yet. Try /watch all');
    return send(chatId, [sub.all ? 'Following every new builder and graduation.' : '', ...(sub.tokens || []).map((t) => `Following ${t}`)].filter(Boolean).join('\n'));
  }

  if (cmd.startsWith('/')) return send(chatId, HELP);
  return null;
}

export async function POST(req) {
  if (!hasBot()) return NextResponse.json({ ok: false }, { status: 404 });
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return NextResponse.json({ ok: false }, { status: 401 });
  let update;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const msg = update.message || update.channel_post;
  if (msg?.text && msg.chat?.id) {
    try {
      await handle(String(msg.chat.id), msg.text);
    } catch {
      await send(String(msg.chat.id), 'Shiplog hit an error answering that. Try again in a minute.');
    }
  }
  return NextResponse.json({ ok: true });
}

// Visiting /api/telegram?setup=1 once points the bot at this site and registers its commands.
export async function GET(req) {
  if (!hasBot()) return NextResponse.json({ ok: false, error: 'Add TELEGRAM_BOT_TOKEN in Vercel first.' });
  const url = new URL(req.url);
  if (url.searchParams.get('setup') !== '1') return NextResponse.json({ ok: true, bot: true });
  const hook = await tg('setWebhook', { url: `${SITE}/api/telegram`, secret_token: webhookSecret(), allowed_updates: ['message', 'channel_post'] });
  const cmds = await tg('setMyCommands', {
    commands: [
      { command: 'scan', description: 'Is anyone building behind a token?' },
      { command: 'top', description: 'Builders shipping right now' },
      { command: 'week', description: 'Builders of the week' },
      { command: 'new', description: 'Newest builders found on Pons' },
      { command: 'watch', description: 'Follow a token, or all signals' },
      { command: 'unwatch', description: 'Stop following' },
      { command: 'list', description: 'What this chat follows' },
    ],
  });
  const me = await tg('getMe', {});
  return NextResponse.json({ ok: Boolean(hook?.ok), webhook: hook, commands: cmds?.ok, bot: me?.result?.username || null });
}
