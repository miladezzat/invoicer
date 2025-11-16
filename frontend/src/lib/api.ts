import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

// Separate instance for public API (no /api prefix)
const publicApiInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  signup: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
}

// Invoices API
export const invoicesAPI = {
  list: (params?: any) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  enablePublicLink: (id: string) => api.post(`/invoices/${id}/public-link`),
  enablePayment: (id: string) => api.post(`/invoices/${id}/enable-payment`),
  sendEmail: (id: string, email: string) => api.post(`/invoices/${id}/send-email`, { email }),
  duplicate: (id: string) => api.post(`/invoices/${id}/duplicate`),
}

// Clients API
export const clientsAPI = {
  list: (params?: any) => api.get('/clients', { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  getStats: () => api.get('/clients/stats'),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
}

// Templates API
export const templatesAPI = {
  list: () => api.get('/templates'),
  get: (id: string) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: string, data: any) => api.patch(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
}

// Public API (no auth required)
export const publicAPI = {
  getInvoice: (token: string) => publicApiInstance.get(`/public/invoices/${token}`),
  createPaymentSession: (invoiceId: string) => publicApiInstance.post(`/public/invoices/${invoiceId}/payment-session`),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
}

// Stripe/Subscription API
export const stripeAPI = {
  getPricingPlans: () => 
    api.get('/stripe/pricing-plans'),
  createCheckoutSession: (interval: 'month' | 'year') => 
    api.post('/stripe/create-checkout-session', { interval }),
  createPortalSession: () => 
    api.post('/stripe/create-portal-session'),
  cancelSubscription: () =>
    api.post('/stripe/cancel-subscription'),
  reactivateSubscription: () =>
    api.post('/stripe/reactivate-subscription'),
}

// Stripe Connect API
export const stripeConnectAPI = {
  createAccount: () => api.post('/stripe/connect/account'),
  getOnboardingLink: () => api.get('/stripe/connect/onboarding-link'),
  getDashboardLink: () => api.get('/stripe/connect/dashboard-link'),
  getStatus: () => api.get('/stripe/connect/status'),
  refreshStatus: () => api.post('/stripe/connect/refresh'),
  disconnect: () => api.post('/stripe/connect/disconnect'),
}

// Analytics API
export const analyticsAPI = {
  getAnalytics: (period: '30d' | '90d' | '1y' | 'all' = '30d') =>
    api.get(`/analytics?period=${period}`),
  exportAnalytics: (format: 'csv' | 'json' = 'json') =>
    api.get(`/analytics/export?format=${format}`),
}

// Developer API - API Keys
export const apiKeysAPI = {
  list: () => api.get('/developer/api-keys'),
  create: (data: { name: string; permissions?: string[] }) => 
    api.post('/developer/api-keys', data),
  delete: (keyId: string) => api.delete(`/developer/api-keys/${keyId}`),
  toggle: (keyId: string, isActive: boolean) => 
    api.patch(`/developer/api-keys/${keyId}/toggle`, { isActive }),
  getStats: () => api.get('/developer/api-keys/stats'),
}

// Developer API - Webhooks
export const webhooksAPI = {
  list: () => api.get('/developer/webhooks'),
  get: (webhookId: string) => api.get(`/developer/webhooks/${webhookId}`),
  create: (data: { url: string; description?: string; events: string[] }) => 
    api.post('/developer/webhooks', data),
  update: (webhookId: string, data: Partial<{ url: string; description?: string; events: string[] }>) =>
    api.put(`/developer/webhooks/${webhookId}`, data),
  delete: (webhookId: string) => api.delete(`/developer/webhooks/${webhookId}`),
  toggle: (webhookId: string, isActive: boolean) => 
    api.patch(`/developer/webhooks/${webhookId}/toggle`, { isActive }),
  listEvents: () => api.get('/developer/webhooks/events/list'),
}

