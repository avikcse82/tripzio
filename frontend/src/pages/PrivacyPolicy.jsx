import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '32px' }}>
      <h2 style={{
        fontSize: '18px', fontWeight: '800', color: '#0f172a',
        marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>{title}</h2>
      <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');`}</style>
      <Navbar />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>

        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>

        <div style={{ background: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          <div style={{ marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '32px', fontWeight: '900', color: '#0f172a',
              margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Last updated: April 2026 · Effective immediately
            </p>
          </div>

          <div style={{ padding: '16px 20px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', marginBottom: '32px' }}>
            <p style={{ fontSize: '14px', color: '#0f766e', margin: 0, fontWeight: '500', lineHeight: 1.7 }}>
              Tripzio ("we", "our", "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. We keep it simple and honest.
            </p>
          </div>

          <Section title="1. What We Collect">
            <p style={{ marginBottom: '12px' }}><strong>Account information:</strong> Your name, email address, and password (encrypted) when you register.</p>
            <p style={{ marginBottom: '12px' }}><strong>Trip data:</strong> The itineraries you generate — destinations, dates, budget, preferences. This helps us improve our AI.</p>
            <p style={{ marginBottom: '12px' }}><strong>Usage data:</strong> Pages you visit, features you use, errors that occur. Used to fix bugs and improve the product.</p>
            <p><strong>We do NOT collect:</strong> Payment card details (handled by Razorpay), government IDs, or any sensitive personal information.</p>
          </Section>

          <Section title="2. How We Use Your Data">
            <p style={{ marginBottom: '8px' }}>• Generate personalized travel itineraries using AI</p>
            <p style={{ marginBottom: '8px' }}>• Save your trip history so you can access it anytime</p>
            <p style={{ marginBottom: '8px' }}>• Send trip-related notifications (only if you opt in)</p>
            <p style={{ marginBottom: '8px' }}>• Improve our AI models and product features</p>
            <p>• Send important service updates (not marketing spam)</p>
          </Section>

          <Section title="3. Third-Party Services">
            <p style={{ marginBottom: '12px' }}>We use trusted third-party services to run Tripzio:</p>
            <p style={{ marginBottom: '8px' }}>• <strong>OpenAI</strong> — Powers our AI itinerary generation. Your trip details are sent to OpenAI to generate plans. OpenAI's privacy policy applies.</p>
            <p style={{ marginBottom: '8px' }}>• <strong>Supabase</strong> — Our database provider. Data stored securely in their infrastructure.</p>
            <p style={{ marginBottom: '8px' }}>• <strong>Google Places API</strong> — Hotel and place data. "Powered by Google" where applicable.</p>
            <p>• <strong>OpenWeatherMap</strong> — Weather data for destinations.</p>
          </Section>

          <Section title="4. Data Security">
            <p style={{ marginBottom: '12px' }}>We take security seriously:</p>
            <p style={{ marginBottom: '8px' }}>• Passwords are encrypted using industry-standard bcrypt hashing</p>
            <p style={{ marginBottom: '8px' }}>• All data transmitted over HTTPS (SSL encrypted)</p>
            <p style={{ marginBottom: '8px' }}>• JWT tokens expire after 24 hours</p>
            <p>• We never store your raw password — ever</p>
          </Section>

          <Section title="5. Your Rights">
            <p style={{ marginBottom: '8px' }}>• <strong>Access:</strong> Request a copy of your data anytime</p>
            <p style={{ marginBottom: '8px' }}>• <strong>Delete:</strong> Request deletion of your account and all data</p>
            <p style={{ marginBottom: '8px' }}>• <strong>Correct:</strong> Update incorrect information in your profile</p>
            <p>• <strong>Opt out:</strong> Unsubscribe from any notifications at any time</p>
          </Section>

          <Section title="6. Cookies">
            <p>We use minimal cookies — only what's necessary to keep you logged in. We do not use tracking cookies or advertise to you.</p>
          </Section>

          <Section title="7. Children">
            <p>Tripzio is not intended for users under 18. We do not knowingly collect data from minors.</p>
          </Section>

          <Section title="8. Contact Us">
            <p>For any privacy concerns or data requests, contact us at:</p>
            <p style={{ marginTop: '10px' }}>
              <strong>Email:</strong> hello@tripzio.io<br />
              <strong>Website:</strong> tripzio.io
            </p>
          </Section>

          <div style={{ paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
              Tripzio is a product by Avik Chakraborty · Kolkata, India · hello@tripzio.io
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
