'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { FoodLog, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ShareCardProps {
  user: User;
  foodLogs: FoodLog[];
  uniqueFoodsCount: number;
  weekStartDate: string;
  weekEndDate: string;
}

const funFacts = [
  "I'm eating the rainbow! 🌈",
  "Building a diverse diet, one food at a time",
  "Variety is the spice of life",
  "Every color = different nutrients",
  "Celebrating food diversity this week",
  "Adding more variety to my plate",
  "Exploring colorful nutrition",
];

// The six color-wheel segments (matches the conic-gradient used everywhere).
const WHEEL_SEGMENTS = [
  { color: '#d4006f', start: 0, end: 45 },
  { color: '#ff6b35', start: 45, end: 95 },
  { color: '#ffd966', start: 95, end: 150 },
  { color: '#52b788', start: 150, end: 225 },
  { color: '#4cc9f0', start: 225, end: 290 },
  { color: '#f0ece3', start: 290, end: 360 },
];

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
 * render CSS conic-gradient) with an HTML white center holding count + label.
 */
function WheelSvg({ size, ring, count, label }: { size: number; ring: number; count: number | string; label: string }) {
  const r = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {WHEEL_SEGMENTS.map((s) => (
          <path key={s.color} d={arcPath(r, r, r, s.start, s.end)} fill={s.color} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: ring,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: size * 0.24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontSize: Math.max(11, size * 0.065), color: '#9a9285', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export default function ShareCard({ user, foodLogs, uniqueFoodsCount, weekStartDate, weekEndDate }: ShareCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const weeklyGoal = user.weekly_goal;
  const progressPercent = Math.min((uniqueFoodsCount / weeklyGoal) * 100, 100);
  const goalMet = uniqueFoodsCount >= weeklyGoal;

  // Get unique food names
  const uniqueFoodNames = Array.from(new Set(foodLogs.map(log => log.food_name)));

  // Random fun fact
  const funFact = funFacts[Math.floor(Math.random() * funFacts.length)];

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
              text: `${uniqueFoodsCount} different plant foods this week!`,
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

      {/* Share Modal (design 2a bottom sheet) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderRadius: 'var(--r-sheet)' }}>
            <div className="pp-grabber mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: 'var(--ink)' }}>
                Share Your Week
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-2xl leading-none"
                style={{ color: 'var(--faint)' }}
              >
                ×
              </button>
            </div>

            {/* Preview Card (design 2a) — this exact element is exported */}
            <div
              ref={cardRef}
              style={{
                background: '#fafaf7',
                border: '1px solid #ece6da',
                borderRadius: '20px',
                padding: '32px 24px',
                marginBottom: '24px',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '18px',
                textAlign: 'center',
              }}
            >
              <WheelSvg size={180} ring={28} count={uniqueFoodsCount} label={`/ ${weeklyGoal} foods`} />

              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
                Unique Foods This Week
              </h1>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '10px', background: '#f0ece3', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #4cc9f0, #52b788)', borderRadius: '5px' }} />
              </div>

              {/* Fun fact / status */}
              {goalMet ? (
                <div style={{ background: 'rgba(82, 183, 136, 0.12)', borderRadius: '16px', padding: '14px 18px' }}>
                  <p style={{ fontSize: '15px', color: '#52b788', fontWeight: 700, margin: '0 0 4px' }}>Goal Crushed! 🎉</p>
                  <p style={{ fontSize: '13px', color: '#6b6459', margin: 0 }}>{funFact}</p>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: '#6b6459', lineHeight: 1.6, margin: 0, maxWidth: '260px' }}>{funFact}</p>
              )}

              {/* Branding */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 700, color: '#d4006f' }}>
                  Plate Palette
                </div>
                <p style={{ fontSize: '11px', color: '#9a9285', margin: '4px 0 0' }}>Track your food variety</p>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateAndShare}
              disabled={isGenerating}
              className="pp-btn-primary w-full text-lg"
            >
              {isGenerating ? 'Generating...' : 'Share Now'}
            </button>

            <p className="text-sm text-center mt-4" style={{ color: 'var(--faint)' }}>
              Generate and share your colorful week on social media
            </p>
          </div>
        </div>
      )}
    </>
  );
}
