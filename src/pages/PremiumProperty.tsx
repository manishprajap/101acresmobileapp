import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { searchOutline, micOutline, expandOutline, bedOutline, waterOutline } from 'ionicons/icons';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './PremiumProperty.css';
import { apiGet } from '../api';

const UPLOADS_BASE_URL = 'https://101acres.com/uploads';
const DEFAULT_LOGO_URL = 'https://101acres.com/images/101.png';

interface Property {
  id?: number;
  _id?: number;
  propertyId?: number;
  propertyFor?: string;
  image?: string | string[];
  contactName?: string;
  title?: string;
  squareFt?: number | string;
  price?: number | string;
  city?: string;
  area?: string;
  type?: string;
  beds?: number;  // Kept for UI, defaults to N/A if missing from API
  baths?: number; // Kept for UI, defaults to N/A if missing from API
}

/* ── Safe image URL resolver ── */
function getPropertyImageUrl(image?: string | string[]): string {
  if (!image) return DEFAULT_LOGO_URL;
  let value: string | string[] = image;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try { value = JSON.parse(trimmed) as string[]; }
      catch { return DEFAULT_LOGO_URL; }
    } else {
      value = trimmed;
    }
  }

  if (Array.isArray(value)) {
    const valid = value.find((v) => typeof v === 'string' && v.trim());
    if (!valid) return DEFAULT_LOGO_URL;
    value = valid;
  }

  const filename = (value as string).trim();
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  if (filename.replace(/^\//, '').startsWith('uploads/'))
    return `https://101acres.com/${filename.replace(/^\//, '')}`;
  return `${UPLOADS_BASE_URL}/${filename.replace(/^\//, '')}`;
}

/* ── Format price nicely ── */
function formatPrice(price?: number | string): string {
  if (!price) return 'Price on request';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return String(price);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)} Lac`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

const PremiumProperty: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  
  // API States
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredResults, setFilteredResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch live data from the API
  useEffect(() => {
    apiGet('/properties')
      .then((data) => {
        const propertiesList = data.data || data || [];
        setAllProperties(propertiesList);
      })
      .catch((err) => {
        console.error(err);
        setError('An error occurred while loading properties. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter Logic Helper
  const getFilteredData = (currentKeyword: string) => {
    return allProperties.filter((p) => {
      const titleText = p.title || p.contactName || '';
      const locationText = `${p.area || ''} ${p.city || ''}`;
      
      const matchKeyword =
        currentKeyword.trim() === '' ||
        titleText.toLowerCase().includes(currentKeyword.toLowerCase()) ||
        locationText.toLowerCase().includes(currentKeyword.toLowerCase());

      return matchKeyword;
    });
  };

  // 2. Automatically update view when Master Dataset loads or keyword changes
  useEffect(() => {
    setFilteredResults(getFilteredData(keyword));
  }, [allProperties, keyword]);

  // 3. Update view manually when user hits "Search"
  const handleSearch = () => {
    setFilteredResults(getFilteredData(keyword));
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content">

        {/* ── HERO ── */}
        <section className="pp-hero">
          <div className="pp-hero-overlay" />
        </section>

        {/* ── SEARCH BAR ── */}
        <div className="pp-search-wrap">
          <div className="pp-search-pill">
            <IonIcon icon={searchOutline} className="pp-pill-icon" />
            <input
              className="pp-pill-input"
              placeholder="Search by area, title or city..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <IonIcon icon={micOutline} className="pp-pill-mic" />
            <button className="pp-pill-btn" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>

        {/* ── RESULTS SECTION ── */}
        <section className="pp-results">
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              Loading modern properties...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#fff5f5', borderRadius: 10, color: '#cc3333' }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredResults.length === 0 && (
            <p className="pp-no-results">No properties found matching your criteria.</p>
          )}

          {!loading && !error && filteredResults.length > 0 && (
            <div className="pp-grid">
              {filteredResults.map((p, index) => {
                const uniqueKey = p.id ?? p._id ?? p.propertyId ?? index;
                const displayTitle = p.title || p.contactName || 'Premium Property';
                const propertyBadge = p.propertyFor || p.type;

                return (
                  <div className="pp-card" key={uniqueKey}>
                    <div className="pp-card-img-wrap">
                      <img 
                        src={getPropertyImageUrl(p.image)} 
                        alt={displayTitle} 
                        className="pp-card-img" 
                        onError={(e) => { e.currentTarget.src = DEFAULT_LOGO_URL; }}
                      />
                      {propertyBadge && <span className="pp-badge">{propertyBadge}</span>}
                    </div>
                    <div className="pp-card-body">
                      <p className="pp-card-title">{displayTitle}</p>
                      <p className="pp-card-price">{formatPrice(p.price)}</p>
                      
                      <div className="pp-card-meta">
                        <span>
                          <IonIcon icon={expandOutline} /> {p.squareFt ?? 'N/A'} sqft
                        </span>
                        <span>
                          <IonIcon icon={bedOutline} /> {p.beds ?? 'N/A'}
                        </span>
                        <span>
                          <IonIcon icon={waterOutline} /> {p.baths ?? 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default PremiumProperty;