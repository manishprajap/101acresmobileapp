import React, { useMemo, useState } from 'react';
import { IonIcon, useIonRouter } from '@ionic/react';
import { heartOutline, heart, locationOutline, callOutline, imagesOutline, shieldCheckmark } from 'ionicons/icons';
import '../pages/Propertycard.css';

// 👉 apne backend ke hisaab se change karo
const IMAGE_BASE = 'https://101acres.com'; // relative image path ke aage lagega
const IMAGE_DIR = '/uploads';              // sirf file name aaye to is folder me dhundhega
export const DETAIL_PATH = (id: number | string) => `/property/${id}`;

export interface Card {
  id: number | string;
  title: string;
  price: number;
  priceFor: string;
  city: string;
  area: string;
  society: string;
  landmark: string;
  sqft: number;
  beds: number;
  baths: number;
  balconies: string;
  furnishing: string;
  availability: string;
  floor: string;
  totalFloors: string;
  ownership: string;
  forType: 'sale' | 'rent';
  kind: string;
  desc: string;
  owner: string;
  phone: string;
  images: string[];
  createdAt: number;
}

const num = (v: any) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

const fmtPrice = (n: number) => {
  if (!n) return 'Price on request';
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lac`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;

// kisi bhi shape (string / JSON string / array / object) se image paths nikaalo
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
  // 1) image jaise naam wale fields
  Object.keys(p).forEach((k) => {
    if (/image|img|photo|picture|thumb|gallery|media|cover/i.test(k)) collect(p[k], out);
  });
  // 2) kuch na mila to har field me image extension dhundho
  if (!out.length) Object.values(p).forEach((v) => { if (typeof v === 'string' && IMG_EXT.test(v.trim())) out.push(v.trim()); });
  return Array.from(new Set(out)).map(fullUrl);
};

export const toCard = (p: any): Card => ({
  id: p.id ?? p._id ?? p.propertyId,
  title: p.title || `${p.residentialType || p.propertyType || 'Property'} for ${p.propertyFor || 'Sale'}`,
  price: num(p.price),
  priceFor: p.priceFor || '',
  city: p.city || '',
  area: p.area || '',
  society: p.society || '',
  landmark: p.landmark || '',
  sqft: num(p.squareFt ?? p.carpetArea ?? p.builtUpArea),
  beds: num(p.beds),
  baths: num(p.baths),
  balconies: p.balconies || '',
  furnishing: p.furnishing || '',
  availability: p.availability || '',
  floor: p.floorNo || '',
  totalFloors: p.totalFloors || '',
  ownership: p.ownership || '',
  forType: String(p.propertyFor || '').toLowerCase().includes('rent') ? 'rent' : 'sale',
  kind: p.residentialType || p.propertyType || '',
  desc: p.description || '',
  owner: p.contactName || '',
  phone: p.contactNumber || p.phone || '',
  images: toImages(p),
  createdAt: new Date(p.created_at || p.createdAt || 0).getTime() || 0,
});

const Thumb: React.FC<{ images: string[]; onOpen: () => void }> = ({ images, onOpen }) => {
  const [failed, setFailed] = useState(0);
  const src = images[failed];
  return (
    <div className="pc-thumb" onClick={onOpen}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { console.warn('Image load failed:', src); setFailed((n) => n + 1); }}
        />
      ) : (
        <div className="pc-noimg"><IonIcon icon={imagesOutline} /></div>
      )}
      {images.length > 1 && src && (
        <span className="pc-count"><IonIcon icon={imagesOutline} /> {images.length}</span>
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

// item = API se aaya raw property object
const PropertyCard: React.FC<{ item: any }> = ({ item }) => {
  const router = useIonRouter();
  const [saved, setSaved] = useState(false);
  const p = useMemo(() => toCard(item), [item]);

  const open = () => router.push(DETAIL_PATH(p.id));
  const where = [p.society, p.area, p.city].filter(Boolean).join(', ');
  const m = meta(p);
  const t = tags(p);

  return (
    <article className="pc-card">
      <div className="pc-row">
        <div className="pc-thumbwrap">
          <Thumb images={p.images} onOpen={open} />
          <span className={`pc-badge ${p.forType === 'rent' ? 'pc-badge--rent' : ''}`}>
            {p.forType === 'rent' ? 'Rent' : 'Sale'}
          </span>
        </div>

        <div className="pc-info" onClick={open}>
          <div className="pc-price">
            <b>{fmtPrice(p.price)}</b>
            {p.priceFor && p.forType === 'rent' && (
              <em>/{p.priceFor.toLowerCase() === 'yearly' ? 'year' : 'month'}</em>
            )}
            {p.sqft > 0 && p.price > 0 && p.forType === 'sale' && (
              <small>₹{Math.round(p.price / p.sqft).toLocaleString('en-IN')}/sq.ft</small>
            )}
          </div>
          <h2>{p.title}</h2>
          {where && <p className="pc-loc"><IonIcon icon={locationOutline} /> {where}</p>}
          {m && <p className="pc-meta">{m}</p>}
        </div>

        <button type="button" className="pc-heart" onClick={() => setSaved((v) => !v)} aria-label="Save">
          <IonIcon icon={saved ? heart : heartOutline} className={saved ? 'saved' : ''} />
        </button>
      </div>

      {t.length > 0 && <div className="pc-tags">{t.map((x) => <span key={x}>{x}</span>)}</div>}

      <div className="pc-foot">
        <div className="pc-owner">
          <span className="pc-avatar">{(p.owner || 'O').charAt(0).toUpperCase()}</span>
          <div>
            <b>{p.owner || 'Owner'}</b>
            <small><IonIcon icon={shieldCheckmark} /> Owner</small>
          </div>
        </div>
        <div className="pc-actions">
          <button type="button" className="pc-btn pc-btn--line" onClick={open}>Details</button>
          {p.phone ? (
            <a className="pc-btn pc-btn--solid" href={`tel:${p.phone}`}><IonIcon icon={callOutline} /> Contact</a>
          ) : (
            <button type="button" className="pc-btn pc-btn--solid" onClick={open}>Contact</button>
          )}
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;