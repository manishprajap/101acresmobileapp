import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { callOutline } from 'ionicons/icons';

const ContactCTA: React.FC = () => {
  const [phone, setPhone] = useState('');

  return (
    <section className="section contact-cta">
      <div className="section-center">
        <h2 className="section-title">Have Question ? Get in touch!</h2>
        <p className="section-subtitle">
          A great plateform to buy, sell and rent your properties without any agent or
          commisions.
        </p>
      </div>

      <div className="contact-form-row">
        <input
          placeholder="Search your Keywords"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <IonButton className="btn-contact">
          <IonIcon icon={callOutline} style={{ marginRight: 8 }} />
          Contact us
        </IonButton>
      </div>
    </section>
  );
};

export default ContactCTA;