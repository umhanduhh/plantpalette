'use client';

import { PLANT_COLOR_HEX, PlantColorKey } from '@/lib/plant-colors';

// Rainbow order colored wedges are placed in when filling the ring.
export const WHEEL_COLOR_ORDER: PlantColorKey[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export interface WheelWedge {
  /** null = the trailing unfilled portion of the ring. */
  color: PlantColorKey | null;
  start: number;
  end: number;
}

/**
 * Lays out the ring as an arc-length progress fill: each color's wedge is
 * sized by (unique foods logged of that color) / goal, so the *total*
 * colored arc matches overall progress toward the goal — logging 10% of
 * your goal fills 10% of the ring, not 10% of the color count. Any
 * remaining arc is a single trailing "empty" wedge.
 */
export function buildWheelWedges(colorCounts: Partial<Record<PlantColorKey, number>>, goal: number): WheelWedge[] {
  const wedges: WheelWedge[] = [];
  let cursor = 0;
  if (goal > 0) {
    for (const color of WHEEL_COLOR_ORDER) {
      const logged = colorCounts[color] || 0;
      if (logged <= 0) continue;
      const deg = Math.min((logged / goal) * 360, 360 - cursor);
      if (deg <= 0) continue;
      wedges.push({ color, start: cursor, end: cursor + deg });
      cursor += deg;
    }
  }
  if (cursor < 360) {
    wedges.push({ color: null, start: cursor, end: 360 });
  }
  return wedges;
}

interface ColorWheelProps {
  /** Big number shown in the center (e.g. unique foods this week). */
  count: number | string;
  /** Small caption under the number. */
  label: string;
  /** Outer diameter in px. */
  size?: number;
  /** Thickness of the colored ring in px. */
  ring?: number;
  /** Unique foods logged so far, by plant color. */
  colorCounts?: Partial<Record<PlantColorKey, number>>;
  /** Denominator the ring fill is measured against (e.g. weekly goal). */
  goal?: number;
}

/**
 * The Plate Palette color wheel — a conic rainbow ring with a white
 * center that holds a count + label. Signature element of design 1b/2a.
 * When `colorCounts`/`goal` are given, the ring fills as an arc-length
 * progress bar — colored in the hues actually logged — instead of the
 * static decorative rainbow.
 */
export default function ColorWheel({ count, label, size = 220, ring = 34, colorCounts, goal }: ColorWheelProps) {
  const background = colorCounts
    ? `conic-gradient(${buildWheelWedges(colorCounts, goal ?? 0)
        .map(w => `${w.color ? PLANT_COLOR_HEX[w.color] : 'var(--wheel-empty)'} ${w.start}deg ${w.end}deg`)
        .join(', ')})`
    : 'var(--wheel-gradient)';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        margin: '0 auto',
        background,
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
