import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonIcon, IonToast } from '@ionic/react';
import {
  searchOutline,
  closeCircle,
  locationOutline,
  locateOutline,
  businessOutline as projectIcon,
  starOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { apiGet } from '../api';

interface LocationResult {
  id: number;
  name: string;
  city: string;
  cityId?: number;
  type: string;        // 'City' | 'Locality' | 'Project' | 'New Launch Projects'
  area?: string;       // sirf property/project results ke liye (subtitle)
  propertyId?: number; // sirf property/project results ke liye
}

// Raw shape jo property search endpoint se aata hai
interface RawProperty {
  id?: number;
  _id?: number;
  propertyId?: number;
  contactName?: string;
  title?: string;
  city?: string;
  area?: string;
  isNewLaunch?: boolean;
}

const slides = [
  { image: '/01.jpg' },
  { image: '/02.jpg' },
  { image: '/03.jpg' },
];

const typeIconMap: Record<string, string> = {
  'City':                locationOutline,
  'Locality':            locationOutline,
  'New Launch Projects': starOutline,
  'Project':             projectIcon,
};

const Hero: React.FC<{ onUseCurrentLocation?: () => Promise<void> }> = ({ onUseCurrentLocation }) => {
  const history = useHistory();
  const [keyword, setKeyword]         = useState('');
  const [current, setCurrent]         = useState(0);
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showDrop, setShowDrop]       = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // ── Auto slider ───────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);

  // ── Bahar click par dropdown band ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Locality / City suggestions ───────────────────────────
  // apiGet() already parsed JSON return karta hai (ya error throw karta hai)
  const searchLocalities = async (query: string): Promise<LocationResult[]> => {
    const data = await apiGet(`/cities/search?q=${encodeURIComponent(query)}`);
    const results: LocationResult[] = Array.isArray(data) ? data : data.data ?? [];
    return results;
  };

  const searchProperties = async (query: string): Promise<LocationResult[]> => {
    const data = await apiGet(`/properties/mobilesearch?q=${encodeURIComponent(query)}`);
    const raw: RawProperty[] = Array.isArray(data) ? data : data.data ?? [];

    return raw.map((p) => {
      const baseName = p.contactName || p.title || 'Property';
      // "Project Name, Area, City" label — empty aur duplicate parts hata do
      const displayName = [baseName, p.area, p.city]
        .filter((part, idx, arr) => part && arr.indexOf(part) === idx)
        .join(', ');

      return {
        id: (p.id ?? p._id ?? p.propertyId) as number,
        propertyId: (p.id ?? p._id ?? p.propertyId) as number,
        name: displayName,
        city: p.city || '',
        area: p.area || p.city || '',
        type: p.isNewLaunch ? 'New Launch Projects' : 'Project',
      };
    });
  };

  // ── Dono sources parallel me fetch ────────────────────────
  const fetchLocations = useCallback(async (query: string) => {
    const myController = new AbortController();
    abortRef.current?.abort();
    abortRef.current = myController;

    setLoading(true);
    setError('');

    try {
      // allSettled: ek fail ho to bhi dusra chalta rahe
      const [propRes, locRes] = await Promise.allSettled([
        searchProperties(query),
        searchLocalities(query),
      ]);

      // Naya search shuru ho chuka ho to purana result ignore karo
      if (abortRef.current !== myController) return;

      const properties = propRes.status === 'fulfilled' ? propRes.value : [];
      const localities = locRes.status === 'fulfilled' ? locRes.value : [];

      // Projects pehle, phir localities
      const merged = [...properties, ...localities];

      if (merged.length === 0 && propRes.status === 'rejected' && locRes.status === 'rejected') {
        throw new Error('Failed to fetch suggestions');
      }

      setSuggestions(merged);
      setShowDrop(merged.length > 0);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setError('Unable to load suggestions. Please try again.');
      setSuggestions([]);
      setShowDrop(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Input change (debounced) ──────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    setActiveIdx(-1);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      setError('');
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      setLoading(false);
      return;
    }

    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchLocations(val.trim());
    }, 350);
  };

  // ── Search clear ──────────────────────────────────────────
  const handleClear = () => {
    setKeyword('');
    setSuggestions([]);
    setShowDrop(false);
    setError('');
    setLoading(false);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ───────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDrop || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // form submit se double search na ho
      if (activeIdx >= 0) handleSelectSuggestion(suggestions[activeIdx]);
      else handleSearch();
    } else if (e.key === 'Escape') {
      setShowDrop(false);
    }
  };

  // ── Suggestion select ─────────────────────────────────────
  const handleSelectSuggestion = (loc: LocationResult) => {
    setKeyword(loc.name);
    setShowDrop(false);
    setSuggestions([]);

    const isProject = loc.type === 'Project' || loc.type === 'New Launch Projects';

    if (isProject && loc.propertyId != null) {
      // Project select karne par seedha detail page
      history.push(`/property/${loc.propertyId}`);
      return;
    }

    // City / Locality select karne par area listing page
    const params = new URLSearchParams({ city: loc.city });
    if (loc.cityId != null) params.set('cityId', String(loc.cityId));
    history.push(`/area?${params.toString()}`);
  };

  // ── Search submit ─────────────────────────────────────────
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!keyword.trim()) return;
    setShowDrop(false);

    history.push(`/area?city=${encodeURIComponent(keyword.trim())}`);
  };

  const handleUseCurrentLocation = async () => {
    if (!onUseCurrentLocation) return;
    setLocating(true);
    setLocationError('');
    try {
      await onUseCurrentLocation();
    } catch (err) {
      setLocationError((err as Error)?.message || 'Could not get your location. Please allow location access and try again.');
    } finally {
      setLocating(false);
    }
  };

  // ── Matching text highlight ───────────────────────────────
  const highlight = (text: string, query: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <strong>{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="hero99-wrap">

      {/* Hero slider */}
      <div className="hero99-slider">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`hero99-slide ${i === current ? 'active' : ''}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}

        <div className="hero99-headline">
          Find your dream property
          <span>Trusted listings across 50+ cities</span>
        </div>

        <div className="h99-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h99-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>

      {/* Search bar (99acres style) */}
      <div className="hero99-search-wrap">
        <form className="hero99-search-box" onSubmit={handleSearch}>
          <div className="hero99-pill">
            <IonIcon icon={searchOutline} className="hero99-pill-icon" />

            <div className="hero99-pill-input-wrap">
              <input
                ref={inputRef}
                className="hero99-pill-input"
                type="text"
                enterKeyHint="search"
                placeholder="Search locality, city or project"
                value={keyword}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
                autoComplete="off"
              />

              {loading && <span className="h99-loading-spinner" />}

              {keyword && !loading && (
                <IonIcon
                  icon={closeCircle}
                  className="h99-mic-icon"
                  onClick={handleClear}
                />
              )}

              <button
                type="button"
                className={`hero99-current-location${locating ? ' is-loading' : ''}`}
                onClick={handleUseCurrentLocation}
                disabled={locating || !onUseCurrentLocation}
                aria-label="Search properties near my current location"
                title="Use my current location"
              >
                {locating ? <span className="h99-location-spinner" /> : <IonIcon icon={locateOutline} />}
              </button>

              {showDrop && (suggestions.length > 0 || error) && (
                <div className="h99-dropdown" ref={dropRef}>
                  {error && <div className="h99-suggestion-error">{error}</div>}
                  {suggestions.map((loc, idx) => (
                    <div
                      key={`${loc.type}-${loc.id}`}
                      className={`h99-suggestion-item ${idx === activeIdx ? 'active' : ''}`}
                      onMouseDown={() => handleSelectSuggestion(loc)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <span className="h99-suggest-icon">
                        <IonIcon icon={typeIconMap[loc.type] || locationOutline} />
                      </span>
                      <div className="h99-suggest-text">
                        <span className="h99-suggest-name">
                          {highlight(loc.name, keyword)}
                        </span>
                        <span className="h99-suggest-type">{loc.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      <IonToast
        isOpen={!!locationError}
        message={locationError}
        duration={3500}
        color="danger"
        onDidDismiss={() => setLocationError('')}
      />

    </div>
  );
};

export default Hero;