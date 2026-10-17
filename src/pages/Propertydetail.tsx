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
  logoWhatsapp,
  openOutline,
  shieldCheckmark,
  imagesOutline,
  timeOutline,
  closeOutline,
  checkmarkCircle,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import './PropertyDetail.css';
import './PropertyDetail.extra.css';
import BottomNav from '../components/BottomNav';
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
  category: string;
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
  washroom: string;
  parking: string;
  propertyAge: string;
  facing: string;
  preLeased: string;
  maintenance: number;
  negotiable: boolean;
  taxExcluded: boolean;
  amenities: string[];
  nearby: string[];
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

type LeadType = 'contact_owner' | 'view_number' | 'enquiry';

interface LeadForm {
  name: string;
  mobile: string;
  email: string;
  message: string;
  /** Honeypot field, real users never fill it. */
  website: string;
}

const emptyLead: LeadForm = { name: '', mobile: '', email: '', message: '', website: '' };

// ── Helpers ────────────────────────────────────────────────
const num = (v: any) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;

const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

const fmtPrice = (n: number) => {
  if (!n) return 'Price on request';
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} Lac`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const isTruthyFlag = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true' || v === 'yes' || v === 'Yes';

const humanize = (v: string): string =>
  v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const snake = (key: string): string => key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Reads a field whether the API returns camelCase, snake_case or lowercase. */
const readProp = (p: Record<string, any>, key: string): unknown => {
  for (const k of [key, snake(key), key.toLowerCase()]) {
    const v = p?.[k];
    if (v !== undefined && v !== null && !(typeof v === 'string' && !v.trim())) return v;
  }
  return undefined;
};

const isObj = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** List fields can be arrays, JSON strings, comma strings or {name:true} objects. */
const parseStringArray = (value: unknown): string[] => {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try { parsed = JSON.parse(t); } catch { parsed = t; }
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map((i) => (isObj(i) ? text(i.name ?? i.label ?? i.title ?? i.value) : text(i)))
      .filter(Boolean);
  }
  if (typeof parsed === 'string') {
    return parsed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (isObj(parsed)) {
    return Object.entries(parsed).filter(([, v]) => isTruthyFlag(v)).map(([k]) => k);
  }
  return [];
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

  if (country && state && city && (area || !idOnly(p, ['areaId', 'area_id', 'localityId', 'locality_id'], 'area'))) {
    return { country, state, city, area };
  }

  try {
    const countries = await lookup('/country');
    let countryId = idOnly(p, ['countryId', 'country_id'], 'country');
    if (!country && countryId) country = countries.find((c) => c.id === countryId)?.name ?? '';
    if (!countryId && country) countryId = countries.find((c) => sameName(c.name, country))?.id ?? '';

    let stateId = idOnly(p, ['stateId', 'state_id'], 'state');
    if (countryId && (!state || !stateId)) {
      const states = await lookup(`/states?countryId=${encodeURIComponent(countryId)}`);
      if (!state && stateId) state = states.find((s) => s.id === stateId)?.name ?? '';
      if (!stateId && state) stateId = states.find((s) => sameName(s.name, state))?.id ?? '';
    }

    let cityId = idOnly(p, ['cityId', 'city_id'], 'city');
    if (stateId && (!city || !cityId)) {
      const cities = await lookup(`/cities?stateId=${encodeURIComponent(stateId)}`);
      if (!city && cityId) city = cities.find((c) => c.id === cityId)?.name ?? '';
      if (!cityId && city) cityId = cities.find((c) => sameName(c.name, city))?.id ?? '';
    }

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
  const looking = text(readProp(p, 'propertyFor') ?? readProp(p, 'lookingTo') ?? p.listingFor).toLowerCase();

  const amenities = Array.from(
    new Set(
      ['amenities', 'propertyFeatures', 'features', 'societyFeatures', 'additionalFeatures', 'fireSafety']
        .flatMap((k) => parseStringArray(readProp(p, k)))
        .map(humanize),
    ),
  );
  const nearby = Array.from(
    new Set(
      ['locatedNear', 'locationAdvantages'].flatMap((k) => parseStringArray(readProp(p, k))),
    ),
  );

  const kind = text(readProp(p, 'residentialType') ?? readProp(p, 'retailSpaceType') ?? readProp(p, 'propertyType') ?? p.type);
  const category = text(readProp(p, 'propertyCategory'));

  return {
    id: p.id ?? p._id ?? p.propertyId,
    title: p.title || `${kind || 'Property'} for ${p.propertyFor || p.listingFor || 'Sale'}`,
    price: num(p.price ?? readProp(p, 'expectedPrice')),
    priceFor: p.priceFor || '',
    forType: looking.includes('rent') || looking.includes('lease') ? 'rent' : 'sale',
    kind,
    category,
    country,
    state,
    city,
    area,
    society,
    landmark: p.landmark || '',
    address: p.address || [society, area, city, state, country].filter(Boolean).join(', '),
    sqft: num(p.squareFt ?? p.sqft ?? readProp(p, 'carpetArea') ?? readProp(p, 'builtUpArea')),
    beds: num(p.beds ?? p.bedrooms),
    baths: num(p.baths ?? p.bathrooms),
    balconies: p.balconies ? String(p.balconies) : '',
    furnishing: p.furnishing || '',
    availability: p.availability || '',
    floor: text(readProp(p, 'floorNo') ?? readProp(p, 'propertyOnFloor')),
    totalFloors: text(readProp(p, 'totalFloors')),
    ownership: p.ownership || '',
    washroom: text(readProp(p, 'washrooms') ?? readProp(p, 'washroom')),
    parking: (() => {
      const direct = text(readProp(p, 'parking'));
      if (direct) return direct;
      const covered = num(readProp(p, 'coveredParking'));
      const open = num(readProp(p, 'openParking'));
      return [covered ? `${covered} covered` : '', open ? `${open} open` : ''].filter(Boolean).join(', ');
    })(),
    propertyAge: text(readProp(p, 'propertyAge') ?? readProp(p, 'ageOfProperty')),
    facing: text(readProp(p, 'propertyFacing') ?? readProp(p, 'facing')),
    preLeased: text(readProp(p, 'preLeased')),
    maintenance: num(readProp(p, 'maintenance') ?? readProp(p, 'maintenanceCharge')),
    negotiable: isTruthyFlag(readProp(p, 'priceNegotiable') ?? readProp(p, 'negotiable')),
    taxExcluded: isTruthyFlag(readProp(p, 'taxExcluded')),
    amenities,
    nearby,
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

// City ka raw key (ID) — similar properties match karne ke liye
const cityKeyOf = (p: any) => String(p?.cityId ?? p?.city_id ?? p?.city ?? '').trim();

/** Pulls a single property object out of whatever shape the API responds with. */
const unwrapProperty = (res: unknown): Record<string, any> | null => {
  const isProperty = (v: unknown): v is Record<string, any> =>
    isObj(v) && ['id', 'propertyId', 'property_id', 'title'].some((k) => k in v);
  const root = isObj(res) ? res : null;
  const data = isObj(root?.data) ? root!.data : null;
  const result = isObj(root?.result) ? root!.result : null;
  const candidates: unknown[] = [
    data?.property, result?.property, data?.data, data, result?.data, result, root?.property, root,
  ];
  for (const c of candidates) {
    if (isProperty(c)) return c;
    if (Array.isArray(c)) {
      const found = c.find(isProperty);
      if (found) return found;
    }
  }
  return null;
};

/** Full record wins, but never replaces a value with an empty one. */
const mergeProps = (base: any, full: Record<string, any>) => {
  const merged: Record<string, any> = { ...(base ?? {}) };
  Object.entries(full).forEach(([k, v]) => {
    if (v !== undefined && v !== null && !(typeof v === 'string' && !v.trim())) merged[k] = v;
  });
  return merged;
};

// ── Lead (enquiry email) helpers — same rules as the website ──
const normalizePhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

/** Returns an error message, or an empty string when the form is valid. */
const validateLead = (form: LeadForm): string => {
  if (form.name.trim().length < 2) return 'Please enter your name.';
  if (!/^[6-9]\d{9}$/.test(normalizePhone(form.mobile))) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  const email = form.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  return '';
};

/** Sends the lead to the website API, which emails the property owner. */
const sendLead = async (
  propertyId: string,
  type: LeadType,
  form: LeadForm,
): Promise<{ contactNumber: string }> => {
  const response = await fetch(
    `${IMAGE_BASE}/api/properties/${encodeURIComponent(propertyId)}/enquiry`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type,
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email.trim(),
        message: form.message.trim() || 'I am interested in this property. Please contact me.',
        website: form.website,
        pageUrl: `${IMAGE_BASE}/property/${propertyId}`,
      }),
    },
  );

  let data: any = null;
  try { data = await response.json(); } catch { /* non-JSON response */ }

  if (!response.ok || (isObj(data) && data.success === false)) {
    throw new Error(
      isObj(data) && typeof data.error === 'string'
        ? data.error
        : 'Could not send your request. Please try again.',
    );
  }
  return { contactNumber: isObj(data) ? text(data.contactNumber) : '' };
};

/** Prefill name / mobile / email from the cached login profile. */
const savedLead = (): LeadForm => {
  try {
    const stored = localStorage.getItem('user');
    if (!stored || stored === 'undefined' || stored === 'null') return emptyLead;
    const parsed = JSON.parse(stored);
    const u = parsed?.user ?? parsed?.data ?? parsed;
    const mobile = [u?.mobile, u?.phone, u?.mobileNumber, u?.phoneNumber, u?.contactNumber]
      .map((v) => String(v ?? '').trim())
      .find((v) => v && v !== '0' && !v.includes('@'));
    return {
      ...emptyLead,
      name: String(u?.name ?? u?.fullName ?? u?.username ?? '').trim(),
      mobile: mobile ? normalizePhone(mobile) : '',
      email: String(u?.email ?? '').trim(),
    };
  } catch {
    return emptyLead;
  }
};

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

  /* Full-screen photo viewer (website: Lightbox) */
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  /* Contact Owner / View Number popup (website: modal) */
  const [modalType, setModalType] = useState<'contact_owner' | 'view_number' | null>(null);
  const [modalForm, setModalForm] = useState<LeadForm>(emptyLead);
  const [modalError, setModalError] = useState('');
  const [modalSending, setModalSending] = useState(false);
  const [modalDone, setModalDone] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState('');

  /* Inline "Send enquiry" form (website: inline form) */
  const [inlineForm, setInlineForm] = useState<LeadForm>(emptyLead);
  const [inlineAgree, setInlineAgree] = useState(true);
  const [inlineSending, setInlineSending] = useState(false);
  const [inlineStatus, setInlineStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lbRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLElement | null>>({});

  // Load the property whenever the id changes
  useEffect(() => {
    let cancelled = false;
    setActiveImg(0);
    setExpanded(false);
    setTab('overview');
    setLoc(null);
    setRevealedNumber('');
    setModalType(null);
    setModalDone(false);
    setInlineStatus(null);
    setLbOpen(false);
    contentRef.current?.scrollToTop(0);

    const prefill = savedLead();
    setModalForm(prefill);
    setInlineForm(prefill);

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

    // The list only carries a summary: load the COMPLETE record
    // (amenities, features, nearby places, parking, etc.)
    apiGet(`/properties/${id}`)
      .then((res) => {
        const full = unwrapProperty(res);
        if (!cancelled && full) setRaw((prev: any) => mergeProps(prev, full));
      })
      .catch((err: unknown) => console.warn('Could not load full property:', err));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Country / State / City / Area NAMES resolve karo (names missing ho toh lookup se)
  useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    const pid = String(pidOf(raw));
    resolveLocation(raw).then((r) => {
      if (!cancelled) setLoc({ pid, ...r });
    });
    return () => { cancelled = true; };
  }, [raw]);

  // Open the viewer on the tapped photo
  useEffect(() => {
    if (!lbOpen) return;
    const t = lbRef.current;
    if (t) t.scrollTo({ left: lbIndex * t.clientWidth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbOpen]);

  const onTrackScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    setActiveImg(Math.round(t.scrollLeft / t.clientWidth));
  };

  const onLbScroll = () => {
    const t = lbRef.current;
    if (!t) return;
    setLbIndex(Math.round(t.scrollLeft / t.clientWidth));
  };

  const goToImg = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' });
    setActiveImg(i);
  };

  const openViewer = (i: number) => {
    setLbIndex(i);
    setLbOpen(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: raw?.title || 'Property', url });
      else await navigator.clipboard.writeText(url);
    } catch { /* user cancelled */ }
  };

  /* ── Lead handlers ─────────────────────────────────── */

  const openModal = (type: 'contact_owner' | 'view_number') => {
    setModalType(type);
    setModalError('');
    // The number was already revealed once: show it again without asking.
    setModalDone(type === 'view_number' && Boolean(revealedNumber));
  };

  const closeModal = () => {
    setModalType(null);
    setModalError('');
  };

  const setModalField = (key: keyof LeadForm, value: string) =>
    setModalForm((prev) => ({ ...prev, [key]: value }));

  const setInlineField = (key: keyof LeadForm, value: string) =>
    setInlineForm((prev) => ({ ...prev, [key]: value }));

  const submitModal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modalType || !id || modalSending) return;

    const problem = validateLead(modalForm);
    if (problem) {
      setModalError(problem);
      return;
    }

    try {
      setModalSending(true);
      setModalError('');
      const result = await sendLead(String(id), modalType, modalForm);
      if (modalType === 'view_number') setRevealedNumber(result.contactNumber);
      setModalDone(true);
    } catch (error) {
      setModalError(
        error instanceof Error ? error.message : 'Could not send your request. Please try again.',
      );
    } finally {
      setModalSending(false);
    }
  };

  const submitInline = async () => {
    if (!id || inlineSending) return;

    if (!inlineAgree) {
      setInlineStatus({ kind: 'error', message: 'Please accept the Terms & Privacy Policy.' });
      return;
    }

    const problem = validateLead(inlineForm);
    if (problem) {
      setInlineStatus({ kind: 'error', message: problem });
      return;
    }

    try {
      setInlineSending(true);
      setInlineStatus(null);
      await sendLead(String(id), 'enquiry', inlineForm);
      setInlineStatus({
        kind: 'success',
        message: 'Your enquiry has been sent to the owner. They will contact you soon.',
      });
      setInlineForm((prev) => ({ ...prev, message: '' }));
    } catch (error) {
      setInlineStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Could not send your enquiry. Please try again.',
      });
    } finally {
      setInlineSending(false);
    }
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
  const ownerLabel = p.ownership || 'Owner';
  const ownerLower = ownerLabel.toLowerCase();
  const phoneToUse = revealedNumber || '';
  const waPhone = phoneToUse.replace(/[^\d]/g, '');

  // Similar: same city (raw city ID se compare, name se nahi)
  const myCityKey = cityKeyOf(raw);
  const similar = allList
    .filter((x) => String(pidOf(x)) !== String(p.id))
    .filter((x) => !myCityKey || cityKeyOf(x) === myCityKey)
    .slice(0, 8);

  // Price sub text (same as the website): area • per sq.ft • Negotiable
  const priceSubText = [
    p.sqft ? `${p.sqft} sq.ft` : '',
    perSqft && p.forType === 'sale' ? `₹${perSqft.toLocaleString('en-IN')}/sq.ft` : '',
    p.negotiable ? 'Negotiable' : '',
  ].filter(Boolean).join(' • ');

  // Highlights strip (same as the website)
  const highlights = [
    p.area ? `Located in ${p.area}` : '',
    p.availability,
    ownerLabel,
    p.negotiable ? 'Price Negotiable' : '',
    p.preLeased && p.preLeased !== 'No' ? 'Pre-leased' : '',
  ].filter(Boolean);

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
    ['Category', p.category],
    ['Listed for', p.forType === 'rent' ? 'Rent' : 'Sale'],
    ['Price', p.price ? `${fmtPrice(p.price)}${p.forType === 'rent' ? `/${rentUnit}` : ''}` : ''],
    ['Price per sq.ft', perSqft && p.forType === 'sale' ? `₹${perSqft.toLocaleString('en-IN')}` : ''],
    ['Maintenance', p.maintenance ? `₹${p.maintenance.toLocaleString('en-IN')}` : ''],
    ['Washroom', p.washroom],
    ['Parking', p.parking],
    ['Property age', p.propertyAge],
    ['Facing', p.facing],
    ['Pre-leased', p.preLeased],
    ['Tax & govt. charges', p.taxExcluded ? 'Excluded' : ''],
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
    { id: 'amenities', l: 'Amenities' },
    ...(p.nearby.length ? [{ id: 'nearby', l: 'Nearby' }] : []),
    { id: 'location', l: 'Location' },
    { id: 'enquiry', l: 'Enquiry' },
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
              <div className="pdx-slide" key={i} onClick={() => openViewer(i)}>
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
          <button type="button" className="pdx-viewall" onClick={() => openViewer(activeImg)}>
            <IonIcon icon={imagesOutline} /> View Photos ({p.images.length})
          </button>
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

          {priceSubText && <p className="pdx-subtext">{priceSubText}</p>}

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
            <span><IonIcon icon={shieldCheckmark} /> Posted by {ownerLabel}</span>
            {ago && <span><IonIcon icon={timeOutline} /> {ago}</span>}
          </div>
        </section>

        {/* Highlights */}
        {highlights.length > 0 && (
          <section className="pdx-card pdx-highlights">
            {highlights.map((h, i) => (
              <span key={`${h}-${i}`} className="pdx-hl">
                <IonIcon icon={checkmarkCircle} /> {h}
              </span>
            ))}
          </section>
        )}

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

        {/* 7. Amenities */}
        <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.amenities = el; }}>
          <div className="pdx-h2-row">
            <h2 className="pdx-h2">Amenities</h2>
            {p.amenities.length > 0 && <small className="pdx-count">{p.amenities.length} amenities</small>}
          </div>
          {p.amenities.length > 0 ? (
            <div className="pdx-amen">
              {p.amenities.map((a, i) => (
                <div className="pdx-amen-item" key={`${a}-${i}`}>
                  <span className="pdx-amen-icon"><IonIcon icon={checkmarkCircle} /></span>
                  <b>{a}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="pdx-muted">No amenities listed for this property.</p>
          )}
        </section>

        {/* 8. Nearby places */}
        {p.nearby.length > 0 && (
          <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.nearby = el; }}>
            <h2 className="pdx-h2">Places nearby</h2>
            <p className="pdx-muted pdx-mb">Important places around this property</p>
            <div className="pdx-chips">
              {p.nearby.map((n) => (
                <span className="pdx-chip" key={n}>
                  <IonIcon icon={locationOutline} /> {n}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 9. Location */}
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

        {/* 10. Owner + Send enquiry */}
        <section className="pdx-card pdx-sec" ref={(el) => { secRefs.current.enquiry = el; }}>
          <h2 className="pdx-h2">{ownerLabel} details</h2>
          <div className="pdx-owner">
            <span className="pdx-avatar">{(p.owner || ownerLabel).charAt(0).toUpperCase()}</span>
            <div className="pdx-owner-info">
              <b>{p.owner || `Property ${ownerLabel}`}</b>
              <small><IonIcon icon={shieldCheckmark} /> Verified listing</small>
            </div>
            {p.phone && (
              <span className="pdx-phone">{revealedNumber || maskPhone(p.phone)}</span>
            )}
          </div>

          <div className="pdx-owner-actions">
            {revealedNumber ? (
              <>
                <a className="pdx-btn pdx-btn--solid" href={`tel:${revealedNumber}`}>
                  <IonIcon icon={callOutline} /> Call {revealedNumber}
                </a>
                {waPhone && (
                  <a
                    className="pdx-btn pdx-btn--line"
                    href={`https://wa.me/${waPhone.length === 10 ? `91${waPhone}` : waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IonIcon icon={logoWhatsapp} /> WhatsApp
                  </a>
                )}
              </>
            ) : (
              <button type="button" className="pdx-btn pdx-btn--solid" onClick={() => openModal('view_number')}>
                <IonIcon icon={callOutline} /> View Phone Number
              </button>
            )}
          </div>

          <h3 className="pdx-h3">Send enquiry</h3>
          <div className="pdx-form">
            <input
              className="pdx-input"
              type="text"
              placeholder="Your Name"
              value={inlineForm.name}
              maxLength={80}
              onChange={(e) => setInlineField('name', e.target.value)}
            />
            <input
              className="pdx-input"
              type="tel"
              inputMode="numeric"
              placeholder="Your Mobile Number"
              value={inlineForm.mobile}
              maxLength={15}
              onChange={(e) => setInlineField('mobile', e.target.value)}
            />
            <input
              className="pdx-input"
              type="email"
              placeholder="Your Email (optional)"
              value={inlineForm.email}
              maxLength={120}
              onChange={(e) => setInlineField('email', e.target.value)}
            />
            <textarea
              className="pdx-input pdx-textarea"
              rows={3}
              maxLength={1000}
              placeholder="I am interested in this property..."
              value={inlineForm.message}
              onChange={(e) => setInlineField('message', e.target.value)}
            />
            {/* honeypot */}
            <input
              className="pdx-honeypot"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={inlineForm.website}
              onChange={(e) => setInlineField('website', e.target.value)}
            />

            {inlineStatus && (
              <p role="status" className={`pdx-status pdx-status--${inlineStatus.kind}`}>
                {inlineStatus.message}
              </p>
            )}

            <label className="pdx-agree">
              <input
                type="checkbox"
                checked={inlineAgree}
                onChange={(e) => setInlineAgree(e.target.checked)}
              />
              <span>I agree to the Terms &amp; Privacy Policy</span>
            </label>

            <button
              type="button"
              className="pdx-btn pdx-btn--solid"
              onClick={submitInline}
              disabled={inlineSending}
            >
              {inlineSending ? <IonSpinner name="dots" /> : (
                <>
                  <IonIcon icon={chatbubbleEllipsesOutline} /> Send enquiry
                </>
              )}
            </button>
          </div>

          <p className="pdx-safe">Never pay any advance before visiting the property in person.</p>
        </section>

        {/* 11. Similar properties */}
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
          <button type="button" className="pdx-btn pdx-btn--line" onClick={() => openModal('contact_owner')}>
            <IonIcon icon={chatbubbleEllipsesOutline} /> Contact {ownerLabel}
          </button>
          {revealedNumber ? (
            <a className="pdx-btn pdx-btn--solid" href={`tel:${revealedNumber}`}>
              <IonIcon icon={callOutline} /> Call {revealedNumber}
            </a>
          ) : (
            <button type="button" className="pdx-btn pdx-btn--solid" onClick={() => openModal('view_number')}>
              <IonIcon icon={callOutline} /> Get Phone No.
            </button>
          )}
        </div>
      </IonFooter>
      <BottomNav active={null} />

      {/* Full-screen photo viewer */}
      {lbOpen && (
        <div className="pdx-lb" role="dialog" aria-modal="true">
          <div className="pdx-lb-top">
            <span>{lbIndex + 1} / {p.images.length}</span>
            <button type="button" className="pdx-lb-close" onClick={() => setLbOpen(false)} aria-label="Close">
              <IonIcon icon={closeOutline} />
            </button>
          </div>
          <div className="pdx-lb-track" ref={lbRef} onScroll={onLbScroll}>
            {p.images.map((src, i) => (
              <div className="pdx-lb-slide" key={i}>
                <img
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
        </div>
      )}

      {/* Contact owner / View number popup */}
      {modalType && (
        <div className="pdx-modal-back" onClick={closeModal}>
          <div className="pdx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="pdx-modal-close" onClick={closeModal} aria-label="Close">
              <IonIcon icon={closeOutline} />
            </button>

            {modalDone ? (
              <div className="pdx-modal-done">
                <IonIcon icon={checkmarkCircle} className="pdx-modal-ok" />
                <h4>
                  {modalType === 'view_number' ? `${ownerLabel} phone number` : 'Request sent'}
                </h4>

                {modalType === 'view_number' && revealedNumber ? (
                  <>
                    <a href={`tel:${revealedNumber}`} className="pdx-modal-number">{revealedNumber}</a>
                    <p>The {ownerLower} has also been notified by email.</p>
                  </>
                ) : (
                  <p>The {ownerLower} has been notified by email and will contact you soon.</p>
                )}

                <button type="button" className="pdx-btn pdx-btn--solid" onClick={closeModal}>Close</button>
              </div>
            ) : (
              <form onSubmit={submitModal} noValidate>
                <h4>{modalType === 'view_number' ? 'View phone number' : `Contact ${ownerLabel}`}</h4>
                <p className="pdx-modal-sub">{p.title}</p>
                <p className="pdx-modal-sub">
                  {modalType === 'view_number'
                    ? `Share your details to see the ${ownerLower}'s number. The ${ownerLower} will be notified by email.`
                    : `Share your details. The ${ownerLower} will receive your request by email and contact you.`}
                </p>

                <div className="pdx-form">
                  <input
                    className="pdx-input"
                    type="text"
                    placeholder="Your Name"
                    value={modalForm.name}
                    maxLength={80}
                    onChange={(e) => setModalField('name', e.target.value)}
                  />
                  <input
                    className="pdx-input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Your Mobile Number"
                    value={modalForm.mobile}
                    maxLength={15}
                    onChange={(e) => setModalField('mobile', e.target.value)}
                  />
                  <input
                    className="pdx-input"
                    type="email"
                    placeholder="Your Email (optional)"
                    value={modalForm.email}
                    maxLength={120}
                    onChange={(e) => setModalField('email', e.target.value)}
                  />
                  {modalType === 'contact_owner' && (
                    <textarea
                      className="pdx-input pdx-textarea"
                      rows={3}
                      maxLength={1000}
                      placeholder="I am interested in this property..."
                      value={modalForm.message}
                      onChange={(e) => setModalField('message', e.target.value)}
                    />
                  )}
                  {/* honeypot */}
                  <input
                    className="pdx-honeypot"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={modalForm.website}
                    onChange={(e) => setModalField('website', e.target.value)}
                  />
                </div>

                {modalError && <p role="alert" className="pdx-status pdx-status--error">{modalError}</p>}

                <button type="submit" className="pdx-btn pdx-btn--solid" disabled={modalSending}>
                  {modalSending ? (
                    <IonSpinner name="dots" />
                  ) : modalType === 'view_number' ? (
                    'View Phone Number'
                  ) : (
                    `Contact ${ownerLabel}`
                  )}
                </button>

                <p className="pdx-modal-note">By continuing you agree to the Terms &amp; Privacy Policy.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default PropertyDetail;