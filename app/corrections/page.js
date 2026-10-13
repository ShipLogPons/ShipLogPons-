import Link from 'next/link';
import '../pages.css';
import { getCorrections } from '@/lib/corrections';
import CorrectionForm from './CorrectionForm';

export const metadata = { title: 'Corrections' };
export const dynamic = 'force-dynamic';

// Changes to how Shiplog counts or shows things, after a mistake was found.
const CHANGELOG = [
  ['October 2026', 'Several GitHub releases from one repository on the same UTC day now count as one ship. One project had published dozens of releases in a day, which pushed it to the top of Builders of the week without matching work.'],
  ['October 2026', 'A token with no repository but with a contract ship is no longer shown as "No builder source". "Can’t read" is now only used when a linked repository exists and could not be read.'],
  ['October 2026', 'Holder concentration no longer shows "Top 10 = 100%" for tokens with very few holders without saying so, and tokens that no wallet holds yet now say that instead of showing 0%.'],
  ['October 2026', 'X handles in token metadata are read more strictly, so single letters and placeholder text are no longer shown as a profile link.'],
  ['October 2026', 'New contracts deployed by a builder wallet now count as ships, so builders who work on chain without a public repository are no longer shown as idle.'],
];

const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export default async function Corrections() {
  const doc = await getCorrections();
  const fixed = doc.items.filter((i) => i.status === 'fixed');
  const open = doc.items.filter((i) => i.status === 'open').length;

  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">Corrections</h1>
        <p className="lede">
          When Shiplog gets something wrong, it is fixed and written down here. Report a mistake below and it goes straight to
          the person who maintains Shiplog.
        </p>

        <h2>Report a mistake</h2>
        <p>
          Wrong repository, a ship that is not real work, a missing project, or a number that does not match the chain. Include
          the page link if you can. Builders who want a repository listed should use <Link href="/submit">Submit</Link> instead.
        </p>
        <CorrectionForm />
        {open > 0 && <p className="note">{open} report{open === 1 ? ' is' : 's are'} waiting for review.</p>}

        <h2>Fixed reports</h2>
        {fixed.length ? (
          <ul className="corr-list">
            {fixed.map((i) => (
              <li key={i.id}>
                <span className="corr-when">#{i.id}, fixed {fmt(i.resolvedAt || i.at)}</span>
                <p><strong>Reported:</strong> {i.what}</p>
                {i.note && <p><strong>What changed:</strong> {i.note}</p>}
                {i.page && /^https?:\/\//.test(i.page) && (
                  <a href={i.page} target="_blank" rel="noopener noreferrer nofollow" className="small">{i.page}</a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No reader reports have been fixed yet. The first ones will be listed here.</p>
        )}

        <h2>Changes to the rules</h2>
        <ul className="corr-list">
          {CHANGELOG.map(([when, text], i) => (
            <li key={i}>
              <span className="corr-when">{when}</span>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
