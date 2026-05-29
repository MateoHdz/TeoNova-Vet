import { useEffect, useState } from 'react'
import { reportsApi, expensesApi, exportExcel } from '../services/api'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { ShoppingCart, TrendingUp, DollarSign, Scissors, Download, TrendingDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const today = new Date()
const PERIODS = [
  { label: 'Día',           from: format(today, 'yyyy-MM-dd'),                                  to: format(today, 'yyyy-MM-dd') },
  { label: 'Semana',        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') },
  { label: 'Mes',           from: format(startOfMonth(today), 'yyyy-MM-dd'),                    to: format(endOfMonth(today), 'yyyy-MM-dd') },
  { label: 'Personalizado', from: format(subDays(today, 30), 'yyyy-MM-dd'),                     to: format(today, 'yyyy-MM-dd') },
]
const COLORS = ['#10b981', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2']

function StatCard({ icon: Icon, color, bg, label, value, sub }: any) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={17} color={color} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function ReportsPage() {
  const [period, setPeriod]         = useState(1)
  const [from, setFrom]             = useState(PERIODS[1].from)
  const [to, setTo]                 = useState(PERIODS[1].to)
  const [summary, setSummary]       = useState<any>(null)
  const [chartData, setChartData]   = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topServices, setTopServices] = useState<any[]>([])
  const [payMethods, setPayMethods] = useState<any[]>([])
  const [expSummary, setExpSummary] = useState<any>(null)
  const [exporting, setExporting]   = useState(false)
  const [loading, setLoading]       = useState(false)

  const load = async (f: string, t: string) => {
    setLoading(true)
    try {
      const [s, days, prods, svcs, pay, exps] = await Promise.all([
        reportsApi.summary(f, t),
        reportsApi.salesByDay(f, t),
        reportsApi.topProducts(f, t),
        reportsApi.topServices(f, t),
        reportsApi.paymentMethods(f, t),
        expensesApi.summary(f, t).catch(() => null),
      ])
      setSummary(s)
      setChartData(days.map((d: any) => ({
        day:      format(new Date(d.date + 'T12:00:00'), 'd MMM', { locale: es }),
        Ingresos: Number(d.revenue)  || 0,
        Gastos:   Number(d.expenses) || 0,
      })))
      setTopProducts(prods)
      setTopServices(svcs)
      setPayMethods(pay.map((p: any) => ({ name: p.method, value: Number(p.total) || 0 })))
      setExpSummary(exps)
    } catch (e: any) {
      toast.error('Error cargando reportes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(from, to) }, [from, to])

  const selectPeriod = (i: number) => {
    setPeriod(i); setFrom(PERIODS[i].from); setTo(PERIODS[i].to)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportExcel(from, to)
      toast.success('Excel descargado correctamente')
    } catch { toast.error('Error al generar Excel') }
    finally { setExporting(false) }
  }

  const netProfit = (summary?.totalProfit || 0) - (expSummary?.totalAmount || 0)

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reportes financieros</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            {format(new Date(from + 'T12:00:00'), "d MMM", { locale: es })} — {format(new Date(to + 'T12:00:00'), "d MMM yyyy", { locale: es })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period tabs */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, padding: 3, gap: 2 }}>
            {PERIODS.map((p, i) => (
              <button key={i} onClick={() => selectPeriod(i)}
                style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: period === i ? 'var(--surface)' : 'transparent', color: period === i ? 'var(--text)' : 'var(--text2)', boxShadow: period === i ? 'var(--shadow)' : 'none' }}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 3 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriod(3) }} style={{ width: 148 }} />
              <input type="date" value={to}   onChange={e => { setTo(e.target.value);   setPeriod(3) }} style={{ width: 148 }} />
            </div>
          )}
          {/* Excel export */}
          <button onClick={handleExport} disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, color: 'var(--text2)', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? .7 : 1 }}>
            {exporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {exporting ? 'Generando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon={ShoppingCart}  color="#10b981" bg="#ecfdf5" label="Ventas totales"   value={summary?.totalSales      ?? (loading ? '...' : 0)} />
        <StatCard icon={DollarSign}    color="#2563eb" bg="#eff6ff" label="Ingresos"          value={summary ? fmt(summary.totalRevenue) : (loading ? '...' : fmt(0))} />
        <StatCard icon={TrendingDown}  color="#dc2626" bg="#fef2f2" label="Gastos período"    value={expSummary ? fmt(expSummary.totalAmount) : fmt(0)} />
        <StatCard icon={TrendingUp}    color={netProfit >= 0 ? '#10b981' : '#dc2626'} bg={netProfit >= 0 ? '#ecfdf5' : '#fef2f2'}
          label="Ganancia neta" value={fmt(netProfit)}
          sub={summary ? `Ganancia bruta: ${fmt(summary.totalProfit)}` : undefined} />
      </div>

      {/* Charts row */}
      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Income vs expenses bar chart */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Ingresos vs Gastos</h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>Comparativo por día</p>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Cargando...</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', flexDirection: 'column', gap: 8 }}>
              <TrendingUp size={28} strokeWidth={1.2} />
              <span style={{ fontSize: 13 }}>Sin datos en este período</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any, name: string) => [fmt(Number(value)), name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos"   fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment methods pie */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Métodos de pago</h2>
          {payMethods.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Sin datos</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={payMethods} dataKey="value" cx="50%" cy="50%" outerRadius={65} fontSize={11}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {payMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {payMethods.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    {p.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top products + top services */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top products */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Top productos vendidos</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Nombre', 'Unidades', 'Ingresos'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: h === '#' || h === 'Nombre' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 8).map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '10px 14px', color: 'var(--text3)', fontWeight: 700, fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13 }}>{Number(p.totalQty).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmt(p.totalRevenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top services */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Servicios más utilizados</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Servicio', 'Veces', 'Ingresos'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: h === '#' || h === 'Servicio' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topServices.slice(0, 8).map((s: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '10px 14px', color: 'var(--text3)', fontWeight: 700, fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13 }}>{Number(s.count)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmt(s.totalRevenue)}</td>
                </tr>
              ))}
              {topServices.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
