'use client';

interface ColorWheelProps {
  /** Big number shown in the center (e.g. unique foods this week). */
  count: number | string;
  /** Small caption under the number. */
  label: string;
  /** Outer diameter in px. */
  size?: number;
  /** Thickness of the colored ring in px. */
  ring?: number;
}

/**
 * The Plate Palette color wheel — a conic rainbow ring with a white
 * center that holds a count + label. Signature element of design 1b/2a.
 */
export default function ColorWheel({ count, label, size = 220, ring = 34 }: ColorWheelProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        margin: '0 auto',
        background: 'var(--wheel-gradient)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: ring,
          borderRadius: '50%',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="font-[family-name:var(--font-playfair)]"
          style={{ fontSize: size * 0.16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}
        >
          {count}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}
