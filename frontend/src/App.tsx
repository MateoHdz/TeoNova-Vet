import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import POSPage from './pages/POSPage'
import SalesPage from './pages/SalesPage'
import InventoryPage from './pages/InventoryPage'
import CustomersPage from './pages/CustomersPage'
import PetsPage from './pages/PetsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ServicesPage from './pages/ServicesPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import SuperAdminPage from './pages/SuperAdminPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}
function RequireClinic({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuthStore()
  return !isSuperAdmin() ? <>{children}</> : <Navigate to="/" replace />
}
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuthStore()
  return isAdmin() ? <>{children}</> : <Navigate to="/" replace />
}
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuthStore()
  return isSuperAdmin() ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="pos"          element={<RequireClinic><POSPage /></RequireClinic>} />
        <Route path="sales"        element={<RequireClinic><SalesPage /></RequireClinic>} />
        <Route path="inventory"    element={<RequireClinic><InventoryPage /></RequireClinic>} />
        <Route path="customers"    element={<RequireClinic><CustomersPage /></RequireClinic>} />
        <Route path="pets"         element={<RequireClinic><PetsPage /></RequireClinic>} />
        <Route path="appointments" element={<RequireClinic><AppointmentsPage /></RequireClinic>} />
        <Route path="services"     element={<RequireClinic><ServicesPage /></RequireClinic>} />
        <Route path="expenses"     element={<RequireClinic><ExpensesPage /></RequireClinic>} />
        <Route path="reports"      element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
        <Route path="users"        element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        <Route path="settings"     element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        <Route path="super"        element={<RequireSuperAdmin><SuperAdminPage /></RequireSuperAdmin>} />
      </Route>
    </Routes>
  )
}
