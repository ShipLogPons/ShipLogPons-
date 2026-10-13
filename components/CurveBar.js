// Progress of a Pons bonding curve toward graduation.
export default function CurveBar({ progress, phase, compact = false }) {
  if (progress == null && phase == null) return null;
  const done = phase === 2 || progress >= 100;
  const pct = done ? 100 : Math.max(1, Math.round(progress || 0));
  return (
    <span className={`curve${compact ? ' compact' : ''}${done ? ' done' : ''}`} title={done ? 'Graduated to its DEX pool' : `${pct}% of the graduation target raised`}>
      <span className="curve-track">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="curve-label">{done ? 'Graduated' : `${pct}% to graduation`}</span>
    </span>
  );
}
