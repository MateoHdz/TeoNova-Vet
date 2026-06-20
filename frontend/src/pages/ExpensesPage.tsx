import { useEffect, useState } from 'react'
import { expensesApi } from '../services/api'
import { Plus, Edit2, Trash2, DollarSign, Search, X, Filter, Utensils, Car, Wrench, ShoppingBag, Zap, Users, Megaphone, FolderOpen, Folder } from 'lucide-react'
import { Alerts } from '../utils/alerts'
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const CATEGORIES: { value: string; label: string; color: string; bg: string; icon: any }[] = [
  { value: 'alimentacion', label: 'Alimentación',  color: '#16a34a', bg: '#f0fdf4', icon: Utensils },
  { value: 'transporte',   label: 'Transporte',    color: '#2563eb', bg: '#eff6ff', icon: Car },
  { value: 'mantenimiento',label: 'Mantenimiento', color: '#d97706', bg: '#fffbeb', icon: Wrench },
  { value: 'compras',      label: 'Compras',       color: '#7c3aed', bg: '#f5f3ff', icon: ShoppingBag },
  { value: 'servicios',    label: 'Servicios',     color: '#0891b2', bg: '#ecfeff', icon: Zap },
  { value: 'nomina',       label: 'Nómina',        color: '#be185d', bg: '#fdf2f8', icon: Users },
  { value: 'marketing',    label: 'Marketing',     color: '#ea580c', bg: '#fff7ed', icon: Megaphone },
  { value: 'otros',        label: 'Otros',         color: '#6b7280', bg: '#f3f4f6', icon: FolderOpen },
]

const getCat = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[7]

const QUICK = [
  { label: 'Hoy',    from: format(new Date(), 'yyyy-MM-dd'),                   to: format(new Date(), 'yyyy-MM-dd') },
  { label: '7 días', from: format(subDays(new Date(), 6), 'yyyy-MM-dd'),       to: format(new Date(), 'yyyy-MM-dd') },
  { label: 'Mes',    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),     to: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
]

const EMPTY = { description: '', amount: '', category: 'otros', date: format(new Date(), 'yyyy-MM-dd'), notes: '' }

