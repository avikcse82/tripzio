// frontend/src/pages/PrivacyPolicy.jsx
// Tripzio Legal — Privacy Policy
// Compliant with: IT Act 2000, PDPB India, GDPR principles

import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function PrivacyPolicy() {
  const navigate = useNavigate()
  const lastUpdated = 'May 2026'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '20px', padding: '5px 14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>Legal</span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Privacy Policy</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Last updated: {lastUpdated}</p>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
            <strong>Summary:</strong> Tripzio collects only what's necessary to provide our service. We never sell your data. You can delete your account and all data at any time. We use Supabase for secure data storage.
          </p>
        </div>

        {[
          {
            title: '1. Who We Are',
            content: `Tripzio ("we", "our", "us") is an AI-powered travel planning platform operated from India. Our platform is accessible at tripzio.io. For privacy-related queries, contact us at privacy@tripzio.io.`
          },
          {
            title: '2. What Data We Collect',
            content: null,
            subsections: [
              {
                subtitle: '2.1 Account Data',
                text: `When you register, we collect your name, email address, and password (encrypted). Travel agents additionally provide agency name, logo, brand color, and contact details.`
              },
              {
                subtitle: '2.2 Trip Planning Data',
                text: `We store the trip plans you generate including destination, budget, duration, trip type, and AI-generated itinerary content. This data is used to power your My Trips history.`
              },
              {
                subtitle: '2.3 Agent Client Data',
                text: `If you are a travel agent, you may store client names, phone numbers, travel preferences, and notes on our platform. You are responsible for obtaining your clients' consent to store their data on Tripzio.`
              },
              {
                subtitle: '2.4 Usage Data',
                text: `We may collect anonymous usage data such as pages visited, features used, and session duration to improve our service. This data is not linked to your identity.`
              },
              {
                subtitle: '2.5 Cookies',
                text: `We use essential cookies for authentication (JWT tokens stored in localStorage). We do not use advertising or tracking cookies.`
              },
            ]
          },
          {
            title: '3. How We Use Your Data',
            content: null,
            subsections: [
              { subtitle: 'Service Delivery', text: 'To generate AI itineraries, save your trips, and provide agent tools.' },
              { subtitle: 'Authentication', text: 'To verify your identity and maintain your session securely.' },
              { subtitle: 'Communication', text: 'To send trip confirmations and important service updates. We do not send marketing emails without consent.' },
              { subtitle: 'Service Improvement', text: 'Anonymous usage patterns to improve AI accuracy and platform features.' },
            ]
          },
          {
            title: '4. What We Never Do',
            content: `• We never sell your personal data to third parties
• We never share your data with advertisers  
• We never use your trip data for advertising profiling
• We never share agent client data with any third party
• Tripzio products are ad-free — we do not allow advertisers to influence our platform`
          },
          {
            title: '5. Third-Party Services',
            content: null,
            subsections: [
              { subtitle: 'Supabase', text: 'We use Supabase for database storage. Your data is stored securely with encryption at rest. Supabase is SOC 2 Type 2 compliant.' },
              { subtitle: 'Anthropic Claude API', text: 'Trip planning prompts are sent to Anthropic\'s API to generate itineraries. We do not send personally identifiable information in prompts. Anthropic\'s privacy policy applies to API usage.' },
              { subtitle: 'Affiliate Partners', text: 'When you click hotel booking links (Booking.com, Agoda, TripAdvisor), those platforms\' privacy policies apply. We may receive an affiliate commission at no extra cost to you.' },
              { subtitle: 'Railway & Vercel', text: 'Our backend (Railway) and frontend (Vercel) hosting providers may process request data. Both are industry-standard compliant platforms.' },
            ]
          },
          {
            title: '6. Data Retention',
            content: `• Account data: retained while your account is active
• Trip plans: retained until you delete them or close your account
• Agent client data: retained until the agent deletes it
• Upon account deletion: all personal data deleted within 30 days
• Anonymous usage data: may be retained for up to 2 years`
          },
          {
            title: '7. Your Rights',
            content: `Under the Indian IT Act 2000 and PDPB principles, you have the right to:
• Access all data we hold about you
• Correct inaccurate data
• Delete your account and all associated data
• Export your trip data
• Withdraw consent at any time

To exercise any of these rights, email privacy@tripzio.io. We will respond within 7 business days.`
          },
          {
            title: '8. Agent Responsibility',
            content: `If you are a travel agent using Tripzio to manage client data, you are the data controller for your clients' information. You must:
• Inform your clients that their data is stored on Tripzio
• Obtain appropriate consent
• Delete client data from Tripzio when no longer needed
• Not upload sensitive client data (financial, health, etc.) beyond what is needed for trip planning`
          },
          {
            title: '9. Security',
            content: `We implement industry-standard security measures including:
• Encrypted passwords (bcrypt)
• JWT token authentication
• HTTPS on all connections
• Supabase Row Level Security
• Regular security reviews

No system is 100% secure. In the event of a data breach affecting your personal data, we will notify you within 72 hours.`
          },
          {
            title: '10. Children\'s Privacy',
            content: `Tripzio is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has registered, contact us immediately.`
          },
          {
            title: '11. Changes to This Policy',
            content: `We may update this Privacy Policy occasionally. We will notify registered users by email of significant changes. Continued use of Tripzio after changes constitutes acceptance.`
          },
          {
            title: '12. Contact Us',
            content: `For privacy concerns:
Email: privacy@tripzio.io
Website: tripzio.io/privacy

For general support:
Email: support@tripzio.io`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>{section.title}</h2>
            {section.content && (
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{section.content}</p>
            )}
            {section.subsections && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {section.subsections.map((sub, j) => (
                  <div key={j} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0d9488', marginBottom: '4px' }}>{sub.subtitle}</div>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>{sub.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', background: '#0d9488', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
