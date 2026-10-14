import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  IonToast,
} from '@ionic/react';
import { chevronBackOutline, personCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { apiGet, apiPost } from '../api';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
// Same stylesheet the Login/Register pages use — keeps this page on the same
// visual system (auth-bg, auth-card, auth-title, auth-field, auth-btn, ...).
// Adjust the path below if this file doesn't sit next to AuthLayout.css.
// import './AuthLayout.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  mobile?: number;
}

const ProfilePage: React.FC = () => {
  const history = useHistory();

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  // Show cached data instantly, then refresh from the server.
  useEffect(() => {
    const stored = localStorage.getItem('user');
    let userId: number | null = null;

    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setPhone(parsed.phone || (parsed.mobile ? String(parsed.mobile) : ''));
        userId = parsed.id;
      } catch {
        setUser(null);
      }
    }

    const loadProfile = async (): Promise<void> => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const fresh = await apiGet(`/profile?userId=${userId}`);
        const freshUser: User = fresh;
        setUser(freshUser);
        setName(freshUser.name || '');
        setEmail(freshUser.email || '');
        setPhone(freshUser.phone || (freshUser.mobile ? String(freshUser.mobile) : ''));
        localStorage.setItem('user', JSON.stringify(freshUser));
      } catch (err) {
        // Not fatal — we already have whatever was cached in localStorage.
        console.error('Load profile error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();

    if (!name.trim()) {
      setToastColor('danger');
      setToastMessage('Name cannot be empty');
      setShowToast(true);
      return;
    }

    const stored = localStorage.getItem('user');
    const userId = stored ? JSON.parse(stored)?.id : null;

    if (!userId) {
      setToastColor('danger');
      setToastMessage('Session expired. Please log in again.');
      setShowToast(true);
      return;
    }

    setSaving(true);
    try {
      // apiPost resolves with the parsed JSON body on success,
      // and throws the parsed JSON body (e.g. { error: '...' }) on failure.
      const result = await apiPost('/profile', { userId, name, email, phone });
      const updatedUser: User = result?.user
        ? result.user
        : { ...(user as User), name, email, phone };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setToastColor('success');
      setToastMessage(result?.message || 'Profile updated successfully');
      setShowToast(true);
    } catch (err: unknown) {
      console.error('Profile update error:', err);
      const message =
        (err as { error?: string; message?: string })?.error ||
        (err as { error?: string; message?: string })?.message ||
        'Could not update profile. Please try again.';
      setToastColor('danger');
      setToastMessage(message);
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <Navbar />
        <style>{`
          /*
            Small additions on top of AuthLayout.css: things that file
            doesn't define because Login has no back button, no avatar,
            and uses IonInput (shadow-DOM) instead of plain <input>.
          */
          .auth-card-header {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 6px;
          }
          .auth-back-btn {
            position: absolute;
            left: -6px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            background: none;
            border: none;
            color: #1c2b39;
            font-size: 18px;
            border-radius: 8px;
            cursor: pointer;
          }
          .auth-back-btn:hover {
            background: rgba(28, 43, 57, 0.06);
          }

          .auth-avatar-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            margin: 2px auto 16px;
          }
          .auth-avatar-circle {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: #1fae5c;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 700;
            box-shadow: 0 6px 16px rgba(31, 174, 92, 0.3);
          }
          .auth-avatar-role {
            font-size: 12px;
            color: #5b6b79;
            text-transform: capitalize;
          }

          /* Plain <input> equivalent of .auth-input (which relies on
             IonInput's shadow-DOM CSS custom properties and can't
             style a raw <input> on its own). */
          .auth-input-native {
            width: 100%;
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(215, 221, 227, 0.8);
            border-radius: 8px;
            outline: none;
            font-family: inherit;
            font-size: 14px;
            color: #1c2b39;
            padding: 9px 12px;
            box-sizing: border-box;
          }
          .auth-input-native::placeholder {
            color: #8a96a3;
            opacity: 1;
          }
          .auth-input-native:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          /* Native <button> equivalent of .auth-btn (that class targets
             ion-button's CSS custom properties, not a plain element). */
          .auth-btn-native {
            display: block;
            width: 100%;
            height: 42px;
            margin-top: 4px;
            border: none;
            border-radius: 8px;
            background: #1fae5c;
            color: #ffffff;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            transition: background 0.15s, opacity 0.15s;
          }
          .auth-btn-native:hover:not(:disabled) {
            background: #189249;
          }
          .auth-btn-native:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>

        <IonContent fullscreen>
          <div className="auth-bg">
            <form className="auth-card" onSubmit={handleSave}>
              <div className="auth-card-header">
                
                <h2 className="auth-title" style={{ margin: 0 }}>Edit Profile</h2>
              </div>

              <div className="auth-avatar-block">
                <div className="auth-avatar-circle">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <IonIcon icon={personCircleOutline} />}
                </div>
                {user?.role && <div className="auth-avatar-role">{user.role}</div>}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  className="auth-input-native"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  className="auth-input-native"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="profile-phone">Phone Number</label>
                <input
                  id="profile-phone"
                  className="auth-input-native"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Add a phone number"
                  disabled={loading}
                />
              </div>

              <button type="submit" className="auth-btn-native" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          <IonToast
            isOpen={showToast}
            message={toastMessage}
            duration={2500}
            color={toastColor}
            onDidDismiss={() => setShowToast(false)}
          />
        </IonContent>
        <BottomNav active={null} />
    </IonPage>
  );
};

export default ProfilePage;