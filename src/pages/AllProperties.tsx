import React from 'react';
import { useHistory } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import Navbar from '../components/Navbar';
import Properties from '../components/Properties';
import BottomNav from '../components/BottomNav';
import './Home.css';

const AllProperties: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      {/* 1. Navbar sabse upar */}
      <Navbar />

      <IonContent className="page-content">
        {/* 2. Back button + Heading same row mein */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px 4px',
          }}
        >
          <button
            onClick={() => history.goBack()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#1a73e8',
              color: '#fff',
              border: 'none',
              borderRadius: 24,
              height: 36,
              padding: '0 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            &#8592; Back
          </button>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#14202c',
              margin: 0,
            }}
          >
            All Properties
          </h2>
        </div>

        {/* 3. Property list — heading is component ke andar hide rahega */}
        <Properties  />
     
      </IonContent>
      <BottomNav active={null} />
    </IonPage>
  );
};

export default AllProperties;