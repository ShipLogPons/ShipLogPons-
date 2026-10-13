import { ImageResponse } from 'next/og';
import { OG_SIZE, Frame } from '@/lib/og';

export const alt = 'Shiplog: every Pons launch, only the builders get a log';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Every Pons launch.</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3, color: '#9fb5cc' }}>Only the builders get a log.</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, color: '#b8c8d8' }}>Releases and code changes, read from GitHub, tied to tokens on Robinhood Chain.</div>
        </div>
      </Frame>
    ),
    OG_SIZE
  );
}
