import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, isAgent, isUser, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #0ea5e9',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Loading Tripzio...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={role === 'agent' ? '/agent/login' : '/login'} replace />
  }

  if (role === 'agent' && !isAgent) {
    return <Navigate to="/dashboard" replace />
  }

  if (role === 'user' && !isUser) {
    return <Navigate to="/agent/dashboard" replace />
  }

  return children
}

export default ProtectedRoute