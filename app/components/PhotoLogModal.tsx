'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeekDates, formatLocalDate } from '@/lib/types';
import { PLANT_COLOR_HEX, PLANT_COLOR_KEYS, PlantColorKey, plantColorLabel } from '@/lib/plant-colors';
import { processImageFile } from '@/lib/image-utils';

const LOW_CONFIDENCE_THRESHOLD = 0.6;
const STORAGE_BUCKET = 'plate-photos';

interface ReviewItem {
  id: string;
  food_name: string;
  estimated_color: PlantColorKey | null;
  confidence: number;
  visual_description: string;
  included: boolean;
  isCustom: boolean;
}

type Step = 'capture' | 'identifying' | 'review' | 'saving' | 'success';

// The photo-log API routes authenticate via a bearer token rather than
// cookies (the app's client-side session lives in localStorage), so every
// call to them needs the current access token attached explicitly.
async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface PhotoLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodAdded: () => void;
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ColorPicker({ selected, onSelect }: { selected: PlantColorKey | null; onSelect: (color: PlantColorKey | null) => void }) {
  return (
    <div className="pp-color-picker" role="group" aria-label="Color">
      {PLANT_COLOR_KEYS.map(color => (
        <button
          key={color}
          type="button"
          className={`pp-color-swatch ${selected === color ? 'pp-color-swatch--selected' : ''}`}
          style={{ background: PLANT_COLOR_HEX[color] }}
          onClick={() => onSelect(color)}
          aria-label={plantColorLabel(color)}
          aria-pressed={selected === color}
        />
      ))}
      <button
        type="button"
        className={`pp-color-swatch pp-color-swatch--other ${selected === null ? 'pp-color-swatch--selected' : ''}`}
        onClick={() => onSelect(null)}
        aria-label="No color / other"
        aria-pressed={selected === null}
      />
    </div>
  );
}

