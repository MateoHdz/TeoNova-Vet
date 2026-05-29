import { create } from 'zustand'

interface Clinic {
  id: number
  name: string
  slug: string
  plan: string
  isActive: boolean
}
interface User {
  id: number
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'employee'
  clinicId: number | null
  clinic: Clinic | null
}

interface AuthState {
  user:    User | null
  token:   string | null
  setAuth: (user: User, token: string) => void
  logout:  () => void
  isAdmin:      () => boolean   // admin of a clinic (NOT superadmin)
  isSuperAdmin: () => boolean   // platform superadmin
  isEmployee:   () => boolean   // clinic employee
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:  (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') }
    catch { return null }
  })(),
  token: localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  // Clinic admin — can manage their own clinic, NOT superadmin
  isAdmin: () => get().user?.role === 'admin',

  // Platform superadmin — manages the SaaS platform only
  isSuperAdmin: () => get().user?.role === 'superadmin',

  // Regular employee
  isEmployee: () => get().user?.role === 'employee',
}))
