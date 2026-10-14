import React from 'react';
import { Route, useHistory } from 'react-router-dom';
import { IonApp, IonPage, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useEffect, useState } from 'react';

import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Area from './pages/Area';
import PremiumProperty from './pages/PremiumProperty';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import SplashScreen from './pages/Splashscreen';
import AreaProperties from './pages/AreaProperties';
import PropertyDetail from './pages/Propertydetail';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';
import PushNotificationService from './pages/PushNotificationService';
import AllProperties from './pages/AllProperties';
import ChangePasswordPage from './components/Changepasswordpage';
import ProfilePage from './components/Profilepage';
import Listings from './pages/Listings';
import AddPropertyForm from './components/Addpropertyform';

setupIonicReact();

const AddPropertyRoute: React.FC = () => {
  const history = useHistory();
  const userId = localStorage.getItem('userId') || undefined;

  return (
    <IonPage>
      <AddPropertyForm
        userId={userId}
        onExit={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace(userId ? '/dashboard' : '/');
          }
        }}
        onSuccess={() => history.replace(userId ? '/dashboard' : '/')}
      />
      
    </IonPage>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <IonApp>
        <SplashScreen />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <PushNotificationService />

      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/" component={Home} />
          <Route exact path="/login" component={LoginPage} />
          <Route exact path="/register" component={RegisterPage} />
          <Route exact path="/area" component={Listings} />
          <Route exact path="/add-property" component={AddPropertyRoute} />
          <Route exact path="/properties" component={AllProperties} />
          <Route exact path="/premium-property" component={PremiumProperty} />
          <Route exact path="/property/:id" component={PropertyDetail} />
          <Route exact path="/about-us" component={AboutUs} />
          <Route exact path="/contact" component={Contact} />
          <Route exact path="/dashboard" component={Dashboard} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/change-password" component={ChangePasswordPage} />
          <Route exact path="/terms" component={Terms} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;