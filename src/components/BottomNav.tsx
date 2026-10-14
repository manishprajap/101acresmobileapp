import React, { useState } from 'react';
import { IonFooter, IonIcon, IonActionSheet } from '@ionic/react';
import { home, homeOutline, search, searchOutline, addCircleOutline, menu, menuOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import '../pages/Home.css';

export type TabKey = 'home' | 'search' | 'sell' | 'menu';

// Sab paths App.tsx ke real routes se match karte hain
const TABS: { key: TabKey; label: string; icon: string; activeIcon?: string; path?: string; free?: boolean }[] = [
  { key: 'home', label: 'Home', icon: homeOutline, activeIcon: home, path: '/' },
  { key: 'search', label: 'Search', icon: searchOutline, activeIcon: search, path: '/area' },
  { key: 'sell', label: 'Sell/Rent', icon: addCircleOutline, path: '/add-property', free: true },
  { key: 'menu', label: 'Menu', icon: menuOutline, activeIcon: menu }, // path nahi: sheet kholta hai
];

const BottomNav: React.FC<{ active?: TabKey | null }> = ({ active = 'home' }) => {
  const history = useHistory();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = () => {
    const u = localStorage.getItem('user');
    return !!u && u !== 'undefined' && u !== 'null';
  };

  const go = (path: string) => history.push(path);
  const goToTab = (path: string) => history.replace(path);

  const onTab = (t: (typeof TABS)[number]) => {
    if (t.key === 'menu') return setMenuOpen(true);
    if (t.key === 'sell' && !isLoggedIn()) return goToTab('/login'); // post karne ke liye login zaroori
    if (t.path) goToTab(t.path);
  };

  const menuButtons = [
    ...(isLoggedIn()
      ? [
          { text: 'Dashboard', handler: () => go('/dashboard') },
          { text: 'Profile', handler: () => go('/profile') },
          { text: 'Change Password', handler: () => go('/change-password') },
        ]
      : [
          { text: 'Login', handler: () => go('/login') },
          { text: 'Register', handler: () => go('/register') },
        ]),
    { text: 'Premium Property', handler: () => go('/properties') },
    { text: 'About Us', handler: () => go('/about-us') },
    { text: 'Contact', handler: () => go('/contact') },
    { text: 'Terms', handler: () => go('/terms') },
    { text: 'Cancel', role: 'cancel' },
  ];

  return (
    <>
      <IonFooter className="hm-footer">
        <nav className="hm-tabbar">
          {TABS.map((t) => {
            const on = active !== null && t.key === active;
            return (
              <button key={t.key} type="button" className={`hm-tab ${on ? 'hm-tab--on' : ''}`} onClick={() => onTab(t)}>
                <span className="hm-tab-icon">
                  <IonIcon icon={on && t.activeIcon ? t.activeIcon : t.icon} />
                  {t.free && <i className="hm-free">FREE</i>}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </IonFooter>

      <IonActionSheet
        isOpen={menuOpen}
        header="Menu"
        buttons={menuButtons}
        onDidDismiss={() => setMenuOpen(false)}
      />
    </>
  );
};

export default BottomNav;