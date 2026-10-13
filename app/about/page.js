import Link from 'next/link';
import '../pages.css';
import { getIndex, counts } from '@/lib/data';
import { BOT_URL, X_URL, GITHUB_URL } from '@/lib/nav';

export const metadata = { title: 'About' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function About() {
  const idx = await getIndex();
  const c = counts(idx);

  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">About Shiplog</h1>
        <p className="lede">
          Shiplog is an independent tracker for the Pons launchpad on Robinhood Chain. It answers one question for every token:
          is someone actually building this?
        </p>

        <h2>Why it exists</h2>
        <p>
          Hundreds of tokens launch on Pons every day. Most say they are building something. A chart can show what traders
          think, but it cannot show whether code is being written. Shiplog reads the evidence instead: commits, releases and
          contracts, each with a link you can open and check yourself.
        </p>

        <h2>What it covers today</h2>
        <ul>
          <li><strong>{c.tracked}</strong> Pons projects with a builder source, read from the chain and from builder submissions.</li>
          <li><strong>{c.active}</strong> of them shipped real work in the last 30 days.</li>
          <li><strong>{c.launches24.toLocaleString('en-US')}</strong> Pons launches in the last 24 hours, all checked for a GitHub link.</li>
        </ul>

        <h2>Who it is for</h2>
        <p>
          <strong>Holders</strong> who want to know if the team behind a token is still working.{' '}
          <strong>Researchers</strong> who need a list of Pons projects with real development.{' '}
          <strong>Builders</strong> who want their work seen next to the chart, with a <Link href="/submit">verified listing</Link> and a
          README <Link href="/docs#badge">badge</Link>.
        </p>

        <h2>Principles</h2>
        <ul>
          <li><strong>Evidence over claims.</strong> Every ship links to the commit, release or transaction behind it.</li>
          <li><strong>Same rules for everyone.</strong> Scores are mechanical, and the rules are public on <Link href="/method">How Shiplog works</Link>.</li>
          <li><strong>Price never changes a score.</strong> Market numbers are context only.</li>
          <li><strong>No paid placement.</strong> A project cannot buy a better position or a removed signal.</li>
          <li><strong>Corrections are public.</strong> Mistakes are fixed and logged on <Link href="/corrections">Corrections</Link>.</li>
        </ul>

        <h2>Independence</h2>
        <p>
          Shiplog is a community tool. It is not affiliated with Pons, Robinhood, or any project it lists, and it holds no
          position in any token it tracks. Nothing on this site is financial advice.
        </p>

        <h2>Get in touch</h2>
        <p>
          Follow <a href={X_URL} target="_blank" rel="noopener noreferrer">@ShipLogPons on X</a> for weekly reports, get alerts from
          the <a href={BOT_URL} target="_blank" rel="noopener noreferrer">Shiplog Telegram bot</a>, list your
          project on <Link href="/submit">Submit</Link>, report a mistake on <Link href="/corrections">Corrections</Link>, or use the
          data yourself through the <Link href="/docs">open API</Link>.
        </p>

        <h2>Open source</h2>
        <p>
          All of Shiplog's code is public on{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>, so anyone can check exactly how
          builders are read and scored.
        </p>
      </div>
    </section>
  );
}
