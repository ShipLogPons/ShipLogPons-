const DAY = 86400000;

// GitHub-style activity calendar: 13 weeks, one square per UTC day.
// Each day counts real commits, and a release counts as 5.
export default function Heatmap({ activity = {}, weeks = 13, compact = false }) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dow = (today.getUTCDay() + 6) % 7; // Monday = 0
  const start = todayUtc - (weeks - 1) * 7 * DAY - dow * DAY;
  const days = [];
  let total = 0;
  let active = 0;
  let rel = 0;
  for (let t = start; t <= todayUtc; t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    const [c, r] = activity[d] || [0, 0];
    const v = c + r * 5;
    total += c;
    rel += r;
    if (v > 0) active++;
    days.push({ d, c, r, lvl: v === 0 ? 0 : v < 3 ? 1 : v < 8 ? 2 : v < 16 ? 3 : 4 });
  }
  const months = [];
  for (let w = 0; w < weeks; w++) {
    const first = days[w * 7];
    if (!first) continue;
    const m = new Date(first.d).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
    if (!months.length || months[months.length - 1].m !== m) months.push({ m, w });
  }

  return (
    <figure className={`heat ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="heat-months" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(6px, ${compact ? 14 : 18}px))` }} aria-hidden="true">
          {months.map((x) => (
            <span key={`${x.m}-${x.w}`} style={{ gridColumn: x.w + 1 }}>{x.m}</span>
          ))}
        </div>
      )}
      <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(6px, ${compact ? 14 : 18}px))` }} role="img" aria-label={`${total} real commits and ${rel} releases on ${active} days in the last ${weeks} weeks`}>
        {days.map((x) => (
          <span key={x.d} className={`hc l${x.lvl}`} title={`${x.d}: ${x.c} real commit${x.c === 1 ? '' : 's'}${x.r ? `, ${x.r} release${x.r > 1 ? 's' : ''}` : ''}`} />
        ))}
      </div>
      {!compact && (
        <figcaption className="heat-cap">
          <span>
            <strong>{total}</strong> real commits, <strong>{rel}</strong> release{rel === 1 ? '' : 's'}, active on <strong>{active}</strong> of {days.length} days
          </span>
          <span className="heat-legend" aria-hidden="true">
            Less <i className="hc l0" /><i className="hc l1" /><i className="hc l2" /><i className="hc l3" /><i className="hc l4" /> More
          </span>
        </figcaption>
      )}
    </figure>
  );
}
