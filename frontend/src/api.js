import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes for AI generation
})

// Auto attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tripzio_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto handle 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tripzio_token')
      localStorage.removeItem('tripzio_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const itineraryAPI = {
  generate: (data) => api.post('/itinerary/generate', data),
  generateAgent: (data) => api.post('/itinerary/generate/agent', data),
  history: () => api.get('/itinerary/history'),
}

export const weatherAPI = {
  getCurrent: (destination, date) =>
    api.get(`/weather/current/${encodeURIComponent(destination)}`, {
      params: date ? { date } : {}
    }),
}

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
}

export const usersAPI = {
  me: () => api.get('/users/me'),
  dashboard: () => api.get('/users/dashboard/user'),
  agentDashboard: () => api.get('/users/dashboard/agent'),
  addClient: (data) => api.post('/users/agent/clients', data),
  getClients: () => api.get('/users/agent/clients'),
  updateClient: (id, data) => api.patch(`/users/agent/clients/${id}`, data),
}
export { API_URL }
export default api
