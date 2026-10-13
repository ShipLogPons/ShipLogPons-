import { getProject } from '@/lib/data';
import { STATUS } from '@/lib/score';
import { ago } from '@/lib/format';
import { SITE } from '@/lib/telegram';

const COLORS = { shipping: '#c99700', resumed: '#2f6fb3', active: '#0f8a7e', quiet: '#6d8094', dormant: '#b4472b' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A small card other sites can put in an iframe. Light or dark follows ?theme= or the viewer's system.
export async function GET(req, { params }) {
  const { slug } = await params;
  const theme = new URL(req.url).searchParams.get('theme');
  const p = await getProject(slug);
  const href = `${SITE}/project/${encodeURIComponent(slug)}`;
  const color = (p && COLORS[p.status]) || '#6d8094';
  const body = p
    ? `<a class="c" href="${href}" target="_blank" rel="noopener">
  <div class="top">
    <span class="av">${esc(p.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase())}${p.avatar ? `<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer">` : ''}</span>
    <span class="nm"><b>${esc(p.name)}</b>${p.symbol ? `<i>$${esc(p.symbol)}</i>` : ''}</span>
    ${p.momentum != null ? `<span class="mo"><b>${p.momentum}</b><i>momentum</i></span>` : ''}
  </div>
  <div class="st"><span class="dot"></span>${esc(STATUS[p.status]?.label || 'Unknown')}</div>
  <div class="ls">${p.lastShip ? `Last ship ${esc(ago(p.lastShip.date))}: ${esc(p.lastShip.title)}` : 'No ships recorded yet'}</div>
  <div class="ft">Tracked by Shiplog</div>
</a>`
    : `<a class="c" href="${SITE}" target="_blank" rel="noopener"><div class="ls">This project is not on Shiplog.</div><div class="ft">Shiplog</div></a>`;

  const light = '--bg:#fcfcfa;--ink:#14171a;--mu:#5d646c;--ru:#dcdfda;--soft:#e8eae6';
  const dark = '--bg:#15191d;--ink:#e8ebee;--mu:#9aa3ac;--ru:#2a3036;--soft:#1f2429';
  const vars = theme === 'dark' ? `:root{${dark}}` : theme === 'light' ? `:root{${light}}` : `:root{${light}}@media(prefers-color-scheme:dark){:root{${dark}}}`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p?.name || 'Shiplog')}</title>
<style>${vars}
*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.c{display:block;background:var(--bg);color:var(--ink);text-decoration:none;border:1px solid var(--ru);border-top:3px solid ${color};border-radius:14px;padding:14px 16px;max-width:420px}
.top{display:flex;align-items:center;gap:10px}
.av{position:relative;width:36px;height:36px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-size:12px;font-weight:700;color:var(--mu);overflow:hidden;flex:none}
.av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nm{display:flex;flex-direction:column;min-width:0;flex:1}.nm b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nm i{font-style:normal;font-size:12px;color:var(--mu)}
.mo{display:flex;flex-direction:column;align-items:flex-end}.mo b{font-size:20px;font-variant-numeric:tabular-nums}.mo i{font-style:normal;font-size:11px;color:var(--mu)}
.st{display:flex;align-items:center;gap:7px;margin-top:12px;font-weight:650;font-size:14px}.dot{width:9px;height:9px;border-radius:50%;background:${color}}
.ls{margin-top:4px;font-size:13px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ft{margin-top:10px;padding-top:8px;border-top:1px solid var(--soft);font-size:11px;color:var(--mu)}
.c:hover .ft{color:var(--ink)}
</style></head><body>${body}</body></html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600',
      'content-security-policy': "frame-ancestors *; default-src 'none'; img-src * data:; style-src 'unsafe-inline'",
    },
  });
}
