import React, { useCallback, useEffect, useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { checkmarkCircle } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './AuthLayout.css';
import './Planspages.css';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { apiGet } from '../api';

type Plan = {
  _id: string;
  name: string;
  price: string;
  duration: string;
  popular?: boolean;
  features: string[];
};

// Helper: does this plan count as "Free"?
const isFreePlan = (price: string) =>
  price === 'Free' || price === '0' || Number(price) === 0;

// Helper: format price for display (adds ₹ for paid plans)
const formatPrice = (price: string) => {
  if (isFreePlan(price)) return 'Free';
  const num = Number(price);
  return !isNaN(num) ? `₹${num.toLocaleString('en-IN')}` : price;
};

/**
 * The API may return features as an array, a JSON string ('["a","b"]'),
 * or a plain string separated by new lines / commas. Always return string[].
 */
const toFeatureList = (value: unknown): string[] => {
  const clean = (list: unknown[]) =>
    list.map((item) => String(item ?? '').trim()).filter(Boolean);

  if (Array.isArray(value)) return clean(value);

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];

    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return clean(parsed);
      } catch {
        /* fall through to plain-text splitting */
      }
    }

    return clean(/\r?\n/.test(text) ? text.split(/\r?\n/) : text.split(','));
  }

  return [];
};

const PlansPage: React.FC = () => {
  const history = useHistory();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data: any = await apiGet('/plans');

      if (data?.success && Array.isArray(data.plans)) {
        setPlans(
          data.plans.map((plan: Plan) => ({
            ...plan,
            features: toFeatureList(plan.features),
          }))
        );
      } else {
        setError(data?.message || 'Failed to load plans');
      }
    } catch (err: any) {
      console.error('Failed to fetch plans:', err);
      setError(err?.error || err?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Plan select hote hi seedha register page pe bhej do, saath me plan name query param me
  const handleChoosePlan = (planName: string) => {
    history.push(`/register?plan=${encodeURIComponent(planName)}`);
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent fullscreen>
        <div className="plans-bg">
          <div className="plans-head">
            <h2 className="plans-title">Choose Your Plan</h2>
            <p className="plans-sub">
              Simple, transparent pricing to list, sell or rent your properties without any agent
              or commissions.
            </p>
          </div>

          {loading && (
            <div className="plans-state">
              <IonSpinner name="crescent" />
              <p>Loading plans...</p>
            </div>
          )}

          {!loading && error && (
            <div className="plans-state plans-error">
              <p>{error}</p>
              <IonButton size="small" fill="outline" onClick={fetchPlans}>
                Try again
              </IonButton>
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="plans-state">
              <p>No plans available right now.</p>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="plans-list">
              {plans.map((plan) => (
                <div key={plan._id} className={`plan-card ${plan.popular ? 'plan-card-popular' : ''}`}>
                  {plan.popular && <span className="plan-popular-tag">Popular</span>}

                  <h3 className="plan-name">{plan.name}</h3>

                  <div className="plan-price-row">
                    <span className="plan-price">{formatPrice(plan.price)}</span>
                    {!isFreePlan(plan.price) && (
                      <span className="plan-duration">/ {plan.duration}</span>
                    )}
                  </div>
                  {isFreePlan(plan.price) && <span className="plan-duration">{plan.duration}</span>}

                  <ul className="plan-features">
                    {plan.features.map((feature, i) => (
                      <li key={i}>
                        <IonIcon icon={checkmarkCircle} className="plan-check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <IonButton
                    expand="block"
                    fill="outline"
                    className="plan-btn"
                    onClick={() => handleChoosePlan(plan.name)}
                  >
                    {isFreePlan(plan.price) ? 'Get Started' : 'Choose Plan'}
                  </IonButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default PlansPage;