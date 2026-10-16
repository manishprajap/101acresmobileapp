import React, { useEffect, useMemo, useState } from 'react';
import { IonIcon, IonSpinner, useIonRouter } from '@ionic/react';
import {
  heartOutline, heart, locationOutline, callOutline, imagesOutline, shieldCheckmark,
} from 'ionicons/icons';
import { apiGet } from '../api';
// Reuse the card styles from the listing page (ls-card, ls-row, ls-thumb...)
import '../pages/Listings.css';

const LIST_URL = '/properties/list';
const IMAGE_BASE = 'https://101acres.com';
const IMAGE_DIR = '/uploads';
const DETAIL_PATH = (id: number | string) => `/property/${id}`;
const RADIUS_KM = 50;
const PAGE = 6;

interface Card {
  id: number | string;
  title: string;
  amount: number;
  price: number;
  priceFor: string;
  city: string;
  cityName: string;
  area: string;
  society: string;
  sqft: number;
  beds: number;
  baths: number;
  furnishing: string;
  availability: string;
  floor: string;
  totalFloors: string;
  ownership: string;
  forType: 'sale' | 'rent';
  owner: string;
  phone: string;
  images: string[];
}

interface Props {
  userLocation?: any;
  onChangeLocation?: () => void;
}

// ── Helpers (same logic as the listing page) ────────────────
const num = (v: any) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

