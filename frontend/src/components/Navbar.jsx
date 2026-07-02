import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, Map, Search, Bell, Menu, X, Compass, Heart, Plane, LayoutDashboard } from 'lucide-react'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { user, isAuthenticated, isAgent, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const navLinks = isAuthenticated && !isAgent ? [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { to: '/my-trips', label: 'My Trips', icon: <Plane size={15} /> },
    { to: '/explore', label: 'Explore', icon: <Compass size={15} /> },
    { to: '/saved', label: 'Saved', icon: <Heart size={15} /> },
  ] : isAgent ? [
    { to: '/agent/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  ] : []

  const isActive = (path) => location.pathname === path

  return (
    <>
      <style>{`
        .nav-link { transition: color 0.2s, background 0.2s; }
        .nav-link:hover { color: #0d9488 !important; }
        .nav-link.active { color: #0d9488 !important; font-weight: 600 !important; }
        .logout-btn:hover { background: #fef2f2 !important; color: #ef4444 !important; border-color: #fca5a5 !important; }
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

      <nav style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(20,184,166,0.12)',
        padding: '0 28px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(13,148,136,0.3)'
          }}>
            <Map size={18} color="white" />
          </div>
          <span style={{
            fontSize: '21px', fontWeight: '800',
            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.3px'
          }}>
            Tripzio
          </span>
        </Link>

        {/* Nav Links Desktop */}
        {isAuthenticated && (
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`nav-link${isActive(link.to) ? ' active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px', fontWeight: isActive(link.to) ? '600' : '500',
                  color: isActive(link.to) ? '#0d9488' : '#64748b',
                  background: isActive(link.to) ? '#f0fdfa' : 'transparent',
                  fontFamily: 'Inter, sans-serif'
                }}>
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated ? (
            <>
              {/* Search icon */}
              <button style={{
                width: '36px', height: '36px', borderRadius: '10px',
                border: '1px solid #e2e8f0', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                color: '#64748b'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d9488' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}>
                <Search size={15} />
              </button>

              {/* Bell */}
              <button style={{
                width: '36px', height: '36px', borderRadius: '10px',
                border: '1px solid #e2e8f0', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                color: '#64748b'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d9488' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}>
                <Bell size={15} />
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  width: '6px', height: '6px',
                  background: '#ef4444', borderRadius: '50%',
                  border: '1.5px solid white'
                }} />
              </button>

              {/* User pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 12px 5px 5px',
                background: isAgent ? '#f0fdfa' : '#eff6ff',
                border: `1px solid ${isAgent ? '#99f6e4' : '#bfdbfe'}`,
                borderRadius: '24px'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: isAgent
                    ? 'linear-gradient(135deg,#0d9488,#14b8a6)'
                    : 'linear-gradient(135deg,#3b82f6,#0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700', color: 'white',
                  flexShrink: 0
                }}>
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <span style={{
                  fontSize: '13px', fontWeight: '600',
                  color: isAgent ? '#0f766e' : '#1d4ed8',
                  fontFamily: 'Inter, sans-serif',
                  maxWidth: '100px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {user?.full_name?.split(' ')[0]}
                </span>
                {isAgent && (
                  <span style={{
                    fontSize: '9px', fontWeight: '700', color: '#0f766e',
                    background: '#ccfbf1', padding: '2px 6px', borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    AGENT
                  </span>
                )}
              </div>

              {/* Logout */}
              <button
                className="logout-btn"
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', color: '#64748b',
                  fontWeight: '500', transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif'
                }}>
                <LogOut size={14} />
                <span style={{ display: 'none' }} className="logout-label">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                fontSize: '14px', fontWeight: '500', color: '#64748b',
                textDecoration: 'none', padding: '7px 14px', borderRadius: '10px',
                fontFamily: 'Inter, sans-serif', transition: 'color 0.2s'
              }}>
                Sign in
              </Link>
              <Link to="/guest" style={{
                fontSize: '14px', fontWeight: '700', color: 'white',
                textDecoration: 'none', padding: '9px 20px', borderRadius: '10px',
                background: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 2px 10px rgba(13,148,136,0.3)',
                transition: 'all 0.2s'
              }}>
                Get Started
              </Link>
            </>
          )}

          {/* Mobile menu */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              border: '1px solid #e2e8f0', background: 'white',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b'
            }}>
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0,
          background: 'white', borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px', zIndex: 99,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 0', textDecoration: 'none',
                color: isActive(link.to) ? '#0d9488' : '#374151',
                fontSize: '15px', fontWeight: '500',
                borderBottom: '1px solid #f1f5f9',
                fontFamily: 'Inter, sans-serif'
              }}>
              {link.icon}
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 0', background: 'none', border: 'none',
            color: '#ef4444', fontSize: '15px', fontWeight: '500',
            cursor: 'pointer', width: '100%', marginTop: '4px',
            fontFamily: 'Inter, sans-serif'
          }}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </>
  )
}

export default Navbar
