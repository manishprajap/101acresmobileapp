import React, { useEffect, useState, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonToast,
  RefresherEventDetail,
} from '@ionic/react';
import {
  homeOutline,
  businessOutline,
  locationOutline,
  bedOutline,
  addOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import './Dashboard.css';
import { apiGet } from '../api';
import Navbar from '../components/Navbar';

// ── Types ──────────────────────────────────────────────────
export interface Property {
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
  landmark?: string;
  address?: string;
  image?: string | string[];
  images?: string | string[];
  status?: string; // ✅ FIXED: Added status field from API
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

const formatINR = (amount: number | string | undefined | null): string => {
  const numericValue = typeof amount === 'string' ? Number(amount) : amount;
  const value = typeof numericValue === 'number' && !Number.isNaN(numericValue) ? numericValue : 0;
  return `₹${value.toLocaleString('en-IN')}`;
};

// ✅ FIXED: Use actual `status` field from API instead of deriving from `propertyFor`
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

const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack }) => (
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

  const goBack = (): void => {
    setActiveView(prevView ?? 'home');
    setPrevView(null);
  };

  const isHome = activeView === 'home';

  return (
    <IonPage className="dash-page">
      <Navbar />
      {/* <PageHeader
        title={TAB_LABELS[activeView]}
        onBack={!isHome ? goBack : undefined}
        showNotifications={isHome}
      /> */}

      <IonContent fullscreen className="dash-content">
        {activeView === 'home' && (
          <HomeView
            onAddNew={openAddProperty}
            onViewAll={() => navigate('properties')}
          />
        )}
        {activeView === 'properties' && (
          <PropertiesView onAddNew={openAddProperty} />
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
      setError('User not logged in');
      setLoading(false);
      return;
    }

    try {
      const propData = await apiGet(`/userproperty?userId=${userId}&page=1&pageSize=100`) as PropertyListResponse;
      if (!propData.success) throw new Error(propData.message ?? 'API error');

      // ✅ NEW: newest properties first
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

      const list: Property[] = allListings.slice().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setProperties(list.slice(0, 3));
      setStats({
        activeListings: propData.total ?? list.length,
        pipelineValue: list.reduce((sum, property) => sum + (Number(property.price) || 0), 0),
        viewingsToday: 0,
        unconfirmedViewings: 0,
        dealsClosedThisMonth: 0,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as Record<string, string>)?.error ?? 'Could not load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handlePropertyCreated = () => {
      void fetchAll();
    };

    window.addEventListener('property:created', handlePropertyCreated);
    return () => window.removeEventListener('property:created', handlePropertyCreated);
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
            {/* ✅ NEW: Pipeline value card, formatted in Rupees */}
            <div className="kpi-card">
              <p className="kpi-label">Pipeline value</p>
              <p className="kpi-val">{formatINR(stats?.pipelineValue)}</p>
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

      <IonToast
        isOpen={!!error}
        message={error}
        duration={3000}
        color="danger"
        position="top"
        onDidDismiss={() => setError('')}
      />
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
        {/* ✅ FIXED: Rupee symbol added */}
        <p className="listing-price">{formatINR(property.price)}</p>
        {/* ✅ FIXED: class + guaranteed-visible inline style fallback for color */}
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
const PropertiesView: React.FC<{ onAddNew: () => void }> = ({ onAddNew }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const userId = localStorage.getItem('userId');

  const fetchProperties = useCallback(
    async (pageToLoad: number, replace: boolean): Promise<void> => {
      if (!userId) {
        setError('User not logged in');
        setLoading(false);
        return;
      }
      try {
        const result = await apiGet(
          `/userproperty?userId=${userId}&page=${pageToLoad}&pageSize=${PAGE_SIZE}`
        ) as PropertyListResponse;
        if (!result.success) throw new Error(result.message ?? 'API error');

        // ✅ NEW: newest properties first, whether it's a fresh load or an
        // infinite-scroll page being appended.
        const sortByNewest = (list: Property[]): Property[] =>
          list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setProperties((prev) =>
          sortByNewest(replace ? result.data : [...prev, ...result.data])
        );
        setHasMore(result.page * result.pageSize < result.total && result.data.length > 0);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as Record<string, string>)?.error ?? 'Could not load';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => { void fetchProperties(1, true); }, [fetchProperties]);

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
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}

      <IonInfiniteScroll threshold="100px" disabled={!hasMore} onIonInfinite={loadMore}>
        <IonInfiniteScrollContent loadingSpinner="crescent" loadingText="Loading more…" />
      </IonInfiniteScroll>

      <IonToast
        isOpen={!!error}
        message={error}
        duration={3000}
        color="danger"
        position="top"
        onDidDismiss={() => setError('')}
      />
    </div>
  );
};

// ── Property Card ──────────────────────────────────────────
const PropertyCard: React.FC<{ property: Property }> = ({ property }) => {
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
            onLoad={() => console.log('Image OK:', cover)}
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
        <p className="prop-card-title">{property.title}</p>
        <p className="prop-card-loc">
          <IonIcon icon={locationOutline} />
          {[property.area, property.city, property.state].filter(Boolean).join(', ')}
        </p>
        <div className="prop-card-footer">
          {/* ✅ FIXED: Rupee symbol added */}
          <span className="prop-card-price">
            {formatINR(property.price)}
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
        {/* ✅ NEW: Status badge on property cards too, with color fallback */}
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