// src/components/EnquiryModal.tsx  (mobile / Ionic app)
// "Contact Owner" and "View Number" popup. Same flow as the web page:
// name + mobile (+ optional email / message) -> POST /api/properties/[id]/enquiry
import React, { useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { closeOutline, checkmarkCircle } from 'ionicons/icons';
import './EnquiryModal.css';

const API_BASE = 'https://101acres.com';

export type LeadType = 'contact_owner' | 'view_number' | 'enquiry';

interface Props {
  open: boolean;
  type: 'contact_owner' | 'view_number';
  propertyId: string | number;
  propertyTitle: string;
  ownership: string; // "Owner" / "Broker" / "Builder"
  alreadyRevealed?: string; // phone number if already revealed once
  onClose: () => void;
  onRevealed: (phone: string) => void;
}

const normalizePhone = (value: string) => {
  let d = value.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};

const validate = (name: string, mobile: string, email: string) => {
  if (name.trim().length < 2) {
    return 'Please enter your name.';
  }

  if (!/^[6-9]\d{9}$/.test(normalizePhone(mobile))) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  if (!email.trim()) {
    return 'Please enter your email address.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Please enter a valid email address.';
  }

  return '';
};
export const sendLead = async (
  propertyId: string | number,
  type: LeadType,
  form: { name: string; mobile: string; email: string; message: string; website: string },
): Promise<{ contactNumber: string }> => {
  const res = await fetch(`${API_BASE}/api/properties/${encodeURIComponent(String(propertyId))}/enquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      type,
      name: form.name.trim(),
      mobile: form.mobile,
      email: form.email.trim(),
      message: form.message.trim() || 'I am interested in this property. Please contact me.',
      website: form.website,
      // window.location in the app is capacitor://localhost, which the server rejects,
      // so always send the public web URL of this property.
      pageUrl: `${API_BASE}/property-detail/${encodeURIComponent(String(propertyId))}`,
    }),
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok || data?.success === false) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Could not send your request. Please try again.');
  }
  return { contactNumber: data?.contactNumber ? String(data.contactNumber) : '' };
};

const EnquiryModal: React.FC<Props> = ({
  open, type, propertyId, propertyTitle, ownership, alreadyRevealed, onClose, onRevealed,
}) => {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '', website: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState('');

  if (!open) return null;

  const who = ownership || 'Owner';
  const whoLower = who.toLowerCase();
  const shownPhone = phone || alreadyRevealed || '';
  const showResult = done || (type === 'view_number' && !!alreadyRevealed);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const problem = validate(form.name, form.mobile, form.email);
    if (problem) { setError(problem); return; }
    try {
      setSending(true);
      setError('');
      const r = await sendLead(propertyId, type, form);
      if (type === 'view_number' && r.contactNumber) {
        setPhone(r.contactNumber);
        onRevealed(r.contactNumber);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="enq-overlay" onClick={onClose}>
      <div className="enq-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="enq-close" onClick={onClose} aria-label="Close">
          <IonIcon icon={closeOutline} />
        </button>

        {showResult ? (
          <div className="enq-done">
            <IonIcon icon={checkmarkCircle} className="enq-done-icon" />
            <h3>{type === 'view_number' ? `${who} phone number` : 'Request sent'}</h3>
            {type === 'view_number' && shownPhone ? (
              <>
                <a className="enq-phone" href={`tel:${shownPhone}`}>{shownPhone}</a>
                <p>The {whoLower} has also been notified by email.</p>
              </>
            ) : (
              <p>The {whoLower} has been notified by email and will contact you soon.</p>
            )}
            <button type="button" className="enq-submit" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h3>{type === 'view_number' ? 'View phone number' : `Contact ${who}`}</h3>
            <small className="enq-sub">{propertyTitle}</small>
            <p className="enq-help">
              {type === 'view_number'
                ? `Share your details to see the ${whoLower}'s number. The ${whoLower} will be notified by email.`
                : `Share your details. The ${whoLower} will receive your request by email and contact you.`}
            </p>

            <input className="enq-input" type="text" placeholder="Your Name" maxLength={80}
              value={form.name} onChange={(e) => set('name', e.target.value)} />
            <input className="enq-input" type="tel" inputMode="numeric" placeholder="Your Mobile Number" maxLength={15}
              value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            <input
              className="enq-input"
              type="email"
              placeholder="Your Email *"
              maxLength={120}
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
            {type === 'contact_owner' && (
              <textarea className="enq-input enq-textarea" rows={3} maxLength={1000}
                placeholder="I am interested in this property..."
                value={form.message} onChange={(e) => set('message', e.target.value)} />
            )}

            {/* honeypot */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="enq-hp" value={form.website} onChange={(e) => set('website', e.target.value)} />

            {error && <p className="enq-error" role="alert">{error}</p>}

            <button type="submit" className="enq-submit" disabled={sending}>
              {sending ? <IonSpinner name="dots" /> : type === 'view_number' ? 'View Phone Number' : `Contact ${who}`}
            </button>
            <p className="enq-terms">By continuing you agree to the Terms &amp; Privacy Policy.</p>
          </form>
        )}
      </div>
    </div>
  );
};

export default EnquiryModal;