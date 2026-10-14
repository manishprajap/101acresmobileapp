import React, { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import './Area.css';
import Navbar from '../components/Navbar';
import { apiGet } from '../api';

/* TYPES */
interface AreaLocality {
  areaId: number;
  name: string;
  count: number;
  slug: string;
}

interface ApiCity {
  id: number;
  name: string;
  slug: string;
  propertyCount?: number | string;
  heroImage?: string;
}

interface ApiLocality {
  id: number;
  name?: string;
  areaName?: string;
  slug?: string;
  propertyCount?: number | string;
  property_count?: number | string;
}

/* HELPERS */
function toSlug(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function capitalizeName(str: string): string {
  return str.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const Area: React.FC = () => {
  const history = useHistory();
  const { citySlug } = useParams<{ citySlug?: string }>();

  const cityParam = citySlug || '';

  const [cities, setCities] = useState<ApiCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const [localities, setLocalities] = useState<AreaLocality[]>([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(false);

  const [heroImage, setHeroImage] = useState('');
  const [cityName, setCityName] = useState('');

  /* ───── LOAD CITIES ───── */
  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      try {
        const data: ApiCity[] = await apiGet('/citiesarea');

        if (!cancelled) {
          setCities(data || []);

          if (cityParam) {
            const match = data.find(
              (c) =>
                c.slug?.toLowerCase() === cityParam.toLowerCase() ||
                toSlug(c.name) === cityParam.toLowerCase()
            );

            if (match) {
              setCityName(capitalizeName(match.name));
              if (match.heroImage) setHeroImage(match.heroImage);
            } else {
              setCityName(capitalizeName(cityParam));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }

    loadCities();
    return () => { cancelled = true; };
  }, [cityParam]);

  /* ───── LOAD AREAS ───── */
  useEffect(() => {
    if (!cityParam) return;

    let cancelled = false;

    async function loadAreas() {
      try {
        setLocalitiesLoading(true);
        setLocalities([]);

        const raw: ApiLocality[] = await apiGet(`/area/${cityParam}`);

        if (!cancelled) {
          const mapped = (raw || [])
            .map((a) => ({
              areaId: a.id,
              name: capitalizeName(
                (a.name ||
                  a.areaName ||
                  (a.slug ? a.slug.replace(/-/g, ' ') : '') ||
                  `Area ${a.id}`) as string
              ),
              count: Number(a.propertyCount ?? a.property_count ?? 0),
              slug:
                (a.slug as string | undefined) ??
                toSlug(a.name ?? a.areaName ?? String(a.id)),
            }))
            .filter((l) => l.count > 0);

          setLocalities(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLocalitiesLoading(false);
      }
    }

    loadAreas();
    return () => { cancelled = true; };
  }, [cityParam]);

  /* ───── CITY LIST ───── */
  const renderCityList = () => (
    <div className="area-page-wrapper">
      <div className="area-page-body">

        {/* Hero — no back button on list view */}
        <div className="area-hero">
          <div className="area-hero-overlay" />
          <button className="ap-back-btn" onClick={() => history.goBack()}>
            ← Back
          </button>
          <h1 className="area-hero-title">Area Wise Properties</h1>
        </div>

        {/* Cards */}
        <div className="area-section">
          {citiesLoading && <p className="area-empty">Loading…</p>}

          {!citiesLoading && cities.length === 0 && (
            <p className="area-empty">No cities found.</p>
          )}

          <div className="area-grid">
            {cities.map((city) => {
              const count = Number(city.propertyCount) || 0;
              return (
                <div
                  key={city.id}
                  className="area-card"
                  onClick={() =>
                    history.push(`/area/${city.slug || toSlug(city.name)}`)
                  }
                >
                  <p className="area-card-city">{capitalizeName(city.name)}</p>
                  <p className="area-card-count">
                    {count} {count === 1 ? 'Property' : 'Properties'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );

  /* ───── CITY DETAIL ───── */
  const renderCityDetail = () => (
    <div className="area-page-wrapper">
      <div className="area-page-body">

        {/* Hero with back button — uses ap-hero so button positioning works */}
        <div
          className="ap-hero"
          style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
        >
          <div className="ap-hero-overlay" />

          {/* Back button — absolutely positioned inside ap-hero */}
          <button className="ap-back-btn" onClick={() => history.goBack()}>
            ← Back
          </button>

          {/* Title centred at bottom of hero */}
          <div className="ap-hero-text">
            <h1 className="ap-hero-title">
              Areas in {cityName || capitalizeName(cityParam)}
            </h1>
          </div>
        </div>

        {/* Cards */}
        <div className="area-section">
          {localitiesLoading && <p className="area-empty">Loading…</p>}

          {!localitiesLoading && localities.length === 0 && (
            <p className="area-empty">No areas found for this city.</p>
          )}

          <div className="area-grid">
           {localities.map((loc) => (
  <div
    key={loc.areaId}
    className="area-card"
    onClick={() => history.push(`/area/detail/${loc.areaId}`)}  // ← fixed
  >
    <p className="area-card-city">{loc.name}</p>
    <p className="area-card-count">
      {loc.count} {loc.count === 1 ? 'Property' : 'Properties'}
    </p>
  </div>
))}
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <IonPage>
      <Navbar />
      <IonContent className="area-page-content" fullscreen>
        {!cityParam ? renderCityList() : renderCityDetail()}
      </IonContent>
    </IonPage>
  );
};

export default Area;