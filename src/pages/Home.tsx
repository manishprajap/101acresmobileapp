import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import Hero from '../components/Hero';
import Properties from '../components/Properties';
import Navbar from '../components/Navbar';
import LocationGate from '../components/LocationGate';
import {
  UserLocation,
  loadLocation,
  saveLocation,
  hasBeenPrompted,
  markPrompted,
} from '../utils/location';
import './Home.css';
import BottomNav from '../components/BottomNav';
import { getDeviceLocation, reverseGeocode } from '../utils/location';


const Home: React.FC = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => loadLocation());

  // Show the prompt only on first launch (no saved location and never prompted before)
  const [showGate, setShowGate] = useState<boolean>(() => !loadLocation() && !hasBeenPrompted());

  const handleSelect = (loc: UserLocation) => {
    saveLocation(loc);
    setUserLocation(loc);
    setShowGate(false);
  };

  const handleSkip = () => {
    markPrompted();
    setShowGate(false);
  };

  const handleUseCurrentLocation = async () => {
    const { lat, lng } = await getDeviceLocation();
    const place = await reverseGeocode(lat, lng);
    const currentLocation: UserLocation = {
      lat,
      lng,
      city: place.city || '',
      label: place.label || place.city || 'Current location',
    };
    saveLocation(currentLocation);
    setUserLocation(currentLocation);
  };

  return (
    <IonPage>
      <Navbar />
      <IonContent className="page-content">
        <Hero onUseCurrentLocation={handleUseCurrentLocation} />
        <Properties
          userLocation={userLocation}
          onChangeLocation={() => setShowGate(true)}
        />
        {/* <Footer /> */}
      </IonContent>

      <LocationGate
        isOpen={showGate}
        onSelect={handleSelect}
        onSkip={handleSkip}
      />
      <BottomNav />
    </IonPage>
  );
};

export default Home;