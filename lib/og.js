// Shared drawing for the share images (Open Graph cards).
export const OG_SIZE = { width: 1200, height: 630 };

export function Mark({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#e9eff3" />
      <line x1="18" y1="12" x2="18" y2="52" stroke="#13294b" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M19.6 13 H46 L39.5 21.5 L46 30 H19.6 Z" fill="#f2b705" />
      <path d="M19.6 13 H46 L19.6 30 Z" fill="#0f8a7e" />
      <rect x="25" y="37" width="22" height="3.6" rx="1.8" fill="#13294b" />
      <rect x="25" y="44.5" width="15" height="3.6" rx="1.8" fill="#13294b" opacity="0.55" />
    </svg>
  );
}

export const STATUS_COLOR = {
  shipping: '#f2b705',
  resumed: '#2f6fb3',
  active: '#0f8a7e',
  quiet: '#9aa9b6',
  dormant: '#b4472b',
  unknown: '#9aa9b6',
  nosource: '#9aa9b6',
};

export function Frame({ children }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#102a4c',
        color: '#ffffff',
        padding: '64px 72px',
        fontFamily: 'sans-serif',
      }}
    >
      {children}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mark size={56} />
        <div style={{ display: 'flex', fontSize: 40, letterSpacing: -1 }}>
          <span style={{ fontWeight: 800 }}>Ship</span>
          <span>log</span>
        </div>
        <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 26, color: '#9fb5cc' }}>Builders on Pons, with proof</div>
      </div>
    </div>
  );
}
