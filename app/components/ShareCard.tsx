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
      // Temporarily remove transform for capture
      const originalTransform = cardRef.current.style.transform;
      cardRef.current.style.transform = 'none';

      // Generate image from HTML (Instagram Story size: 1080x1920)
      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        backgroundColor: '#ffffff',
        width: 1080,
        height: 1920,
        windowWidth: 1080,
        windowHeight: 1920,
      });

      // Restore transform
      cardRef.current.style.transform = originalTransform;

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
        className="w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg hover:shadow-xl transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #4cc9f0, #52b788)' }}
      >
        📱 Share This Week
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
                Share Your Week
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Preview Card */}
            <div className="mb-6 overflow-hidden rounded-xl shadow-lg" style={{ width: '300px', height: '533px' }}>
              <div
                ref={cardRef}
                style={{
                  width: '1080px',
                  height: '1920px',
                  transform: 'scale(0.278)',
                  transformOrigin: 'top left',
                  background: 'linear-gradient(180deg, #fff5f8 0%, #fff9f0 50%, #f0f9ff 100%)',
                  padding: '120px 80px',
                  fontFamily: 'Poppins, sans-serif',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Card Content */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                  {/* Large Circle with Count */}
                  <div style={{
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4006f, #ff6b35)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 80px',
                    boxShadow: '0 30px 60px rgba(212, 0, 111, 0.3)',
                  }}>
                    <p style={{
                      fontSize: '280px',
                      fontWeight: 'bold',
                      color: 'white',
                      lineHeight: 1,
                      marginBottom: '20px',
                    }}>
                      {uniqueFoodsCount}
                    </p>
                    <p style={{
                      fontSize: '70px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: 600,
                    }}>
                      / {weeklyGoal}
                    </p>
                  </div>

                  <h1 style={{
                    fontSize: '100px',
                    fontWeight: 900,
                    fontFamily: 'Playfair Display, serif',
                    color: '#d4006f',
                    marginBottom: '40px',
                    lineHeight: 1.2,
                  }}>
                    Unique Foods This Week
                  </h1>

                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '50px',
                    backgroundColor: 'white',
                    borderRadius: '25px',
                    overflow: 'hidden',
                    marginBottom: '80px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #d4006f 0%, #ff6b35 50%, #52b788 100%)',
                      borderRadius: '25px',
                    }} />
                  </div>

                  {/* Fun Fact / Status */}
                  {goalMet ? (
                    <div style={{
                      backgroundColor: 'rgba(82, 183, 136, 0.15)',
                      padding: '50px',
                      borderRadius: '30px',
                      marginBottom: '80px',
                    }}>
                      <p style={{
                        fontSize: '80px',
                        color: '#52b788',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                      }}>
                        Goal Crushed! 🎉
                      </p>
                      <p style={{
                        fontSize: '50px',
                        color: '#666',
                      }}>
                        {funFact}
                      </p>
                    </div>
                  ) : (
                    <p style={{
                      fontSize: '60px',
                      color: '#ff6b35',
                      fontWeight: 600,
                      marginBottom: '80px',
                      lineHeight: 1.4,
                    }}>
                      {funFact}
                    </p>
                  )}

                  {/* Branding */}
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: '60px',
                  }}>
                    <p style={{
                      fontSize: '90px',
                      fontWeight: 900,
                      fontFamily: 'Playfair Display, serif',
                      color: '#d4006f',
                      marginBottom: '20px',
                    }}>
                      Plate Palette
                    </p>
                    <p style={{
                      fontSize: '45px',
                      color: '#999',
                    }}>
                      Track your food variety
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateAndShare}
              disabled={isGenerating}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
            >
              {isGenerating ? 'Generating...' : 'Share Now'}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              Generate and share your colorful week on social media
            </p>
          </div>
        </div>
      )}
    </>
  );
}
