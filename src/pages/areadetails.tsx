import React, { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import './Area.css';
import Navbar from '../components/Navbar';
import { apiGet } from '../api';

interface AreaLocality {
  name: string;
  count: number;
  areaId: number;
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
  area_name?: string;
  slug?: string;
  propertyCount?: number | string;
  property_count?: number | string;
  city_id?: number;
  [key: string]: unknown;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function toSlug(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

const AreaDetails: React.FC = () => {
  const history     = useHistory();
  const query       = useQuery();
  const cityParam   = query.get('city') || query.get('area') || '';
  const cityIdParam = query.get('cityId') || '';

  const [cities, setCities]               = useState<ApiCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError]     = useState<string | null>(null);

  const [localities, setLocalities]               = useState<AreaLocality[]>([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(false);
  const [localitiesError, setLocalitiesError]     = useState<string | null>(null);
  const [heroImage, setHeroImage]                 = useState('/01.jpg');

  useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        setCitiesLoading(true);
        const data: ApiCity[] = await apiGet('/citiesarea');
        if (!cancelled) { setCities(data); setCitiesError(null); }
      } catch (err) {
        if (!cancelled) setCitiesError('Cities could not be loaded. Please try again.');
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    loadCities();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cityParam || citiesLoading) return;
    let cancelled = false;

    async function loadLocalities() {
      setLocalitiesLoading(true);
      setLocalitiesError(null);
      setLocalities([]);
      try {
        let resolvedCityId = cityIdParam ? Number(cityIdParam) : null;
        if (!resolvedCityId) {
          const match = cities.find(c => c.name.toLowerCase() === cityParam.toLowerCase());
          if (match) { resolvedCityId = match.id; if (match.heroImage) setHeroImage(match.heroImage); }
        } else {
          const match = cities.find(c => c.id === resolvedCityId);
          if (match?.heroImage) setHeroImage(match.heroImage);
        }

        const endpoint = resolvedCityId
          ? `/area?cityId=${resolvedCityId}&hasProperties=true`
          : `/area?city=${encodeURIComponent(cityParam)}&hasProperties=true`;

        const raw: ApiLocality[] = await apiGet(endpoint);

        if (!cancelled) {
          setLocalities(
            raw.map((a) => ({
              areaId: a.id,
              name:   (a.name ?? a.area_name ?? `Area ${a.id}`) as string,
              count:  Number(a.propertyCount ?? a.property_count ?? 0),
              slug:   (a.slug as string | undefined) ?? toSlug((a.name ?? a.area_name ?? String(a.id))),
            })).filter(loc => loc.count > 0)
          );
        }
      } catch (err) {
        if (!cancelled) setLocalitiesError('Areas could not be loaded. Please try again.');
      } finally {
        if (!cancelled) setLocalitiesLoading(false);
      }
    }
    loadLocalities();
    return () => { cancelled = true; };
  }, [cityParam, cityIdParam, citiesLoading, cities]);

  // ── City card click → localities list ────────────────────
  const handleCityClick = (city: ApiCity) => {
    history.push(`/area?city=${encodeURIComponent(city.name)}&cityId=${city.id}`);
  };

  // ── Locality card click → slug URL + areaId in query ─────
  // areaId query param se AreaProperties seedha properties fetch karta hai
  // slug URL mein rehta hai SEO ke liye
  const handleLocalityClick = (loc: AreaLocality) => {
    history.push(
      `/area/${loc.slug}?areaId=${loc.areaId}&areaName=${encodeURIComponent(loc.name)}&city=${encodeURIComponent(cityParam)}`
    );
  };

  // Cities with zero listed properties should never surface in the picker —
  // tapping into an empty city just dead-ends the user on a "No localities
  // found" screen. Filtering here keeps that in sync with the locality list
  // below, which already excludes zero-count areas.
  const visibleCities = cities.filter((city) => (Number(city.propertyCount) || 0) > 0);

  const renderCityList = () => (
    <>
      <section className="area-hero">
        <div className="area-hero-overlay" />
        <button className="ap-back-btn" onClick={() => history.goBack()}>&#8592; Back</button>
        <h1 className="area-hero-title">Area Wise Properties</h1>
      </section>
      <section className="area-section">
        {citiesLoading && <p className="area-empty">Loading cities…</p>}
        {citiesError   && <p className="area-empty area-error">{citiesError}</p>}
        {!citiesLoading && !citiesError && visibleCities.length === 0 && (
          <p className="area-empty">No cities found.</p>
        )}
        {!citiesLoading && !citiesError && visibleCities.length > 0 && (
          <div className="area-grid">
            {visibleCities.map((city, i) => {
              const propertyCount = Number(city.propertyCount) || 0;
              return (
                <div
                  key={`${city.slug ?? city.id}-${i}`}
                  className="area-card"
                  onClick={() => handleCityClick(city)}
                >
                  <h3 className="area-card-city">{city.name}</h3>
                  <p className="area-card-count">
                    {propertyCount} {propertyCount === 1 ? 'Property' : 'Properties'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );

  const renderCityDetail = () => (
    <>
      <section className="area-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="area-hero-overlay" />
        <button className="ap-back-btn" onClick={() => history.goBack()}>&#8592; Back</button>
        <h1 className="area-hero-title">Areas in {cityParam}</h1>
      </section>
      <section className="area-section">
        {localitiesLoading && <p className="area-empty">Loading areas…</p>}
        {localitiesError   && <p className="area-empty area-error">{localitiesError}</p>}
        {!localitiesLoading && !localitiesError && (
          localities.length > 0 ? (
            <div className="area-grid">
              {localities.map((loc, i) => (
                <div
                  key={`${loc.areaId}-${i}`}
                  className="area-card"
                  onClick={() => handleLocalityClick(loc)}
                >
                  <h3 className="area-card-city">{loc.name}</h3>
                  <p className="area-card-count">
                    {loc.count} {loc.count === 1 ? 'Property' : 'Properties'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="area-empty">No localities found in {cityParam}.</p>
          )
        )}
      </section>
    </>
  );

  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content area-page-content">
        <div className="area-page-wrapper">
          <div className="area-page-body">
            {!cityParam ? renderCityList() : renderCityDetail()}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AreaDetails;