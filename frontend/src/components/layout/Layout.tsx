import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, ShoppingCart, Package, Users, PawPrint,
  Scissors, BarChart2, Settings, Bell, Search, LogOut,
  ChevronDown, Calendar, X, Menu, Building2, Receipt,
  Shield, TrendingDown, ShieldCheck
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { notificationsApi } from '../../services/api'

const iconMap: any = {
  'package': Package, 'scissors': Scissors,
  'shopping-cart': ShoppingCart, 'calendar': Calendar,
}

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setV(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return v
}

const CLINIC_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',    exact: true },
  { to: '/pos',         icon: ShoppingCart,    label: 'Ventas'              },
  { to: '/sales',       icon: Receipt,         label: 'Historial'                 },
  { to: '/inventory',   icon: Package,         label: 'Inventario'                },
  { to: '/customers',   icon: Users,           label: 'Clientes'                  },
  { to: '/pets',        icon: PawPrint,        label: 'Mascotas'                  },
  { to: '/appointments',icon: Calendar,        label: 'Agenda'                    },
  { to: '/services',    icon: Scissors,        label: 'Servicios'                 },
  { to: '/expenses',    icon: TrendingDown,    label: 'Gastos'                    },
]
const CLINIC_ADMIN_NAV = [
  { to: '/reports',  icon: BarChart2, label: 'Reportes'      },
  { to: '/users',    icon: Users,     label: 'Usuarios'      },
  { to: '/settings', icon: Settings,  label: 'Configuración' },
]
const SUPER_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Resumen',  exact: true },
  { to: '/super',     icon: Building2,       label: 'Clínicas'              },
  { to: '/security',  icon: ShieldCheck,     label: 'Seguridad'             },
]

export default function Layout() {
  const { user, logout, isAdmin, isSuperAdmin } = useAuthStore()
  const navigate   = useNavigate()
  const location   = useLocation()
  const isMobile   = useIsMobile()
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [notifs,       setNotifs]       = useState<any[]>([])
  const [unread,       setUnread]       = useState(0)
  const notifsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (isMobile) setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    if (isSuperAdmin()) return
    const load = () =>
      notificationsApi.getAll()
        .then(d => { setNotifs(d.notifications); setUnread(d.unread) })
        .catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node))
        setShowNotifs(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const superAdmin = isSuperAdmin()
  const initials   = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 1) return 'Ahora'
    if (m < 60) return `Hace ${m} min`
    const h = Math.floor(m / 60)
    return h < 24 ? `Hace ${h}h` : `Hace ${Math.floor(h / 24)}d`
  }

  const navItems = superAdmin ? SUPER_NAV : CLINIC_NAV

  const NavItem = ({ to, icon: Icon, label, exact }: any) => (
    <NavLink to={to} end={exact ?? false}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, marginBottom: 2,
        color: isActive ? '#fff' : 'var(--text2)',
        background: isActive ? (superAdmin ? '#d97706' : 'var(--green)') : 'transparent',
        fontWeight: isActive ? 600 : 500, fontSize: 14, transition: 'all .12s',
        textDecoration: 'none',
      })}>
      <Icon size={16} strokeWidth={2} />{label}
    </NavLink>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 99 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s ease',
          boxShadow: sidebarOpen ? 'var(--shadow-lg)' : 'none',
        } : {}),
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: superAdmin ? '#d97706' : 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {superAdmin ? <Shield size={17} color="#fff" strokeWidth={2} /> : <PawPrint size={17} color="#fff" strokeWidth={2.2} />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{superAdmin ? 'VetPOS' : (user?.clinic?.name || 'Veterinaria')}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{superAdmin ? 'Plataforma' : `Plan ${user?.clinic?.plan || 'Pro'}`}</div>
            </div>
          </div>
          {isMobile && <button onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text3)', padding: 4 }}><X size={16} /></button>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
          {superAdmin && (
            <div style={{ margin: '4px 2px 8px', padding: '5px 10px', background: '#fef3c7', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#92400e' }}>
              ⚡ SUPERADMIN
            </div>
          )}
          {navItems.map(item => <NavItem key={item.to} {...item} />)}

          {!superAdmin && isAdmin() && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', padding: '10px 12px 4px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                Administración
              </div>
              {CLINIC_ADMIN_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </>
          )}
        </nav>

        {/* Bottom plan badge */}
        {!superAdmin && (
          <div style={{ margin: '0 10px 12px', background: 'var(--green-xlight)', borderRadius: 10, padding: '10px 12px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-dark)' }}>Plan {user?.clinic?.plan || 'Pro'}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Sistema activo</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 10 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text2)', padding: 6, borderRadius: 8, flexShrink: 0 }}>
              <Menu size={20} />
            </button>
          )}

          {!isMobile && !superAdmin && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                ¡Hola, <span style={{ color: 'var(--green-dark)' }}>{user?.name?.split(' ')[0]}</span>! 👋
              </div>
            </div>
          )}

          {superAdmin && !isMobile && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} /> Panel de Plataforma
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Notifications — clinic only */}
          {!superAdmin && (
            <div ref={notifsRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifs(!showNotifs)}
                style={{ position: 'relative', padding: 8, borderRadius: 8, color: 'var(--text2)' }}>
                <Bell size={18} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, background: '#ef4444', borderRadius: '50%', fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', zIndex: 100, maxWidth: 'calc(100vw - 32px)' }}>
                  <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                    <button onClick={() => { setShowNotifs(false); setUnread(0) }} style={{ color: 'var(--text3)' }}><X size={14} /></button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifs.length === 0
                      ? <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Sin notificaciones</div>
                      : notifs.map(n => {
                          const IC = iconMap[n.icon] || Bell
                          const colorMap: any = { stock: '#d97706', appointment: '#2563eb', sale: '#10b981' }
                          const bgMap:    any = { stock: '#fffbeb', appointment: '#eff6ff', sale: '#ecfdf5' }
                          return (
                            <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: n.read ? '#fff' : '#fafffe' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: bgMap[n.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <IC size={14} color={colorMap[n.type]} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{n.body}</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{timeAgo(n.time)}</div>
                              </div>
                              {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginTop: 4, flexShrink: 0 }} />}
                            </div>
                          )
                        })
                    }
                  </div>
                  <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <button onClick={() => notificationsApi.getAll().then(d => { setNotifs(d.notifications); setUnread(d.unread) }).catch(() => {})}
                      style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Actualizar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: superAdmin ? '#d97706' : 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials}
              </div>
              {!isMobile && (
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>{user?.role}</div>
                </div>
              )}
              <ChevronDown size={13} color="var(--text3)" />
            </div>

            {showUserMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--surface)', borderRadius: 10, boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', minWidth: 190, zIndex: 100 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.email}</div>
                  {!superAdmin && user?.clinic && (
                    <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>{user.clinic.name}</div>
                  )}
                </div>
                <button onClick={() => { logout(); navigate('/login') }}
                  style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dc2626', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <LogOut size={13} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
