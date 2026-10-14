import React from 'react';
import { IonIcon } from '@ionic/react';
import { Link } from 'react-router-dom';
import {
  logoFacebook,
  logoTwitter,
  logoInstagram,
  logoLinkedin,
} from 'ionicons/icons';

const Footer: React.FC = () => {
  return (
    <>
      <footer className="footer">
        <div className="footer-top">
          <span className="footer-text">
            ©2026 101Acres. Design &amp; Develop with <span className="footer-heart">❤️</span> by Aarna Tech Xperts.
          </span>
          <div className="footer-socials">
            <a href="#" aria-label="Facebook"><IonIcon icon={logoFacebook} /></a>
            <a href="#" aria-label="Twitter"><IonIcon icon={logoTwitter} /></a>
            <a href="#" aria-label="Instagram"><IonIcon icon={logoInstagram} /></a>
            <a href="#" aria-label="LinkedIn"><IonIcon icon={logoLinkedin} /></a>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-links">
          <Link to="/about-us">About Us</Link>
          <span className="footer-dot">•</span>
          <Link to="/contact">Contact</Link>
          <span className="footer-dot">•</span>
          <Link to="/terms">Terms &amp; Conditions</Link>
        </div>
      </footer>

      <style>{`
        .footer {
          background-color: #0f1b2d;
          padding: 20px 16px 14px;
          color: #cbd5e1;
        }

        .footer-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }

        .footer-text {
          font-size: 12.5px;
          line-height: 1.5;
          color: #94a3b8;
          max-width: 320px;
        }

        .footer-heart {
          font-size: 12px;
        }

        .footer-socials {
          display: flex;
          gap: 14px;
        }

        .footer-socials a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          font-size: 14px;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .footer-socials a:hover {
          background-color: #1a73e8;
          transform: translateY(-2px);
        }

        .footer-divider {
          height: 1px;
          background-color: rgba(255, 255, 255, 0.08);
          margin: 14px 0 10px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .footer-links a {
          color: #cbd5e1;
          font-size: 12.5px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: #1a73e8;
        }

        .footer-dot {
          color: #475569;
          font-size: 11px;
        }
      `}</style>
    </>
  );
};

export default Footer;