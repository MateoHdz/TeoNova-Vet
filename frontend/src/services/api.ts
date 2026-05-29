import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

// ── Customers ─────────────────────────────────────────────────
export const customersApi = {
  list: (search?: string) => api.get('/customers', { params: { search } }).then(r => r.data),
  get: (id: number) => api.get(`/customers/${id}`).then(r => r.data),
  create: (data: any) => api.post('/customers', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/customers/${id}`).then(r => r.data),
}

// ── Pets ──────────────────────────────────────────────────────
export const petsApi = {
  list: (customerId?: number) => api.get('/pets', { params: { customerId } }).then(r => r.data),
  create: (data: any) => api.post('/pets', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/pets/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/pets/${id}`).then(r => r.data),
}

// ── Products ──────────────────────────────────────────────────
export const productsApi = {
  list: (search?: string, lowStock?: boolean) =>
    api.get('/products', { params: { search, lowStock } }).then(r => r.data),
  get: (id: number) => api.get(`/products/${id}`).then(r => r.data),
  create: (data: any) => api.post('/products', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then(r => r.data),
  adjustStock: (id: number, data: any) => api.post(`/products/${id}/stock`, data).then(r => r.data),
  lowStock: () => api.get('/products/low-stock').then(r => r.data),
}

// ── Services ──────────────────────────────────────────────────
export const servicesApi = {
  list: () => api.get('/services').then(r => r.data),
  create: (data: any) => api.post('/services', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/services/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/services/${id}`).then(r => r.data),
}

// ── Sales ─────────────────────────────────────────────────────
export const salesApi = {
  list: (params?: any) => api.get('/sales', { params }).then(r => r.data),
  get: (id: number) => api.get(`/sales/${id}`).then(r => r.data),
  create: (data: any) => api.post('/sales', data).then(r => r.data),
  cancel: (id: number) => api.patch(`/sales/${id}/cancel`).then(r => r.data),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsApi = {
  summary: (from: string, to: string) =>
    api.get('/reports/summary', { params: { from, to } }).then(r => r.data),
  salesByDay: (from: string, to: string) =>
    api.get('/reports/sales-by-day', { params: { from, to } }).then(r => r.data),
  movements: (params?: any) =>
    api.get('/reports/movements', { params }).then(r => r.data),
  topProducts: (from: string, to: string) =>
    api.get('/reports/top-products', { params: { from, to } }).then(r => r.data),
  topServices: (from: string, to: string) =>
    api.get('/reports/top-services', { params: { from, to } }).then(r => r.data),
  paymentMethods: (from: string, to: string) =>
    api.get('/reports/payment-methods', { params: { from, to } }).then(r => r.data),
  lowStock: () => api.get('/reports/low-stock').then(r => r.data),
}

// ── Appointments ──────────────────────────────────────────────
export const appointmentsApi = {
  list:         (params?: any) => api.get('/appointments', { params }).then(r => r.data),
  get:          (id: number)   => api.get(`/appointments/${id}`).then(r => r.data),
  create:       (data: any)    => api.post('/appointments', data).then(r => r.data),
  update:       (id: number, data: any) => api.put(`/appointments/${id}`, data).then(r => r.data),
  updateStatus: (id: number, status: string) => api.patch(`/appointments/${id}/status`, { status }).then(r => r.data),
  remove:       (id: number)   => api.delete(`/appointments/${id}`).then(r => r.data),
  todaySummary: (params?: any) => api.get('/appointments/today-summary', { params }).then(r => r.data),
}

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  getAll: () => api.get('/notifications').then(r => r.data),
}

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users').then(r => r.data),
}

// ── Clinics (superadmin only) ─────────────────────────────────
export const clinicsApi = {
  list:            ()             => api.get('/clinics').then(r => r.data),
  get:             (id: number)   => api.get(`/clinics/${id}`).then(r => r.data),
  stats:           (id: number)   => api.get(`/clinics/${id}/stats`).then(r => r.data),
  platformSummary: ()             => api.get('/clinics/platform-summary').then(r => r.data),
  create:          (data: any)    => api.post('/clinics', data).then(r => r.data),
  update:          (id: number, data: any) => api.put(`/clinics/${id}`, data).then(r => r.data),
  activate:        (id: number)   => api.patch(`/clinics/${id}/activate`).then(r => r.data),
  suspend:         (id: number)   => api.patch(`/clinics/${id}/suspend`).then(r => r.data),
}

// ── Expenses ──────────────────────────────────────────────────
export const expensesApi = {
  list:    (params?: any)          => api.get('/expenses', { params }).then(r => r.data),
  get:     (id: number)            => api.get(`/expenses/${id}`).then(r => r.data),
  summary: (from: string, to: string) => api.get('/expenses/summary', { params: { from, to } }).then(r => r.data),
  byDay:   (from: string, to: string) => api.get('/expenses/by-day',  { params: { from, to } }).then(r => r.data),
  create:  (data: any)             => api.post('/expenses', data).then(r => r.data),
  update:  (id: number, data: any) => api.put(`/expenses/${id}`, data).then(r => r.data),
  remove:  (id: number)            => api.delete(`/expenses/${id}`).then(r => r.data),
}

// ── Reports Excel export ──────────────────────────────────────
export const exportExcel = async (from: string, to: string): Promise<void> => {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/reports/export/excel?from=${from}&to=${to}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Error al generar Excel')
  const blob = await response.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte-vetpos-${from}-${to}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
