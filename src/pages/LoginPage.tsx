import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonText,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import './AuthLayout.css';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { useHistory } from 'react-router-dom';
import { apiPost } from '../api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // fcmToken ab app-level PushNotificationService se aayega
      const tokenToSend = localStorage.getItem('fcmToken') || undefined;

      const data = await apiPost('/mobilelogin', {
        email,
        password,
        fcmToken: tokenToSend,
        fcmPlatform: Capacitor.getPlatform(), // 'android' | 'ios' | 'web'
      });
      console.log('Login Response:', data);

      const user = data.user ?? data.data?.user ?? data.data ?? null;
      const userId = user?.id ?? data.userId ?? data.data?.userId ?? data.id;

      if (!userId) {
        alert('Login succeeded but user ID missing — contact support');
        return;
      }

      localStorage.setItem('user', JSON.stringify(user ?? { id: userId, email }));
      if (data.token) localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(userId));

      history.replace('/dashboard');
    } catch (error: any) {
      console.error('Login Error:', error);
      const message = error?.error || error?.message || '';
      alert(message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
        ? 'Unable to connect to 101Acres. Check your internet connection and try again.'
        : message || 'Login failed. Please check your details and try again.');
    }
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent fullscreen>
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
      <BottomNav active={null} />
    </IonPage>
  );
};

export default LoginPage;