import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import './InfoPage.css';

const Terms: React.FC = () => {
  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content">
        <section className="info-hero">
          <div className="info-hero-overlay" />
          <h1 className="info-hero-title">Terms & Conditions</h1>
        </section>

        <section className="info-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            101Acres website use karte hi aap in terms & conditions ko accept karte hain.
            Agar aap in terms se agree nahi karte, to kripya platform use na karein.
          </p>

          <h2>2. Property Listings</h2>
          <p>
            Hum apni best koshish karte hain ki listings accurate aur up-to-date rahe,
            lekin pricing, availability ya details me kabhi-kabhi discrepancy ho sakti hai.
            Final confirmation ke liye seller/agent se directly contact karna recommended hai.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>
            Users ko platform par sahi aur genuine information provide karni hogi. Koi bhi
            fraudulent activity ya fake listing post karna strictly prohibited hai.
          </p>

          <h2>4. Limitation of Liability</h2>
          <p>
            101Acres kisi bhi transaction, deal ya agreement ke liye directly responsible
            nahi hai jo buyers, sellers ya agents ke beech ho. Platform sirf ek connecting
            medium hai.
          </p>

          <h2>5. Changes to Terms</h2>
          <p>
            Hum in terms ko kisi bhi waqt update karne ka right rakhte hain. Updated terms
            website par publish hone ke baad immediately effective ho jayenge.
          </p>
        </section>

      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default Terms;