function ReviewRow({
  item,
  onToggleIncluded,
  onRemove,
  onNameChange,
  onColorChange,
}: {
  item: ReviewItem;
  onToggleIncluded: () => void;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onColorChange: (color: PlantColorKey | null) => void;
}) {
  const dotColor = item.estimated_color ? PLANT_COLOR_HEX[item.estimated_color] : null;
  const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD && !item.isCustom;

  return (
    <div className="pp-row" role="listitem" style={{ cursor: 'default', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div
        className="pp-row-icon"
        style={{ background: dotColor ? `color-mix(in srgb, ${dotColor} 16%, white)` : 'var(--surface-chip)', marginTop: 2 }}
        aria-hidden="true"
      >
        <span className="pp-dot" style={{ width: 14, height: 14, background: dotColor || 'var(--muted)', opacity: dotColor ? 1 : 0.5 }} />
      </div>

      <div className="pp-row-body" style={{ minWidth: 160 }}>
        <input
          type="text"
          className="pp-review-name-input"
          value={item.food_name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Food name"
        />
        {item.visual_description && (
          <p className="pp-row-meta" style={{ marginBottom: 6 }}>{item.visual_description}</p>
        )}
        <div className="flex items-center" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <ColorPicker selected={item.estimated_color} onSelect={onColorChange} />
          {lowConfidence && <span className="pp-badge-warn">Low confidence — check this</span>}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 4, flexShrink: 0, marginTop: 2 }}>
        <button
          type="button"
          onClick={onToggleIncluded}
          className={`pp-add-btn ${item.included ? 'pp-add-btn--added' : ''}`}
          aria-pressed={item.included}
          aria-label={item.included ? `Exclude ${item.food_name}` : `Include ${item.food_name}`}
        >
          {item.included ? <CheckIcon /> : <PlusIcon />}
          {item.included ? 'Logging' : 'Log it'}
        </button>
        <button type="button" onClick={onRemove} className="pp-remove-btn" aria-label={`Remove ${item.food_name}`}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export default function PhotoLogModal({ isOpen, onClose, onFoodAdded }: PhotoLogModalProps) {
  const [step, setStep] = useState<Step>('capture');
  const [error, setError] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [customFoodName, setCustomFoodName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  function resetAll() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setStep('capture');
    setError('');
    setPhotoProcessing(false);
    setPhotoPreviewUrl(null);
    setPhotoBlob(null);
    setImageBase64(null);
    setMimeType(null);
    setItems([]);
    setCustomFoodName('');
    setSuccessMessage('');
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError('');
    setPhotoProcessing(true);
    try {
      const processed = await processImageFile(file);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(URL.createObjectURL(processed.blob));
      setPhotoBlob(processed.blob);
      setImageBase64(processed.base64);
      setMimeType(processed.mimeType);
    } catch {
      setError('Could not read that photo. Please try another.');
    } finally {
      setPhotoProcessing(false);
    }
  }

  function handleRetake() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setStep('capture');
    setError('');
    setPhotoPreviewUrl(null);
    setPhotoBlob(null);
    setImageBase64(null);
    setMimeType(null);
    setItems([]);
  }

  async function handleIdentify() {
    if (!imageBase64 || !mimeType) return;
    setStep('identifying');
    setError('');

    try {
      const res = await fetch('/api/photo-log/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Photo identification failed. Please try again.');
      }

      const reviewItems: ReviewItem[] = (data.items || []).map((item: any) => ({
        id: genId(),
        food_name: item.food_name,
        estimated_color: item.estimated_color,
        confidence: item.confidence,
        visual_description: item.visual_description || '',
        included: item.confidence >= LOW_CONFIDENCE_THRESHOLD,
        isCustom: false,
      }));

      setItems(reviewItems);
      setStep('review');
    } catch (err: any) {
      // Keep the photo in place so the user can retry without re-capturing.
      setError(err.message || 'Photo identification failed. Please try again.');
      setStep('capture');
    }
  }

  function toggleIncluded(id: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, included: !i.included } : i)));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function updateName(id: string, name: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, food_name: name } : i)));
  }

  function updateColor(id: string, color: PlantColorKey | null) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, estimated_color: color } : i)));
  }

  function handleAddCustomFood() {
    const name = customFoodName.trim();
    if (!name) return;
    setItems(prev => [
      ...prev,
      {
        id: genId(),
        food_name: name.replace(/\b\w/g, c => c.toUpperCase()),
        estimated_color: null,
        confidence: 1,
        visual_description: '',
        included: true,
        isCustom: true,
      },
    ]);
    setCustomFoodName('');
  }

  async function handleSave() {
    const includedItems = items.filter(i => i.included && i.food_name.trim());
    if (includedItems.length === 0 || !photoBlob) return;

    setStep('saving');
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload the photo first so we still have a source_image reference
      // even if the FDC matching step below fails.
      const photoPath = `${user.id}/${Date.now()}-${genId()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(photoPath, photoBlob, { contentType: 'image/jpeg' });
      if (uploadError) throw new Error('Could not upload photo. Please try again.');

      const matchRes = await fetch('/api/photo-log/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ food_names: includedItems.map(i => i.food_name) }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error || 'Could not match foods to nutrition data. Please try again.');

      const matches: Array<{ fdcId: number; food_data_type: string; food_nutrients: any }> = matchData.matches;

      const todayStr = formatLocalDate(new Date());
      const logsToInsert = includedItems.map((item, i) => ({
        user_id: user.id,
        fdc_id: matches[i].fdcId,
        food_name: item.food_name,
        food_data_type: matches[i].food_data_type,
        food_nutrients: matches[i].food_nutrients,
        logged_date: todayStr,
        logged_at: new Date().toISOString(),
        color_category: item.estimated_color,
        confidence: item.confidence,
        source: 'photo' as const,
        source_image: photoPath,
      }));

      const weekDates = getWeekDates();
      const { data: existingLogs } = await supabase
        .from('food_logs')
        .select('fdc_id')
        .eq('user_id', user.id)
        .gte('logged_date', weekDates.week_starting_date)
        .lte('logged_date', weekDates.week_ending_date);

      const existingFdcIds = new Set(existingLogs?.map(log => log.fdc_id) || []);
      const newLogs = logsToInsert.filter(l => !existingFdcIds.has(l.fdc_id));
      const duplicateCount = logsToInsert.length - newLogs.length;

      if (newLogs.length > 0) {
        const { error: insertError } = await supabase.from('food_logs').insert(newLogs);
        if (insertError) throw insertError;
      }

      let message = '';
      if (newLogs.length > 0 && duplicateCount === 0) {
        message = `Logged ${newLogs.length} food${newLogs.length > 1 ? 's' : ''}!`;
      } else if (newLogs.length > 0 && duplicateCount > 0) {
        message = `Logged ${newLogs.length} new food${newLogs.length > 1 ? 's' : ''}! ${duplicateCount} already logged this week.`;
      } else {
        message = `All ${duplicateCount} food${duplicateCount > 1 ? 's were' : ' was'} already logged this week!`;
      }

      setSuccessMessage(message);
      setStep('success');

      setTimeout(() => {
        onFoodAdded();
        handleClose();
      }, 2000);
    } catch (err: any) {
      // Preserve the photo + review list so the user can retry Save
      // without re-identifying the plate.
      setError(err.message || 'Failed to save. Please try again.');
      setStep('review');
    }
  }

  if (!isOpen) return null;

  const includedCount = items.filter(i => i.included && i.food_name.trim()).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="p-6 max-w-md w-full max-h-[85vh] overflow-y-auto flex flex-col" style={{ background: 'var(--surface)', borderRadius: 'var(--r-sheet)' }}>
        {step === 'success' ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-2xl font-bold mb-2 font-[family-name:var(--font-playfair)]" style={{ color: 'var(--fresh-green)' }}>
              Nice!
            </p>
            <p className="text-lg" style={{ color: 'var(--body-text)' }}>{successMessage}</p>
          </div>
        ) : (
          <>
            <div className="pp-sheet-header">
              <h2 className="pp-sheet-title">Log from a photo</h2>
              <button onClick={handleClose} className="pp-icon-btn" aria-label="Close">×</button>
            </div>

            {error && (
              <div
                className="mb-3 p-3 text-sm"
                style={{ background: '#fff2d9', color: '#a15c00', borderRadius: 'var(--r-row)' }}
                role="alert"
              >
                {error}
              </div>
            )}

            {(step === 'capture' || step === 'identifying') && (
              <div className="flex-1 overflow-y-auto">
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Selected plate" className="pp-photo-preview mb-4" />
                ) : (
                  <div className="pp-photo-dropzone mb-4">
                    <CameraIcon />
                    <p style={{ fontSize: 14 }}>Take or upload a photo of your plate</p>
                  </div>
                )}

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />
                <input
                  ref={libraryInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />

                <div className="flex" style={{ gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="pp-btn-secondary flex-1 flex items-center justify-center"
                    style={{ gap: 6 }}
                    disabled={photoProcessing || step === 'identifying'}
                  >
                    <CameraIcon /> Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="pp-btn-secondary flex-1 flex items-center justify-center"
                    style={{ gap: 6 }}
                    disabled={photoProcessing || step === 'identifying'}
                  >
                    <ImageIcon /> Choose Photo
                  </button>
                </div>

                {photoPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleIdentify}
                    disabled={photoProcessing || step === 'identifying'}
                    className="pp-btn-primary w-full text-lg mt-4"
                  >
                    {step === 'identifying' ? 'Looking at your plate…' : photoProcessing ? 'Processing photo…' : 'Identify Foods'}
                  </button>
                )}
              </div>
            )}

            {step === 'review' && (
              <>
                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {items.length === 0 && (
                    <div className="pp-state-copy">
                      We didn&apos;t spot any food in that photo. Try another photo, or add a food below.
                    </div>
                  )}

                  {items.length > 0 && (
                    <div role="list">
                      {items.map(item => (
                        <ReviewRow
                          key={item.id}
                          item={item}
                          onToggleIncluded={() => toggleIncluded(item.id)}
                          onRemove={() => removeItem(item.id)}
                          onNameChange={(name) => updateName(item.id, name)}
                          onColorChange={(color) => updateColor(item.id, color)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center mt-3" style={{ gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add another food…"
                      value={customFoodName}
                      onChange={(e) => setCustomFoodName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomFood(); } }}
                      className="pp-search-input"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={handleAddCustomFood} className="pp-icon-btn pp-icon-btn--soft" aria-label="Add food">
                      <PlusIcon />
                    </button>
                  </div>
                </div>

                <div className="flex mt-4" style={{ gap: 10 }}>
                  <button type="button" onClick={handleRetake} className="pp-btn-secondary">
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={includedCount === 0}
                    className="pp-btn-primary flex-1 text-lg"
                  >
                    {`Log ${includedCount} food${includedCount === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            )}

            {step === 'saving' && (
              <div className="pp-state-copy">Saving your foods…</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
