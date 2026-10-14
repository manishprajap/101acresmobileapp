import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonText,
} from '@ionic/react';
import './AuthLayout.css';
import Navbar from '../components/Navbar';
import { useHistory } from 'react-router-dom';
import OtpVerify from './OtpVerify';
import { apiGet, apiPost } from '../api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpUserId, setOtpUserId] = useState(0);
  const history = useHistory();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiPost('/mobilelogin', { email, password });
      console.log('Login Response:', data);
      const userId = data.userId ?? data.id;
      if (!userId) {
        alert('Login succeeded but user ID missing — contact support');
        return;
      }
      setOtpPhone(data.phone || email);
      setOtpUserId(userId);
      setOtpStep(true);
    } catch (error: any) {
      console.error('Login Error:', error);
      alert(error?.error || error?.message || 'Login Failed');
    }
  };

  if (otpStep) {
    return (
      <OtpVerify
        phone={otpPhone}
        userId={otpUserId}
        roleId={3}
        onBack={() => {
          setOtpStep(false);
        }}
      />
    );
  }

  return (
    <IonPage>
      <Navbar />
      <IonContent fullscreen scrollY={false}>
        <div className="auth-bg">
          <form className="auth-card" onSubmit={handleLogin}>
            <h2 className="auth-title">Login</h2>

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
                onIonInput={(e) => setEmail(e.detail.value!)}
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
                onIonInput={(e) => setPassword(e.detail.value!)}
                required
              />
            </div>

            <IonButton expand="block" type="submit" className="auth-btn">
              Login
            </IonButton>

            <IonText className="auth-footer">
              Don't have an account?{' '}
              <a href="/register" className="auth-link">
                Sign Up
              </a>
            </IonText>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;