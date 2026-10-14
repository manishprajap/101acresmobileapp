import React from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { homeOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import './Splashscreen.css'
/**
 * 101Acres Splash / Loader Screen
 * --------------------------------
 * Usage:
 *   import SplashScreen from './SplashScreen';
 *   <SplashScreen />
 *
 * Typical pattern: show this for ~1.5-2.5s on app boot, then route to Home.
 *
 *   const [showSplash, setShowSplash] = useState(true);
 *   useEffect(() => {
 *     const timer = setTimeout(() => setShowSplash(false), 2000);
 *     return () => clearTimeout(timer);
 *   }, []);
 *   if (showSplash) return <SplashScreen />;
 */
const SplashScreen = () => {
    return (
        <IonPage>
            <IonContent fullscreen scrollY={false} className="splash-content">
                <div className="splash-bg">
                    <div className="splash-blob splash-blob--top" />
                    <div className="splash-blob splash-blob--bottom" />
                </div>

                <div className="splash-center">
                    <div className="splash-logo-mark">
                        <img
                            src="/logo1.webp"
                            alt="101Acres Logo"
                            style={{
                                width: "100px",
                                height: "100px",
                                objectFit: "contain",
                                // marginRight: "8px",
                            }}
                        />          
                        </div>

                    <div className="splash-text-block">
                        <h1 className="splash-title">
                            101<span className="splash-title-accent">Acres</span>
                        </h1>
                        <p className="splash-subtitle">Find your perfect property</p>
                    </div>

                    <div className="splash-dots">
                        <span className="splash-dot" />
                        <span className="splash-dot" />
                        <span className="splash-dot" />
                    </div>
                </div>

                <div className="splash-footer">
                    <p>
                        Design &amp; Develop with <span className="splash-heart">&#9825;</span> by Aarna Tech Xperts
                    </p>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default SplashScreen;