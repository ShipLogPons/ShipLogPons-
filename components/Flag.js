import { STATUS } from '@/lib/score';

// Each status is a small signal flag, so status reads at a glance without color alone.
export default function Flag({ status, size = 18, withLabel = false }) {
  const w = size;
  const h = Math.round(size * 0.72);
  const body = (() => {
    switch (status) {
      case 'shipping':
        return <rect x="2" y="1" width={w - 2} height={h} fill="var(--f-ship)" />;
      case 'resumed':
        return (
          <>
            <rect x="2" y="1" width={w - 2} height={h / 2} fill="var(--f-resume)" />
            <rect x="2" y={1 + h / 2} width={w - 2} height={h / 2} fill="var(--f-ship)" />
          </>
        );
      case 'active':
        return (
          <>
            <rect x="2" y="1" width={w - 2} height={h} fill="var(--f-white)" />
            <polygon points={`2,1 ${w},1 2,${h + 1}`} fill="var(--f-active)" />
          </>
        );
      case 'quiet':
        return (
          <>
            <rect x="2" y="1" width={(w - 2) / 2} height={h} fill="var(--f-quiet)" />
            <rect x={2 + (w - 2) / 2} y="1" width={(w - 2) / 2} height={h} fill="var(--f-white)" />
          </>
        );
      case 'dormant':
        return <rect x="2" y="1" width={w - 2} height={h} fill="var(--f-dormant)" />;
      case 'unknown':
        return (
          <>
            <rect x="2" y="1" width={w - 2} height={h} fill="var(--f-white)" />
            <rect x="2" y="1" width={(w - 2) / 2} height={h / 2} fill="var(--f-quiet)" />
            <rect x={2 + (w - 2) / 2} y={1 + h / 2} width={(w - 2) / 2} height={h / 2} fill="var(--f-quiet)" />
          </>
        );
      default:
        return (
          <rect x="2.5" y="1.5" width={w - 3} height={h - 1} fill="none" stroke="var(--muted)" strokeDasharray="2 2" />
        );
    }
  })();
  const label = STATUS[status]?.label || 'Unknown';
  return (
    <span className="flag" title={STATUS[status]?.note}>
      <svg width={w + 1} height={h + 6} viewBox={`0 0 ${w + 1} ${h + 6}`} aria-hidden="true">
        <line x1="1" y1="0" x2="1" y2={h + 6} stroke="var(--ink)" strokeWidth="1.5" />
        {body}
        {status !== 'nosource' && (
          <rect x="2" y="1" width={w - 2} height={h} fill="none" stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.75" />
        )}
      </svg>
      {withLabel ? <span className="flag-label">{label}</span> : <span className="sr">{label}</span>}
    </span>
  );
}
