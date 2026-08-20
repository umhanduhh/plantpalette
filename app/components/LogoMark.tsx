/**
 * The Plate Palette brand mark — an orange fork blooming out of coral petals,
 * cradled by a magenta dome, with yellow and green leaves fanning out below.
 * Pure SVG so it scales cleanly from a small inline signature up to a header
 * lockup, and rasterizes fine for html2canvas (the share-card export).
 */

const COLORS = {
  arc: '#e62a82',
  fork: '#f26a26',
  petal: '#fa7268',
  leafYellow: '#fbc531',
  leafGreen: '#45b369',
};

/** A pointed leaf/petal shape (vesica piscis) between two tips. */
function vesica(x1: number, y1: number, x2: number, y2: number, bulge: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * bulge;
  const ny = (dx / len) * bulge;
  return `M${x1},${y1} Q${mx + nx},${my + ny} ${x2},${y2} Q${mx - nx},${my - ny} ${x1},${y1} Z`;
}

/** A leaf with an inner cut-out, so it reads as an outlined blade. */
function leaf(x1: number, y1: number, x2: number, y2: number, outerBulge: number, innerBulge: number): string {
  const ix1 = x1 + (x2 - x1) * 0.22;
  const iy1 = y1 + (y2 - y1) * 0.22;
  const ix2 = x1 + (x2 - x1) * 0.88;
  const iy2 = y1 + (y2 - y1) * 0.88;
  return `${vesica(x1, y1, x2, y2, outerBulge)} ${vesica(ix1, iy1, ix2, iy2, innerBulge)}`;
}

export default function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      {/* Magenta dome arc */}
      <path
        d="M26,70 A34,34 0 0 1 94,70"
        fill="none"
        stroke={COLORS.arc}
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Bottom leaves */}
      <path d={leaf(56, 80, 18, 96, 14, 5)} fill={COLORS.leafYellow} fillRule="evenodd" />
      <path d={leaf(64, 80, 102, 96, 14, 5)} fill={COLORS.leafGreen} fillRule="evenodd" />

      {/* Coral petals flanking the fork */}
      <path d={vesica(58, 77, 38, 54, 10)} fill={COLORS.petal} />
      <path d={vesica(62, 77, 82, 54, 10)} fill={COLORS.petal} />

      {/* Fork: three tines + a chunky handle that tapers to a rounded point */}
      <rect x="48" y="34" width="6" height="28" rx="3" fill={COLORS.fork} />
      <rect x="57" y="30" width="6" height="32" rx="3" fill={COLORS.fork} />
      <rect x="66" y="34" width="6" height="28" rx="3" fill={COLORS.fork} />
      <path d="M52,58 L68,58 L63,96 Q60,103 57,96 Z" fill={COLORS.fork} />
    </svg>
  );
}
