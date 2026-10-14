import React, { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Area.css';
import { apiGet } from '../api';

const IMAGE_BASE = 'https://101acres.com';

interface Property {
    id: number;
    title?: string;
    description?: string;
    image?: string;
    price?: number | string;
    beds?: number | string;
    baths?: number | string;
    squareFt?: number | string;
    rating?: number;
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

interface IdParams {
    id?: string;
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
    const { id } = useParams<IdParams>();

    const [allProperties, setAllProperties] = useState<Property[]>([]);
    const [filtered, setFiltered] = useState<Property[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [search, setSearch] = useState('');

    // Read-more expanded state for article cards
    const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});

    // ── Fetch properties ──────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);
                const data = await apiGet(`/properties-by-area/${id}`);
                const arr: Property[] = Array.isArray(data) ? data : Object.values(data);
                if (!cancelled) {
                    setAllProperties(arr);
                    setFiltered(arr);
                }
            } catch (err) {
                console.error('Properties load error:', err);
                if (!cancelled) setError('Failed to load properties. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [id]);

    // ── Filter / Search ───────────────────────────────────────
    useEffect(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            setFiltered(allProperties);
            return;
        }
        setFiltered(
            allProperties.filter((p) => {
                const haystack = [
                    p.title,
                    p.description,
                    p.propertyLocation,
                    p.propertyType,
                    p.residentialType,
                    p.propertyFor,
                    p.country_name,
                    p.state_name,
                    p.city_name,
                    p.area_name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            })
        );
    }, [search, allProperties]);

    const toggleExpand = (propId: number) => {
        setExpanded((prev) => ({ ...prev, [propId]: !prev[propId] }));
    };

    // ── Article Card ──────────────────────────────────────────
    const renderArticleCard = (p: Property) => {
        const images = parseImages(p.image);
        const thumb = images[0] ?? null;
        const address = [p.country_name, p.state_name, p.city_name, p.area_name]
            .filter(Boolean)
            .join(', ');
        const isExpanded = !!expanded[p.id];
        const fullText = p.description || '';
        const previewText = fullText.length > 120 ? fullText.slice(0, 120) + '…' : fullText;

        return (
            <div key={p.id} className="ap-card">
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
                        {isExpanded ? fullText : previewText}
                    </h3>

                    {fullText.length > 120 && (
                        <button
                            className="ap-read-more-btn"
                            onClick={() => toggleExpand(p.id)}
                        >
                            {isExpanded ? 'Read less' : 'Read more'}
                        </button>
                    )}

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
    };

    // ── Normal Property Card ──────────────────────────────────
    const renderPropertyCard = (p: Property) => {
        const images = parseImages(p.image);
        const thumb = images[0] ?? null;

        return (
            <div
                key={p.id}
                className="ap-card"
                onClick={() => history.push(`/property/${p.id}`)}
            >
                <div className="ap-card-img-wrap">
                    {thumb ? (
                        <img
                            className="ap-card-img"
                            src={thumb}
                            alt={p.title || 'Property'}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/property/placeholder.jpg';
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
                    <h3 className="ap-card-title">{p.title || 'Property'}</h3>

                    <div className="ap-card-stats">
                        {p.squareFt && <span>📐 {p.squareFt} ft²</span>}
                        {p.beds && <span>🛏 {p.beds} Beds</span>}
                        {p.baths && <span>🚿 {p.baths} Baths</span>}
                    </div>

                    <div className="ap-card-footer">
                        {p.price !== undefined && (
                            <p className="ap-card-price">
                                ₹{Number(p.price).toLocaleString()}
                            </p>
                        )}
                        {typeof p.rating === 'number' && !isNaN(p.rating) ? (
                            <p className="ap-card-rating">
                                {'★'.repeat(Math.round(p.rating))}
                                <span className="ap-rating-val"> ({p.rating})</span>
                            </p>
                        ) : (
                            <p className="ap-card-no-rating">No rating</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <IonPage>
            <Navbar />
            <IonContent className="page-content ap-page-content">
                <div className="ap-page-wrapper">
                    <div className="ap-page-body">

                        {/* Hero */}
                        <section className="ap-hero">
                            <div className="ap-hero-overlay" />
                            <button className="ap-back-btn" onClick={() => history.goBack()}>
                                &#8592; Back
                            </button>
                            <div className="ap-hero-content">
                                <h1 className="ap-hero-title">Properties in This Area</h1>
                                <div className="ap-hero-search">
                                    <span className="ap-hero-search-icon">🔍</span>
                                    <input
                                        className="ap-hero-search-input"
                                        type="text"
                                        placeholder='Search "3 BHK flats for sale"'
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* States */}
                        {loading && <p className="ap-empty">Loading properties…</p>}
                        {error && <p className="ap-empty">{error}</p>}

                        {!loading && !error && (
                            <p className="ap-results-count">
                                {filtered.length}{' '}
                                {filtered.length === 1 ? 'Property' : 'Properties'} found
                            </p>
                        )}

                        {!loading && !error && filtered.length === 0 && (
                            <p className="ap-empty">No properties found.</p>
                        )}

                        {/* Cards */}
                        {!loading && !error && filtered.length > 0 && (
                            <section className="ap-section">
                                <div className="ap-grid">
                                    {filtered.map((p) =>
                                        !p.title
                                            ? renderArticleCard(p)  // no title = article card
                                            : renderPropertyCard(p) // has title = normal card
                                    )}
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