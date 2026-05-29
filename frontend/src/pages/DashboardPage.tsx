import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { reportsApi, productsApi, salesApi, appointmentsApi, clinicsApi } from '../services/api'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Helper to format ISO datetime strings (stored as local time) to 12‑hour format without applying timezone offsets
const formatLocalTime = (iso: string): string => {
  try {
    const date = new Date(iso)
    const hour = date.getHours()
    const minute = String(date.getMinutes()).padStart(2, '0')
    const period = hour >= 12 ? 'pm' : 'am'
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    return `${hour12}:${minute} ${period}`
  } catch (e) {
    return ''
  }
}
import {
  ShoppingCart, DollarSign, AlertTriangle, ArrowRight,
  Package, Calendar, Building2, Users, TrendingUp, Activity
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Link } from 'react-router-dom'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const today    = format(new Date(), 'yyyy-MM-dd')
const weekFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
const weekTo   = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), 'yyyy-MM-dd')

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub, linkTo }: any) {
  const inner = (
    <div className="card" style={{ padding: '18px 20px', cursor: linkTo ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={iconColor} />
        </div>
        {linkTo && <ArrowRight size={13} color="var(--text3)" />}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ─── SUPERADMIN DASHBOARD ────────────────────────────────────
function SuperAdminDashboard() {
  const [platform, setPlatform] = useState<any>(null)
  const [clinics,  setClinics]  = useState<any[]>([])

  useEffect(() => {
    clinicsApi.list().then(setClinics).catch(() => {})
    clinicsApi.platformSummary().then(setPlatform).catch(() => {})
  }, [])

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
          PANEL DE PLATAFORMA
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Resumen general</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 3 }}>
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Platform stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={Building2} iconColor="#10b981" iconBg="#ecfdf5" label="Clínicas activas"    value={platform?.activeClinics    ?? '—'} linkTo="/super" />
        <StatCard icon={Building2} iconColor="#dc2626" iconBg="#fef2f2" label="Suspendidas"         value={platform?.suspendedClinics ?? '—'} linkTo="/super" />
        <StatCard icon={Users}     iconColor="#2563eb" iconBg="#eff6ff" label="Usuarios totales"    value={platform?.totalUsers       ?? '—'} />
        <StatCard icon={Activity}  iconColor="#d97706" iconBg="#fffbeb" label="En trial"            value={platform?.trialClinics     ?? '—'} linkTo="/super" />
      </div>

      {/* Clinics list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Clínicas registradas</h2>
          <Link to="/super" style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
              {['Clínica', 'Plan', 'Estado', 'Creada'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinics.slice(0, 8).map((c: any) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>/{c.slug}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.plan === 'pro' ? '#ecfdf5' : c.plan === 'trial' ? '#f3f4f6' : '#eff6ff', color: c.plan === 'pro' ? '#065f46' : c.plan === 'trial' ? '#6b7280' : '#1e40af', textTransform: 'capitalize' }}>
                    {c.plan}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.isActive ? 'var(--ok-bg)' : 'var(--out-bg)', color: c.isActive ? 'var(--ok)' : 'var(--out)' }}>
                    {c.isActive ? 'Activa' : 'Suspendida'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                  {format(new Date(c.createdAt), 'dd MMM yyyy', { locale: es })}
                </td>
              </tr>
            ))}
            {clinics.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>Sin clínicas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── CLINIC DASHBOARD ────────────────────────────────────────
function ClinicDashboard() {
  const { user } = useAuthStore()
  const [summary,     setSummary]     = useState<any>(null)
  const [chartData,   setChartData]   = useState<any[]>([])
  const [lowStock,    setLowStock]    = useState<any[]>([])
  const [todaySales,  setTodaySales]  = useState<any[]>([])
  const [apptSummary, setApptSummary] = useState<any>(null)

  useEffect(() => {
    reportsApi.summary(today, today).then(setSummary).catch(() => {})
    reportsApi.salesByDay(weekFrom, weekTo).then(days =>
      setChartData(days.map((d: any) => ({
        day: format(new Date(d.date + 'T12:00:00'), 'EEE', { locale: es }),
        Ingresos: Number(d.revenue),
      })))
    ).catch(() => {})
    productsApi.lowStock().then(setLowStock).catch(() => {})
    salesApi.list({ from: today, to: today }).then(setTodaySales).catch(() => {})
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    appointmentsApi.todaySummary({ from: todayStart.toISOString(), to: todayEnd.toISOString() }).then(setApptSummary).catch(() => {})
  }, [])

  const todayRevenue = todaySales.reduce((s: number, v: any) => s + Number(v.total), 0)

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bienvenido, {user?.name?.split(' ')[0]}</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 3 }}>
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })} · {user?.clinic?.name}
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon={ShoppingCart} iconColor="#10b981" iconBg="#ecfdf5" label="Ventas hoy"    value={todaySales.length}   sub={`Total: ${fmt(todayRevenue)}`}                                          linkTo="/sales" />
        <StatCard icon={DollarSign}   iconColor="#2563eb" iconBg="#eff6ff" label="Ingresos hoy"  value={fmt(todayRevenue)}    sub={summary ? `Ganancia: ${fmt(summary.totalProfit)}` : undefined}            />
        <StatCard icon={Calendar}     iconColor="#7c3aed" iconBg="#f5f3ff" label="Citas hoy"     value={apptSummary?.total ?? '—'} sub={apptSummary ? `${apptSummary.pending} pendientes` : undefined}   linkTo="/appointments" />
        <StatCard icon={AlertTriangle} iconColor="#ef4444" iconBg="#fef2f2" label="Stock bajo"   value={lowStock.length}     sub="productos bajo mínimo"                                                  linkTo="/inventory" />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Weekly chart */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Ingresos de la semana</h2>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Lun — Dom</p>
            </div>
            <Link to="/reports" style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver reportes <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today's sales feed */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Ventas de hoy</h2>
            <Link to="/sales" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          {todaySales.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text3)', gap: 10 }}>
              <ShoppingCart size={28} strokeWidth={1.2} />
              <p style={{ fontSize: 13 }}>Sin ventas aún hoy</p>
              <Link to="/pos" className="btn-green" style={{ fontSize: 12, padding: '7px 14px' }}>Nueva venta</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 200, overflowY: 'auto' }}>
              {todaySales.slice(0, 6).map((s: any) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 9, background: 'var(--surface2)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>#{s.id} {s.customer?.name || 'Sin cliente'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {formatLocalTime(s.soldAt)} · {s.items?.length || 0} item{s.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fmt(s.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock + appointments */}
      {(lowStock.length > 0 || apptSummary) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {lowStock.length > 0 && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  Alertas de stock
                  <span style={{ background: 'var(--out-bg)', color: 'var(--out)', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{lowStock.length}</span>
                </h2>
                <Link to="/inventory" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Ver →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lowStock.slice(0, 5).map((p: any) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: p.stock === 0 ? 'var(--out-bg)' : 'var(--low-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Package size={12} color={p.stock === 0 ? 'var(--out)' : 'var(--low)'} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.stock === 0 ? 'var(--out)' : 'var(--low)' }}>
                      {p.stock === 0 ? 'AGOTADO' : `${p.stock} ${p.unit}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {apptSummary && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Citas de hoy</h2>
                <Link to="/appointments" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Ver agenda →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--green-xlight)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--green-dark)', fontWeight: 500 }}>Total programadas</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-dark)' }}>{apptSummary.total}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--low-bg)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--low)' }}>{apptSummary.pending}</div>
                    <div style={{ fontSize: 11, color: 'var(--low)', fontWeight: 600 }}>Pendientes</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--ok-bg)', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ok)' }}>{apptSummary.done}</div>
                    <div style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>Realizadas</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MAIN EXPORT — routes by role ────────────────────────────
export default function DashboardPage() {
  const { isSuperAdmin } = useAuthStore()
  return isSuperAdmin() ? <SuperAdminDashboard /> : <ClinicDashboard />
}
