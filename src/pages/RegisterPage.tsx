import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonButton,
  IonText,
  IonToast,
  IonModal,
  IonSpinner,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { useHistory, useLocation } from 'react-router-dom';
import './AuthLayout.css';
import './Planspages.css';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { apiPostFormData } from '../api';

type Role = 'owner' | 'agent' | 'builder' | 'dealer';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'agent', label: 'Agent' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'builder', label: 'Builder' },
];

// ---- Payment / Scan & Pay details ----
const PAYMENT_DETAILS = {
  accountName: '101ACRES.COM',
  accountNumber: '8054278341',
  bankName: 'Indian Bank',
  ifscCode: 'IDIB000M175',
  branch: 'IND MSME BRANCH NEW DELHI, INDER ENCLAVE, NEW DELHI 110087',
  upiId: '101acrescom@indianbk',
  whatsappNumber: '919217703975', // country code + number, no + or spaces
};

// Only these names are treated as free (exact match, case-insensitive).
// Silver / Gold / Diamond and anything else is a paid plan.
const FREE_PLAN_NAMES = ['free'];

const isFreePlan = (plan: string) =>
  FREE_PLAN_NAMES.includes((plan || '').trim().toLowerCase());

type ToastState = { open: boolean; message: string; color: 'success' | 'danger' | 'warning' };

const RegisterPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  // ?plan=Gold  (trim removes extra spaces like "free%20")
  const planFromUrl = (new URLSearchParams(location.search).get('plan') || '')
    .replace(/\s+/g, ' ')
    .trim();

  const [registerAs, setRegisterAs] = useState<Role | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState(planFromUrl);
  const [loading, setLoading] = useState(false);

  // Scan & Pay popup (paid plans only, after successful registration)
  const [showPopup, setShowPopup] = useState(false);
  const [paidPlanName, setPaidPlanName] = useState('');

  const [toast, setToast] = useState<ToastState>({ open: false, message: '', color: 'success' });

  const showToast = (message: string, color: ToastState['color'] = 'danger') =>
    setToast({ open: true, message, color });

  useEffect(() => {
    if (planFromUrl) setPlan(planFromUrl);
  }, [planFromUrl]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setRegisterAs('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!registerAs) {
      showToast('Please select a role (Owner, Agent, Dealer or Builder).', 'warning');
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      showToast('Mobile number must be exactly 10 digits.');
      return;
    }

    if (!plan.trim()) {
      showToast('Please choose a subscription plan first.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const tokenToSend = localStorage.getItem('fcmToken') || '';

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('mobile', mobile);
      formData.append('password', password);
      formData.append('role', registerAs);
      formData.append('plan', plan.trim());
      if (tokenToSend) {
        formData.append('fcmToken', tokenToSend);
      }
      formData.append('fcmPlatform', Capacitor.getPlatform());

      const data: any = await apiPostFormData('/mobileregister', formData);

      console.log('Success:', data);

      // A Free plan never needs payment, even if the server flag is wrong.
      // Only a paid plan can be forced to show the popup by the server.
      const needsPayment = isFreePlan(plan) ? false : data?.requiresPayment !== false;

      if (needsPayment) {
        // Silver / Gold / Diamond -> show Scan & Pay popup.
        setPaidPlanName(plan);
        resetForm();
        setShowPopup(true);
      } else {
        // Free plan -> no QR popup, show success and go to login.
        showToast('Registration successful!', 'success');
        resetForm();
        setTimeout(() => {
          history.push('/login');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error?.error || error?.message || 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  // ---- Scan & Pay derived values ----
  const upiPayString = `upi://pay?pa=${PAYMENT_DETAILS.upiId}&pn=${encodeURIComponent(
    PAYMENT_DETAILS.accountName
  )}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiPayString
  )}`;
  const whatsappShareUrl = `https://wa.me/${PAYMENT_DETAILS.whatsappNumber}?text=${encodeURIComponent(
    `Hi, I have registered on 101acres.com with the "${paidPlanName}" plan and am sharing the payment screenshot for approval.`
  )}`;

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_DETAILS.upiId);
      showToast('UPI ID copied', 'success');
    } catch {
      showToast('Could not copy. Please copy it manually.', 'warning');
    }
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent fullscreen>
        <div className="auth-bg">
          <form className="auth-card" onSubmit={handleRegister}>
            <h2 className="auth-title">Create an Account</h2>

            {/* Selected Plan Badge */}
            {plan ? (
              <div className="plan-badge">
                <span className="plan-badge-text">
                  Selected Plan: <strong>{plan}</strong>
                </span>
                <a
                  href="/plans"
                  className="plan-badge-link"
                  onClick={(e) => {
                    e.preventDefault();
                    history.push('/plans');
                  }}
                >
                  Change
                </a>
              </div>
            ) : (
              <div className="plan-badge plan-badge-warning">
                <span className="plan-badge-text">
                  No plan selected —{' '}
                  <a
                    href="/plans"
                    className="plan-badge-link"
                    onClick={(e) => {
                      e.preventDefault();
                      history.push('/plans');
                    }}
                  >
                    choose a plan first
                  </a>
                </span>
              </div>
            )}

            {/* Role dropdown */}
            <div className="auth-field">
              <label className="auth-label">Register As</label>
              <IonSelect
                className="auth-input auth-select"
                interface="action-sheet"
                placeholder="Select your role"
                value={registerAs}
                cancelText="Cancel"
                onIonChange={(e) => setRegisterAs(e.detail.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <IonSelectOption key={role.value} value={role.value}>
                    {role.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <div className="auth-field">
              <label className="auth-label">Name</label>
              <IonInput
                className="auth-input"
                type="text"
                placeholder="Your name"
                value={name}
                clearInput={false}
                autocapitalize="words"
                autocorrect="off"
                spellcheck={false}
                onIonInput={(e) => setName(e.detail.value ?? '')}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <IonInput
                className="auth-input"
                type="text"
                inputmode="email"
                placeholder="name@example.com"
                value={email}
                clearInput={false}
                autocapitalize="off"
                autocorrect="off"
                spellcheck={false}
                onIonInput={(e) => setEmail(e.detail.value ?? '')}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Mobile</label>
              <IonInput
                className="auth-input"
                type="tel"
                inputmode="numeric"
                maxlength={10}
                placeholder="Enter 10-digit mobile"
                value={mobile}
                clearInput={false}
                onIonInput={(e) => {
                  const digits = String(e.detail.value ?? '')
                    .replace(/\D/g, '')
                    .slice(0, 10);
                  setMobile(digits);
                }}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <IonInput
                className="auth-input"
                type="password"
                placeholder="Password"
                value={password}
                clearInput={false}
                onIonInput={(e) => setPassword(e.detail.value ?? '')}
                required
              />
            </div>

            <IonButton expand="block" type="submit" className="auth-btn" disabled={loading}>
              {loading ? <IonSpinner name="dots" /> : 'Register'}
            </IonButton>

            <IonText className="auth-footer">
              Already have an account?{' '}
              <a
                href="/login"
                className="auth-link"
                onClick={(e) => {
                  e.preventDefault();
                  history.push('/login');
                }}
              >
                Sign In
              </a>
            </IonText>
          </form>
        </div>

        {/* Scan & Pay Modal — paid plans only, after successful registration */}
        <IonModal
          isOpen={showPopup}
          onDidDismiss={() => {
            setShowPopup(false);
            history.push('/login');
          }}
        >
          <IonContent>
            <div className="pay-wrap">
              <h2 className="pay-title">Scan &amp; Pay to Activate Your Plan</h2>
              <p className="pay-sub">
                Your account is created. Your <strong>{paidPlanName}</strong> plan will be activated
                once we verify your payment.
              </p>

              <div className="pay-qr-card">
                <div className="pay-qr-head">101 ACRES.COM</div>
                <div className="pay-qr-scan">SCAN &amp; PAY</div>
                <div className="pay-qr-img">
                  <img src={qrCodeUrl} alt="Scan & Pay QR Code" width={170} height={170} />
                </div>
                <div className="pay-qr-foot">BHIM · UPI</div>
              </div>

              <button type="button" className="pay-upi" onClick={copyUpi}>
                UPI ID: {PAYMENT_DETAILS.upiId} <span>(tap to copy)</span>
              </button>

              <div className="pay-bank">
                <p><strong>Account Name:</strong> {PAYMENT_DETAILS.accountName}</p>
                <p><strong>Account Number:</strong> {PAYMENT_DETAILS.accountNumber}</p>
                <p><strong>Bank:</strong> {PAYMENT_DETAILS.bankName}</p>
                <p><strong>IFSC Code:</strong> {PAYMENT_DETAILS.ifscCode}</p>
                <p><strong>Branch:</strong> {PAYMENT_DETAILS.branch}</p>
              </div>

              <h3 className="pay-share-title">Share Screenshot of Payment</h3>
              <p className="pay-share-note">
                After payment, please share the screenshot on WhatsApp to:
              </p>

              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pay-wa-btn"
              >
                📞 +{PAYMENT_DETAILS.whatsappNumber.replace(/^91/, '91 ')}
              </a>

              <IonButton
                expand="block"
                fill="outline"
                className="pay-continue"
                onClick={() => setShowPopup(false)}
              >
                Continue to Login
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={toast.open}
          message={toast.message}
          duration={2500}
          color={toast.color}
          position="top"
          onDidDismiss={() => setToast((prev) => ({ ...prev, open: false }))}
        />
      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default RegisterPage;