import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import {
  MapPin, Zap, Users, Star, ArrowRight,
  Globe, Shield, Clock, TrendingUp
} from 'lucide-react'

const stats = [
  { value: '500+', label: 'Destinations' },
  { value: '10K+', label: 'Trips Planned' },
  { value: '98%', label: 'Happy Travelers' },
  { value: '2 min', label: 'Avg Plan Time' },
]

const features = [
  {
    icon: <Zap size={24} color="#0ea5e9" />,
    title: 'AI-Powered Planning',
    desc: 'Get a complete day-by-day itinerary in seconds. Our AI understands Indian travel deeply — budgets, trains, permits, seasons.',
    bg: '#eff6ff'
  },
  {
    icon: <MapPin size={24} color="#14b8a6" />,
    title: 'India-First Intelligence',
    desc: 'From Leh to Kanyakumari, from ₹5,000 weekends to luxury holidays. Real Indian pricing, real Indian routes.',
    bg: '#f0fdfa'
  },
  {
    icon: <Clock size={24} color="#8b5cf6" />,
    title: 'Real-Time Adaptive',
    desc: 'Weather changed? Train delayed? Tripzio adapts your plan instantly so your trip never misses a beat.',
    bg: '#f5f3ff'
  },
  {
    icon: <Users size={24} color="#f59e0b" />,
    title: 'For Travel Agents Too',
    desc: 'Generate 3 itinerary options for your client in 2 minutes. WhatsApp-ready export. Professional invoices.',
    bg: '#fffbeb'
  },
  {
    icon: <Shield size={24} color="#22c55e" />,
    title: 'Trusted & Accurate',
    desc: 'Every recommendation is grounded in real data — not hallucinations. Permit rules, entry fees, seasonal closures included.',
    bg: '#f0fdf4'
  },
  {
    icon: <TrendingUp size={24} color="#ef4444" />,
    title: 'Cost Breakdown',
    desc: 'Transparent estimates for transport, stays, food, and activities. No surprises. Plan confidently within your budget.',
    bg: '#fef2f2'
  },
]

const testimonials = [
  {
    name: 'Priya Sharma',
    city: 'Mumbai',
    text: 'Planned our Ladakh trip in literally 3 minutes. The AI knew about all the permits and suggested the perfect route. Absolutely brilliant.',
    rating: 5,
    avatar: 'PS'
  },
  {
    name: 'Rajesh Nair',
    city: 'Kochi',
    text: 'As a travel agent, Tripzio has transformed my business. I send clients 3 options before they finish their morning chai.',
    rating: 5,
    avatar: 'RN'
  },
  {
    name: 'Ananya Bose',
    city: 'Kolkata',
    text: 'Finally a travel app that understands ₹15,000 budgets and suggests real options — not just 5-star hotels.',
    rating: 5,
    avatar: 'AB'
  },
]

const LandingPage = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f3460 100%)',
        padding: '100px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', left: '-80px',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(14,165,233,0.15)',
            border: '1px solid rgba(14,165,233,0.3)',
            borderRadius: '20px', padding: '6px 16px',
            marginBottom: '24px'
          }}>
            <Globe size={14} color="#0ea5e9" />
            <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '500' }}>
              India's smartest travel platform
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: '800',
            color: 'white',
            lineHeight: '1.15',
            marginBottom: '24px',
            letterSpacing: '-1px'
          }}>
            Plan less.
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Travel more.
            </span>
          </h1>

          <p style={{
            fontSize: '18px', color: '#94a3b8',
            lineHeight: '1.7', marginBottom: '40px',
            maxWidth: '600px', margin: '0 auto 40px'
          }}>
            Tell Tripzio your budget, days, and vibe.
            Get a complete personalized itinerary in seconds —
            built specifically for Indian travelers and travel agents.
          </p>

          <div style={{
            display: 'flex', gap: '16px',
            justifyContent: 'center', flexWrap: 'wrap'
          }}>
            <Link to="/login" style={{
              background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
              color: 'white', textDecoration: 'none',
              padding: '16px 36px', borderRadius: '12px',
              fontSize: '16px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 8px 32px rgba(14,165,233,0.4)'
            }}>
              Start Planning Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/agent/login" style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'white', textDecoration: 'none',
              padding: '16px 36px', borderRadius: '12px',
              fontSize: '16px', fontWeight: '600',
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}>
              I am a Travel Agent
              <ArrowRight size={18} />
            </Link>
          </div>

          <p style={{
            marginTop: '20px', fontSize: '13px',
            color: '#475569'
          }}>
            Free to start · No credit card required
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '40px 24px'
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '32px', textAlign: 'center'
        }}>
          {stats.map((stat, i) => (
            <div key={i}>
              <div style={{
                fontSize: '36px', fontWeight: '800',
                background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '14px', color: '#64748b',
                fontWeight: '500', marginTop: '4px'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: '36px', fontWeight: '800',
              color: '#0f172a', marginBottom: '16px'
            }}>
              Everything you need to travel smarter
            </h2>
            <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
              Built for Indian travelers, powered by AI that understands India deeply.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '28px',
                transition: 'all 0.2s'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  width: '52px', height: '52px',
                  background: f.bg, borderRadius: '12px',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '18px'
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontSize: '17px', fontWeight: '700',
                  color: '#0f172a', marginBottom: '10px'
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontSize: '14px', color: '#64748b',
                  lineHeight: '1.7'
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        padding: '80px 24px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: '36px', fontWeight: '800',
              color: '#0f172a', marginBottom: '16px'
            }}>
              Travelers love Tripzio
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '28px'
              }}>
                <div style={{
                  display: 'flex', gap: '4px', marginBottom: '16px'
                }}>
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={16} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{
                  fontSize: '15px', color: '#334155',
                  lineHeight: '1.7', marginBottom: '20px',
                  fontStyle: 'italic'
                }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px',
                    background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700', color: 'white'
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px', fontWeight: '600', color: '#0f172a'
                    }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {t.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        padding: '80px 24px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px', fontWeight: '800',
            color: 'white', marginBottom: '16px'
          }}>
            Ready to travel smarter?
          </h2>
          <p style={{
            fontSize: '17px', color: '#94a3b8',
            marginBottom: '36px', lineHeight: '1.7'
          }}>
            Join thousands of Indian travelers who plan better, spend smarter, and experience more.
          </p>
          <div style={{
            display: 'flex', gap: '16px',
            justifyContent: 'center', flexWrap: 'wrap'
          }}>
            <Link to="/login" style={{
              background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
              color: 'white', textDecoration: 'none',
              padding: '16px 36px', borderRadius: '12px',
              fontSize: '16px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 8px 32px rgba(14,165,233,0.4)'
            }}>
              Start for Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/agent/login" style={{
              background: 'transparent',
              color: 'white', textDecoration: 'none',
              padding: '16px 36px', borderRadius: '12px',
              fontSize: '16px', fontWeight: '600',
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Agent Sign Up
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#0f172a',
        borderTop: '1px solid #1e293b',
        padding: '32px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '24px', height: '24px',
            background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MapPin size={12} color="white" />
          </div>
          <span style={{
            fontSize: '16px', fontWeight: '700',
            background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Tripzio
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#475569' }}>
          © 2026 Tripzio. Built with love for Indian travelers.
        </p>
      </footer>
    </div>
  )
}

export default LandingPage