import Link from 'next/link';
import '../pages.css';
import { getIndex } from '@/lib/data';
import { SITE } from '@/lib/telegram';
import CopyButton from '@/components/CopyButton';

export const metadata = { title: 'API and embeds' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ENDPOINTS = [
  {
    path: '/api/projects',
    what: 'Every tracked Pons builder with status, momentum, token, repositories, last ship and market context.',
    fields: 'slug, name, symbol, status, momentum (0 to 100), verified, token, launch, repos, lastShip, market, url',
  },
  {
    path: '/api/ships',
    what: 'Every ship from the last 30 days, newest first, each with the link to its proof.',
    fields: 'project, projectName, kind, title, proof, repo, url, date',
  },
  {
    path: '/api/scan?address=0x…',
    what: 'Everything Shiplog knows about one token: builder, launch, curve progress, deployer history, dev wallet and holders.',
    fields: 'verdict, token, launch, builder, deployer, holders, market',
  },
  {
    path: '/api/report?week=2026-10-05',
    what: 'The weekly report as data. Leave out week for the current week. The week is named by its Monday, UTC.',
    fields: 'headline, summary, totals, previous, board, newBuilders, graduated, majorReleases, contracts, devSold, liquidityGone',
  },
  {
    path: '/api/badge/[slug]',
    what: 'An SVG badge with the current status and momentum, for a README.',
    fields: 'image/svg+xml',
  },
  {
    path: '/embed/[slug]',
    what: 'A small HTML card for an iframe. Add ?theme=light or ?theme=dark to fix the colors.',
    fields: 'text/html',
  },
];

export default async function Docs() {
  const { projects } = await getIndex();
  const sample = projects.find((p) => ['shipping', 'active', 'resumed'].includes(p.status)) || projects[0];
  const slug = sample?.slug || 'your-project';
  const badgeMd = `[![Shiplog](${SITE}/api/badge/${slug})](${SITE}/project/${slug})`;
  const iframe = `<iframe src="${SITE}/embed/${slug}" width="420" height="150" style="border:0" loading="lazy" title="Shiplog"></iframe>`;

  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">API and embeds</h1>
        <p className="lede">
          All Shiplog data is free to use. No key, no sign-up. JSON responses allow requests from any website.
        </p>

        <h2>Endpoints</h2>
        <p>Base URL: <code>{SITE}</code></p>
        <ul className="api-list">
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <code className="api-path">GET {e.path}</code>
              <p>{e.what}</p>
              <p className="small muted">Returns: {e.fields}</p>
            </li>
          ))}
        </ul>
        <p>
          Data refreshes every few minutes and responses are cached for up to five minutes. Please keep to about one request a
          minute per endpoint. Status and momentum rules are on <Link href="/method">How Shiplog works</Link>.
        </p>

        <h2 id="badge">README badge</h2>
        <p>Show your live Shiplog status on GitHub. Replace the slug with your own, found in your project page address.</p>
        {sample && (
          <p>
            <a href={`/project/${slug}`}>
              <img src={`/api/badge/${slug}`} alt={`Shiplog status for ${sample.name}`} height="20" />
            </a>
          </p>
        )}
        <pre className="snippet"><code>{badgeMd}</code></pre>
        <CopyButton value={badgeMd} label="Copy Markdown" />

        <h2 id="embed">Website card</h2>
        <p>Put a live Shiplog card on your website or docs. It updates itself and links back to your project page.</p>
        {sample && (
          <iframe src={`/embed/${slug}`} width="420" height="150" style={{ border: 0, maxWidth: '100%' }} loading="lazy" title={`Shiplog card for ${sample.name}`} />
        )}
        <pre className="snippet"><code>{iframe}</code></pre>
        <CopyButton value={iframe} label="Copy HTML" />

        <h2>Telegram</h2>
        <p>
          For alerts instead of polling, use the Shiplog bot: <code>/watch all</code> sends every new builder, graduation, new
          contract and risk signal, plus a digest every 6 hours.
        </p>

        <h2>Terms</h2>
        <p>
          Use the data for anything, including commercial work. Link back to Shiplog where you show it. The data comes as is,
          without a guarantee, and is not financial advice.
        </p>
      </div>
    </section>
  );
}
