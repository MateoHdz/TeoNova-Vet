import { useEffect, useState, useMemo } from 'react'
import { usersApi, clinicsApi } from '../services/api'
import {
  Users, Search, Shield, ShieldOff, Trash2, KeyRound,
  ChevronLeft, ChevronRight, X, Eye, EyeOff, AlertTriangle,
  CheckCircle2, UserX, Crown, Briefcase, UserCog, Filter,
  RefreshCw, Building2,
} from 'lucide-react'
import { Alerts } from '../utils/alerts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────
interface UserRow {
  id: number
  name: string
  email: string
  role: 'superadmin' | 'admin' | 'employee'
  isActive: boolean
  clinicId: number | null
  createdAt: string
  clinic: { id: number; name: string; slug: string } | null
}

// ── Constants ─────────────────────────────────────────────────────
const PAGE_SIZE = 20

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  superadmin: { label: 'SuperAdmin', color: '#7c3aed', bg: '#f5f3ff', icon: Crown },
  admin:      { label: 'Admin',      color: '#2563eb', bg: '#eff6ff', icon: Briefcase },
  employee:   { label: 'Empleado',   color: '#0891b2', bg: '#ecfeff', icon: UserCog },
}

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  try { return format(new Date(d), 'dd MMM yyyy', { locale: es }) } catch { return '—' }
}

