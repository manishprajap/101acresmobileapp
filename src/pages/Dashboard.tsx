import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  RefresherEventDetail,
} from '@ionic/react';
import {
  homeOutline,
  businessOutline,
  locationOutline,
  bedOutline,
  addOutline,
  arrowBackOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import Swal from 'sweetalert2';
import BottomNav from '../components/BottomNav';
import './Dashboard.css';
import { apiDelete, apiGet } from '../api';
import Navbar from '../components/Navbar';

// ── Types ──────────────────────────────────────────────────
export interface Property {
  [key: string]: unknown;
  id: number;
  title: string;
  propertyFor: string;
  propertyType: string;
  price: number;
  priceFor: string;
  squareFt: number;
  beds?: number;
  baths?: number;
  city: string;
  state: string;
  country: string;
  area?: string;
  countryName?: string;
  stateName?: string;
  cityName?: string;
  areaName?: string;
  landmark?: string;
  address?: string;
  image?: string | string[];
  images?: string | string[];
  status?: string;
  createdAt: string;
}

interface PropertyListResponse {
  data: Property[];
  total: number;
  page: number;
  pageSize: number;
  success: boolean;
  message?: string;
}

interface DashboardStats {
  activeListings: number;
  pipelineValue: number;
  viewingsToday: number;
  unconfirmedViewings: number;
  dealsClosedThisMonth: number;
}

const PAGE_SIZE = 10;
const UPLOADS_BASE_URL = 'https://101acres.com/uploads';
const DEFAULT_LOGO_URL = 'https://101acres.com/images/101.png';

// ── Greeting Helper ────────────────────────────────────────
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning,';
  if (hour >= 12 && hour < 17) return 'Good afternoon,';
  if (hour >= 17 && hour < 21) return 'Good evening,';
  return 'Good night,';
};

// ── Price (ONLY the `price` field is used) ─────────────────
const getPropertyPrice = (property: Property): number => {
  const value = Number(String(property.price ?? '').replace(/,/g, '').trim());
  return Number.isFinite(value) ? value : 0;
};

const showPrice = (price: number): string => `₹${price.toLocaleString('en-IN')}`;

const getPropertyLocationName = (...values: unknown[]): string =>
  String(values.find((value) => value != null && String(value).trim() && !/^\d+$/.test(String(value).trim())) ?? '');

const getPropertyLocationId = (property: Property, idKeys: string[], valueKey: string): string => {
  const value = idKeys.map((key) => property[key]).find((item) => item != null && String(item).trim());
  const candidate = value ?? property[valueKey];
  return candidate != null && /^\d+$/.test(String(candidate).trim()) ? String(candidate).trim() : '';
};

const parseLookupItems = (response: unknown): Array<{ id: string; name: string }> => {
  const result = response as Record<string, unknown> | null;
  const candidates: unknown[] = [
    response,
    result?.data,
    result?.result,
    (result?.data as Record<string, unknown> | undefined)?.data,
    (result?.result as Record<string, unknown> | undefined)?.data,
  ];
  const rows = candidates.find(Array.isArray) as unknown[] | undefined;
  return (rows ?? []).flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    const id = item.id ?? item.value ?? item.countryId ?? item.country_id
      ?? item.stateId ?? item.state_id ?? item.cityId ?? item.city_id
      ?? item.areaId ?? item.area_id ?? item.locality_id;
    const name = item.name ?? item.country_name ?? item.countryName
      ?? item.state_name ?? item.stateName ?? item.city_name ?? item.cityName
      ?? item.area_name ?? item.areaName ?? item.locality_name ?? item.localityName
      ?? item.locality ?? item.label ?? item.title;
    return id != null && name != null && String(name).trim()
      ? [{ id: String(id), name: String(name).trim() }]
      : [];
  });
};

