import Link from 'next/link';
import { ago } from '@/lib/format';
import { Avatar } from './ProjectRow';

export default function LogEntry({ s, showProject = true, stamp }) {
  return (
    <li className="log-entry">
      <span className="log-stamp num">{stamp || ago(s.date)}</span>
      <span className="log-body">
        {showProject && (
          <Link href={`/project/${s.project}`} className="log-project">
            <Avatar src={s.avatar || null} name={s.projectName} size={18} />
            {s.projectName}
          </Link>
        )}
        <span className="log-title">{s.title}</span>
        <a className="log-proof" href={s.url} target="_blank" rel="noopener noreferrer">
          {s.repo ? `${s.proof} in ${s.repo}` : s.proof}
        </a>
      </span>
    </li>
  );
}
