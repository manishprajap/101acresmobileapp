import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IonPage, IonHeader, IonContent, IonIcon, IonSpinner, useIonRouter } from '@ionic/react';
import {
  arrowBack, searchOutline, closeCircle, heartOutline, heart, locationOutline,
  businessOutline, callOutline, imagesOutline, shieldCheckmark,
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { apiGet } from '../api';
import BottomNav from '../components/BottomNav';
import './Listings.css';

// 👉 apne backend ke hisaab se change karo
const LIST_URL = '/properties/list';
const IMAGE_BASE = 'https://101acres.com'; // relative image path ke aage lagega
const IMAGE_DIR = '/uploads';              // sirf file name aaye to is folder me dhundhega
const DETAIL_PATH = (id: number | string) => `/property/${id}`;

interface Card {
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

const toCard = (p: any): Card => ({
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
    <div className="ls-thumb" onClick={onOpen}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { console.warn('Image load failed:', src); setFailed((n) => n + 1); }}
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

const BHK = ['1', '2', '3', '4+'];
const SORTS = [
  { v: 'rel', l: 'Relevance' },
  { v: 'new', l: 'Newest first' },
  { v: 'low', l: 'Price: Low to High' },
  { v: 'high', l: 'Price: High to Low' },
];
const PAGE = 8;

const Listings: React.FC = () => {
  const router = useIonRouter();
  const { search } = useLocation();
  const qp = useMemo(() => new URLSearchParams(search), [search]);
  const q = (qp.get('city') || '').trim();
  const areaQ = (qp.get('area') || '').trim();
  const cityId = qp.get('cityId');
  const typeParam = qp.get('type'); // sale | rent | null

  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forType, setForType] = useState<'all' | 'sale' | 'rent'>(
    typeParam === 'rent' ? 'rent' : typeParam === 'sale' ? 'sale' : 'all'
  );
  const [bhk, setBhk] = useState<string[]>([]);
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('rel');
  const [shown, setShown] = useState(PAGE);
  const [saved, setSaved] = useState<Set<string | number>>(new Set());

  // search box state
  const [keyword, setKeyword] = useState('');
  const [sugs, setSugs] = useState<any[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const sugTimer = useRef<number | null>(null);

  const [clientFilter, setClientFilter] = useState(false);

  const fetchList = async (url: string): Promise<any[]> => {
    const data = await apiGet(url);
    return Array.isArray(data) ? data : data?.data ?? data?.properties ?? [];
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const term = (areaQ || q).trim();
      let list: any[] = [];
      let byClient = false;

      if (term) {
        // Hero jaisi hi search API
        try { list = await fetchList(`/properties/mobilesearch?q=${encodeURIComponent(term)}`); } catch { list = []; }
      }
      // search se kuch na mile (ya term hi na ho) to full list + client filter
      if (!list.length) {
        const params = new URLSearchParams();
        if (q) params.set('city', q);
        if (cityId) params.set('cityId', cityId);
        if (areaQ) params.set('area', areaQ);
        list = await fetchList(`${LIST_URL}?${params.toString()}`);
        byClient = true;
      }
      console.log('Listings sample item:', list[0]);
      setClientFilter(byClient);
      setItems(list.map(toCard));
    } catch (e: any) {
      setError(e?.message || 'Listings load nahi ho payi');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); setShown(PAGE); }, [q, cityId, areaQ]);

  const kinds = useMemo(
    () => Array.from(new Set(items.map((i) => i.kind).filter(Boolean))).slice(0, 8),
    [items]
  );

  const results = useMemo(() => {
    const term = q.toLowerCase();
    const aTerm = areaQ.toLowerCase();
    let list = items.filter((p) => {
      const hay = `${p.city} ${p.area} ${p.title} ${p.society} ${p.landmark}`.toLowerCase();
      if (clientFilter && term && !hay.includes(term)) return false;
      if (clientFilter && aTerm && !p.area.toLowerCase().includes(aTerm)) return false;
      if (forType !== 'all' && p.forType !== forType) return false;
      if (kind && p.kind !== kind) return false;
      if (bhk.length && !bhk.some((b) => (b === '4+' ? p.beds >= 4 : p.beds === Number(b)))) return false;
      return true;
    });
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'new') list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [items, q, areaQ, forType, kind, bhk, sort, clientFilter]);

  const toggleBhk = (b: string) =>
    setBhk((p) => (p.includes(b) ? p.filter((x) => x !== b) : [...p, b]));
  const toggleSave = (id: string | number) =>
    setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const place = [areaQ, q].filter(Boolean).join(', ') || 'All cities';
  const headline = `${forType === 'rent' ? 'Properties for Rent' : forType === 'sale' ? 'Properties for Sale' : 'Properties'} in ${place}`;

  // ── Search box logic ──────────────────────────────────────
  // URL badalne par search box me current location dikhao
  useEffect(() => { setKeyword([areaQ, q].filter(Boolean).join(', ')); }, [q, areaQ]);

  useEffect(() => () => { if (sugTimer.current) clearTimeout(sugTimer.current); }, []);

  const onSearchInput = (val: string) => {
    setKeyword(val);
    if (sugTimer.current) clearTimeout(sugTimer.current);
    if (val.trim().length < 2) { setSugs([]); setShowSug(false); setSugLoading(false); return; }

    sugTimer.current = window.setTimeout(async () => {
      setSugLoading(true);
      const enc = encodeURIComponent(val.trim());
      const [p, l] = await Promise.allSettled([
        apiGet(`/properties/mobilesearch?q=${enc}`),
        apiGet(`/cities/search?q=${enc}`),
      ]);
      const arr = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : r.value?.data ?? []) : [];

      const props = arr(p).map((x: any) => {
        const pid = x.id ?? x._id ?? x.propertyId;
        return {
          id: pid,
          propertyId: pid,
          name: [x.contactName || x.title || 'Property', x.area, x.city].filter(Boolean).join(', '),
          city: x.city || '',
          type: x.isNewLaunch ? 'New Launch Projects' : 'Project',
        };
      });
      setSugs([...props, ...arr(l)]);
      setShowSug(true);
      setSugLoading(false);
    }, 350);
  };

  const pickSug = (s: any) => {
    setShowSug(false);
    const isProject = s.type === 'Project' || s.type === 'New Launch Projects';
    if (isProject && s.propertyId != null) return router.push(DETAIL_PATH(s.propertyId));

    const params = new URLSearchParams({ city: s.city || s.name });
    if (s.cityId != null) params.set('cityId', String(s.cityId));
    if (s.type === 'Locality') params.set('area', s.name);
    if (forType !== 'all') params.set('type', forType);
    router.push(`/area?${params.toString()}`);
  };

  const submitSearch = () => {
    const k = keyword.trim();
    if (!k) return;
    setShowSug(false);
    const params = new URLSearchParams({ city: k });
    if (forType !== 'all') params.set('type', forType);
    router.push(`/area?${params.toString()}`);
  };

  const meta = (p: Card) =>
    [p.beds ? `${p.beds} Beds` : '', p.baths ? `${p.baths} Baths` : '', p.sqft ? `${p.sqft} sq.ft` : '']
      .filter(Boolean).join(' • ');

  const tags = (p: Card) =>
    [p.availability, p.furnishing, p.floor ? `Floor ${p.floor}${p.totalFloors ? `/${p.totalFloors}` : ''}` : '', p.ownership]
      .filter(Boolean).slice(0, 4);

  return (
    <IonPage>
      <IonHeader className="ion-no-border ls-header">
        <div className="ls-top">
          <button type="button" className="ls-back" onClick={() => router.goBack()} aria-label="Back">
            <IonIcon icon={arrowBack} />
          </button>

          <div className="ls-searchbar">
            <IonIcon icon={searchOutline} />
            <input
              value={keyword}
              placeholder='Search "Gomti Nagar, Lucknow"'
              enterKeyHint="search"
              autoComplete="off"
              onChange={(e) => onSearchInput(e.target.value)}
              onFocus={(e) => { e.target.select(); if (sugs.length) setShowSug(true); }}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitSearch(); } }}
            />
            {sugLoading && <IonSpinner name="dots" />}
            {keyword && !sugLoading && (
              <IonIcon
                icon={closeCircle}
                className="ls-clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setKeyword(''); setSugs([]); setShowSug(false); }}
              />
            )}

            {showSug && sugs.length > 0 && (
              <div className="ls-sug">
                {sugs.map((s, i) => (
                  <div key={`${s.type}-${s.id}-${i}`} className="ls-sug-item" onMouseDown={() => pickSug(s)}>
                    <span className="ls-sug-icon">
                      <IonIcon icon={s.type === 'Project' || s.type === 'New Launch Projects' ? businessOutline : locationOutline} />
                    </span>
                    <div>
                      <b>{s.name}</b>
                      <small>{s.type}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ls-chips">
          {(['all', 'sale', 'rent'] as const).map((t) => (
            <button key={t} type="button" className={`ls-chip ${forType === t ? 'on' : ''}`} onClick={() => setForType(t)}>
              {t === 'all' ? 'All' : t === 'sale' ? 'Buy' : 'Rent'}
            </button>
          ))}
          <span className="ls-sep" />
          {BHK.map((b) => (
            <button key={b} type="button" className={`ls-chip ${bhk.includes(b) ? 'on' : ''}`} onClick={() => toggleBhk(b)}>
              {b} BHK
            </button>
          ))}
          {kinds.length > 0 && <span className="ls-sep" />}
          {kinds.map((k) => (
            <button key={k} type="button" className={`ls-chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(kind === k ? '' : k)}>
              {k}
            </button>
          ))}
        </div>
      </IonHeader>

      <IonContent className="ls-content">
        <div className="ls-summary">
          <div>
            <h1>{results.length} results</h1>
            <p>{headline}</p>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        {loading && <div className="ls-state"><IonSpinner name="crescent" /></div>}
        {!loading && error && (
          <div className="ls-state">
            <p>{error}</p>
            <button type="button" className="ls-btn ls-btn--solid" onClick={load}>Retry</button>
          </div>
        )}
        {!loading && !error && results.length === 0 && (
          <div className="ls-state">
            <p>Koi property nahi mili. Filters hata kar ya dusri location try karo.</p>
          </div>
        )}

        {!loading && results.slice(0, shown).map((p) => {
          const open = () => router.push(DETAIL_PATH(p.id));
          const where = [p.society, p.area, p.city].filter(Boolean).join(', ');
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
                    {p.sqft > 0 && p.price > 0 && p.forType === 'sale' && (
                      <small>₹{Math.round(p.price / p.sqft).toLocaleString('en-IN')}/sq.ft</small>
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
                    <small><IonIcon icon={shieldCheckmark} /> Owner</small>
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

        {!loading && results.length > shown && (
          <button type="button" className="ls-more" onClick={() => setShown((s) => s + PAGE)}>
            Show more properties ({results.length - shown} left)
          </button>
        )}
      </IonContent>

      <BottomNav active="search" />
    </IonPage>
  );
};

export default Listings;