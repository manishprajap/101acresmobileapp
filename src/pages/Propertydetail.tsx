// src/pages/PropertyDetail.tsx  (mobile / Ionic app)
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { IonPage, IonHeader, IonContent, IonFooter, IonIcon, IonSpinner } from '@ionic/react';
import {
  arrowBack,
  shareSocialOutline,
  heartOutline,
  heart,
  locationOutline,
  bedOutline,
  waterOutline,
  gridOutline,
  layersOutline,
  cubeOutline,
  calendarOutline,
  expandOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  openOutline,
  shieldCheckmark,
  imagesOutline,
  timeOutline,
} from 'ionicons/icons';
import './PropertyDetail.css';
import BottomNav from '../components/BottomNav';
import EnquiryModal from '../components/EnquiryModal';
import { apiGet } from '../api';

const IMAGE_BASE = 'https://101acres.com';
const IMAGE_DIR = '/uploads';
const DEFAULT_LOGO_URL = 'https://101acres.com/images/101.png';

// ── Types ──────────────────────────────────────────────────
interface RouteParams { id: string; }
interface LocationState { property?: any; }

interface Detail {
  id: string | number;
  title: string;
  price: number;
  priceFor: string;
  forType: 'sale' | 'rent';
  kind: string;
  country: string;
  state: string;
  city: string;
  area: string;
  society: string;
  landmark: string;
  address: string;
  sqft: number;
  beds: number;
  baths: number;
  balconies: string;
  furnishing: string;
  availability: string;
  floor: string;
  totalFloors: string;
  ownership: string;
  desc: string;
  owner: string;
  phone: string;
  images: string[];
  createdAt: number;
}

interface ResolvedLocation {
  country: string;
  state: string;
  city: string;
  area: string;
}

// ── Helpers ────────────────────────────────────────────────
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
  if (!out.length) {
    Object.values(p).forEach((v) => {
      if (typeof v === 'string' && IMG_EXT.test(v.trim())) out.push(v.trim());
    });
  }
  const urls = Array.from(new Set(out)).map(fullUrl);
  return urls.length ? urls : [DEFAULT_LOGO_URL];
};

// ── Location name helpers ──────────────────────────────────
const isNumericId = (v: unknown) => /^\d+$/.test(String(v ?? '').trim());

// First value that is a real NAME (non-empty, not a pure number)
const nameOnly = (...values: unknown[]): string =>
  String(
    values.find((v) => v != null && String(v).trim() && !isNumericId(v)) ?? '',
  ).trim();

// First value that is a numeric ID
const idOnly = (p: any, idKeys: string[], valueKey: string): string => {
  const fromKeys = idKeys.map((k) => p?.[k]).find((v) => v != null && isNumericId(v));
  if (fromKeys != null) return String(fromKeys).trim();
  return isNumericId(p?.[valueKey]) ? String(p[valueKey]).trim() : '';
};

type LookupItem = { id: string; name: string };

const parseLookupItems = (response: any): LookupItem[] => {
  const candidates: any[] = [
    response,
    response?.data,
    response?.result,
    response?.data?.data,
    response?.result?.data,
  ];
  const rows = candidates.find(Array.isArray) as any[] | undefined;
  return (rows ?? []).flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const id = row.id ?? row.value ?? row.countryId ?? row.country_id
      ?? row.stateId ?? row.state_id ?? row.cityId ?? row.city_id
      ?? row.areaId ?? row.area_id ?? row.locality_id;
    const name = row.name ?? row.country_name ?? row.countryName
      ?? row.state_name ?? row.stateName ?? row.city_name ?? row.cityName
      ?? row.area_name ?? row.areaName ?? row.locality_name ?? row.localityName
      ?? row.locality ?? row.label ?? row.title;
    return id != null && name != null && String(name).trim()
      ? [{ id: String(id), name: String(name).trim() }]
      : [];
  });
};