const unwrapDashboardProperty = (response: unknown): Property | null => {
  if (!response || typeof response !== 'object') return null;
  const result = response as Record<string, unknown>;
  const data = result.data as Record<string, unknown> | undefined;
  const nestedData = data?.data as Record<string, unknown> | undefined;
  const candidates = [data?.property, result.property, nestedData, data, result.result, result];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      ('id' in candidate || 'propertyId' in candidate || 'title' in candidate)
    ) {
      return candidate as Property;
    }
  }
  return null;
};

const resolvePropertyLocations = async (properties: Property[]): Promise<Property[]> => {
  try {
    const detailedProperties = await Promise.all(properties.map(async (property) => {
      try {
        const response = await apiGet(`/properties/${property.id}`);
        const detail = unwrapDashboardProperty(response);
        if (!detail) {
          console.warn(`Property ${property.id} detail response did not contain a property record.`);
          return property;
        }

        const merged = { ...property, ...detail };
        return { ...merged, price: getPropertyPrice(merged) };
      } catch (error) {
        console.warn(`Could not load details for property ${property.id}; using list data.`, error);
        return property;
      }
    }));

    const countries = parseLookupItems(await apiGet('/country'));
    const countryById = new Map(countries.map((item) => [item.id, item.name]));
    const countryIdByName = new Map(countries.map((item) => [item.name.toLowerCase(), item.id]));
    const countryIds = new Set<string>();

    detailedProperties.forEach((property) => {
      const countryId = getPropertyLocationId(property, ['countryId', 'country_id'], 'country');
      if (countryId) countryIds.add(countryId);
      const countryName = getPropertyLocationName(property.countryName, property.country_name, property.country);
      const matchedId = countryName ? countryIdByName.get(countryName.toLowerCase()) : undefined;
      if (matchedId) countryIds.add(matchedId);
    });

    const statesByCountry = new Map<string, Map<string, string>>();
    await Promise.all(Array.from(countryIds, async (countryId) => {
      const states = parseLookupItems(await apiGet(`/states?countryId=${encodeURIComponent(countryId)}`));
      statesByCountry.set(countryId, new Map(states.map((item) => [item.id, item.name])));
    }));

    const stateIds = new Set<string>();
    const stateIdByProperty = new Map<number, string>();
    detailedProperties.forEach((property) => {
      const countryId = getPropertyLocationId(property, ['countryId', 'country_id'], 'country')
        || countryIdByName.get(getPropertyLocationName(property.countryName, property.country_name, property.country).toLowerCase())
        || '';
      const rawState = getPropertyLocationId(property, ['stateId', 'state_id'], 'state');
      const states = statesByCountry.get(countryId);
      const stateId = rawState
        || Array.from(states?.entries() ?? []).find(
          ([, name]) => name.toLowerCase() === getPropertyLocationName(property.stateName, property.state_name, property.state).toLowerCase(),
        )?.[0]
        || '';
      if (stateId) {
        stateIds.add(stateId);
        stateIdByProperty.set(property.id, stateId);
      }
    });

    const citiesByState = new Map<string, Map<string, string>>();
    await Promise.all(Array.from(stateIds, async (stateId) => {
      const cities = parseLookupItems(await apiGet(`/cities?stateId=${encodeURIComponent(stateId)}`));
      citiesByState.set(stateId, new Map(cities.map((item) => [item.id, item.name])));
    }));

    const cityIds = new Set<string>();
    detailedProperties.forEach((property) => {
      const cityId = getPropertyLocationId(property, ['cityId', 'city_id'], 'city');
      if (cityId) cityIds.add(cityId);
    });

    const areasByCity = new Map<string, Map<string, string>>();
    await Promise.all(Array.from(cityIds, async (cityId) => {
      const areas = parseLookupItems(await apiGet(`/area?cityId=${encodeURIComponent(cityId)}`));
      areasByCity.set(cityId, new Map(areas.map((item) => [item.id, item.name])));
    }));

    return detailedProperties.map((property) => {
      const countryId = getPropertyLocationId(property, ['countryId', 'country_id'], 'country')
        || countryIdByName.get(getPropertyLocationName(property.countryName, property.country_name, property.country).toLowerCase())
        || '';
      const stateId = stateIdByProperty.get(property.id)
        || getPropertyLocationId(property, ['stateId', 'state_id'], 'state');
      const cityId = getPropertyLocationId(property, ['cityId', 'city_id'], 'city');
      const country = getPropertyLocationName(property.countryName, property.country_name, property.country)
        || countryById.get(countryId)
        || '';
      const rawState = getPropertyLocationName(property.stateName, property.state_name, property.state);
      const state = rawState
        || statesByCountry.get(countryId)?.get(stateId)
        || '';
      const cityOptions = citiesByState.get(stateId);
      const rawCity = getPropertyLocationName(property.cityName, property.city_name, property.city);
      const city = rawCity
        || cityOptions?.get(cityId)
        || '';
      const areaId = getPropertyLocationId(property, ['areaId', 'area_id', 'localityId', 'locality_id'], 'area');
      const areaOptions = areasByCity.get(cityId);
      const area = getPropertyLocationName(
        property.areaName,
        property.area_name,
        property.localityName,
        property.locality_name,
        property.locality,
        property.area,
      ) || areaOptions?.get(areaId) || '';

      return { ...property, price: getPropertyPrice(property), country, state, city, area };
    });
  } catch (error) {
    console.error('Could not resolve dashboard property locations:', error);
    return properties.map((property) => ({
      ...property,
      price: getPropertyPrice(property),
      country: getPropertyLocationName(property.countryName, property.country_name, property.country),
      state: getPropertyLocationName(property.stateName, property.state_name, property.state),
      city: getPropertyLocationName(property.cityName, property.city_name, property.city),
      area: getPropertyLocationName(
        property.areaName,
        property.area_name,
        property.localityName,
        property.locality_name,
        property.locality,
        property.area,
      ),
    }));
  }
};

