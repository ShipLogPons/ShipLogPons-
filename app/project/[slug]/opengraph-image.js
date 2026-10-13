import { ImageResponse } from 'next/og';
import { getProject } from '@/lib/data';
import { STATUS } from '@/lib/score';
import { OG_SIZE, Frame, STATUS_COLOR } from '@/lib/og';

export const alt = 'Shiplog builder card';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { slug } = await params;
  const p = await getProject(slug);
  const name = p?.name || 'Not in the log';
  const status = p ? STATUS[p.status]?.label : '';
  const color = p ? STATUS_COLOR[p.status] : '#9aa9b6';
  const last = p?.lastShip?.title || '';
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2, maxWidth: 820, overflow: 'hidden' }}>{name.slice(0, 28)}</div>
            {p?.symbol && <div style={{ fontSize: 36, color: '#9fb5cc' }}>${p.symbol.slice(0, 12)}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 30 }}>
            {status && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 32 }}>
                <div style={{ width: 34, height: 24, background: color, borderRadius: 3 }} />
                {status}
              </div>
            )}
            {p?.momentum != null && <div style={{ display: 'flex', fontSize: 32, color: '#e9eff3' }}>Momentum {p.momentum}/100</div>}
            {p?.verified && <div style={{ display: 'flex', fontSize: 28, color: '#4cc493' }}>✓ Repo verified</div>}
          </div>
          {last && <div style={{ display: 'flex', marginTop: 30, fontSize: 28, color: '#b8c8d8', maxWidth: 1050 }}>Last ship: {last.slice(0, 90)}</div>}
        </div>
      </Frame>
    ),
    OG_SIZE
  );
}
