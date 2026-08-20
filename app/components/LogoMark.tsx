/**
 * The Plate Palette brand mark — the official logo image. Rendered as a plain
 * <img> so it rasterizes correctly in html2canvas (the share-card export).
 * The `size` prop sets the rendered height; width scales with the natural
 * aspect ratio of the artwork.
 */
export default function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/plate-palette-logo.png"
      alt="Plate Palette logo"
      height={size}
      crossOrigin="anonymous"
      style={{ height: size, width: 'auto', display: 'block', flexShrink: 0 }}
    />
  );
}
