import React, { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Area.css';
import { apiGet } from '../api';

const IMAGE_BASE = 'https://101acres.com';

interface Property {
    id: number;
    type: 'property' | 'propertyArticle';
    description?: string;
    image?: string;
    propertyLocation?: string;
    propertyType?: string;
    residentialType?: string;
    propertyFor?: string;
    country_name?: string;
    state_name?: string;
    city_name?: string;
    area_name?: string;
    status?: string;
}

interface SlugParams {
    slug?: string;
}

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function parseImages(raw?: string | null): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr.filter(Boolean).map((url: string) => {
            if (url.startsWith('http')) return url;
            if (url.startsWith('/')) return `${IMAGE_BASE}${url}`;
            return `${IMAGE_BASE}/uploads/${url}`;
        });
    } catch {
        if (typeof raw === 'string' && raw.length > 0) {
            if (raw.startsWith('http')) return [raw];
            if (raw.startsWith('/')) return [`${IMAGE_BASE}${raw}`];
            return [`${IMAGE_BASE}/uploads/${raw}`];
        }
        return [];
    }
}

const AreaProperties: React.FC = () => {
    const history = useHistory();
    const query   = useQuery();
    const { slug } = useParams<SlugParams>();

    const areaIdParam   = query.get('areaId')   || '';
    const areaNameParam = query.get('areaName') || '';
    const cityName      = query.get('city')     || '';

    const [resolvedAreaId,   setResolvedAreaId]   = useState<string>(areaIdParam);
    const [resolvedAreaName, setResolvedAreaName] = useState<string>(areaNameParam);
    const [slugLoading, setSlugLoading]           = useState(false);
    const [slugError,   setSlugError]             = useState<string | null>(null);

    const [allProperties, setAllProperties] = useState<Property[]>([]);
    const [loading,  setLoading]            = useState(false);
    const [error,    setError]              = useState<string | null>(null);
    const [search,   setSearch]             = useState('');

    // ── Step 1: Slug se areaId resolve karo ──────────────────
    useEffect(() => {
        if (!slug) {
            setResolvedAreaId(areaIdParam);
            setResolvedAreaName(areaNameParam);
            return;
        }

        let cancelled = false;

        async function resolveSlug() {
            try {
                setSlugLoading(true);
                setSlugError(null);

                const data = await apiGet(`/area/${slug}`);
console.log("all data",data);
                if (!cancelled) {
                    // API array return karta hai — pehla item lo
                    const item = Array.isArray(data) ? data[0] : data;

                    if (!item) {
                        setSlugError('Area not found.');
                        return;
                    }

                    const id   = item?.id       ?? item?.areaId     ?? '';
                    const name = item?.areaName ?? item?.name       ?? item?.area_name ?? slug;

                    setResolvedAreaId(String(id));
                    setResolvedAreaName(name);
                }
            } catch (err) {
                console.error('Slug resolve error:', err);
                if (!cancelled) setSlugError('Area not found. Please try again.');
            } finally {
                if (!cancelled) setSlugLoading(false);
            }
        }

        resolveSlug();
        return () => { cancelled = true; };
    }, [slug, areaIdParam, areaNameParam]);

    // ── Step 2: areaId se properties fetch karo ──────────────
    useEffect(() => {
        if (!resolvedAreaId) return;

        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const data = await apiGet(`/properties-by-area/${resolvedAreaId}`);
console.log("all property:",data);
                const arr: Property[] = Array.isArray(data)
                    ? data
                    : Object.values(data);

                if (!cancelled) {
                    setAllProperties(arr);
                }
            } catch (err) {
                console.error('Properties load error:', err);
                if (!cancelled) setError('Properties could not be loaded. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [resolvedAreaId]);

    // ── Search filter ─────────────────────────────────────────
    const filtered = allProperties.filter((p) => {
        const q = search.toLowerCase().trim();
        return !q ||
            p.description?.toLowerCase().includes(q)      ||
            p.area_name?.toLowerCase().includes(q)        ||
            p.city_name?.toLowerCase().includes(q)        ||
            p.propertyLocation?.toLowerCase().includes(q) ||
            p.propertyType?.toLowerCase().includes(q)     ||
            p.residentialType?.toLowerCase().includes(q)  ||
            p.propertyFor?.toLowerCase().includes(q);
    });

    const isLoading   = slugLoading || loading;
    const anyError    = slugError   || error;
    const displayName = resolvedAreaName || slug || 'Area';

    return (
        <IonPage>
            <Navbar />
            <IonContent className="page-content ap-page-content">
                <div className="ap-page-wrapper">
                    <div className="ap-page-body">

                        {/* ── Hero ── */}
                        <section className="ap-hero">
                            <div className="ap-hero-overlay" />
                            <button className="ap-back-btn" onClick={() => history.goBack()}>
                                &#8592; Back
                            </button>
                            <div className="ap-hero-content">
                                <h1 className="ap-hero-title">
                                    Properties in {displayName}
                                    {cityName && <span className="ap-hero-city">, {cityName}</span>}
                                </h1>
                                <div className="ap-hero-search">
                                    <span className="ap-hero-search-icon">🔍</span>
                                    <input
                                        className="ap-hero-search-input"
                                        type="text"
                                        placeholder='Search "3 BHK flats for sale"'
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <button className="ap-hero-search-btn">Search</button>
                                </div>
                            </div>
                        </section>

                        {/* ── States ── */}
                        {isLoading && <p className="ap-empty">Loading properties…</p>}
                        {anyError  && <p className="ap-empty">{anyError}</p>}

                        {!isLoading && !anyError && (
                            <p className="ap-results-count">
                                {filtered.length} {filtered.length === 1 ? 'Property' : 'Properties'} found
                            </p>
                        )}

                        {!isLoading && !anyError && filtered.length === 0 && (
                            <p className="ap-empty">No properties found.</p>
                        )}

                        {/* ── Property Cards ── */}
                        {!isLoading && !anyError && filtered.length > 0 && (
                            <section className="ap-section">
                                <div className="ap-grid">
                                    {filtered.map((p) => {
                                        const images = parseImages(p.image);
                                        const thumb  = images.length > 0 ? images[0] : null;
                                        const address = [
                                            p.country_name,
                                            p.state_name,
                                            p.city_name,
                                            p.area_name,
                                        ].filter(Boolean).join(', ');

                                        return (
                                            <div
                                                key={p.id}
                                                className="ap-card"
                                                onClick={() => history.push(`/property-detail/${p.id}`)}
                                            >
                                                <div className="ap-card-img-wrap">
                                                    {thumb ? (
                                                        <img
                                                            className="ap-card-img"
                                                            src={thumb}
                                                            alt={p.description || 'Property'}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="ap-card-img-placeholder">
                                                            <span>🏠</span>
                                                        </div>
                                                    )}
                                                    {p.propertyFor && (
                                                        <span className={`ap-badge ap-badge--${p.propertyFor.toLowerCase()}`}>
                                                            {p.propertyFor}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="ap-card-body">
                                                    <h3 className="ap-card-title">
                                                        {p.description || 'Property'}
                                                    </h3>
                                                    <p className="ap-card-meta">
                                                        <span className="ap-meta-label">Location:</span>{' '}
                                                        {p.propertyLocation || '—'}
                                                    </p>
                                                    <p className="ap-card-meta">
                                                        <span className="ap-meta-label">Type:</span>{' '}
                                                        {[p.propertyType, p.residentialType].filter(Boolean).join(' / ') || '—'}
                                                    </p>
                                                    <p className="ap-card-meta">
                                                        <span className="ap-meta-label">Address:</span>{' '}
                                                        {address || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default AreaProperties;