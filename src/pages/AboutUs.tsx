import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './InfoPage.css';

const AboutUs: React.FC = () => {
  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content">
        <section className="info-hero">
          <div className="info-hero-overlay" />
          <h1 className="info-hero-title">About Us</h1>
        </section>

        <section className="info-section">
          <h2>Who We Are</h2>
          <p>
            101Acres ek trusted real estate platform hai jo buyers, sellers aur agents ko
            ek hi jagah par connect karta hai. Hamara goal hai property search ko simple,
            transparent aur fast banana — chahe aap apna pehla ghar khareed rahe hon ya
            investment ke liye plot dekh rahe hon.
          </p>

          <h2>Our Mission</h2>
          <p>
            Hum chahte hain ki har user ko verified listings, sahi pricing aur direct
            contact mile bina kisi extra hassle ke. Isi liye humne ek aasan, mobile-friendly
            platform banaya hai jahan properties area-wise, budget-wise aur type-wise
            browse ki ja sakti hain.
          </p>

          <h2>Why Choose Us</h2>
          <ul>
            <li>Verified property listings</li>
            <li>Direct connect with agents and owners</li>
            <li>Easy area-wise search across Delhi NCR & beyond</li>
            <li>Transparent pricing, no hidden charges</li>
          </ul>
        </section>

      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default AboutUs;