const fmtPrice = (n: number) => {
  if (!n) return 'Price on request';
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lac`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;

// Extract image paths from any shape (string / JSON string / array / object)
const collect = (v: any, out: string[], depth = 0) => {
  if (v == null || depth > 3) return;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return;
    if (t.startsWith('[') || t.startsWith('{')) {
      try { collect(JSON.parse(t), out, depth + 1); return; } catch { /* plain string */ }
    }
    if (!t.startsWith('data:') && !/^https?:/i.test(t) && t.includes(',')) {
      t.split(',').forEach((x) => collect(x, out, depth + 1));
      return;
    }
    if (IMG_EXT.test(t) || t.startsWith('data:image') || /^https?:/i.test(t)) out.push(t);
    return;
  }
  if (Array.isArray(v)) { v.forEach((x) => collect(x, out, depth + 1)); return; }
  if (typeof v === 'object') Object.values(v).forEach((x) => collect(x, out, depth + 1));
};

const fullUrl = (u: string) => {
  if (/^(https?:|data:)/i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const clean = u.replace(/^\.?\//, '');
  const path = clean.includes('/') ? `/${clean}` : `${IMAGE_DIR}/${clean}`;
  return encodeURI(`${IMAGE_BASE}${path}`);
};

const toImages = (p: any): string[] => {
  const out: string[] = [];
  Object.keys(p).forEach((k) => {
    if (/image|img|photo|picture|thumb|gallery|media|cover/i.test(k)) collect(p[k], out);
  });
  if (!out.length) Object.values(p).forEach((v) => { if (typeof v === 'string' && IMG_EXT.test(v.trim())) out.push(v.trim()); });
  return Array.from(new Set(out)).map(fullUrl);
};

const toCard = (p: any): Card => ({
  id: p.id ?? p._id ?? p.propertyId,
  title: p.title || `${p.residentialType || p.propertyType || 'Property'} for ${p.propertyFor || 'Sale'}`,
  price: num(p.price),
  amount: num(p.amount),
  priceFor: p.priceFor || '',
  city: p.city || '',
  cityName: p.cityName || '',
  area: p.area || '',
  society: p.society || '',
  sqft: num(p.squareFt ?? p.carpetArea ?? p.builtUpArea),
  beds: num(p.beds),
  baths: num(p.baths),
  furnishing: p.furnishing || '',
  availability: p.availability || '',
  floor: p.floorNo || '',
  totalFloors: p.totalFloors || '',
  ownership: p.ownership || '',
  forType: String(p.propertyFor || '').toLowerCase().includes('rent') ? 'rent' : 'sale',
  owner: p.contactName || '',
  phone: p.contactNumber || p.phone || '',
  images: toImages(p),
});

const Thumb: React.FC<{ images: string[]; onOpen: () => void }> = ({ images, onOpen }) => {
  const [failed, setFailed] = useState(0);
  const src = images[failed];
  return (
    <div className="ls-thumb" onClick={onOpen}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed((n) => n + 1)}
        />
      ) : (
        <div className="ls-noimg"><IonIcon icon={imagesOutline} /></div>
      )}
      {images.length > 1 && src && (
        <span className="ls-count"><IonIcon icon={imagesOutline} /> {images.length}</span>
      )}
    </div>
  );
};

const meta = (p: Card) =>
  [p.beds ? `${p.beds} Beds` : '', p.baths ? `${p.baths} Baths` : '', p.sqft ? `${p.sqft} sq.ft` : '']
    .filter(Boolean).join(' • ');

const tags = (p: Card) =>
  [p.availability, p.furnishing, p.floor ? `Floor ${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ''}` : '', p.ownership]
    .filter(Boolean).slice(0, 4);

// ── Component ───────────────────────────────────────────────
const Properties: React.FC<Props> = ({ userLocation, onChangeLocation }) => {
  const router = useIonRouter();

  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [saved, setSaved] = useState<Set<string | number>>(new Set());

  const lat = userLocation?.lat ?? userLocation?.latitude;
  const lng = userLocation?.lng ?? userLocation?.lon ?? userLocation?.longitude;
  const placeName: string = userLocation?.city || userLocation?.name || userLocation?.label || '';

  const fetchList = async (url: string): Promise<any[]> => {
    const data = await apiGet(url);
    return Array.isArray(data) ? data : data?.data ?? data?.properties ?? [];
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let list: any[] = [];

        // 1) Nearby properties (within 50 km) when a location is saved
        if (lat != null && lng != null) {
          try {
            list = await fetchList(`${LIST_URL}?lat=${lat}&lng=${lng}&radius=${RADIUS_KM}`);
          } catch { list = []; }
        }
        // 2) Fallback: full list
        if (!list.length) list = await fetchList(LIST_URL);

        if (!cancelled) {
          setItems(list.map(toCard));
          setShown(PAGE);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load properties');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [lat, lng]);

  const toggleSave = (id: string | number) =>
    setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const visible = useMemo(() => items.slice(0, shown), [items, shown]);

  const retry = () => {
    setLoading(true);
    setError('');
    fetchList(LIST_URL)
      .then((l) => setItems(l.map(toCard)))
      .catch((e) => setError(e?.message || 'Unable to load properties'))
      .finally(() => setLoading(false));
  };

  return (
    <section className="ls-content" style={{ paddingBottom: 16 }}>
      <div className="ls-summary">
        <div>
          <h1>{lat != null && lng != null ? `Properties near you` : 'Latest properties'}</h1>
          <p>{placeName ? `Within ${RADIUS_KM} km of ${placeName}` : `${items.length} properties`}</p>
        </div>
        {onChangeLocation && (
          <button type="button" className="ls-btn ls-btn--line" onClick={onChangeLocation}>
            <IonIcon icon={locationOutline} /> Change
          </button>
        )}
      </div>

      {loading && <div className="ls-state"><IonSpinner name="crescent" /></div>}

      {!loading && error && (
        <div className="ls-state">
          <p>{error}</p>
          <button type="button" className="ls-btn ls-btn--solid" onClick={retry}>Retry</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="ls-state"><p>No properties found.</p></div>
      )}

      {!loading && visible.map((p) => {
        const open = () => router.push(DETAIL_PATH(p.id));
        const where = [p.society, p.area, p.cityName].filter(Boolean).join(', ');
        return (
          <article className="ls-card" key={p.id}>
            <div className="ls-row">
              <div className="ls-thumbwrap">
                <Thumb images={p.images} onOpen={open} />
                <span className={`ls-badge ${p.forType === 'rent' ? 'ls-badge--rent' : ''}`}>
                  {p.forType === 'rent' ? 'Rent' : 'Sale'}
                </span>
              </div>

              <div className="ls-info" onClick={open}>
                <div className="ls-price">
                  <b>{fmtPrice(p.price)}</b>
                  {p.priceFor && p.forType === 'rent' && (
                    <em>/{p.priceFor.toLowerCase() === 'yearly' ? 'year' : 'month'}</em>
                  )}
                 
                </div>
                <h2>{p.title}</h2>
                {where && <p className="ls-loc"><IonIcon icon={locationOutline} /> {where}</p>}
                {meta(p) && <p className="ls-meta">{meta(p)}</p>}
              </div>

              <button type="button" className="ls-heart" onClick={() => toggleSave(p.id)} aria-label="Save">
                <IonIcon icon={saved.has(p.id) ? heart : heartOutline} className={saved.has(p.id) ? 'saved' : ''} />
              </button>
            </div>

            {tags(p).length > 0 && (
              <div className="ls-tags">
                {tags(p).map((t) => <span key={t}>{t}</span>)}
              </div>
            )}

            <div className="ls-foot">
              <div className="ls-owner">
                <span className="ls-avatar">{(p.owner || 'O').charAt(0).toUpperCase()}</span>
                <div>
                  <b>{p.owner || 'Owner'}</b>
                  <small><IonIcon icon={shieldCheckmark} /> {p.ownership || 'Owner'}</small>
                </div>
              </div>
              <div className="ls-actions">
                <button type="button" className="ls-btn ls-btn--line" onClick={open}>Details</button>
                {p.phone ? (
                  <a className="ls-btn ls-btn--solid" href={`tel:${p.phone}`}>
                    <IonIcon icon={callOutline} /> Contact
                  </a>
                ) : (
                  <button type="button" className="ls-btn ls-btn--solid" onClick={open}>Contact</button>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {!loading && items.length > shown && (
        <button type="button" className="ls-more" onClick={() => setShown((s) => s + PAGE)}>
          Show more properties ({items.length - shown} left)
        </button>
      )}
    </section>
  );
};

export default Properties;