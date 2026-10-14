import React from 'react';
import { IonIcon } from '@ionic/react';
import { homeOutline, briefcaseOutline, keyOutline } from 'ionicons/icons';

const cards = [
  {
    icon: homeOutline,
    title: 'Apartments',
    copy: 'Welcome to 101acres.com, your one-stop destination for premium apartments! Whether you\u2019re seeking your forever home or a smart investment, we\u2019ve got you covered with an extensive range of apartments for sale and rent. Unlock the door to your dreams with our curated listings and expert assistance.',
  },
  {
    icon: briefcaseOutline,
    title: 'houses',
    copy: 'Explore endless possibilities at 101acres.com \u2013 Your gateway to the perfect house! Discover a diverse range of houses for sale and rent, tailored to your unique lifestyle and preferences. Find your ideal home sweet home or unlock lucrative opportunities for rental income with our expertly curated listings',
  },
  {
    icon: keyOutline,
    title: 'Offices',
    copy: 'Discover the perfect space for your business at 101acres.com! Unlock opportunities for growth with our extensive listings of offices for sale and rent. From prime locations to flexible options, find the workspace that fuels success. Take your business to new heights with our tailored real estate solutions',
  },
];

const HelpSection: React.FC = () => {
  return (
    <section className="section help-section">
      <h2 className="section-title">We're Here To Help You</h2>
      <p className="section-subtitle">What Are You Looking For?</p>

      <div className="help-grid">
        {cards.map((c) => (
          <div className="help-card" key={c.title}>
            <div className="help-icon">
              <IonIcon icon={c.icon} />
            </div>
            <h3>{c.title}</h3>
            <p>{c.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HelpSection;