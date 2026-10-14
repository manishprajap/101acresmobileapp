import React, { useState, useEffect, useRef } from 'react';
import { IonHeader, IonToolbar, IonIcon } from '@ionic/react';
import {
  personCircleOutline,
  logOutOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { apiGet } from '../api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const Navbar: React.FC = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // account drawer (username click)
  const [user, setUser] = useState<User | null>(null);

  const history = useHistory();
  const location = useLocation();

  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async (): Promise<void> => {
    try {
      await apiGet('/mobilelogin');
    } catch (err: unknown) {
      console.error('Logout error occurred:', err);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setUser(null);
    setIsUserMenuOpen(false);
    history.push('/'); // Redirects safely to the Home page upon logging out
  };

  // Account card menu items
  const accountMenuItems: { label: string; icon: string; path: string; colorClass: string }[] = [
    { label: 'Change Password', icon: lockClosedOutline, path: '/change-password', colorClass: 'icon-privacy' },
    { label: 'Profile', icon: personCircleOutline, path: '/profile', colorClass: 'icon-profile' },
  ];

  // Sync user from localStorage on route change
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        setUser(JSON.parse(stored) as User);
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // Close drawers when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent): void => {
      const target = e.target as Node;

      if (
        !userMenuRef.current?.contains(target) &&
        !(target as Element).closest?.('.profile-btn')
      ) {
        setIsUserMenuOpen(false);
      }

    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const handleNav = (path: string): void => {
    history.push(path);
    setIsUserMenuOpen(false);
  };


  return (
    <>
      <style>{`
        .navbar-wrapper {
          position: relative;
          z-index: 1000;
        }
        .navbar-wrapper ion-header,
        .navbar-wrapper ion-toolbar {
          overflow: visible !important;
          contain: none !important;
        }
        .navbar-wrapper .navbar-inner {
          position: relative;
          overflow: visible !important;
        }

        /* Post Property FREE button */
        .post-property-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 16px;
          background: #ffffff;
          border: 1px solid #e3e6ee;
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
          font-size: 14px;
          font-weight: 700;
          color: #0a72d6;
          white-space: nowrap;
          cursor: pointer;
        }
        .post-property-btn:active {
          background: #f5f9ff;
        }
        .post-free {
          background: #16a34a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 3px 7px;
          border-radius: 6px;
        }

        /* Profile trigger button */
        .nav-user {
          position: relative;
        }
        .profile-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          color: inherit;
          cursor: pointer;
        }
        .profile-btn ion-icon {
          font-size: 26px;
        }

        /* Account drawer */
        .side-drawer {
          position: absolute;
          top: 56px;
          height: auto;
          max-height: calc(100vh - 56px);
          width: 240px;
          max-width: 80vw;
          background: #ffffff;
          border-radius: 0 0 12px 12px;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, opacity 0.2s ease;
          overflow-y: auto;
        }

        /* Account drawer: RIGHT */
        .side-drawer-right {
          right: 0;
          box-shadow: -4px 6px 20px rgba(0,0,0,0.12);
          transform: translateY(-8px);
          opacity: 0;
          pointer-events: none;
        }
        .side-drawer-right.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        /* Account drawer content */
        .account-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #2b2624, #1f1b19);
        }
        .account-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f5921b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          flex-shrink: 0;
        }
        .account-name {
          color: #ffffff;
          font-weight: 700;
          font-size: 13.5px;
          line-height: 1.25;
        }
        .account-subtitle {
          color: #9ca3af;
          font-size: 11px;
          line-height: 1.25;
        }
        .account-body {
          display: flex;
          flex-direction: column;
          padding: 2px 0;
        }
        .account-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
        }
        .account-item:last-child {
          border-bottom: none;
        }
        .account-item:hover {
          background: #f9fafb;
        }
        .account-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }
        .account-icon.icon-privacy {
          background: #ede9fe;
          color: #7c3aed;
        }
        .account-icon.icon-profile {
          background: #ffe9d9;
          color: #f5921b;
        }
        .account-icon.icon-logout {
          background: #fee2e2;
          color: #ef4444;
        }
        .account-item.logout-item {
          color: #ef4444;
          font-weight: 600;
        }
        .account-item.logout-item:hover {
          background: #fef2f2;
        }

        @media (max-width: 480px) {
          .post-property-btn {
            height: 34px;
            padding: 0 12px;
            font-size: 12px;
            gap: 6px;
          }
          .post-free {
            font-size: 9px;
            padding: 2px 6px;
          }
          /* small screens: show only the profile icon, hide the name */
          .profile-btn span {
            display: none;
          }
        }
      `}</style>

      <div className="navbar-wrapper">
        <IonHeader className="navbar">
          <IonToolbar className="navbar">
            <div className="navbar-inner">

              {/* Logo */}
              <div className="brand" onClick={() => handleNav('/')}>
                <img
                  src="/logo1.webp"
                  alt="logo"
                  style={{ width: 40, height: 40, marginRight: 8 }}
                />
                <span>101Acres</span>
              </div>

              {/* Right side actions */}
              <div className="nav-actions">
                <button
                  type="button"
                  className="post-property-btn"
                  onClick={() => handleNav(user ? '/add-property' : '/login')}
                >
                  Post Property <span className="post-free">FREE</span>
                </button>

                {user && (
                  <div className="nav-user">
                    <button
                      type="button"
                      className="profile-btn"
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                      <IonIcon icon={personCircleOutline} />
                      <span>{user.name}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </IonToolbar>
        </IonHeader>

        {/* Account Drawer (RIGHT) */}
        {user && (
          <div className={`side-drawer side-drawer-right${isUserMenuOpen ? ' open' : ''}`} ref={userMenuRef}>
            <div className="account-card-header">
              <div className="account-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="account-name">{user.name}</div>
                <div className="account-subtitle">My Account</div>
              </div>
            </div>

            <div className="account-body">
              {accountMenuItems.map((item) => (
                <div
                  key={item.label}
                  className="account-item"
                  onClick={() => handleNav(item.path)}
                >
                  <span className={`account-icon ${item.colorClass}`}>
                    <IonIcon icon={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
              <div className="account-item logout-item" onClick={handleLogout}>
                <span className="account-icon icon-logout">
                  <IonIcon icon={logOutOutline} />
                </span>
                <span>Log Out</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;