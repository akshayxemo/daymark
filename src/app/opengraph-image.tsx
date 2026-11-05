import { ImageResponse } from 'next/og';
import { siteName, siteTagline } from '@/lib/site';

export const alt = `${siteName} — ${siteTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const colors = {
  bg: '#101211',
  panel: '#191c1a',
  border: '#2b302b',
  text: '#edeee9',
  muted: '#8b918b',
  accent: '#c1e69b',
};

const barHeights = [58, 94, 74];
const facts = ['Open source', 'Privacy-first', 'Self-hostable', 'PostgreSQL'];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: colors.bg,
        color: colors.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 10,
            height: 94,
            transform: 'skewX(-10deg)',
          }}
        >
          {barHeights.map((height, index) => (
            <div
              key={index}
              style={{ width: 26, height, background: colors.accent, borderRadius: 6 }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 108, fontWeight: 700, letterSpacing: -6 }}>
          daymark
          <span style={{ color: colors.accent }}>.</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 980 }}>
        <div
          style={{ display: 'flex', fontSize: 48, letterSpacing: -1.5, lineHeight: 1.1 }}
        >{`${siteTagline}.`}</div>
        <div style={{ display: 'flex', fontSize: 27, color: colors.muted, lineHeight: 1.4 }}>
          Record what you planned, what you worked on, how much time you invested and what you
          actually delivered.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {facts.map((fact) => (
          <div
            key={fact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              border: `1px solid ${colors.border}`,
              borderRadius: 999,
              background: colors.panel,
              color: colors.muted,
              fontSize: 22,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: colors.accent }} />
            {fact}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
