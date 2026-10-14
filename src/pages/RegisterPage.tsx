import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonToast,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import './AuthLayout.css';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { useHistory } from 'react-router-dom';
import { apiPostFormData } from '../api';

const RegisterPage: React.FC = () => {
  const [registerAs, setRegisterAs] = useState<'user' | 'agent'>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const history = useHistory();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tokenToSend = localStorage.getItem('fcmToken') || '';

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('mobile', mobile);
      formData.append('password', password);
      formData.append('role', registerAs);
      if (tokenToSend) {
        formData.append('fcmToken', tokenToSend);
      }
      formData.append('fcmPlatform', Capacitor.getPlatform());

      const data = await apiPostFormData('/mobileregister', formData);

      console.log('Success:', data);
      setShowSuccessToast(true);

      setName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setRegisterAs('user');

      setTimeout(() => {
        history.push('/login');
      }, 1500);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.error || error.message || 'Registration Failed');
    }
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent fullscreen>
        <div className="auth-bg">
          <form className="auth-card" onSubmit={handleRegister}>
            <h2 className="auth-title">Create an Account</h2>

            <div className="auth-field">
              <label className="auth-label">Register As:</label>
              <IonRadioGroup
                value={registerAs}
                onIonChange={(e) => setRegisterAs(e.detail.value)}
                className="auth-radio-group"
              >
                <IonItem lines="none" className="auth-radio-item">
                  <IonRadio slot="start" value="user" />
                  <IonLabel>User</IonLabel>
                </IonItem>
                <IonItem lines="none" className="auth-radio-item">
                  <IonRadio slot="start" value="agent" />
                  <IonLabel>Agent</IonLabel>
                </IonItem>
              </IonRadioGroup>
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
                onIonInput={(e) => setName(e.detail.value!)}
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
                onIonInput={(e) => setEmail(e.detail.value!)}
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
                onIonInput={(e) => setMobile(e.detail.value!)}
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
              Register
            </IonButton>

            <IonText className="auth-footer">
              Already have an account?{' '}
              <a href="/login" className="auth-link">
                Sign In
              </a>
            </IonText>
          </form>
        </div>

        <IonToast
          isOpen={showSuccessToast}
          message="Registration successful!"
          duration={1500}
          color="success"
          position="top"
          onDidDismiss={() => setShowSuccessToast(false)}
        />
      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default RegisterPage;