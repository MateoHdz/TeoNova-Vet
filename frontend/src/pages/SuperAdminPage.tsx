import { useEffect, useState } from 'react'
import { clinicsApi } from '../services/api'
import {
  Plus, Building2, Users, Package, TrendingUp,
  ToggleLeft, ToggleRight, Edit2, X, CheckCircle2,
  AlertTriangle, Activity, ShieldOff
} from 'lucide-react'
import { Alerts } from '../utils/alerts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const PLANS = ['trial', 'basic', 'pro', 'enterprise']
const PLAN_COLOR: any = { trial: '#6b7280', basic: '#2563eb', pro: '#10b981', enterprise: '#7c3aed' }
const PLAN_BG:    any = { trial: '#f3f4f6', basic: '#eff6ff', pro: '#ecfdf5', enterprise: '#f5f3ff' }

const EMPTY_FORM = {
  name: '', slug: '', email: '', phone: '', address: '', nit: '', plan: 'trial',
  adminName: '', adminEmail: '', adminPassword: '',
}

export default function SuperAdminPage() {
  const [clinics,   setClinics]   = useState<any[]>([])
  const [stats,     setStats]     = useState<Record<number, any>>({})
  const [platform,  setPlatform]  = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<any>(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<'all' | 'active' | 'suspended'>('all')

  const load = async () => {
    const [list, plat] = await Promise.all([
      clinicsApi.list().catch(() => []),
      clinicsApi.platformSummary().catch(() => null),
    ])
    setClinics(list)
    setPlatform(plat)
    // Load per-clinic stats
    const statsMap: Record<number, any> = {}
    await Promise.all(list.map(async (c: any) => {
      try { statsMap[c.id] = await clinicsApi.stats(c.id) } catch {}
    }))
    setStats(statsMap)
  }

  useEffect(() => { load() }, [])

  const filtered = clinics.filter(c =>
    tab === 'all' ? true : tab === 'active' ? c.isActive : !c.isActive
  )

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({ ...EMPTY_FORM, name: c.name, slug: c.slug, email: c.email || '', phone: c.phone || '', address: c.address || '', nit: c.nit || '', plan: c.plan })
    setShowModal(true)
  }

  const save = async () => {
    const missing = []
    if (!form.name) missing.push('Nombre')
    if (!form.slug) missing.push('Slug')
    
    if (!editing) {
      if (!form.adminName) missing.push('Nombre del admin')
      if (!form.adminEmail) missing.push('Email del admin')
      if (!form.adminPassword) missing.push('Contraseña inicial')
    }

    if (missing.length > 0) { Alerts.validationError(missing); return }

    setLoading(true)
    try {
      if (editing) {
        await clinicsApi.update(editing.id, { name: form.name, slug: form.slug, email: form.email, phone: form.phone, address: form.address, nit: form.nit, plan: form.plan })
        Alerts.success('Clínica actualizada')
      } else {
        const result = await clinicsApi.create(form)
        Alerts.success(`Clínica creada · Admin: ${result.admin.email}`)
      }
      setShowModal(false); load()
    } catch (e: any) { Alerts.error(e.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  const setStatus = async (c: any, active: boolean) => {
    try {
      await (active ? clinicsApi.activate(c.id) : clinicsApi.suspend(c.id))
      Alerts.success(active ? 'Clínica activada' : 'Clínica suspendida')
      load()
    } catch {
      Alerts.error('Error al cambiar el estado')
    }
  }

  const F = ({ label, k, type = 'text', placeholder = '' }: any) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={placeholder} />
    </div>
  )

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
            ⚡ SUPERADMIN — GESTIÓN DE PLATAFORMA
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Clínicas registradas</h1>
        </div>
        <button onClick={openCreate} className="btn-green"><Plus size={15} /> Nueva clínica</button>
      </div>

      {/* Platform stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          [Building2, '#10b981', '#ecfdf5', 'Total clínicas',   platform?.totalClinics     ?? '—'],
          [CheckCircle2,'#10b981','#ecfdf5','Activas',          platform?.activeClinics    ?? '—'],
          [ShieldOff,  '#dc2626', '#fef2f2', 'Suspendidas',     platform?.suspendedClinics ?? '—'],
          [Users,      '#2563eb', '#eff6ff', 'Usuarios totales', platform?.totalUsers      ?? '—'],
        ].map(([Icon, c, bg, l, v]: any) => (
          <div key={l} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={16} color={c} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, padding: 3, gap: 2, marginBottom: 16, width: 'fit-content' }}>
        {[['all', 'Todas'], ['active', 'Activas'], ['suspended', 'Suspendidas']].map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val as any)}
            style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === val ? 'var(--surface)' : 'transparent', color: tab === val ? 'var(--text)' : 'var(--text2)', boxShadow: tab === val ? 'var(--shadow)' : 'none' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Clinics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map((c: any) => {
          const st = stats[c.id]
          return (
            <div key={c.id} className="card" style={{ padding: 18, opacity: c.isActive ? 1 : 0.75 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--green-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="var(--green)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>/{c.slug}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: PLAN_BG[c.plan], color: PLAN_COLOR[c.plan], textTransform: 'capitalize' }}>
                    {c.plan}
                  </span>
                  <button onClick={() => openEdit(c)} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '4px 6px', color: 'var(--text2)' }}><Edit2 size={12} /></button>
                </div>
              </div>

              {/* Contact */}
              {(c.email || c.phone) && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {c.email && <span>📧 {c.email}</span>}
                  {c.phone && <span>📞 {c.phone}</span>}
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {[['Usuarios', st?.users || 0, '#2563eb', '#eff6ff'], ['Clientes', st?.customers || 0, '#10b981', '#ecfdf5'], ['Ventas/mes', st?.salesThisMonth || 0, '#7c3aed', '#f5f3ff']].map(([l, v, col, bg]: any) => (
                  <div key={l} style={{ background: bg, borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              {Number(st?.revenueThisMonth) > 0 && (
                <div style={{ padding: '7px 10px', background: 'var(--green-xlight)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--green-dark)' }}>Ingresos (mes)</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-dark)' }}>{fmt(st.revenueThisMonth)}</span>
                </div>
              )}

              {/* Status + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.isActive ? 'var(--ok-bg)' : 'var(--out-bg)', color: c.isActive ? 'var(--ok)' : 'var(--out)' }}>
                  {c.isActive ? '● Activa' : '● Suspendida'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.isActive ? (
                    <button onClick={() => setStatus(c, false)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1.5px solid var(--out)', background: 'var(--out-bg)', color: 'var(--out)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShieldOff size={12} /> Suspender
                    </button>
                  ) : (
                    <button onClick={() => setStatus(c, true)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1.5px solid var(--ok)', background: 'var(--ok-bg)', color: 'var(--ok)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Activar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <Building2 size={36} style={{ margin: '0 auto 10px', display: 'block' }} strokeWidth={1.2} />
            Sin clínicas {tab !== 'all' ? `${tab === 'active' ? 'activas' : 'suspendidas'}` : ''}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editing ? 'Editar clínica' : 'Nueva clínica'}</h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>

            {/* Clinic info */}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Datos de la clínica</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}><F label="Nombre *" k="name" /></div>
              <F label="Slug (identificador) *" k="slug" placeholder="ej: mrmax-bogota" />
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Plan</label>
                <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                  {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <F label="NIT" k="nit" />
              <F label="Email" k="email" type="email" />
              <F label="Teléfono" k="phone" type="tel" />
              <div style={{ gridColumn: '1/-1' }}><F label="Dirección" k="address" /></div>
            </div>

            {/* Admin user — only on create */}
            {!editing && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  Usuario administrador (se crea automáticamente)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ gridColumn: '1/-1' }}><F label="Nombre del admin *" k="adminName" /></div>
                  <F label="Email del admin *" k="adminEmail" type="email" />
                  <F label="Contraseña inicial *" k="adminPassword" type="password" />
                </div>
                <div style={{ background: 'var(--green-xlight)', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: 'var(--green-dark)', marginBottom: 14 }}>
                  ✅ Al crear la clínica, el usuario admin se creará automáticamente con acceso inmediato.
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
              <button onClick={save} disabled={loading} className="btn-green" style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Crear clínica + Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
