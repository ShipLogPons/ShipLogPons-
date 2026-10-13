import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeveloper, activitySum } from '@/lib/data';
import { getUser } from '@/lib/github';
import { PONS_URL } from '@/lib/pons';
import ProjectRow from '@/components/ProjectRow';
import Heatmap from '@/components/Heatmap';
import { agoTs } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function generateMetadata({ params }) {
  const { owner } = await params;
  return { title: `${owner} on Pons`, description: `Every Pons token linked to the GitHub account ${owner}, and how each one is going.` };
}

export default async function Developer({ params }) {
  const { owner } = await params;
  const dev = await getDeveloper(decodeURIComponent(owner));
  if (!dev) notFound();
  const user = await getUser(dev.owner);

  const activity = {};
  for (const p of dev.projects) {
    for (const [d, [c, r]] of Object.entries(p.activity || {})) {
      activity[d] = activity[d] || [0, 0];
      activity[d][0] += c;
      activity[d][1] += r;
    }
  }
  const month = activitySum(activity, 30);
  const live = dev.projects.filter((p) => ['shipping', 'resumed', 'active'].includes(p.status)).length;
  const gone = dev.projects.filter((p) => ['quiet', 'dormant'].includes(p.status)).length;
  const record =
    dev.projects.length === 1
      ? live
        ? 'Their one Pons project is being worked on.'
        : 'Their one Pons project has gone quiet.'
      : `${live} of ${dev.projects.length} Pons projects still get real work${gone ? `, ${gone} went quiet` : ''}.`;

  return (
    <>
      <header className="p-head">
        <div className="wrap">
          <div className="p-title">
            <span className="avatar" style={{ width: 64, height: 64, fontSize: 21 }}>
              {dev.owner.slice(0, 2).toUpperCase()}
              <img src={user?.avatar || `https://github.com/${dev.owner}.png?size=120`} alt="" width={64} height={64} referrerPolicy="no-referrer" />
            </span>
            <h1>
              {user?.name || dev.owner}
              {user?.name && user.name.toLowerCase() !== dev.owner.toLowerCase() && <span className="p-sym">@{dev.owner}</span>}
            </h1>
          </div>
          {user?.bio && <p className="lede">{user.bio}</p>}
          <div className="p-status">
            <span className="pill">{user?.type === 'Organization' ? 'GitHub organization' : 'GitHub developer'}</span>
            <span className="pill">{dev.projects.length} Pons project{dev.projects.length === 1 ? '' : 's'}</span>
            {user?.created && <span className="pill">On GitHub since {user.created.slice(0, 4)}</span>}
          </div>
          <nav className="p-links" aria-label="Developer links">
            <a href={`https://github.com/${dev.owner}`} target="_blank" rel="noopener noreferrer">GitHub profile</a>
            {user?.twitter && <a href={`https://x.com/${user.twitter}`} target="_blank" rel="noopener noreferrer nofollow">X @{user.twitter}</a>}
            {user?.blog && <a href={/^https?:/.test(user.blog) ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer nofollow">Website</a>}
          </nav>
        </div>
      </header>

      <div className="wrap" style={{ maxWidth: 900, paddingBottom: 48 }}>
        <div className="panel">
          <h2>Track record</h2>
          <p className="dev-status">{record}</p>
          <dl className="facts">
            <dt>Real commits, 30 days</dt>
            <dd>{month.commits}</dd>
            <dt>Releases, 30 days</dt>
            <dd>{month.releases}</dd>
            {user?.repos != null && (
              <>
                <dt>Public repositories</dt>
                <dd>{user.repos}</dd>
              </>
            )}
            {user?.followers != null && (
              <>
                <dt>Followers</dt>
                <dd>{user.followers}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="panel">
          <h2>Activity across all their Pons projects</h2>
          <Heatmap activity={activity} />
        </div>

        <h2 className="sec-title">Pons projects</h2>
        <div className="panel-card">
          <ul className="plist">
            {dev.projects.map((p) => (
              <ProjectRow key={p.slug} p={p} />
            ))}
          </ul>
        </div>

        {dev.copies.length > 0 && (
          <div className="panel" style={{ marginTop: 22 }}>
            <h2>Tokens that copy their repositories</h2>
            <p className="note" style={{ marginTop: 0 }}>
              These Pons tokens link a {dev.owner} repository, but launched after the original. They are probably not made by {dev.owner}.
            </p>
            <ul className="dep-list">
              {dev.copies.map((c) => (
                <li key={c.token || c.slug}>
                  <a href={PONS_URL(c.token)} target="_blank" rel="noopener noreferrer">
                    {c.name} {c.symbol && `$${c.symbol}`}
                  </a>
                  <span className="muted small">{c.ts ? agoTs(c.ts) : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="note">
          Projects are grouped by the GitHub account in their linked repository. <Link href="/method">How statuses work</Link>
        </p>
      </div>
    </>
  );
}
