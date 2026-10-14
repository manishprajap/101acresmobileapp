import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  useIonToast,
} from '@ionic/react';
import { callOutline, mailOutline, locationOutline, sendOutline } from 'ionicons/icons';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './InfoPage.css';
import { apiPost } from '../api';

// 👉 Save the illustration image to: src/assets/contact-illustration.png
import contactIllustration from '/contact-illustration.png';

const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setphone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [present] = useIonToast();

  const showToast = (msg: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    present({
      message: msg,
      duration: 2500,
      position: 'top',
      color,
      cssClass: 'contact-toast',
    });
  };

  // Only digits allowed in mobile field, max 10 characters
  const handlePhoneChange = (value: string | null | undefined) => {
    const digitsOnly = (value || '').replace(/\D/g, '').slice(0, 10);
    setphone(digitsOnly);
  };

  // Block non-numeric key presses at the source (extra safety on top of the filter above)
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLIonInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !phone.trim() || !subject.trim() || !message.trim()) {
      showToast('Please fill all fields ⚠️', 'warning');
      return;
    }

    if (phone.trim().length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const data = await apiPost('/contact', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      if (data.success) {
        showToast('Message sent successfully ✅', 'success');

        setName("");
        setEmail("");
        setphone("");
        setSubject("");
        setMessage("");
      } else {
        showToast(data.message || 'Something went wrong', 'danger');
      }

    } catch (error) {
      console.error("API ERROR:", error);
      showToast('Server error, please try again ❌', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content">

        <section className="info-hero">
          <div className="info-hero-overlay" />
          <h1 className="info-hero-title">Contact Us</h1>
        </section>

        <section className="contact-section">

          <div className="contact-heading">
            <h2>Get in Touch</h2>
            <p>Have a question or need help? We'd love to hear from you.</p>
          </div>

          <div className="contact-section-grid">

            {/* Left side: Illustration + contact info */}
            <div className="contact-side">
              <img
                src={contactIllustration}
                alt="Contact us illustration"
                className="contact-illustration"
              />

              <div className="contact-info">
                <a
                  className="contact-info-item"
                  href="tel:+919217703975"
                  aria-label="Call +91 9217703975"
                >
                  <span className="contact-icon-badge">
                    <IonIcon icon={callOutline} />
                  </span>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Call us</span>
                    <span className="contact-info-value">+91 9217703975</span>
                  </div>
                </a>

                <a
                  className="contact-info-item"
                  href="mailto:admin@101acres.com"
                  aria-label="Email admin@101acres.com"
                >
                  <span className="contact-icon-badge">
                    <IonIcon icon={mailOutline} />
                  </span>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Email us</span>
                    <span className="contact-info-value">admin@101acres.com</span>
                  </div>
                </a>

                <a
                  className="contact-info-item"
                  href="https://www.google.com/maps/search/?api=1&query=Paschim+Vihar+Delhi"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open location in Google Maps"
                >
                  <span className="contact-icon-badge">
                    <IonIcon icon={locationOutline} />
                  </span>
                  <div className="contact-info-text">
                    <span className="contact-info-label">Visit us</span>
                    <span className="contact-info-value">Delhi, India</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Right side: Form */}
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label>Your Name</label>
                <IonInput
                  className="contact-input"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onIonChange={(e) => setName(e.detail.value || '')}
                  required
                />
              </div>

              <div className="form-field">
                <label>Your Email</label>
                <IonInput
                  className="contact-input"
                  type="email"
                  placeholder="e.g. rahul@email.com"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value || '')}
                  required
                />
              </div>

              <div className="form-field">
                <label>Mobile Number</label>
                <IonInput
                  className="contact-input"
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength={10}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onIonChange={(e) => handlePhoneChange(e.detail.value)}
                  onKeyDown={handlePhoneKeyDown}
                  required
                />
              </div>

              <div className="form-field">
                <label>Subject</label>
                <IonInput
                  className="contact-input"
                  placeholder="How can we help?"
                  value={subject}
                  onIonChange={(e) => setSubject(e.detail.value || '')}
                  required
                />
              </div>

              <div className="form-field">
                <label>Your Message</label>
                <IonTextarea
                  className="contact-input"
                  placeholder="Write your message here..."
                  rows={4}
                  value={message}
                  onIonChange={(e) => setMessage(e.detail.value || '')}
                  required
                />
              </div>

              <IonButton
                expand="block"
                type="submit"
                className="contact-btn"
                disabled={submitting}
              >
                <IonIcon icon={sendOutline} slot="start" />
                {submitting ? 'Sending...' : 'Send Message'}
              </IonButton>
            </form>

          </div>
        </section>

        <section className="contact-map">
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '56.25%'
            }}
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d28005.86074612841!2d77.09829205!3d28.667724399999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d04709a55ca61%3A0x733c78dcf34281ce!2sPaschim%20Vihar%2C%20Delhi!5e0!3m2!1sen!2sin!4v1783155884805!5m2!1sen!2sin"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
              loading="lazy"
              allowFullScreen
            />
          </div>
        </section>

      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default Contact;