import React, { useEffect, useState } from 'react';
import { IonModal, IonIcon } from '@ionic/react';
import { navigateOutline, searchOutline, locationOutline, settingsOutline } from 'ionicons/icons';
import {
  UserLocation,
  getDeviceLocation,
  reverseGeocode,
  searchPlaces,
  openAppLocationSettings,
  openLocationSettings,
} from '../utils/location';

interface LocationGateProps {
  isOpen: boolean;
  onSelect: (loc: UserLocation) => void;
  onSkip: () => void;
}

const LocationGate: React.FC<LocationGateProps> = ({ isOpen, onSelect, onSkip }) => {
  const [mode, setMode]           = useState<'choose' | 'manual'>('choose');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<UserLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [settingsAction, setSettingsAction] = useState<'app' | 'location' | null>(null);

  // Reset the modal every time it opens
  useEffect(() => {
    if (isOpen) {
      setMode('choose');
      setBusy(false);
      setError('');
      setSettingsAction(null);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced place search for manual entry
  useEffect(() => {
    if (mode !== 'manual') return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const list = await searchPlaces(q);
        if (!cancelled) {
          setResults(list);
          setError(list.length === 0 ? 'No matching place found.' : '');
        }
      } catch (error) {
        if (!cancelled) {
          const message = (error as Error)?.message?.toLowerCase() || '';
          setError(message.includes('network') || message.includes('connect') || message.includes('fetch')
            ? 'Cannot connect to 101Acres. Check your internet connection and try again.'
            : 'Could not search places right now. Please try again.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, mode]);

  const handleUseCurrent = async () => {
    setBusy(true);
    setError('');
    try {
      const { lat, lng } = await getDeviceLocation();
      const { label, city } = await reverseGeocode(lat, lng);
      onSelect({ lat, lng, label, city });
    } catch (e) {
      const msg = (e as Error).message || '';
      const lowerMessage = msg.toLowerCase();
      if (msg.includes('PERMISSION') || lowerMessage.includes('denied')) {
        setError('Location permission is off. Allow location access for 101Acres in Android Settings, then try again.');
        setSettingsAction('app');
      } else if (msg.includes('LOCATION_SERVICES_DISABLED') || lowerMessage.includes('location services')) {
        setError('Turn on Location/GPS on your phone, then tap Use my current location again.');
        setSettingsAction('location');
      } else if (msg.includes('LOCATION_TIMEOUT') || lowerMessage.includes('timeout')) {
        setError('Could not get a location fix. Turn on GPS and Wi-Fi/mobile data, then retry.');
        setSettingsAction('location');
      } else {
        setError('Could not access device location. Please check Android location permission and GPS, or enter a city manually.');
        setSettingsAction('app');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      backdropDismiss={false}
      className="loc-modal"
      style={{ '--height': 'auto', '--max-height': '92%' } as React.CSSProperties}
    >
      <div style={{ padding: '24px 20px 20px', background: '#fff' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#e8f1fb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        }}>
          <IonIcon icon={locationOutline} style={{ fontSize: 28, color: '#1a5fa8' }} />
        </div>

        <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#14202c', margin: '0 0 6px' }}>
          Find properties near you
        </h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7785', margin: '0 0 18px' }}>
          Share your location to see properties within 50 km.
        </p>

        {mode === 'choose' && (
          <>
            <button className="loc-btn loc-btn--primary" onClick={handleUseCurrent} disabled={busy}>
              <IonIcon icon={navigateOutline} />
              {busy ? 'Getting your location...' : 'Use my current location'}
            </button>
            <button className="loc-btn loc-btn--ghost" onClick={() => setMode('manual')} disabled={busy}>
              <IonIcon icon={searchOutline} />
              Enter location manually
            </button>
          </>
        )}

        {mode === 'manual' && (
          <>
            <input
              className="loc-input"
              autoFocus
              placeholder="Search city, area or locality"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && <div className="loc-hint">Searching...</div>}
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {results.map((r, i) => (
                <div key={`${r.lat}-${r.lng}-${i}`} className="loc-result" onClick={() => onSelect(r)}>
                  <IonIcon icon={locationOutline} style={{ fontSize: 16, color: '#1a5fa8', flexShrink: 0 }} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
            <button className="loc-btn loc-btn--ghost" onClick={() => { setMode('choose'); setError(''); }}>
              Back
            </button>
          </>
        )}

        {error && <div className="loc-error">{error}</div>}

        {settingsAction && (
          <button
            type="button"
            className="loc-btn loc-btn--settings"
            onClick={() => {
              const openSettings = settingsAction === 'app'
                ? openAppLocationSettings
                : openLocationSettings;
              void openSettings().catch(() => {
                setError('Could not open Android Settings. Open Settings manually and enable location for 101Acres.');
              });
            }}
          >
            <IonIcon icon={settingsOutline} />
            {settingsAction === 'app' ? 'Open app permission settings' : 'Turn on phone location'}
          </button>
        )}

        <button className="loc-skip" onClick={onSkip}>Skip for now</button>
      </div>

      <style>{`
        .loc-modal { align-items: flex-end; }
        .loc-modal::part(content) { width: 100%; border-radius: 20px 20px 0 0; }
        .loc-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 16px; border-radius: 12px; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; margin-bottom: 10px;
        }
        .loc-btn:disabled { opacity: 0.6; cursor: default; }
        .loc-btn--primary { background: #1a5fa8; color: #fff; }
        .loc-btn--ghost { background: #f1f5f9; color: #14202c; }
        .loc-btn--settings { background: #e5effa; color: #174f85; }
        .loc-input {
          width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 14px;
          border: 1px solid #d5dde6; border-radius: 12px; outline: none; margin-bottom: 8px;
        }
        .loc-input:focus { border-color: #1a5fa8; }
        .loc-hint { font-size: 12px; color: #888; padding: 4px 2px 8px; }
        .loc-result {
          display: flex; align-items: center; gap: 8px; padding: 11px 6px;
          font-size: 13px; color: #14202c; border-bottom: 1px solid #eef2f6; cursor: pointer;
        }
        .loc-result:active { background: #f5f8fb; }
        .loc-error {
          background: #fff5f5; color: #cc3333; font-size: 12px;
          padding: 10px 12px; border-radius: 10px; margin: 4px 0 8px;
        }
        .loc-skip {
          display: block; margin: 6px auto 0; background: none; border: none;
          color: #6b7785; font-size: 13px; cursor: pointer; padding: 8px;
        }
      `}</style>
    </IonModal>
  );
};

export default LocationGate;