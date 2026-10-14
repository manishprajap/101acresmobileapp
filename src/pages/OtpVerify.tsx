// src/.../OtpVerify.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import './OtpVerify.css';
import {
  IonPage,
  IonContent,
  IonButton,
  IonText
} from '@ionic/react';
import Navbar from '../components/Navbar';
import { apiGet, apiPost } from '../api';
interface OtpVerifyProps {
    phone: string | number;
    userId: number;
    roleId: number;
    onBack: () => void;
}

const OTP_LENGTH = 6;

const OtpVerify: React.FC<OtpVerifyProps> = ({ phone, userId, roleId, onBack }) => {
    const history = useHistory();
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [resendLoading, setResendLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (paste.length > 0) {
            const newOtp = Array(OTP_LENGTH).fill('');
            paste.split('').forEach((ch, i) => { newOtp[i] = ch; });
            setOtp(newOtp);
            inputRefs.current[Math.min(paste.length, OTP_LENGTH - 1)]?.focus();
        }
    };

   const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < OTP_LENGTH) {
        setError('Please enter the full 6-digit OTP');
        return;
    }

    setLoading(true);
    setError('');

    try {
        const data = await apiPost('/verify-otp', { userId, otp: otpValue });

        console.log('Verify Response:', data);

        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', String(data.user?.id ?? userId));

        console.log('Verify success, navigating to dashboard...');
        history.replace('/dashboard');

    } catch (err: any) {
        console.error('Verify OTP Error:', err);
        setError(err?.error || err?.message || 'OTP verification failed');
    } finally {
        setLoading(false);
    }
};

    const handleResend = async () => {
    setResendLoading(true);
    setError('');

    try {
        const response = await apiPost(
            '/resend-otp',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ userId }),
            }
        );

        console.log('Status:', response.status);

        const data = await response.json();

        console.log('Response:', data);

        if (response.ok) {
            setOtp(Array(OTP_LENGTH).fill(''));
            setResendTimer(30);
            inputRefs.current[0]?.focus();
        } else {
            setError(
                data.error ||
                data.message ||
                'Failed to resend OTP'
            );
        }
    } catch (err: any) {
        console.error('Resend OTP error:', err);
        setError(err.message || 'Something went wrong. Please try again.');
    } finally {
        setResendLoading(false);
    }
};

    const maskedPhone = String(phone).replace(/(\d{2})\d{6}(\d{2})/, '$1xxxxxx$2');

    return (
  <IonPage>
    <Navbar />
    <IonContent fullscreen scrollY={false}>
      <div className="auth-bg">
        <div className="auth-card">

          <h2 className="auth-title">Verify OTP</h2>

          <IonText className="auth-footer">
            OTP sent to <strong>+91 {maskedPhone}</strong>
          </IonText>

          {/* OTP BOXES */}
          <div className="otp-boxes" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`otp-input ${digit ? 'otp-input--filled' : ''} ${error ? 'otp-input--error' : ''}`}
              />
            ))}
          </div>

          {error && <p className="otp-error">{error}</p>}

          {/* VERIFY BUTTON */}
          <IonButton
            expand="block"
            className="auth-btn"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify & Login'}
          </IonButton>

          {/* RESEND */}
          <div className="otp-resend">
            {resendTimer > 0 ? (
              <p>
                Resend OTP in <span className="otp-timer">{resendTimer}s</span>
              </p>
            ) : (
              <button
                className="otp-resend-btn"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending…' : 'Resend OTP'}
              </button>
            )}
          </div>

        </div>
      </div>
    </IonContent>
  </IonPage>
);
};

export default OtpVerify;