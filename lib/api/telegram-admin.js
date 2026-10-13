import { NextResponse } from 'next/server';
import { POST as basePOST, GET as baseGET } from '@/lib/api/telegram';
import { correctionCommand } from '@/lib/corrections';
import { send, hasBot, webhookSecret, tg } from '@/lib/telegram';

const ADMIN = ['/admin', '/reports', '/fixed', '/reject'];

// Correction commands for the admin chat; everything else goes to the normal bot handler.
export async function POST(req) {
  if (!hasBot() || req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return basePOST(req);
  const raw = await req.text();
  let update = null;
  try {
    update = JSON.parse(raw);
  } catch {
    /* handled below */
  }
  const msg = update?.message || update?.channel_post;
  const [first, ...args] = (msg?.text || '').trim().split(/\s+/);
  const cmd = (first || '').toLowerCase().replace(/@.*$/, '');
  if (msg?.chat?.id && ADMIN.includes(cmd)) {
    const chatId = String(msg.chat.id);
    try {
      await send(chatId, await correctionCommand(chatId, cmd, args));
    } catch {
      await send(chatId, 'Shiplog hit an error answering that. Try again in a minute.');
    }
    return NextResponse.json({ ok: true });
  }
  return basePOST(new Request(req.url, { method: 'POST', headers: req.headers, body: raw }));
}

// The bot's profile text, shown in Telegram before someone starts a chat.
const ABOUT = () => "Who's really building on Pons? Real commits, releases and contracts from Robinhood Chain builders.";
const DESCRIPTION = () =>
  [
    'Shiplog tracks builders on the Pons launchpad (Robinhood Chain) by what they ship, not by price.',
    '',
    '/scan 0x… checks if anyone is building behind a token',
    '/top and /week show who is shipping now',
    '/watch all sends new builders, graduations, new contracts, dev sells and a digest every 6 hours',
    '',
    'Every claim links to its proof.',
  ].join('\n');

export async function GET(req) {
  const res = await baseGET(req);
  if (hasBot() && new URL(req.url).searchParams.get('setup') === '1') {
    await tg('setMyShortDescription', { short_description: ABOUT().slice(0, 120) });
    await tg('setMyDescription', { description: DESCRIPTION().slice(0, 512) });
  }
  return res;
}