export default function SecurityPage() {
  const [users,       setUsers]       = useState<UserRow[]>([])
  const [clinics,     setClinics]     = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)

  // Filters
  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState<string>('all')
  const [filterClinic,setFilterClinic]= useState<string>('all')
  const [filterStatus,setFilterStatus]= useState<string>('all')

  // Modals
  const [pwdModal,    setPwdModal]    = useState<UserRow | null>(null)
  const [delModal,    setDelModal]    = useState<UserRow | null>(null)
  const [pwdValue,    setPwdValue]    = useState('')
  const [pwdConfirm,  setPwdConfirm]  = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ── Load data ────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const [u, c] = await Promise.all([
        usersApi.listGlobal().catch(() => []),
        clinicsApi.list().catch(() => []),
      ])
      setUsers(u)
      setClinics(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Filtered & paginated list ─────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      if (filterRole   !== 'all' && u.role          !== filterRole)                    return false
      if (filterClinic !== 'all' && String(u.clinicId) !== filterClinic)              return false
      if (filterStatus !== 'all') {
        if (filterStatus === 'active'    && !u.isActive) return false
        if (filterStatus === 'suspended' &&  u.isActive) return false
      }
      return true
    })
  }, [users, search, filterRole, filterClinic, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => setPage(1), [search, filterRole, filterClinic, filterStatus])

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      users.length,
    active:     users.filter(u => u.isActive).length,
    suspended:  users.filter(u => !u.isActive).length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
    admin:      users.filter(u => u.role === 'admin').length,
    employee:   users.filter(u => u.role === 'employee').length,
  }), [users])

  // ── Actions ───────────────────────────────────────────────────────
  const toggleStatus = async (u: UserRow) => {
    try {
      if (u.isActive) {
        await usersApi.suspend(u.id)
        Alerts.success(`${u.name} suspendido`)
      } else {
        await usersApi.activate(u.id)
        Alerts.success(`${u.name} activado`)
      }
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !u.isActive } : x))
    } catch (e: any) {
      Alerts.error(e.response?.data?.message || 'Error al cambiar estado')
    }
  }

  const handleResetPassword = async () => {
    if (!pwdModal) return
    if (pwdValue.length < 8) { Alerts.error('La contraseña debe tener al menos 8 caracteres'); return }
    if (pwdValue !== pwdConfirm) { Alerts.error('Las contraseñas no coinciden'); return }
    setActionLoading(true)
    try {
      await usersApi.resetPassword(pwdModal.id, pwdValue)
      Alerts.success(`Contraseña de ${pwdModal.name} actualizada`)
      setPwdModal(null); setPwdValue(''); setPwdConfirm(''); setShowPwd(false)
    } catch (e: any) {
      Alerts.error(e.response?.data?.message || 'Error al cambiar contraseña')
    } finally { setActionLoading(false) }
  }

  const handleDelete = async () => {
    if (!delModal) return
    setActionLoading(true)
    try {
      await usersApi.permanentDelete(delModal.id)
      Alerts.success(`Usuario ${delModal.name} eliminado`)
      setUsers(prev => prev.filter(u => u.id !== delModal.id))
      setDelModal(null)
    } catch (e: any) {
      Alerts.error(e.response?.data?.message || 'Error al eliminar usuario')
    } finally { setActionLoading(false) }
  }

  const clearFilters = () => {
    setSearch(''); setFilterRole('all'); setFilterClinic('all'); setFilterStatus('all')
  }
  const hasFilters = search || filterRole !== 'all' || filterClinic !== 'all' || filterStatus !== 'all'

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
            🔐 SUPERADMIN — GESTIÓN DE SEGURIDAD
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Usuarios del sistema</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
            Gestiona usuarios, contraseñas y accesos de toda la plataforma
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: Users,       color: '#2563eb', bg: '#eff6ff', label: 'Total usuarios',  value: stats.total },
          { icon: CheckCircle2,color: '#10b981', bg: '#ecfdf5', label: 'Activos',          value: stats.active },
          { icon: UserX,       color: '#dc2626', bg: '#fef2f2', label: 'Suspendidos',      value: stats.suspended },
          { icon: Crown,       color: '#7c3aed', bg: '#f5f3ff', label: 'SuperAdmins',      value: stats.superadmin },
          { icon: Briefcase,   color: '#0891b2', bg: '#ecfeff', label: 'Admins',           value: stats.admin },
          { icon: UserCog,     color: '#6b7280', bg: '#f9fafb', label: 'Empleados',        value: stats.employee },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', zIndex: 1 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="premium-search-input"
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Role filter */}
          <div style={{ flex: '0 0 140px' }}>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: '100%' }}>
              <option value="all">Todos los roles</option>
              <option value="superadmin">SuperAdmin</option>
              <option value="admin">Admin</option>
              <option value="employee">Empleado</option>
            </select>
          </div>

          {/* Clinic filter */}
          <div style={{ flex: '0 0 180px' }}>
            <select value={filterClinic} onChange={e => setFilterClinic(e.target.value)} style={{ width: '100%' }}>
              <option value="all">Todas las clínicas</option>
              <option value="null">Sin clínica (SuperAdmin)</option>
              {clinics.map((c: any) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ flex: '0 0 140px' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '100%' }}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
              <X size={13} /> Limpiar
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            <Filter size={12} style={{ display: 'inline', marginRight: 4 }} />
            {filtered.length} de {users.length} usuarios
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text3)' }}>
            <RefreshCw size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite' }} />
            Cargando usuarios...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  {['Usuario', 'Rol', 'Clínica', 'Estado', 'Registrado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '50px 0', textAlign: 'center', color: 'var(--text3)' }}>
                      <Users size={30} style={{ margin: '0 auto 10px', display: 'block', opacity: .4 }} strokeWidth={1.2} />
                      No se encontraron usuarios con los filtros aplicados
                    </td>
                  </tr>
                ) : paginated.map((u, idx) => {
                  const rm = ROLE_META[u.role]
                  const RIcon = rm.icon
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--surface2)', opacity: u.isActive ? 1 : 0.65, transition: 'background .15s' }}>

                      {/* Usuario */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: rm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <RIcon size={14} color={rm.color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: rm.bg, color: rm.color }}>
                          <RIcon size={10} /> {rm.label}
                        </span>
                      </td>

                      {/* Clínica */}
                      <td style={{ padding: '10px 14px' }}>
                        {u.clinic ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Building2 size={12} color="var(--text3)" />
                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.clinic.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Plataforma</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: u.isActive ? 'var(--ok-bg)' : 'var(--out-bg)', color: u.isActive ? 'var(--ok)' : 'var(--out)' }}>
                          {u.isActive ? <CheckCircle2 size={10} /> : <UserX size={10} />}
                          {u.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>

                      {/* Registrado */}
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {fmtDate(u.createdAt)}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>

                          {/* Cambiar contraseña */}
                          <button
                            id={`pwd-btn-${u.id}`}
                            onClick={() => { setPwdModal(u); setPwdValue(''); setPwdConfirm(''); setShowPwd(false) }}
                            title="Cambiar contraseña"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1.5px solid #d1d5db', background: 'var(--surface)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                            <KeyRound size={12} /> Contraseña
                          </button>

                          {/* Suspender / Activar */}
                          {u.role !== 'superadmin' && (
                            <button
                              id={`status-btn-${u.id}`}
                              onClick={() => toggleStatus(u)}
                              title={u.isActive ? 'Suspender usuario' : 'Activar usuario'}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: `1.5px solid ${u.isActive ? 'var(--out)' : 'var(--ok)'}`, background: u.isActive ? 'var(--out-bg)' : 'var(--ok-bg)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: u.isActive ? 'var(--out)' : 'var(--ok)' }}>
                              {u.isActive ? <><ShieldOff size={12} /> Suspender</> : <><Shield size={12} /> Activar</>}
                            </button>
                          )}

                          {/* Eliminar */}
                          {u.role !== 'superadmin' && (
                            <button
                              id={`del-btn-${u.id}`}
                              onClick={() => setDelModal(u)}
                              title="Eliminar usuario"
                              style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderRadius: 6, border: '1.5px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', color: '#dc2626' }}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              Página {page} de {totalPages} · {filtered.length} usuarios
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .5 : 1, fontSize: 12, fontWeight: 600 }}>
                <ChevronLeft size={14} /> Anterior
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .5 : 1, fontSize: 12, fontWeight: 600 }}>
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Cambiar contraseña ──────────────────────────── */}
      {pwdModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={16} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Cambiar contraseña</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{pwdModal.name}</div>
                </div>
              </div>
              <button onClick={() => setPwdModal(null)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Nueva contraseña *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password-input"
                    type={showPwd ? 'text' : 'password'}
                    value={pwdValue}
                    onChange={e => setPwdValue(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: 40 }}
                  />
                  <button onClick={() => setShowPwd(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwdValue.length > 0 && pwdValue.length < 8 && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠ Mínimo 8 caracteres</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Confirmar contraseña *</label>
                <input
                  id="confirm-password-input"
                  type={showPwd ? 'text' : 'password'}
                  value={pwdConfirm}
                  onChange={e => setPwdConfirm(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                {pwdConfirm.length > 0 && pwdValue !== pwdConfirm && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠ Las contraseñas no coinciden</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPwdModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                Cancelar
              </button>
              <button
                id="confirm-password-btn"
                onClick={handleResetPassword}
                disabled={actionLoading || pwdValue.length < 8 || pwdValue !== pwdConfirm}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: actionLoading || pwdValue.length < 8 || pwdValue !== pwdConfirm ? '#d1d5db' : '#d97706', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <KeyRound size={14} />
                {actionLoading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eliminar usuario ────────────────────────────── */}
      {delModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={16} color="#dc2626" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Eliminar usuario</div>
              </div>
              <button onClick={() => setDelModal(null)} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>Esta acción es irreversible</div>
              </div>
              <p style={{ fontSize: 12, color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
                El usuario <strong>{delModal.name}</strong> ({delModal.email}) será eliminado permanentemente de la base de datos junto con su acceso al sistema.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                Cancelar
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleDelete}
                disabled={actionLoading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} />
                {actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
