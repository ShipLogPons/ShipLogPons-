// Shiplog mark: a signal flag on a mast above two log lines.
export function LogoMark({ size = 32, inverted = false }) {
  const bg = inverted ? '#eef2f5' : '#13294b';
  const fg = inverted ? '#13294b' : '#e9eff3';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={bg} />
      <line x1="18" y1="12" x2="18" y2="52" stroke={fg} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M19.6 13 H46 L39.5 21.5 L46 30 H19.6 Z" fill="#f2b705" />
      <path d="M19.6 13 H46 L19.6 30 Z" fill="#0f8a7e" />
      <rect x="25" y="37" width="22" height="3.6" rx="1.8" fill={fg} />
      <rect x="25" y="44.5" width="15" height="3.6" rx="1.8" fill={fg} opacity="0.55" />
    </svg>
  );
}

export function Wordmark({ size = 30, inverted = false }) {
  return (
    <span className="wordmark-inner">
      <LogoMark size={size} inverted={inverted} />
      <span className="wm-text">
        <b>Ship</b>log
      </span>
    </span>
  );
}
