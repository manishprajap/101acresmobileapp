import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonIcon,
    IonToast,
} from '@ionic/react';
import {
    chevronBackOutline,
    eyeOutline,
    eyeOffOutline,
    shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { apiPost } from '../api';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
// Same stylesheet the Login/Register pages use — keeps this page on the same
// visual system (auth-bg, auth-card, auth-title, auth-field, auth-btn, ...).
// Adjust the path below if this file doesn't sit next to AuthLayout.css.
const ChangePasswordPage: React.FC = () => {
    const history = useHistory();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [saving, setSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

    const validate = (): string | null => {
        if (!currentPassword) return 'Enter your current password';
        if (newPassword.length < 6) return 'New password must be at least 6 characters';
        if (newPassword !== confirmPassword) return 'New password and confirmation do not match';
        if (newPassword === currentPassword) return 'New password must be different from the current one';
        return null;
    };

    const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
        e?.preventDefault();

        const validationError = validate();
        if (validationError) {
            setToastColor('danger');
            setToastMessage(validationError);
            setShowToast(true);
            return;
        }

        // Get the logged-in user's id from localStorage
        const storedUser = localStorage.getItem('user');
        const userId = storedUser ? JSON.parse(storedUser)?.id : null;

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
            const result = await apiPost('/changepassword', { userId, currentPassword, newPassword });

            setToastColor('success');
            setToastMessage(result?.message || 'Password changed successfully');
            setShowToast(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            console.error('Change password error:', err);
            const message =
                (err as { error?: string; message?: string })?.error ||
                (err as { error?: string; message?: string })?.message ||
                'Could not change password. Please try again.';
            setToastColor('danger');
            setToastMessage(message);
            setShowToast(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <IonPage>
            {/*
              IMPORTANT: Navbar must render INSIDE IonPage, not as a sibling
              above it. IonRouterOutlet only tracks/animates <IonPage>
              elements during route transitions — anything rendered outside
              an IonPage doesn't get cleaned up when the previous page
              transitions out, so the outgoing page's Navbar and this page's
              Navbar can both remain mounted at once (double navbar bug).
              Keeping Navbar as the first child of IonPage ties its
              mount/unmount lifecycle to this page's own transition.
            */}
            <Navbar />

            <style>{`
          /*
            Small additions on top of AuthLayout.css: things that file
            doesn't define because Login has no back button, no icon
            badge, and uses IonInput (shadow-DOM) instead of plain
            <input> + an inline eye-toggle button.
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

          .auth-icon-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            margin: 2px auto 12px;
            border-radius: 50%;
            background: rgba(31, 174, 92, 0.12);
            color: #1fae5c;
            font-size: 22px;
          }
          .auth-caption {
            text-align: center;
            font-size: 12px;
            line-height: 1.5;
            color: #5b6b79;
            max-width: 280px;
            margin: -8px auto 16px;
          }

          /* Plain <input> equivalent of .auth-input (which relies on
             IonInput's shadow-DOM CSS custom properties and can't
             style a raw <input> on its own). */
          .auth-input-row {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.75);
            border: 1px solid rgba(215, 221, 227, 0.8);
            border-radius: 8px;
            padding: 0 10px;
          }
          .auth-input-row input {
            flex: 1;
            min-width: 0;
            border: none;
            outline: none;
            background: transparent;
            font-family: inherit;
            font-size: 14px;
            color: #1c2b39;
            padding: 9px 2px;
          }
          .auth-input-row input::placeholder {
            color: #8a96a3;
            opacity: 1;
          }
          .auth-eye-btn {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            background: none;
            border: none;
            color: #8a96a3;
            font-size: 17px;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
          }
          .auth-eye-btn:hover {
            color: #5b6b79;
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
                    <form className="auth-card" onSubmit={handleSubmit}>
                        <div className="auth-card-header">
                            
                            <h2 className="auth-title" style={{ margin: 0 }}>Change Password</h2>
                        </div>

                        <div className="auth-icon-badge">
                            <IonIcon icon={shieldCheckmarkOutline} />
                        </div>
                        <div className="auth-caption">
                            Use a password that's at least 6 characters and not used anywhere else.
                        </div>

                        <div className="auth-field">
                            <label className="auth-label" htmlFor="cp-current">Current Password</label>
                            <div className="auth-input-row">
                                <input
                                    id="cp-current"
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    aria-label="Toggle current password visibility"
                                >
                                    <IonIcon icon={showCurrent ? eyeOffOutline : eyeOutline} />
                                </button>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label className="auth-label" htmlFor="cp-new">New Password</label>
                            <div className="auth-input-row">
                                <input
                                    id="cp-new"
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowNew(!showNew)}
                                    aria-label="Toggle new password visibility"
                                >
                                    <IonIcon icon={showNew ? eyeOffOutline : eyeOutline} />
                                </button>
                            </div>
                        </div>

                        <div className="auth-field">
                            <label className="auth-label" htmlFor="cp-confirm">Confirm New Password</label>
                            <div className="auth-input-row">
                                <input
                                    id="cp-confirm"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label="Toggle confirm password visibility"
                                >
                                    <IonIcon icon={showConfirm ? eyeOffOutline : eyeOutline} />
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="auth-btn-native" disabled={saving}>
                            {saving ? 'Updating...' : 'Update Password'}
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

export default ChangePasswordPage;