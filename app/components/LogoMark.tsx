/**
 * The Plate Palette brand mark — a fork blooming into a leaf, with a
 * magenta rainbow arc overhead. Pure SVG so it scales cleanly from a small
 * inline signature up to a header lockup, and rasterizes fine for
 * html2canvas (the share-card export).
 */

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

function leaf(x1: number, y1: number, x2: number, y2: number, outerBulge: number, innerBulge: number): string {
  const ix1 = x1 + (x2 - x1) * 0.24;
  const iy1 = y1 + (y2 - y1) * 0.24;
  const ix2 = x1 + (x2 - x1) * 0.86;
  const iy2 = y1 + (y2 - y1) * 0.86;
  return `${vesica(x1, y1, x2, y2, outerBulge)} ${vesica(ix1, iy1, ix2, iy2, innerBulge)}`;
}

export default function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      {/* Bottom leaves */}
      <path d={leaf(58, 74, 15, 96, 17, 7)} fill="#ffd966" fillRule="evenodd" />
      <path d={leaf(62, 74, 105, 96, 17, 7)} fill="#52b788" fillRule="evenodd" />

      {/* Petals */}
      <path d={vesica(53, 70, 29, 56, 14)} fill="#ff8f78" />
      <path d={vesica(67, 70, 91, 56, 14)} fill="#ff8f78" />

      {/* Fork */}
      <rect x="55" y="56" width="10" height="46" rx="5" fill="#ff6b35" />
      <rect x="46" y="34" width="6" height="30" rx="3" fill="#ff6b35" />
      <rect x="57" y="30" width="6" height="34" rx="3" fill="#ff6b35" />
      <rect x="68" y="34" width="6" height="30" rx="3" fill="#ff6b35" />

      {/* Rainbow arc */}
      <path d="M25,84 L25,60 A35,35 0 0 1 95,60 L95,84" fill="none" stroke="#d4006f" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