// ── Attach location NAMES only (original IDs untouched) ────
// Edit flow ko original country/state/city IDs chahiye, isliye
// yahan sirf countryName/stateName/cityName/areaName add hote hain.
const attachLocationNames = async (properties: Property[]): Promise<Property[]> => {
  if (properties.length === 0) return properties;

  const resolved = await resolvePropertyLocations(properties);
  const resolvedById = new Map(resolved.map((item) => [item.id, item]));

  return properties.map((property) => {
    const match = resolvedById.get(property.id);
    return {
      ...property,
      countryName: match?.country || property.countryName || '',
      stateName: match?.state || property.stateName || '',
      cityName: match?.city || property.cityName || '',
      areaName: match?.area || property.areaName || '',
      area: match?.area || property.area || '',
    };
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const response = error as { error?: unknown; message?: unknown };
    if (typeof response.error === 'string' && response.error) return response.error;
    if (typeof response.message === 'string' && response.message) return response.message;
  }
  return fallback;
};

const showRequestError = async (error: unknown, fallback: string): Promise<void> => {
  const message = getErrorMessage(error, fallback);
  const authenticationRequired = message.toLowerCase().includes('authentication required');
  await Swal.fire({
    icon: 'error',
    title: authenticationRequired ? 'Authentication required' : 'Request failed',
    text: authenticationRequired ? 'Please sign in again, then retry this action.' : message,
    confirmButtonColor: '#185FA5',
    heightAuto: false,
  });
};

// ── Confirmation helper (used by Edit and Delete) ──────────
const confirmAction = async (options: {
  title: string;
  text: string;
  confirmText: string;
  confirmColor?: string;
  icon?: 'warning' | 'question';
}): Promise<boolean> => {
  const result = await Swal.fire({
    icon: options.icon ?? 'question',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText,
    confirmButtonColor: options.confirmColor ?? '#185FA5',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    heightAuto: false, // prevents layout shift inside Ionic
  });
  return result.isConfirmed;
};

// ── Status helpers (uses actual `status` field from API) ───
const getStatusLabel = (property: Property): string => {
  return property.status ?? 'Inactive';
};

const getStatusClass = (property: Property): string => {
  const s = property.status?.toLowerCase();
  if (s === 'active') return 'status-active';
  return 'status-inactive';
};

const getStatusStyle = (property: Property): React.CSSProperties => {
  const s = property.status?.toLowerCase();
  const isActive = s === 'active';
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '4px',
    backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
    color: isActive ? '#16a34a' : '#dc2626',
  };
};