// Cache lookups so the same URL is never fetched twice
const lookupCache = new Map<string, Promise<LookupItem[]>>();
const lookup = (url: string): Promise<LookupItem[]> => {
  if (!lookupCache.has(url)) {
    lookupCache.set(
      url,
      apiGet(url)
        .then(parseLookupItems)
        .catch(() => {
          lookupCache.delete(url);
          return [] as LookupItem[];
        }),
    );
  }
  return lookupCache.get(url) as Promise<LookupItem[]>;
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Resolve country / state / city / area NAMES (uses API names first, lookups as fallback)
const resolveLocation = async (p: any): Promise<ResolvedLocation> => {
  let country = nameOnly(p.countryName, p.country_name, p.country);
  let state = nameOnly(p.stateName, p.state_name, p.state);
  let city = nameOnly(p.cityName, p.city_name, p.city);
  let area = nameOnly(
    p.areaName, p.area_name, p.localityName, p.locality_name, p.locality, p.area,
  );

  // All names already present -> no extra API call
  if (country && state && city && (area || !idOnly(p, ['areaId', 'area_id', 'localityId', 'locality_id'], 'area'))) {
    return { country, state, city, area };
  }

  try {
    // Country
    const countries = await lookup('/country');
    let countryId = idOnly(p, ['countryId', 'country_id'], 'country');
    if (!country && countryId) country = countries.find((c) => c.id === countryId)?.name ?? '';
    if (!countryId && country) countryId = countries.find((c) => sameName(c.name, country))?.id ?? '';

    // State
    let stateId = idOnly(p, ['stateId', 'state_id'], 'state');
    if (countryId && (!state || !stateId)) {
      const states = await lookup(`/states?countryId=${encodeURIComponent(countryId)}`);
      if (!state && stateId) state = states.find((s) => s.id === stateId)?.name ?? '';
      if (!stateId && state) stateId = states.find((s) => sameName(s.name, state))?.id ?? '';
    }

    // City
    let cityId = idOnly(p, ['cityId', 'city_id'], 'city');
    if (stateId && (!city || !cityId)) {
      const cities = await lookup(`/cities?stateId=${encodeURIComponent(stateId)}`);
      if (!city && cityId) city = cities.find((c) => c.id === cityId)?.name ?? '';
      if (!cityId && city) cityId = cities.find((c) => sameName(c.name, city))?.id ?? '';
    }

    // Area
    const areaId = idOnly(p, ['areaId', 'area_id', 'localityId', 'locality_id'], 'area');
    if (!area && areaId && cityId) {
      const areas = await lookup(`/area?cityId=${encodeURIComponent(cityId)}`);
      area = areas.find((a) => a.id === areaId)?.name ?? '';
    }
  } catch (e) {
    console.warn('Could not resolve property location names:', e);
  }

  return { country, state, city, area };
};

const toDetail = (p: any, loc?: ResolvedLocation): Detail => {
  const country = loc?.country || nameOnly(p.countryName, p.country_name, p.country);
  const state = loc?.state || nameOnly(p.stateName, p.state_name, p.state);
  const city = loc?.city || nameOnly(p.cityName, p.city_name, p.city);
  const area = loc?.area || nameOnly(
    p.areaName, p.area_name, p.localityName, p.locality_name, p.locality, p.area,
  );
  const society = p.society || '';
  return {
    id: p.id ?? p._id ?? p.propertyId,
    title: p.title || `${p.residentialType || p.propertyType || 'Property'} for ${p.propertyFor || p.listingFor || 'Sale'}`,
    price: num(p.price),
    priceFor: p.priceFor || '',
    forType: String(p.propertyFor || p.listingFor || '').toLowerCase().includes('rent') ? 'rent' : 'sale',
    kind: p.residentialType || p.propertyType || p.type || '',
    country,
    state,
    city,
    area,
    society,
    landmark: p.landmark || '',
    address: p.address || [society, area, city, state, country].filter(Boolean).join(', '),
    sqft: num(p.squareFt ?? p.sqft ?? p.carpetArea ?? p.builtUpArea),
    beds: num(p.beds ?? p.bedrooms),
    baths: num(p.baths ?? p.bathrooms),
    balconies: p.balconies ? String(p.balconies) : '',
    furnishing: p.furnishing || '',
    availability: p.availability || '',
    floor: p.floorNo ? String(p.floorNo) : '',
    totalFloors: p.totalFloors ? String(p.totalFloors) : '',
    ownership: p.ownership || '',
    desc: p.description || '',
    owner: p.contactName || '',
    phone: String(p.contactNumber || p.phone || ''),
    images: toImages(p),
    createdAt: new Date(p.created_at || p.createdAt || 0).getTime() || 0,
  };
};

// Estimated EMI: 20% down payment, 8.5% p.a., 20 years
const calcEmi = (price: number) => {
  const principal = price * 0.8;
  const r = 0.085 / 12;
  const n = 240;
  const f = Math.pow(1 + r, n);
  return Math.round((principal * r * f) / (f - 1));
};

const postedAgo = (t: number) => {
  if (!t) return '';
  const d = Math.floor((Date.now() - t) / 864e5);
  if (d <= 0) return 'Posted today';
  if (d === 1) return 'Posted yesterday';
  if (d < 30) return `Posted ${d} days ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `Posted ${m} month${m > 1 ? 's' : ''} ago`;
  return 'Posted 1+ year ago';
};

const maskPhone = (ph: string) => {
  const d = ph.replace(/\s/g, '');
  if (d.length < 6) return d;
  return `${d.slice(0, 2)}${'X'.repeat(d.length - 4)}${d.slice(-2)}`;
};

const mapEmbed = (address: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(address || 'India')}&output=embed`;
const mapLink = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'India')}`;

// Cache the list so detail + similar properties share one request
let listCache: Promise<any[]> | null = null;
const loadList = (): Promise<any[]> => {
  if (!listCache) {
    listCache = apiGet('/properties/list')
      .then((data: any) => (Array.isArray(data) ? data : data?.data ?? data?.properties ?? []))
      .catch((e) => { listCache = null; throw e; });
  }
  return listCache;
};

const pidOf = (p: any) => p?.id ?? p?._id ?? p?.propertyId;

// Raw city key (ID) used to match similar properties
const cityKeyOf = (p: any) => String(p?.cityId ?? p?.city_id ?? p?.city ?? '').trim();

// ── Component ──────────────────────────────────────────────
const PropertyDetail: React.FC = () => {
  const { id } = useParams<RouteParams>();
  const location = useLocation<LocationState>();
  const history = useHistory();

  const [raw, setRaw] = useState<any | null>(null);
  const [allList, setAllList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('overview');
  const [loc, setLoc] = useState<(ResolvedLocation & { pid: string }) | null>(null);

  // Contact Owner / View Number popup
  const [modalType, setModalType] = useState<'contact_owner' | 'view_number' | null>(null);
  const [revealedNumber, setRevealedNumber] = useState('');

  const contentRef = useRef<HTMLIonContentElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLElement | null>>({});

  // Load the property whenever the id changes
  useEffect(() => {
    let cancelled = false;
    setActiveImg(0);
    setExpanded(false);
    setModalType(null);
    setRevealedNumber('');
    setTab('overview');
    setLoc(null);
    contentRef.current?.scrollToTop(0);

    const passed = location.state?.property;
    if (passed && String(pidOf(passed)) === String(id)) {
      setRaw(passed);
      setLoading(false);
    } else {
      setLoading(true);
    }

    loadList()
      .then((list) => {
        if (cancelled) return;
        setAllList(list);
        if (!(passed && String(pidOf(passed)) === String(id))) {
          setRaw(list.find((p) => String(pidOf(p)) === String(id)) ?? null);
        }
      })
      .catch((err: unknown) => console.error('Error fetching property:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Resolve Country / State / City / Area NAMES (via lookups if names are missing)
  useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    const pid = String(pidOf(raw));
    resolveLocation(raw).then((r) => {
      if (!cancelled) setLoc({ pid, ...r });
    });
    return () => { cancelled = true; };
  }, [raw]);

  const onTrackScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    setActiveImg(Math.round(t.scrollLeft / t.clientWidth));
  };

  const goToImg = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' });
    setActiveImg(i);
  };

  const handleShare = async () => {
    const url = `${IMAGE_BASE}/property-detail/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: raw?.title || 'Property', url });
      else await navigator.clipboard.writeText(url);
    } catch { /* user cancelled */ }
  };

  // ── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="pdx-center"><IonSpinner name="crescent" /></div>
        </IonContent>
        <BottomNav active={null} />
      </IonPage>
    );
  }

  // ── Not found ──────────────────────────────────────────
  if (!raw) {
    return (
      <IonPage>
        <IonContent>
          <div className="pdx-center">
            <p>Property not found.</p>
            <button type="button" className="pdx-btn pdx-btn--solid pdx-btn--auto" onClick={() => history.push('/properties')}>
              Back to listings
            </button>
          </div>
        </IonContent>
        <BottomNav active={null} />
      </IonPage>
    );
  }

  const activeLoc = loc && loc.pid === String(pidOf(raw)) ? loc : undefined;
  const p = toDetail(raw, activeLoc);
  const where = [p.society, p.area, p.city, p.state, p.country].filter(Boolean).join(', ');
  const perSqft = p.sqft > 0 && p.price > 0 ? Math.round(p.price / p.sqft) : 0;
  const rentUnit = p.priceFor.toLowerCase() === 'yearly' ? 'year' : 'month';
  const ago = postedAgo(p.createdAt);
  const who = p.ownership || 'Owner';

  // Similar: same city (compared by raw city ID, not by name)
  const myCityKey = cityKeyOf(raw);
  const similar = allList
    .filter((x) => String(pidOf(x)) !== String(p.id))
    .filter((x) => !myCityKey || cityKeyOf(x) === myCityKey)
    .slice(0, 8);

  // Overview grid (icon + label + value)
  const overview = [
    { icon: bedOutline, label: 'Bedrooms', value: p.beds ? String(p.beds) : '' },
    { icon: waterOutline, label: 'Bathrooms', value: p.baths ? String(p.baths) : '' },
    { icon: gridOutline, label: 'Balconies', value: p.balconies },
    { icon: expandOutline, label: 'Super area', value: p.sqft ? `${p.sqft} sq.ft` : '' },
    {
      icon: layersOutline,
      label: 'Floor',
      value: p.floor ? `${p.floor}${p.totalFloors ? ` of ${p.totalFloors}` : ''}` : '',
    },
    { icon: cubeOutline, label: 'Furnishing', value: p.furnishing },
    { icon: calendarOutline, label: 'Availability', value: p.availability },
  ].filter((o) => o.value);

  // Key/value details
  const details: [string, string][] = ([
    ['Property type', p.kind],
    ['Listed for', p.forType === 'rent' ? 'Rent' : 'Sale'],
    ['Price', p.price ? `${fmtPrice(p.price)}${p.forType === 'rent' ? `/${rentUnit}` : ''}` : ''],
    ['Price per sq.ft', perSqft && p.forType === 'sale' ? `₹${perSqft.toLocaleString('en-IN')}` : ''],
    ['Ownership', p.ownership],
    ['Society / Project', p.society],
    ['Locality', p.area],
    ['City', p.city],
    ['State', p.state],
    ['Country', p.country],
    ['Landmark', p.landmark],
  ] as [string, string][]).filter(([, v]) => v);

  const longDesc = p.desc.length > 220;

  const tabs = [
    { id: 'overview', l: 'Overview' },
    { id: 'details', l: 'Details' },
    ...(p.desc ? [{ id: 'about', l: 'Description' }] : []),
    { id: 'location', l: 'Location' },
    ...(similar.length ? [{ id: 'similar', l: 'Similar' }] : []),
  ];

  const jumpTo = (sid: string) => {
    setTab(sid);
    secRefs.current[sid]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Highlight the tab of the section currently on screen
  const onContentScroll = () => {
    let cur = tabs[0].id;
    tabs.forEach((t) => {
      const el = secRefs.current[t.id];
      if (el && el.getBoundingClientRect().top <= 120) cur = t.id;
    });
    setTab(cur);
  };

  return (
    <IonPage>
      {/* Top bar */}
      <IonHeader className="ion-no-border pdx-header">
        <div className="pdx-top">
          <button type="button" className="pdx-icon-btn" onClick={() => history.goBack()} aria-label="Back">
            <IonIcon icon={arrowBack} />
          </button>
          <div className="pdx-top-title">
            <b>{fmtPrice(p.price)}{p.forType === 'rent' && p.price > 0 ? `/${rentUnit}` : ''}</b>
            <small>{[p.kind, p.area || p.city].filter(Boolean).join(' • ')}</small>
          </div>
          <button type="button" className="pdx-icon-btn" onClick={handleShare} aria-label="Share">
            <IonIcon icon={shareSocialOutline} />
          </button>
          <button type="button" className="pdx-icon-btn" onClick={() => setSaved((s) => !s)} aria-label="Save">
            <IonIcon icon={saved ? heart : heartOutline} className={saved ? 'pdx-saved' : ''} />
          </button>
        </div>
      </IonHeader>

      <IonContent ref={contentRef} className="pdx-content" scrollEvents onIonScroll={onContentScroll}>
        {/* 1. Gallery */}
        <div className="pdx-gallery">
          <div className="pdx-track" ref={trackRef} onScroll={onTrackScroll}>
            {p.images.map((src, i) => (
              <div className="pdx-slide" key={i}>
                <img
                  className="pdx-slide-bg"
                  src={src}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <img
                  className="pdx-slide-img"
                  src={src}
                  alt={`${p.title} ${i + 1}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = DEFAULT_LOGO_URL;
                  }}
                />
              </div>
            ))}
          </div>

          <span className={`pdx-badge ${p.forType === 'rent' ? 'pdx-badge--rent' : ''}`}>
            {p.forType === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {p.images.length > 1 && (
            <span className="pdx-counter">
              <IonIcon icon={imagesOutline} /> {activeImg + 1}/{p.images.length}
            </span>
          )}
        </div>

        {p.images.length > 1 && (
          <div className="pdx-thumbs">
            {p.images.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`pdx-thumb ${i === activeImg ? 'on' : ''}`}
                onClick={() => goToImg(i)}
                aria-label={`Photo ${i + 1}`}
              >
                <img src={src} alt="" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}

        {/* 2. Price + title */}
        <section className="pdx-card pdx-summary">
          <div className="pdx-price-row">
            <div className="pdx-price">
              <b>{fmtPrice(p.price)}</b>
              {p.forType === 'rent' && p.price > 0 && <em>/{rentUnit}</em>}
            </div>
            {perSqft > 0 && p.forType === 'sale' && (
              <span className="pdx-persqft">₹{perSqft.toLocaleString('en-IN')}/sq.ft</span>
            )}
          </div>

          {p.forType === 'sale' && p.price > 0 && (
            <div className="pdx-emi">
              EMI starts at <b>₹{calcEmi(p.price).toLocaleString('en-IN')}/mo</b>
              <small>20% down • 8.5% • 20 yrs</small>
            </div>
          )}

          <h1 className="pdx-title">{p.title}</h1>
          {where && (
            <p className="pdx-loc">
              <IonIcon icon={locationOutline} /> {where}
            </p>
          )}

          <div className="pdx-posted">
            <span><IonIcon icon={shieldCheckmark} /> Posted by {who}</span>
            {ago && <span><IonIcon icon={timeOutline} /> {ago}</span>}
          </div>
        </section>

        {/* 3. Sticky section tabs */}
        <nav className="pdx-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`pdx-tab ${tab === t.id ? 'on' : ''}`}
              onClick={() => jumpTo(t.id)}
            >
              {t.l}
            </button>
          ))}
        </nav>

        {/* 4. Overview */}
        <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.overview = el; }}>
          <h2 className="pdx-h2">Property overview</h2>
          {overview.length > 0 ? (
            <div className="pdx-ov">
              {overview.map((o) => (
                <div className="pdx-ov-item" key={o.label}>
                  <span className="pdx-ov-icon"><IonIcon icon={o.icon} /></span>
                  <div>
                    <small>{o.label}</small>
                    <b>{o.value}</b>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="pdx-muted">No overview details available.</p>
          )}
        </section>

        {/* 5. Details */}
        <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.details = el; }}>
          <h2 className="pdx-h2">More details</h2>
          <div className="pdx-kv">
            {details.map(([k, v]) => (
              <div className="pdx-kv-item" key={k}>
                <small>{k}</small>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Description */}
        {p.desc && (
          <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.about = el; }}>
            <h2 className="pdx-h2">About this property</h2>
            <p className={`pdx-desc ${!expanded && longDesc ? 'pdx-desc--clamp' : ''}`}>{p.desc}</p>
            {longDesc && (
              <button type="button" className="pdx-link" onClick={() => setExpanded((e) => !e)}>
                {expanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </section>
        )}

        {/* 7. Location */}
        <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.location = el; }}>
          <div className="pdx-h2-row">
            <h2 className="pdx-h2">Location</h2>
            <a href={mapLink(p.address)} target="_blank" rel="noopener noreferrer" className="pdx-link">
              <IonIcon icon={openOutline} /> Open in Maps
            </a>
          </div>
          {p.address && <p className="pdx-addr"><IonIcon icon={locationOutline} /> {p.address}</p>}
          <iframe
            title="Property Location"
            src={mapEmbed(p.address)}
            className="pdx-map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>

        {/* 8. Owner */}
        <section className="pdx-card">
          <h2 className="pdx-h2">Contact {who.toLowerCase()}</h2>
          <div className="pdx-owner">
            <span className="pdx-avatar">{(p.owner || who).charAt(0).toUpperCase()}</span>
            <div className="pdx-owner-info">
              <b>{p.owner || who}</b>
              <small><IonIcon icon={shieldCheckmark} /> {who}</small>
            </div>
            {(revealedNumber || p.phone) && (
              <span className="pdx-phone">{revealedNumber || maskPhone(p.phone)}</span>
            )}
          </div>
          <p className="pdx-safe">Never pay any advance before visiting the property in person.</p>
        </section>

        {/* 9. Similar properties */}
        {similar.length > 0 && (
          <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.similar = el; }}>
            <h2 className="pdx-h2">Similar properties</h2>
            <div className="pdx-sim">
              {similar.map((x) => {
                const s = toDetail(x);
                return (
                  <div
                    key={String(s.id)}
                    className="pdx-sim-card"
                    onClick={() => history.push(`/property/${s.id}`, { property: x })}
                  >
                    <div className="pdx-sim-img">
                      <img
                        src={s.images[0]}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.onerror = null;
                          t.src = DEFAULT_LOGO_URL;
                        }}
                      />
                    </div>
                    <b>
                      {fmtPrice(s.price)}
                      {s.forType === 'rent' && s.price > 0 ? '/mo' : ''}
                    </b>
                    <span className="pdx-sim-title">{s.title}</span>
                    <small>{[s.area, s.city, s.state].filter(Boolean).join(', ')}</small>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </IonContent>

      {/* Sticky action bar */}
      <IonFooter className="ion-no-border pdx-footer">
        <div className="pdx-actions">
          <button type="button" className="pdx-btn pdx-btn--line" onClick={() => setModalType('contact_owner')}>
            <IonIcon icon={chatbubbleEllipsesOutline} /> Contact {who}
          </button>

          {revealedNumber ? (
            <a className="pdx-btn pdx-btn--solid" href={`tel:${revealedNumber}`}>
              <IonIcon icon={callOutline} /> Call {revealedNumber}
            </a>
          ) : (
            <button type="button" className="pdx-btn pdx-btn--solid" onClick={() => setModalType('view_number')}>
              <IonIcon icon={callOutline} /> View Number
            </button>
          )}
        </div>
      </IonFooter>

      {/* Contact Owner / View Number popup */}
      <EnquiryModal
        open={!!modalType}
        type={modalType ?? 'contact_owner'}
        propertyId={p.id}
        propertyTitle={p.title}
        ownership={who}
        alreadyRevealed={revealedNumber}
        onClose={() => setModalType(null)}
        onRevealed={setRevealedNumber}
      />

      <BottomNav active={null} />
    </IonPage>
  );
};

export default PropertyDetail;