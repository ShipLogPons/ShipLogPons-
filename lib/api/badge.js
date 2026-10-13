import { getProject } from '@/lib/data';
import { STATUS } from '@/lib/score';

const COLORS = {
  shipping: '#c99700',
  resumed: '#2f6fb3',
  active: '#0f8a7e',
  quiet: '#6d8094',
  dormant: '#b4472b',
  unknown: '#6d8094',
  nosource: '#6d8094',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const width = (s) => Math.round(s.length * 6.4 + 14);

export async function GET(_req, { params }) {
  const { slug } = await params;
  const p = await getProject(slug);
  const left = 'shiplog';
  const right = p ? `${STATUS[p.status]?.label || 'Unknown'}${p.momentum != null ? ` ${p.momentum}` : ''}` : 'not found';
  const color = p ? COLORS[p.status] || '#6d8094' : '#6d8094';
  const lw = width(left) + 14;
  const rw = width(right);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="20" role="img" aria-label="${esc(left)}: ${esc(right)}">
<title>${esc(left)}: ${esc(right)}</title>
<clipPath id="r"><rect width="${lw + rw}" height="20" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#102a4c"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/></g>
<g transform="translate(5 4)"><line x1="1" y1="0" x2="1" y2="12" stroke="#e9eff3" stroke-width="1.4"/><path d="M2 0.5h8l-2 2.6 2 2.6H2z" fill="#f2b705"/><path d="M2 0.5h8L2 5.7z" fill="#0f8a7e"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
<text x="${18 + (lw - 18) / 2}" y="14" text-anchor="middle">${esc(left)}</text>
<text x="${lw + rw / 2}" y="14" text-anchor="middle">${esc(right)}</text></g></svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=1800, s-maxage=1800' },
  });
}