// ── Image URL Helper ───────────────────────────────────────
const getPropertyImageUrl = (property: Property): string => {
  const raw: string | string[] | undefined = property.images ?? property.image;

  if (!raw) return DEFAULT_LOGO_URL;

  let filename: string | null = null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          filename = parsed[0] as string;
        }
      } catch {
        filename = trimmed;
      }
    } else {
      filename = trimmed;
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    filename = raw[0];
  }

  if (!filename) return DEFAULT_LOGO_URL;

  if (filename.startsWith('http')) return filename;
  if (filename.startsWith('/')) return `https://101acres.com${filename}`;

  return `${UPLOADS_BASE_URL}/${filename}`;
};

// ── Loading Spinner ────────────────────────────────────────
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '12px' }}>
    <div style={{
      width: '40px', height: '40px',
      border: '3px solid #e5e7eb',
      borderTopColor: '#374151',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{message}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── View types ─────────────────────────────────────────────
type ActiveView = 'home' | 'properties';

const TAB_LABELS: Record<ActiveView, string> = {
  home: 'Dashboard',
  properties: 'Properties',
};

// ── Page Header ────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  showNotifications?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack }) => (
  <div className="dash-top-header">
    <div className="dash-top-left">
      {onBack ? (
        <button className="dash-back-btn" onClick={onBack} aria-label="Go back">
          <IonIcon icon={arrowBackOutline} />
        </button>
      ) : (
        <div className="dash-logo-dot">
          <IonIcon icon={homeOutline} />
        </div>
      )}
      <span className="dash-tab-label">{title}</span>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════
// Dashboard Root
// ══════════════════════════════════════════════════════════
const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [prevView, setPrevView] = useState<ActiveView | null>(null);
  const history = useHistory();

  const navigate = (view: ActiveView): void => {
    setPrevView(activeView);
    setActiveView(view);
  };

  const openAddProperty = (): void => {
    history.push('/add-property');
  };

  const openEditProperty = (property: Property): void => {
    history.push('/add-property', { property });
  };

  // Kept for the (currently commented-out) PageHeader back button
  const goBack = (): void => {
    setActiveView(prevView ?? 'home');
    setPrevView(null);
  };
  void goBack;
  void TAB_LABELS;

  return (
    <IonPage className="dash-page">
      <Navbar />

      <IonContent fullscreen className="dash-content">
        {activeView === 'home' && (
          <HomeView
            onAddNew={openAddProperty}
            onViewAll={() => navigate('properties')}
          />
        )}
        {activeView === 'properties' && (
          <PropertiesView onAddNew={openAddProperty} onEdit={openEditProperty} />
        )}
      </IonContent>

      <BottomNav active={null} />
    </IonPage>
  );
};

// ══════════════════════════════════════════════════════════
// Home View
// ══════════════════════════════════════════════════════════
const HomeView: React.FC<{ onAddNew: () => void; onViewAll: () => void }> = ({
  onAddNew, onViewAll,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState<string>(getGreeting());

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getGreeting());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    const userId = localStorage.getItem('userId');

    if (!userId) {
      const message = 'Please sign in to view your dashboard.';
      setError(message);
      void Swal.fire({
        icon: 'error',
        title: 'Authentication required',
        text: message,
        confirmButtonColor: '#185FA5',
        heightAuto: false,
      });
      setLoading(false);
      return;
    }

    try {
      const propData = await apiGet(`/userproperty?userId=${userId}&page=1&pageSize=100`) as PropertyListResponse;
      if (!propData.success) throw new Error(propData.message ?? 'API error');

      const allListings: Property[] = (propData.data ?? []).slice();
      const pageSize = Math.max(propData.pageSize || 100, 1);
      const totalPages = Math.ceil((propData.total || allListings.length) / pageSize);

      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
            const response = await apiGet(
              `/userproperty?userId=${userId}&page=${page}&pageSize=${pageSize}`,
            ) as PropertyListResponse;
            return response.data ?? [];
          }),
        );
        allListings.push(...remainingPages.flat());
      }

      // Newest properties first
      const list: Property[] = allListings.map((property) => ({
        ...property,
        price: getPropertyPrice(property),
        landmark: getPropertyLocationName(
          property.subLocalityName,
          property.sublocalityName,
          property.sub_locality_name,
          property.subLocality,
          property.sublocality,
          property.sub_locality,
          property.landmark,
        ),
      })).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProperties(await resolvePropertyLocations(list.slice(0, 3)));
      setStats({
        activeListings: propData.total ?? list.length,
        pipelineValue: list.reduce((sum, property) => sum + getPropertyPrice(property), 0),
        viewingsToday: 0,
        unconfirmedViewings: 0,
        dealsClosedThisMonth: 0,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Could not load dashboard');
      setError(message);
      await showRequestError(err, 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handleChange = () => {
      void fetchAll();
    };

    window.addEventListener('property:created', handleChange);
    window.addEventListener('property:changed', handleChange);
    return () => {
      window.removeEventListener('property:created', handleChange);
      window.removeEventListener('property:changed', handleChange);
    };
  }, [fetchAll]);

  const handleRefresh = async (e: CustomEvent<RefresherEventDetail>): Promise<void> => {
    setGreeting(getGreeting());
    await fetchAll();
    e.detail.complete();
  };

  return (
    <div className="home-view">
      <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
        <IonRefresherContent pullingIcon="chevron-down-circle-outline" />
      </IonRefresher>

      <div className="kpi-header">
        <div className="kpi-header-top">
          <div>
            <p className="kpi-greeting">{greeting}</p>
            <h1 className="kpi-name">Dashboard</h1>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading dashboard..." />
        ) : (
          <div className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-label">Total listings</p>
              <p className="kpi-val">{stats?.activeListings ?? 0}</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Pipeline value</p>
              <p className="kpi-val">{showPrice(stats?.pipelineValue ?? 0)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="home-body">
        <section className="home-section">
          <p className="section-title">Quick actions</p>
          <div className="quick-grid">
            <button className="quick-btn" onClick={onAddNew}>
              <span className="quick-icon"><IonIcon icon={addOutline} /></span>
              <span className="quick-label">Add Property</span>
            </button>
          </div>
        </section>

        <section className="home-section">
          <div className="section-header">
            <p className="section-title">My listings</p>
            <button className="section-link" onClick={onViewAll}>View all</button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading listings..." />
          ) : error ? (
            <div className="list-error"><p>{error}</p></div>
          ) : properties.length === 0 ? (
            <div className="list-empty">
              <IonIcon icon={businessOutline} />
              <p>No listings yet. Tap + to add one.</p>
            </div>
          ) : (
            <div className="listing-list">
              {properties.map((p) => (
                <ListingRow key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// ── Listing Row ────────────────────────────────────────────
const ListingRow: React.FC<{ property: Property }> = ({ property }) => {
  const [imgError, setImgError] = useState(false);
  const cover = getPropertyImageUrl(property);

  return (
    <div className="listing-row">
      <div className="listing-thumb">
        {!imgError ? (
          <img
            src={cover}
            alt={property.title}
            className="listing-thumb-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <img
            src={DEFAULT_LOGO_URL}
            alt="default"
            className="listing-thumb-img"
          />
        )}
      </div>
      <div className="listing-info">
        <p className="listing-title">{property.title}</p>
        <p className="listing-sub">
          {property.squareFt?.toLocaleString('en-IN')} sq ft · {property.city}
        </p>
      </div>
      <div className="listing-right">
        <p className="listing-price">{showPrice(getPropertyPrice(property))}</p>
        <span
          className={`listing-status ${getStatusClass(property)}`}
          style={getStatusStyle(property)}
        >
          {getStatusLabel(property)}
        </span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// Properties View
// ══════════════════════════════════════════════════════════
const PropertiesView: React.FC<{
  onAddNew: () => void;
  onEdit: (property: Property) => void;
}> = ({ onAddNew, onEdit }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const userId = localStorage.getItem('userId');

  const fetchProperties = useCallback(
    async (pageToLoad: number, replace: boolean): Promise<void> => {
      if (!userId) {
        const message = 'Please sign in to view your properties.';
        setError(message);
        void Swal.fire({
          icon: 'error',
          title: 'Authentication required',
          text: message,
          confirmButtonColor: '#185FA5',
          heightAuto: false,
        });
        setLoading(false);
        return;
      }
      try {
        const result = await apiGet(
          `/userproperty?userId=${userId}&page=${pageToLoad}&pageSize=${PAGE_SIZE}`
        ) as PropertyListResponse;
        if (!result.success) throw new Error(result.message ?? 'API error');

        // Newest properties first (fresh load or appended infinite-scroll page)
        const sortByNewest = (list: Property[]): Property[] =>
          list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const withPrice = result.data.map((property) => ({
          ...property,
          price: getPropertyPrice(property),
        }));

        // ✅ Country / State / City / Area ke NAMES resolve karo (IDs untouched)
        const withLocations = await attachLocationNames(withPrice);

        setProperties((prev) =>
          sortByNewest(replace ? withLocations : [...prev, ...withLocations])
        );
        setHasMore(result.page * result.pageSize < result.total && result.data.length > 0);
      } catch (err: unknown) {
        const message = getErrorMessage(err, 'Could not load properties');
        setError(message);
        await showRequestError(err, 'Could not load properties');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => { void fetchProperties(1, true); }, [fetchProperties]);

  useEffect(() => {
    const refreshProperties = (): void => {
      setPage(1);
      void fetchProperties(1, true);
    };
    window.addEventListener('property:changed', refreshProperties);
    return () => window.removeEventListener('property:changed', refreshProperties);
  }, [fetchProperties]);

  const handleRefresh = async (e: CustomEvent<RefresherEventDetail>): Promise<void> => {
    setPage(1);
    await fetchProperties(1, true);
    e.detail.complete();
  };

  const loadMore = async (e: CustomEvent<void>): Promise<void> => {
    const next = page + 1;
    setPage(next);
    await fetchProperties(next, false);
    (e.target as HTMLIonInfiniteScrollElement).complete();
  };

  // ── Edit: confirm first, then navigate ───────────────────
  const handleEdit = async (property: Property): Promise<void> => {
    const ok = await confirmAction({
      icon: 'question',
      title: 'Edit property?',
      text: `Do you want to edit "${property.title}"?`,
      confirmText: 'Yes, edit',
    });
    if (!ok) return;
    onEdit(property);
  };

  // ── Delete: confirm first, then call API ─────────────────
  const handleDelete = async (property: Property): Promise<void> => {
    const ok = await confirmAction({
      icon: 'warning',
      title: 'Delete property?',
      text: `Delete "${property.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: '#b42318',
    });
    if (!ok) return;

    setDeletingId(property.id);
    try {
      const result = await apiDelete(`/properties/${property.id}`) as { success?: boolean; message?: string } | null;
      if (result?.success === false) throw new Error(result.message ?? 'Could not delete property');
      setProperties((current) => current.filter((item) => item.id !== property.id));
      window.dispatchEvent(new Event('property:changed'));
      await Swal.fire({
        icon: 'success',
        title: 'Property deleted',
        text: result?.message ?? 'The property was deleted successfully.',
        confirmButtonColor: '#185FA5',
        heightAuto: false,
      });
    } catch (err: unknown) {
      await showRequestError(err, 'Could not delete property');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="properties-view">
      <div className="props-header">
        <h2 className="props-header-title">My Properties</h2>
        <button className="props-add-btn" onClick={onAddNew}>
          <IonIcon icon={addOutline} /> Add
        </button>
      </div>

      <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
        <IonRefresherContent />
      </IonRefresher>

      {loading ? (
        <LoadingSpinner message="Loading properties..." />
      ) : error ? (
        <div className="list-error"><p>{error}</p></div>
      ) : properties.length === 0 ? (
        <div className="list-empty">
          <IonIcon icon={businessOutline} />
          <p>No properties found</p>
          <button className="empty-add-btn" onClick={onAddNew}>
            Add your first listing
          </button>
        </div>
      ) : (
        <div className="props-card-list">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleting={deletingId === p.id}
            />
          ))}
        </div>
      )}

      <IonInfiniteScroll threshold="100px" disabled={!hasMore} onIonInfinite={loadMore}>
        <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Loading more…" />
      </IonInfiniteScroll>
    </div>
  );
};

// ── Property Card ──────────────────────────────────────────
interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void | Promise<void>;
  onDelete: (property: Property) => Promise<void>;
  deleting: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, deleting }) => {
  const [imgError, setImgError] = useState(false);
  const cover = getPropertyImageUrl(property);
  const isForSale = property.propertyFor?.toLowerCase() === 'sale';

  return (
    <div className="prop-card">
      <div className="prop-card-img-wrap">
        {!imgError ? (
          <img
            src={cover}
            alt={property.title}
            className="prop-card-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <img
            src={DEFAULT_LOGO_URL}
            alt="default"
            className="prop-card-img"
          />
        )}
        <span className={`prop-badge ${isForSale ? 'prop-badge--sale' : 'prop-badge--rent'}`}>
          For {property.propertyFor}
        </span>
        <span className="prop-type-tag">{property.propertyType}</span>
      </div>
      <div className="prop-card-body">
        <div className="prop-card-card-actions">
          <button
            type="button"
            aria-label={`Edit ${property.title}`}
            onClick={() => void onEdit(property)}
            disabled={deleting}
          >
            <IonIcon icon={createOutline} /> Edit
          </button>
          <button
            type="button"
            className="prop-card-delete-btn"
            aria-label={`Delete ${property.title}`}
            onClick={() => void onDelete(property)}
            disabled={deleting}
          >
            <IonIcon icon={trashOutline} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
        <p className="prop-card-title">{property.title}</p>
        <p className="prop-card-loc">
          <IonIcon icon={locationOutline} />
          {[property.area, property.cityName, property.stateName, property.countryName].filter(Boolean).join(', ')}
        </p>
        <div className="prop-card-footer">
          <span className="prop-card-price">
            {showPrice(getPropertyPrice(property))}
            <span className="prop-card-pricefor"> / {property.priceFor}</span>
          </span>
          <span className="prop-card-sqft">
            {property.squareFt?.toLocaleString('en-IN')} sqft
          </span>
        </div>
        {(property.beds || property.baths) && (
          <div className="prop-card-beds">
            <IonIcon icon={bedOutline} />
            {property.beds ? `${property.beds} Beds` : ''}
            {property.beds && property.baths ? ' · ' : ''}
            {property.baths ? `${property.baths} Baths` : ''}
          </div>
        )}
        <span
          className={`listing-status ${getStatusClass(property)}`}
          style={getStatusStyle(property)}
        >
          {getStatusLabel(property)}
        </span>
      </div>
    </div>
  );
};

export default Dashboard;