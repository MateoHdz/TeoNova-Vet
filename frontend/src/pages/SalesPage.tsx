import { useEffect, useState, useMemo } from 'react'
import { reportsApi, usersApi, salesApi, exportExcel } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Eye, Receipt, X, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Download, Users, CreditCard, User, Filter, Folder, XCircle } from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Alerts } from '../utils/alerts'
import Pagination from '../components/Pagination'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const methodLabel: any = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }
const typeLabel: any = { venta: 'Entrada (Venta)', gasto: 'Salida (Gasto)' }

const QUICK_RANGES = [
  { label: 'Hoy', days: 0 },
  { label: 'Ayer', days: 1 },
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Este mes', days: 30 },
]

export default function SalesPage() {
  const { isEmployee } = useAuthStore()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Filters state
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [type, setType] = useState('all') // 'all' | 'income' | 'expense'
  const [userId, setUserId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  
  const [activeRange, setActiveRange] = useState(0) // Default to "Hoy" (index 0)
  
  // Data state
  const [movements, setMovements] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [selectedMovement, setSelectedMovement] = useState<any>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  // Load all users for the filter dropdown
  useEffect(() => {
    usersApi.list()
      .then(setUsers)
      .catch(() => {})
  }, [])

  // Sync date pickers and load movements when filters change
  const load = async (f: string, t: string) => {
    setLoading(true)
    try {
      // Force today if employee
      const actualFrom = isEmployee() ? todayStr : f
      const actualTo = isEmployee() ? todayStr : t

      const data = await reportsApi.movements({
        from: actualFrom,
        to: actualTo,
        type: type !== 'all' ? type : undefined,
        userId: userId || undefined,
        paymentMethod: paymentMethod || undefined,
      })
      setMovements(data)
    } catch (err: any) {
      Alerts.error('Error al cargar movimientos financieros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(from, to)
  }, [from, to, type, userId, paymentMethod])

  useEffect(() => {
    setPage(1)
  }, [from, to, type, userId, paymentMethod, limit])

  // Force date range to today if employee on mount or whenever role changes
  useEffect(() => {
    if (isEmployee()) {
      setFrom(todayStr)
      setTo(todayStr)
      setActiveRange(0)
    }
  }, [isEmployee, todayStr])

  const applyRange = (idx: number) => {
    if (isEmployee()) return // Locked for workers
    setActiveRange(idx)
    const { days } = QUICK_RANGES[idx]
    if (days === 0) {
      setFrom(todayStr)
      setTo(todayStr)
    } else if (days === 1) {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      setFrom(yesterday)
      setTo(yesterday)
    } else {
      setFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
      setTo(todayStr)
    }
  }

  // Calculate totals dynamically from movements
  const totalIncomes = movements.reduce((s, m) => s + Number(m.entry || 0), 0)
  const totalExpenses = movements.reduce((s, m) => s + Number(m.exit || 0), 0)
  const netUtility = totalIncomes - totalExpenses

  const total = movements.length
  const paginatedMovements = useMemo(() => {
    const start = (page - 1) * limit
    return movements.slice(start, start + limit)
  }, [movements, page, limit])

  // Formato local basado en ISO standard
  const formatLocalTime = (isoString?: string): string => {
    if (!isoString) return '--:--'
    try {
      const d = new Date(isoString)
      const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true }
      return d.toLocaleTimeString('es-CO', opts)
    } catch {
      return '--:--'
    }
  }

  // ── Daily Sale Numbers: #1, #2, #3... resets each day ──────────────────────
  // Groups sales by date, sorts each group chronologically (ASC), assigns sequential #N
  const dailySaleNumbers = useMemo(() => {
    const numberMap = new Map<string, number>() // movement.id -> daily number
    // Group sale movements by date
    const byDate = new Map<string, any[]>()
    for (const m of movements) {
      if (m.type !== 'venta') continue
      if (!byDate.has(m.date)) byDate.set(m.date, [])
      byDate.get(m.date)!.push(m)
    }
    // Sort each date group chronologically (oldest first = #1)
    byDate.forEach((group) => {
      const sorted = [...group].sort((a, b) =>
        (a.soldAtISO || '').localeCompare(b.soldAtISO || '')
      )
      sorted.forEach((m, i) => numberMap.set(m.id, i + 1))
    })
    return numberMap
  }, [movements])

  const handleExportExcel = async () => {
    try {
      await exportExcel(from, to)
      Alerts.success('Excel exportado correctamente')
    } catch (err) {
      Alerts.error('Error al exportar Excel')
    }
  }

  // Open details (Sale details need fetching items)
  const viewDetail = async (m: any) => {
    setSelectedMovement(m)
    if (m.type === 'venta') {
      try {
        const fullSale = await salesApi.get(m.originalId)
        setDetail(fullSale)
      } catch (err) {
        Alerts.error('No se pudo cargar el detalle de la venta')
      }
    } else {
      // For expense, we have all information in the movement itself
      setDetail(m)
    }
  }

  const cancelSale = async (id: number) => {
    if (!(await Alerts.confirm('¿Cancelar esta venta?', 'Se restaurará el stock de los productos y se anulará el ingreso'))) return
    try {
      await salesApi.cancel(id)
      Alerts.success('Venta cancelada correctamente')
      setDetail(null)
      load(from, to)
    } catch (err: any) {
      Alerts.error(err.response?.data?.message || 'Error al cancelar la venta')
    }
  }

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={24} color="var(--green)" /> Movimientos Financieros
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
            Control contable unificado de ingresos, egresos y flujos de caja.
          </p>
        </div>

        {/* Action Buttons: Excel Export */}
        {!isEmployee() && (
          <button
            onClick={handleExportExcel}
            className="btn-green"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow)',
              padding: '10px 16px',
            }}
          >
            <Download size={16} />
            Exportar Reporte Excel
          </button>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Incomes Card */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpRight size={22} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Ingresos</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{fmt(totalIncomes)}</div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--out-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowDownRight size={22} color="var(--out)" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Egresos (Gastos)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--out)' }}>{fmt(totalExpenses)}</div>
          </div>
        </div>

        {/* Net Utility Card */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, gridColumn: 'span 2' }}>
          <div style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 12, 
            background: netUtility >= 0 ? '#ecfdf5' : '#fef2f2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <DollarSign size={22} color={netUtility >= 0 ? 'var(--green)' : 'var(--out)'} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Utilidad Neta Resultante</div>
            <div style={{ 
              fontSize: 22, 
              fontWeight: 900, 
              color: netUtility >= 0 ? 'var(--green-dark)' : 'var(--out)' 
            }}>
              {fmt(netUtility)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={16} /> Filtros y Búsqueda Avanzada
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top filter row: Dates and ranges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {/* Quick Ranges - Hidden/Disabled for employees */}
            {!isEmployee() && (
              <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, padding: 3, gap: 2 }}>
                {QUICK_RANGES.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => applyRange(i)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeRange === i ? 'var(--surface)' : 'transparent',
                      color: activeRange === i ? 'var(--text)' : 'var(--text2)',
                      boxShadow: activeRange === i ? 'var(--shadow)' : 'none',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Date Pickers - Disabled for employees */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 260 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="date"
                  value={from}
                  disabled={isEmployee()}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setActiveRange(-1)
                  }}
                  style={{
                    fontSize: 13,
                    padding: '8px 10px',
                    cursor: isEmployee() ? 'not-allowed' : 'pointer',
                    background: isEmployee() ? 'var(--surface2)' : 'var(--surface)'
                  }}
                />
              </div>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>al</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="date"
                  value={to}
                  disabled={isEmployee()}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setActiveRange(-1)
                  }}
                  style={{
                    fontSize: 13,
                    padding: '8px 10px',
                    cursor: isEmployee() ? 'not-allowed' : 'pointer',
                    background: isEmployee() ? 'var(--surface2)' : 'var(--surface)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom filter row: Category, Responsible and Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {/* Filter by Type */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>TIPO MOVIMIENTO</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                style={{ fontSize: 13, padding: '8px 10px' }}
              >
                <option value="all">Todos los movimientos</option>
                <option value="income">Solo Ingresos (Ventas)</option>
                <option value="expense">Solo Egresos (Gastos)</option>
              </select>
            </div>

            {/* Filter by Responsible User */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>USUARIO RESPONSABLE</label>
              <select 
                value={userId} 
                onChange={(e) => setUserId(e.target.value)}
                style={{ fontSize: 13, padding: '8px 10px' }}
              >
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Admin' : 'Empleado'})</option>
                ))}
              </select>
            </div>

            {/* Filter by Payment Method */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>MÉTODO DE PAGO</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ fontSize: 13, padding: '8px 10px' }}
              >
                <option value="">Todos los métodos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Movements Table ── */}
      <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ animation: 'spin 1s linear infinite', border: '3px solid var(--border)', borderTopColor: 'var(--green)', width: 32, height: 32, borderRadius: '50%', margin: '0 auto 12px' }} />
            Cargando historial de movimientos...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1.5px solid var(--border)' }}>
                  {['#', 'Tipo', 'Fecha/Hora', 'Método', 'Categoría', 'Entrada', 'Salida', 'Responsable', 'Acciones'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: ['Entrada', 'Salida', 'Acciones'].includes(h) ? 'right' : 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text2)',
                        textTransform: 'uppercase',
                        letterSpacing: '.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedMovements.map((m: any) => {
                  const isIncome = m.entry > 0
                  
                  return (
                    <tr
                      key={m.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* # / descripción del movimiento */}
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {m.type === 'venta' ? (
                          <span style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: 'var(--text)',
                            letterSpacing: '-0.02em',
                          }}>
                            #{dailySaleNumbers.get(m.id) ?? '?'}
                          </span>
                        ) : (
                          m.description
                        )}
                      </td>

                      {/* Movement Type Tag */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isIncome ? 'var(--green-xlight)' : 'var(--out-bg)',
                            color: isIncome ? 'var(--green-dark)' : 'var(--out)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {isIncome ? 'INGRESO' : 'EGRESO'}
                        </span>
                      </td>

                      {/* Date and Time */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>
                        <div style={{ fontWeight: 600 }}>{format(new Date(m.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatLocalTime(m.soldAtISO)}</div>
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                        {m.type === 'venta' ? methodLabel[m.paymentMethod] || m.paymentMethod : '💵 Efectivo'}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <span style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                          {m.category}
                        </span>
                      </td>

                      {/* Entry (Income) */}
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--green)', textAlign: 'right' }}>
                        {m.entry > 0 ? fmt(m.entry) : '—'}
                      </td>

                      {/* Exit (Expense) */}
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, color: 'var(--out)', textAlign: 'right' }}>
                        {m.exit > 0 ? fmt(m.exit) : '—'}
                      </td>

                      {/* Responsible User */}
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} color="var(--text3)" /> {m.user}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => viewDetail(m)}
                          style={{
                            background: 'var(--green-xlight)',
                            border: 'none',
                            borderRadius: 7,
                            padding: '6px 9px',
                            cursor: 'pointer',
                            color: 'var(--green-dark)',
                            transition: 'transform 0.1s',
                          }}
                          title="Ver Detalle"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {/* Empty State */}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                      <Receipt size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text3)' }} strokeWidth={1.2} />
                      <p style={{ fontWeight: 600, fontSize: 14 }}>Sin movimientos financieros en este período</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>Prueba ampliando el rango de fechas o cambiando los filtros aplicados.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && movements.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
          />
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detail && selectedMovement && (
        <div className="modal-overlay" onClick={() => { setDetail(null); setSelectedMovement(null); }}>
          <div className="modal-box" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedMovement.type === 'venta' ? <Receipt size={18} /> : <DollarSign size={18} />}
                {selectedMovement.type === 'venta' ? 'Venta Detallada' : 'Gasto Registrado'}
              </h3>
              <button onClick={() => { setDetail(null); setSelectedMovement(null); }} style={{ color: 'var(--text3)', padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* General Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18, background: 'var(--surface2)', borderRadius: 10, padding: 14 }}>
              {[
                ['TIPO DE MOVIMIENTO', typeLabel[selectedMovement.type]],
                ['FECHA Y HORA', `${format(new Date(selectedMovement.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })} a las ${formatLocalTime(selectedMovement.soldAtISO)}`],
                ['RESPONSABLE', selectedMovement.user],
                ['MÉTODO DE PAGO', selectedMovement.type === 'venta' ? methodLabel[detail.paymentMethod] || detail.paymentMethod : '💵 Efectivo'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.06em', fontWeight: 800 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: 'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Render items if Sale */}
            {selectedMovement.type === 'venta' ? (
              <>
                <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text2)', marginBottom: 8 }}>Artículos / Servicios Vendidos</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Descripción', 'Cant.', 'P.Unit', 'Total'].map(h => (
                        <th key={h} style={{ padding: '6px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textAlign: h === 'Descripción' ? 'left' : 'right', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 4px', fontSize: 13, color: 'var(--text)' }}>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              marginRight: 6,
                              background: item.itemType === 'service' ? 'var(--blue-light)' : 'var(--green-xlight)',
                              color: item.itemType === 'service' ? 'var(--blue)' : 'var(--green-dark)',
                            }}
                          >
                            {item.itemType === 'service' ? 'SVC' : 'PRD'}
                          </span>
                          {item.description}
                        </td>
                        <td style={{ padding: '8px 4px', fontSize: 13, textAlign: 'right', color: 'var(--text)' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 4px', fontSize: 13, textAlign: 'right', color: 'var(--text2)' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ padding: '8px 4px', fontSize: 13, fontWeight: 700, textAlign: 'right', color: 'var(--text)' }}>{fmt(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {detail.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
                      <span>Descuento</span>
                      <span style={{ color: 'var(--out)' }}>- {fmt(detail.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                    <span>Total Cobrado</span>
                    <span style={{ color: 'var(--green)' }}>{fmt(detail.total)}</span>
                  </div>
                </div>

                {/* Cancellation button for Sales: Admin can cancel any completed sale, Employee can cancel ONLY if the sale is from TODAY */}
                {detail.status === 'completed' && (!isEmployee() || selectedMovement.date === todayStr) && (
                  <button
                    onClick={() => cancelSale(detail.id)}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '10px',
                      borderRadius: 8,
                      background: 'var(--out-bg)',
                      color: 'var(--out)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 13,
                      transition: 'background 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--out-bg)')}
                  >
                    <XCircle size={14} /> Cancelar Venta (Reversar Caja y Stock)
                  </button>
                )}
              </>
            ) : (
              /* Detail Layout for Expense */
              <>
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', marginBottom: 4 }}>DESCRIPCIÓN / DETALLE</h4>
                  <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{selectedMovement.description}</p>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', marginBottom: 4 }}>CATEGORÍA DE GASTO</h4>
                  <span style={{ background: 'var(--surface2)', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--text2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Folder size={12} color="var(--text3)" /> {selectedMovement.category}
                  </span>
                </div>

                {selectedMovement.notes && (
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)', marginBottom: 4 }}>OBSERVACIONES / NOTAS</h4>
                    <p style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--surface2)', padding: '10px 12px', borderRadius: 8, fontStyle: 'italic' }}>
                      "{selectedMovement.notes}"
                    </p>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text2)' }}>Monto Total del Gasto</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--out)' }}>{fmt(selectedMovement.exit)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
