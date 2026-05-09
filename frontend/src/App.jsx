import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import LandingPage from './pages/LandingPage'
import UserLogin from './pages/UserLogin'
import AgentLogin from './pages/AgentLogin'
import UserDashboard from './pages/UserDashboard'
import AgentDashboard from './pages/AgentDashboard'
import AgentProfile from './pages/AgentProfile'
import DestinationSuggestions from './pages/DestinationSuggestions'
import ItineraryResult from './pages/ItineraryResult'
import ComingSoon from './pages/ComingSoon'
import MyTrips from './pages/MyTrips'
import NotFound from './pages/NotFound'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

// ── Only change: added loading check to prevent premature redirect ──
function ProtectedRoute({ children, role }) {
  const { isAuthenticated, isAgent, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role === 'agent' && !isAgent) return <Navigate to="/dashboard" replace />
  if (role === 'user' && isAgent) return <Navigate to="/agent/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, isAgent, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) {
    return <Navigate to={isAgent ? '/agent/dashboard' : '/dashboard'} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white', color: '#0f172a',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontSize: '14px', fontFamily: 'Inter, sans-serif',
            fontWeight: '500', border: '1px solid #e2e8f0',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#0d9488', secondary: 'white' },
            style: { borderLeft: '4px solid #0d9488' }
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
            style: { borderLeft: '4px solid #ef4444' }
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/login" element={<PublicRoute><UserLogin /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><UserLogin /></PublicRoute>} />
        <Route path="/agent/login" element={<PublicRoute><AgentLogin /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>} />
        <Route path="/destinations/suggest" element={<ProtectedRoute role="user"><DestinationSuggestions /></ProtectedRoute>} />
        <Route path="/itinerary/result" element={<ProtectedRoute><ItineraryResult /></ProtectedRoute>} />
        <Route path="/my-trips" element={<ProtectedRoute role="user"><MyTrips /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute role="user"><ComingSoon /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute role="user"><ComingSoon /></ProtectedRoute>} />
        <Route path="/agent/dashboard" element={<ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>} />
        <Route path="/agent/profile" element={<ProtectedRoute role="agent"><AgentProfile /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )
}