export default function ExpensesPage() {
  const { isAdmin } = useAuthStore()
  const [expenses,   setExpenses]   = useState<any[]>([])
  const [summary,    setSummary]    = useState<any>(null)
  const [from,       setFrom]       = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to,         setTo]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [activeQ,    setActiveQ]    = useState(2)
  const [catFilter,  setCatFilter]  = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<any>(null)
  const [form,       setForm]       = useState(EMPTY)
  const [loading,    setLoading]    = useState(false)

  const load = async () => {
    const params: any = { from, to }
    if (catFilter) params.category = catFilter
    const [exp, sum] = await Promise.all([
      expensesApi.list(params).catch(() => []),
      expensesApi.summary(from, to).catch(() => null),
    ])
    setExpenses(exp)
    setSummary(sum)
  }

  useEffect(() => { load() }, [from, to, catFilter])

  const applyQuick = (idx: number) => {
    setActiveQ(idx)
    setFrom(QUICK[idx].from)
    setTo(QUICK[idx].to)
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit   = (e: any) => {
    setEditing(e)
    setForm({ description: e.description, amount: String(e.amount), category: e.category, date: e.date, notes: e.notes || '' })
    setShowModal(true)
  }

  const save = async () => {
    const missing = []
    if (!form.description) missing.push('Descripción')
    if (!form.amount) missing.push('Monto')
    if (!form.date) missing.push('Fecha')
    if (missing.length > 0) { Alerts.validationError(missing); return }
    
    if (Number(form.amount) <= 0) { Alerts.error('El monto debe ser mayor a 0'); return }
    setLoading(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      editing ? await expensesApi.update(editing.id, payload) : await expensesApi.create(payload)
      Alerts.success(editing ? 'Gasto actualizado' : 'Gasto registrado')
      setShowModal(false); load()
    } catch (e: any) { Alerts.error(e.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    if (!(await Alerts.confirm('¿Eliminar este gasto?', 'Se eliminará del registro y alterará el saldo final'))) return
    try {
      await expensesApi.remove(id); Alerts.success('Gasto eliminado'); load()
    } catch { Alerts.error('Error al eliminar') }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Gastos y egresos</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            {expenses.length} registro{expenses.length !== 1 ? 's' : ''} · Total: <strong style={{ color: '#dc2626' }}>{fmt(totalExpenses)}</strong>
          </p>
        </div>
        <button onClick={openCreate} className="btn-green"><Plus size={15} /> Registrar gasto</button>
      </div>

      {/* Quick filters + date range */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, padding: 3, gap: 2 }}>
          {QUICK.map((q, i) => (
            <button key={i} onClick={() => applyQuick(i)}
              style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeQ === i ? 'var(--surface)' : 'transparent', color: activeQ === i ? 'var(--text)' : 'var(--text2)', boxShadow: activeQ === i ? 'var(--shadow)' : 'none' }}>
              {q.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setActiveQ(-1) }} style={{ width: 148 }} />
          <input type="date" value={to}   onChange={e => { setTo(e.target.value);   setActiveQ(-1) }} style={{ width: 148 }} />
        </div>
        {/* Category filter */}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Summary cards by category */}
      {summary?.byCategory?.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {summary.byCategory.slice(0, 6).map((c: any) => {
            const cat = getCat(c.category)
            return (
              <div key={c.category} className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 160px', minWidth: 150 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cat.icon size={16} color={cat.color} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{cat.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>{fmt(Number(c.total))}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.count} registro{c.count !== '1' ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Expenses table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="responsive-table">
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '1.5px solid var(--border)' }}>
              {['Fecha', 'Descripción', 'Categoría', 'Monto', 'Registrado por', 'Observaciones', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e: any, i: number) => {
              const cat = getCat(e.category)
              return (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = '#fff')}>
                  <td data-label="Fecha" style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                    {format(new Date(e.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td data-label="Descripción" style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500 }}>{e.description}</td>
                  <td data-label="Categoría" style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: cat.bg, color: cat.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <cat.icon size={11} color={cat.color} /> {cat.label}
                    </span>
                  </td>
                  <td data-label="Monto" style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>
                    {fmt(Number(e.amount))}
                  </td>
                  <td data-label="Registrado por" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)' }}>{e.user?.name || '—'}</td>
                  <td data-label="Observaciones" style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.notes || '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(e)} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: 'var(--text2)' }}><Edit2 size={13} /></button>
                      {isAdmin() && (
                        <button onClick={() => remove(e.id)} style={{ background: 'var(--out-bg)', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: 'var(--out)' }}><Trash2 size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {expenses.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '52px', textAlign: 'center', color: 'var(--text3)' }}>
                <DollarSign size={32} style={{ margin: '0 auto 10px', display: 'block' }} strokeWidth={1.2} />
                Sin gastos en este período
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Total footer */}
        {expenses.length > 0 && (
          <div style={{ padding: '12px 14px', background: 'var(--surface2)', borderTop: '1.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{expenses.length} registros</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>Total: {fmt(totalExpenses)}</span>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editing ? 'Editar gasto' : 'Registrar gasto'}</h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Descripción *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej. Compra de pan para empleados" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Monto *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="1" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>Categoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                      style={{ padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${form.category === c.value ? c.color : 'var(--border)'}`, background: form.category === c.value ? c.bg : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                      <c.icon size={16} color={form.category === c.value ? c.color : 'var(--text3)'} />
                      <div style={{ fontSize: 10, fontWeight: 600, color: form.category === c.value ? c.color : 'var(--text3)', marginTop: 4 }}>{c.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Observaciones</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Detalle adicional..." style={{ resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
              <button onClick={save} disabled={loading} className="btn-green" style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
