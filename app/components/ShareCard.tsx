'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { FoodLog, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getPlantColorInfo, PLANT_COLOR_HEX_RAW, PlantColorKey } from '@/lib/plant-colors';
import { buildWheelWedges } from './ColorWheel';
import LogoMark from './LogoMark';

interface ShareCardProps {
  user: User;
  foodLogs: FoodLog[];
  uniqueFoodsCount: number;
  weekStartDate: string;
  weekEndDate: string;
}

const WHEEL_EMPTY = '#f0ece3';

// Same arc-length progress fill as ColorWheel, in raw hex for SVG/html2canvas.
function buildWheelSegments(colorCounts: Partial<Record<PlantColorKey, number>>, goal: number) {
  return buildWheelWedges(colorCounts, goal).map(w => ({
    color: w.color ? PLANT_COLOR_HEX_RAW[w.color] : WHEEL_EMPTY,
    start: w.start,
    end: w.end,
  }));
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const p = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = p(end);
  const [x2, y2] = p(start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`;
}

/**
 * SVG color wheel — an SVG ring (so html2canvas can rasterize it; it cannot
 * render CSS conic-gradient) with a white center holding a three-tier
 * hierarchy: big count, "plant colors", small "this week".
 */
function WheelSvg({ size, ring, count, colorCounts, goal }: { size: number; ring: number; count: number | string; colorCounts: Partial<Record<PlantColorKey, number>>; goal: number }) {
  const r = size / 2;
  const segments = buildWheelSegments(colorCounts, goal);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {segments.map((s, i) => (
          <path key={i} d={arcPath(r, r, r, s.start, s.end)} fill={s.color} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: ring,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LogoMark size={size * 0.1} />
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: size * 0.24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1, marginTop: size * 0.02 }}>
          {count}
        </div>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: size * 0.075, fontWeight: 600, color: '#1a1a1a', marginTop: size * 0.03 }}>
          plant colors
        </div>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: size * 0.05, fontWeight: 600, color: '#d4006f', marginTop: size * 0.01, letterSpacing: '0.01em' }}>
          this week
        </div>
      </div>
    </div>
  );
}

// A confetti piece anchors to whichever corner (top/bottom × left/right) is
// given, so it stays put in that corner no matter how tall the card grows
// with more logged foods.
interface ConfettiPiece {
  kind: 'dash' | 'dot' | 'spark';
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  color: string;
  size?: number;
  rotate?: number;
  glyph?: string;
}

const CONFETTI_PIECES: ConfettiPiece[] = [
  // Top-left cluster
  { kind: 'dash', top: 18, left: 18, color: '#4cc9f0', rotate: -20 },
  { kind: 'dot', top: 40, left: 14, color: '#d4006f', size: 7 },
  { kind: 'dash', top: 78, left: 12, color: '#ff6b35', rotate: 15 },
  { kind: 'spark', top: 60, left: 40, color: '#52b788', size: 14, glyph: '✧' },
  { kind: 'dot', top: 14, left: 46, color: '#8b5fbf', size: 5 },
  { kind: 'dash', top: 98, left: 30, color: '#ffd966', rotate: 40 },
  { kind: 'dot', top: 110, left: 60, color: '#ff6b35', size: 6 },
  { kind: 'spark', top: 30, left: 70, color: '#4cc9f0', size: 11, glyph: '✧' },
  { kind: 'dash', top: 85, left: 80, color: '#8b5fbf', rotate: 10 },
  // Top-right cluster
  { kind: 'spark', top: 14, right: 20, color: '#ffd966', size: 22, glyph: '✦' },
  { kind: 'dash', top: 46, right: 22, color: '#8b5fbf', rotate: -15 },
  { kind: 'dot', top: 70, right: 16, color: '#52b788', size: 8 },
  { kind: 'dash', top: 20, right: 48, color: '#d4006f', rotate: 25 },
  { kind: 'dot', top: 90, right: 40, color: '#4cc9f0', size: 6 },
  { kind: 'spark', top: 100, right: 14, color: '#ff6b35', size: 12, glyph: '✧' },
  { kind: 'dot', top: 120, right: 60, color: '#ffd966', size: 6 },
  { kind: 'spark', top: 34, right: 74, color: '#52b788', size: 11, glyph: '✧' },
  { kind: 'dash', top: 60, right: 80, color: '#4cc9f0', rotate: -30 },
  // Bottom-left cluster (bottom-anchored so it holds its corner at any card height)
  { kind: 'dot', bottom: 20, left: 16, color: '#ff6b35', size: 7 },
  { kind: 'dash', bottom: 44, left: 14, color: '#52b788', rotate: 20 },
  { kind: 'spark', bottom: 70, left: 34, color: '#4cc9f0', size: 13, glyph: '✧' },
  { kind: 'dot', bottom: 90, left: 18, color: '#8b5fbf', size: 6 },
  { kind: 'dash', bottom: 14, left: 50, color: '#ffd966', rotate: 30 },
  { kind: 'spark', bottom: 60, left: 60, color: '#d4006f', size: 12, glyph: '✧' },
  { kind: 'dot', bottom: 100, left: 44, color: '#52b788', size: 5 },
  { kind: 'dash', bottom: 32, left: 20, color: '#ff6b35', rotate: 5 },
  { kind: 'spark', bottom: 110, left: 70, color: '#ffd966', size: 10, glyph: '✧' },
  // Bottom-right cluster
  { kind: 'dash', bottom: 22, right: 18, color: '#d4006f', rotate: -25 },
  { kind: 'dot', bottom: 50, right: 14, color: '#ffd966', size: 8 },
  { kind: 'spark', bottom: 76, right: 36, color: '#8b5fbf', size: 14, glyph: '✦' },
  { kind: 'dot', bottom: 96, right: 16, color: '#ff6b35', size: 6 },
  { kind: 'dash', bottom: 14, right: 50, color: '#52b788', rotate: 15 },
  { kind: 'spark', bottom: 60, right: 60, color: '#4cc9f0', size: 12, glyph: '✧' },
  { kind: 'dot', bottom: 110, right: 44, color: '#d4006f', size: 5 },
  { kind: 'dash', bottom: 34, right: 70, color: '#ffd966', rotate: -20 },
  { kind: 'spark', bottom: 120, right: 70, color: '#ff6b35', size: 10, glyph: '✧' },
];

// Confetti scattered around all four corners — decorative only, and dense
// by request ("way more confetti").
function Confetti() {
  return (
    <>
      {CONFETTI_PIECES.map((p, i) => {
        const pos = { position: 'absolute' as const, top: p.top, bottom: p.bottom, left: p.left, right: p.right };
        if (p.kind === 'dash') {
          return <div key={i} style={{ ...pos, width: 14, height: 4, borderRadius: 2, background: p.color, transform: `rotate(${p.rotate}deg)` }} />;
        }
        if (p.kind === 'dot') {
          return <div key={i} style={{ ...pos, width: p.size, height: p.size, borderRadius: '50%', background: p.color }} />;
        }
        return <span key={i} style={{ ...pos, fontSize: p.size, color: p.color, lineHeight: 1 }}>{p.glyph}</span>;
      })}
    </>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

export default function ShareCard({ user, foodLogs, uniqueFoodsCount, weekStartDate, weekEndDate }: ShareCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const weeklyGoal = user.weekly_goal;
  const goalMet = uniqueFoodsCount >= weeklyGoal;
  const accentLine = goalMet ? 'Crushed it.' : 'Building variety.';
  const accentColor = goalMet ? '#ff6b35' : '#d4006f';

  // Get unique food names, most compact scannable form.
  const uniqueFoodNames = Array.from(new Set(foodLogs.map(log => log.food_name)));
  const namesToShow = uniqueFoodNames.slice(0, 5);
  const remainingCount = uniqueFoodNames.length - namesToShow.length;

  const colorCounts: Partial<Record<PlantColorKey, number>> = {};
  uniqueFoodNames.forEach(name => {
    const info = getPlantColorInfo(name);
    if (info?.color) colorCounts[info.color] = (colorCounts[info.color] || 0) + 1;
  });

  async function handleGenerateAndShare() {
    if (!cardRef.current) return;

    setIsGenerating(true);

    try {
      // Capture the preview card at 3x for a crisp shareable image.
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#fafaf7',
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to generate image');
        }

        const file = new File([blob], 'plate-palette-week.png', { type: 'image/png' });

        // Try Web Share API
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My Plate Palette Week',
              text: `Count the colors on your plate! ${uniqueFoodsCount} different plant foods this week 🌈`,
              url: 'https://platepalette.app/',
            });

            // Log the share
            await logShare('shared');
          } catch (shareError: any) {
            if (shareError.name !== 'AbortError') {
              console.error('Share error:', shareError);
              // Fall back to download
              downloadImage(canvas);
              await logShare('copied');
            }
            // If AbortError, user cancelled - don't log
          }
        } else {
          // Web Share not available, download instead
          downloadImage(canvas);
          await logShare('copied');
        }

        setShowShareModal(false);
      }, 'image/png');

    } catch (error) {
      console.error('Error generating image:', error);
      alert('Couldn\'t generate image. Try again?');
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadImage(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.download = 'plate-palette-week.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function logShare(platform: string) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      await supabase.from('share_logs').insert({
        user_id: authUser.id,
        week_starting_date: weekStartDate,
        week_ending_date: weekEndDate,
        foods_count: uniqueFoodsCount,
        goal_count: weeklyGoal,
        platform: platform,
        shared_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging share:', error);
    }
  }

  return (
    <>
      {/* Share Button */}
      <button
        onClick={() => setShowShareModal(true)}
        disabled={uniqueFoodsCount === 0}
        className="pp-btn-primary w-full text-lg mb-4"
      >
        📱 Share This Week
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--r-sheet)' }}>
            <div className="pp-grabber mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="pp-display text-3xl">Share your week</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="pp-icon-btn pp-icon-btn--soft"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Preview Card — this exact element is exported as the shared image */}
            <div
              ref={cardRef}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #fdeee0 0%, #fce4ea 25%, #fdf6df 50%, #e8f5ea 75%, #e7f6fa 100%)',
                border: '1px solid #ece6da',
                borderRadius: '20px',
                padding: '28px 22px 22px',
                marginBottom: '20px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              <Confetti />

              <WheelSvg size={224} ring={32} count={uniqueFoodsCount} colorCounts={colorCounts} goal={weeklyGoal} />

              <div>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 800, color: '#1a1a1a', margin: 0, lineHeight: 1.15 }}>
                  {uniqueFoodsCount} colors.
                </p>
                <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '28px', fontWeight: 800, color: accentColor, margin: '2px 0 0', lineHeight: 1.15 }}>
                  {accentLine}
                </p>
                <svg width="130" height="10" viewBox="0 0 130 10" style={{ display: 'block', margin: '4px auto 0' }}>
                  <path d="M2 6 Q 22 0, 43 6 T 87 6 T 128 6" stroke={accentColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>

              {/* Compact, scannable food summary — each food carries its own color badge */}
              {namesToShow.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: '16px', rowGap: '10px', maxWidth: '320px' }}>
                  {namesToShow.map((name) => {
                    const info = getPlantColorInfo(name);
                    const hex = info?.color ? PLANT_COLOR_HEX_RAW[info.color] : '#c9c2b4';
                    return (
                      <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${hex}26`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: hex, display: 'inline-block' }} />
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#3f3b34' }}>{name}</span>
                      </span>
                    );
                  })}
                  {remainingCount > 0 && (
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#9a9285' }}>+ {remainingCount} more</span>
                  )}
                </div>
              )}

              <div style={{ width: '100%', borderTop: '1px dashed #ece6da' }} />

              {/* Signature wordmark */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LogoMark size={22} />
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 700, color: '#1a1a1a' }}>
                    Plate Palette
                  </span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#9a9285', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Variety, not restriction
                </span>
              </div>
            </div>

            {/* CTA — reserved multicolor treatment for this celebratory action */}
            <button
              onClick={handleGenerateAndShare}
              disabled={isGenerating}
              className="pp-btn-celebrate w-full text-lg"
            >
              {!isGenerating && <ShareIcon />}
              {isGenerating ? 'Generating...' : 'Share now'}
            </button>

            <p className="text-xs text-center mt-3 mb-3" style={{ color: 'var(--faint)' }}>
              Shares as an image you can post or send.
            </p>

            {/* Secondary action — visibly quiet */}
            <button
              onClick={() => setShowShareModal(false)}
              className="pp-btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
