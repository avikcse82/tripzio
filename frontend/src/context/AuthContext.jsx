import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

import { API_URL } from '../api'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('tripzio_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('tripzio_user')
    const storedToken = localStorage.getItem('tripzio_token')
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      setToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    setLoading(false)
  }, [])

  const register = async (userData) => {
    const response = await axios.post(`${API_URL}/auth/register`, userData)
    const { access_token, role, full_name } = response.data
    const userObj = { email: userData.email, full_name, role }
    localStorage.setItem('tripzio_token', access_token)
    localStorage.setItem('tripzio_user', JSON.stringify(userObj))
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userObj)
    return response.data
  }

  const login = async (credentials) => {
    const response = await axios.post(`${API_URL}/auth/login`, credentials)
    const { access_token, role, full_name } = response.data
    const userObj = { email: credentials.email, full_name, role }
    localStorage.setItem('tripzio_token', access_token)
    localStorage.setItem('tripzio_user', JSON.stringify(userObj))
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    setUser(userObj)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('tripzio_token')
    localStorage.removeItem('tripzio_user')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  const isAuthenticated = !!token && !!user
  const isAgent = user?.role === 'agent'
  const isUser = user?.role === 'user'

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      register, login, logout,
      isAuthenticated, isAgent, isUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}