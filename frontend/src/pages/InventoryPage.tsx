  import { useEffect, useState, useMemo, useRef } from 'react'
import { productsApi } from '../services/api'
import { 
  Plus, Search, Edit2, Trash2, Package, SlidersHorizontal, 
  TrendingUp, AlertTriangle, Activity, X, Tag, ArrowRight, Scale, Calculator
} from 'lucide-react'
import { Alerts } from '../utils/alerts'
import Pagination from '../components/Pagination'
import { fmtMoney, fmtUnitPrice, parseDecimalInput, roundPrice } from '../utils/money'
import { calcFromPackage, calcBulkProfitSummary } from '../utils/bulkUnits'

const EMPTY_BULK_CALC = {
  packageCost: '',
  packageWeight: '',
  packageUnit: 'kg' as 'kg' | 'lb' | 'g',
  marginPercent: '20',
  packageCount: '1',
}

const EMPTY = { 
  name: '', 
  sku: '', 
  category: 'Alimento', 
  purchasePrice: 0, 
  salePrice: 0, 
  stock: 0, 
  minStock: 5, 
  unit: 'unidad', 
  description: '',
  isBulk: false,
  saleUnit: 'unidad',
}

const CATS = ['Todas', 'Alimento', 'Accesorios', 'Higiene', 'Salud', 'Juguetes', 'Snacks', 'Otro']

const CAT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  'Alimento':   { bg: 'hsl(200, 95%, 94%)', text: 'hsl(200, 95%, 30%)', icon: '🍲' },
  'Accesorios': { bg: 'hsl(35, 95%, 94%)', text: 'hsl(35, 95%, 30%)', icon: '📿' },
  'Higiene':    { bg: 'hsl(210, 20%, 94%)', text: 'hsl(210, 20%, 40%)', icon: '🧼' },
  'Salud':      { bg: 'hsl(270, 85%, 95%)', text: 'hsl(270, 85%, 35%)', icon: '💊' },
  'Juguetes':   { bg: 'hsl(20, 95%, 94%)', text: 'hsl(20, 95%, 35%)', icon: '🧸' },
  'Snacks':     { bg: 'hsl(140, 75%, 94%)', text: 'hsl(140, 75%, 28%)', icon: '🦴' },
  'Otro':       { bg: 'hsl(0, 0%, 95%)', text: 'hsl(0, 0%, 40%)', icon: '📦' },
}

function StockBadge({ stock, minStock }: any) {
  if (stock === 0) return <span className="badge-out">⚠ Agotado</span>
  if (stock <= minStock) return <span className="badge-low">⚠ Bajo</span>
  return <span className="badge-ok">Disponible</span>
}

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [stockModal, setStockModal] = useState<any>(null)
  
  // Stock adjustment states
  const [stockQty, setStockQty]           = useState(0)
  const [stockNotes, setStockNotes]       = useState('')
  const [stockNewPurchase, setStockNewPurchase] = useState<string>('')
  const [stockNewSale, setStockNewSale]   = useState<string>('')
  const [bulkCalc, setBulkCalc] = useState(EMPTY_BULK_CALC)
  const [bulkSaleManual, setBulkSaleManual] = useState(false)
  const bulkSyncSkip = useRef(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<any>({})

  const load = () => {
    productsApi.list(search, lowStockOnly, category, page, limit)
      .then((res: any) => {
        setProducts(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => Alerts.error('Error al conectar con el servidor'))
    productsApi.summary().then(setSummary).catch(() => {})
  }

  useEffect(() => { setPage(1) }, [search, lowStockOnly, category, limit])
  useEffect(() => { load() }, [search, lowStockOnly, category, page, limit])

  // Dynamic KPI Metric Calculations
  const totalSKUs = summary.totalSKUs || 0
  const totalPurchaseValuation = summary.totalPurchaseValuation || 0
  const totalSaleValuation = summary.totalSaleValuation || 0
  const lowStockCount = summary.lowStockCount || 0
  const outOfStockCount = summary.outOfStockCount || 0

  const openCreate = () => { 
    setEditing(null)
    setForm(EMPTY)
    setBulkCalc(EMPTY_BULK_CALC)
    setBulkSaleManual(false)
    setShowModal(true) 
  }

  const openEdit = (p: any) => {
    setBulkCalc(EMPTY_BULK_CALC)
    setBulkSaleManual(true)
    setEditing(p)
    setForm({ 
      name: p.name, 
      sku: p.sku || '', 
      category: p.category || 'Alimento', 
      purchasePrice: Number(p.purchasePrice || 0), 
      salePrice: Number(p.salePrice || 0), 
      stock: Number(p.stock || 0), 
      minStock: Number(p.minStock || 5), 
      unit: p.unit || 'unidad', 
      description: p.description || '',
      isBulk: !!p.isBulk,
      saleUnit: p.saleUnit || 'unidad',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    const missing = []
    if (!form.name) missing.push('Nombre del Producto')
    if (form.salePrice <= 0) missing.push('Precio de Venta válido')
    
    if (missing.length > 0) {
      Alerts.validationError(missing)
      return
    }

    setLoading(true)
    try {
      editing ? await productsApi.update(editing.id, form) : await productsApi.create(form)
      Alerts.success(editing ? 'Producto actualizado' : 'Producto creado')
      setShowModal(false)
      load()
    } catch (e: any) { 
      Alerts.error(e.response?.data?.message || 'Error al guardar el producto') 
    } finally { 
      setLoading(false) 
    }
  }

  const handleStockAdjust = async (type: 'in' | 'out' | 'adjustment') => {
    if (stockQty <= 0) {
      Alerts.error('Ingresa una cantidad mayor que cero')
      return
    }
    try {
      await productsApi.adjustStock(stockModal.id, { 
        quantity: stockQty, 
        type, 
        notes: stockNotes || undefined,
        ...(type === 'in' && stockNewPurchase ? { newPurchasePrice: parseDecimalInput(stockNewPurchase) } : {}),
        ...(type === 'in' && stockNewSale     ? { newSalePrice:     parseDecimalInput(stockNewSale)     } : {}),
      })
      Alerts.success('Stock actualizado correctamente' + (type === 'in' && (stockNewPurchase || stockNewSale) ? ' · Precios actualizados' : ''))
      setStockModal(null)
      setStockQty(0)
      setStockNotes('')
      setStockNewPurchase('')
      setStockNewSale('')
      load()
    } catch (e: any) { 
      Alerts.error(e.response?.data?.message || 'Error al ajustar el inventario') 
    }
  }

  // Live Margins calculations for Editor Modal
  const modalMargin = form.salePrice > 0 
    ? Math.round(((form.salePrice - form.purchasePrice) / form.salePrice) * 100)
    : 0

  const bulkPreview = useMemo(() => {
    if (!form.isBulk) return null
    return calcFromPackage({
      packageCost: parseDecimalInput(bulkCalc.packageCost),
      packageWeight: parseDecimalInput(bulkCalc.packageWeight),
      packageUnit: bulkCalc.packageUnit,
      saleUnit: form.saleUnit || 'g',
      marginPercent: parseDecimalInput(bulkCalc.marginPercent) || 20,
      packageCount: parseDecimalInput(bulkCalc.packageCount) || 1,
    })
  }, [form.isBulk, form.saleUnit, bulkCalc])

  const bulkProfit = useMemo(() => {
    if (!form.isBulk || !bulkPreview || form.salePrice <= 0) return null
    return calcBulkProfitSummary(bulkPreview, form.salePrice)
  }, [form.isBulk, form.salePrice, bulkPreview])

  const patchBulkCalc = (patch: Partial<typeof EMPTY_BULK_CALC>) => {
    setBulkSaleManual(false)
    setBulkCalc(c => ({ ...c, ...patch }))
  }

  // Sincroniza precios y stock desde la calculadora de bulto
  useEffect(() => {
    if (!form.isBulk || !bulkPreview || bulkSyncSkip.current) return
    bulkSyncSkip.current = true
    setForm(f => ({
      ...f,
      purchasePrice: roundPrice(bulkPreview.purchasePerUnit, 4),
      salePrice: bulkSaleManual
        ? f.salePrice
        : roundPrice(bulkPreview.suggestedSalePerUnit, 4),
      unit: f.saleUnit || 'g',
      ...(!editing
        ? {
            stock: roundPrice(bulkPreview.totalStock, 3),
            minStock: roundPrice(bulkPreview.minStockSuggested, 3),
          }
        : {}),
    }))
    requestAnimationFrame(() => { bulkSyncSkip.current = false })
  }, [bulkPreview, form.isBulk, form.saleUnit, editing, bulkSaleManual])

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            📦 Control de Inventario
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
            Control logístico de productos, movimientos de stock, alertas y rentabilidad comercial.
          </p>
        </div>
        <button onClick={openCreate} className="btn-green" style={{ display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow)', borderRadius: 10 }}>
          <Plus size={16} />
          Agregar Producto
        </button>
      </div>

      {/* ── KPI Inventory Stats Row ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {/* Total Catalog Card */}
        <div 
          className="card" 
          style={{ 
            padding: '18px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            transition: 'all 0.25s ease', 
            border: '1px solid var(--border)' 
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={22} color="var(--text2)" />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Total Catálogo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
              {totalSKUs} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>SKUs</span>
            </div>
          </div>
        </div>

        {/* Inventory Valuation Card */}
        <div 
          className="card" 
          style={{ 
            padding: '18px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            transition: 'all 0.25s ease', 
            border: '1px solid var(--border)' 
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--green-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={22} color="var(--green)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Valor del Inventario</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginRight: 4 }}>Costo:</span>{fmtMoney(totalPurchaseValuation)}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green-dark)' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginRight: 4 }}>Venta:</span>{fmtMoney(totalSaleValuation)}
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div 
          className="card" 
          style={{ 
            padding: '18px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            transition: 'all 0.25s ease', 
            border: '1px solid var(--border)' 
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--low-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} color="var(--low)" />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Stock Crítico</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--low)' }}>
              {lowStockCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Productos</span>
            </div>
          </div>
        </div>

        {/* Out of Stock Card */}
        <div 
          className="card" 
          style={{ 
            padding: '18px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            transition: 'all 0.25s ease', 
            border: '1px solid var(--border)' 
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--out-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} color="var(--out)" />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Agotados</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--out)' }}>
              {outOfStockCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Productos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Filters ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)' }}>
        <div className="premium-search-wrapper">
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar por nombre de producto o SKU..."
            className="premium-search-input"
          />
        </div>

        {/* Category dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="premium-select"
            style={{ width: 200, padding: '0 12px' }}
          >
            {CATS.map(c => (
              <option key={c} value={c}>
                {c === 'Todas' ? '📂 Todas las categorías' : `${CAT_STYLES[c]?.icon || '📦'} ${c}`}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle Button */}
        <button 
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className="premium-filter-btn"
          style={{ 
            border: `1.5px solid ${lowStockOnly ? 'var(--green)' : 'var(--border)'}`, 
            background: lowStockOnly ? 'var(--green-xlight)' : 'var(--surface)', 
            color: lowStockOnly ? 'var(--green-dark)' : 'var(--text2)'
          }}
        >
          <SlidersHorizontal size={13} style={{ color: lowStockOnly ? 'var(--green)' : 'var(--text2)' }} />
          Solo Stock Bajo
        </button>
      </div>

      {/* ── Table Catalog ── */}
      <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1.5px solid var(--border)' }}>
                {['Producto / SKU', 'Categoría', 'Cantidad de Stock', 'Mínimo', 'P. Compra', 'P. Venta', 'Margen neto', 'Estado', 'Acciones'].map(h => (
                  <th 
                    key={h} 
                    style={{ 
                      padding: '14px 16px', 
                      textAlign: ['P. Compra', 'P. Venta', 'Margen neto', 'Acciones'].includes(h) ? 'right' : 'left', 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: 'var(--text2)', 
                      textTransform: 'uppercase', 
                      letterSpacing: '.06em', 
                      whiteSpace: 'nowrap' 
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => {
                const margin = p.salePrice > 0 ? Math.round(((p.salePrice - p.purchasePrice) / p.salePrice) * 100) : 0
                const isOutOfStock = p.stock === 0
                const isLowStock = p.stock > 0 && p.stock <= p.minStock
                
                // Get custom HSL styles for category
                const catStyle = CAT_STYLES[p.category] || { bg: 'hsl(0, 0%, 94%)', text: 'hsl(0, 0%, 35%)', icon: '📦' }

                // Stock progress width calculation for the inline indicator
                const stockProgress = Math.min((p.stock / Math.max(p.minStock, 1)) * 100, 100)
                const barColor = isOutOfStock ? 'var(--out)' : isLowStock ? '#d97706' : 'var(--green)'

                return (
                  <tr key={p.id} className="table-row-premium">
                    {/* Name & SKU */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{p.name}</div>
                      {p.sku ? (
                        <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 2, fontFamily: 'monospace' }}>
                          🔑 SKU: {p.sku}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic', marginTop: 2 }}>Sin SKU</div>
                      )}
                    </td>

                    {/* Styled Category Tag */}
                    <td style={{ padding: '14px 16px' }}>
                      <span 
                        style={{ 
                          background: catStyle.bg, 
                          color: catStyle.text, 
                          fontSize: 11, 
                          fontWeight: 700, 
                          padding: '4px 10px', 
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>{catStyle.icon}</span>
                        <span>{p.category || 'Otro'}</span>
                      </span>
                    </td>

                    {/* Stock level with visual progress bar */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ 
                            fontWeight: 800, 
                            fontSize: 14.5, 
                            color: isOutOfStock ? 'var(--out)' : isLowStock ? '#d97706' : 'var(--text)',
                          }}>
                             {p.isBulk
                               ? Number(p.stock).toLocaleString('es-CO', { maximumFractionDigits: 3 })
                               : Math.round(Number(p.stock)).toLocaleString('es-CO')
                             } <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{p.isBulk ? (p.saleUnit || 'kg') : (p.unit || 'uds')}</span>
                          </span>
                          {p.isBulk && (
                            <span style={{ 
                              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                              background: 'hsl(200,95%,94%)', color: 'hsl(200,95%,30%)',
                              letterSpacing: '.04em'
                            }}>A GRANEL</span>
                          )}
                          
                          {/* Stock adjustment shortcut button */}
                          <button 
                            onClick={() => { setStockModal(p); setStockQty(0); setStockNotes(''); setStockNewPurchase(''); setStockNewSale('') }}
                            style={{ 
                              fontSize: 10, 
                              fontWeight: 700, 
                              color: 'var(--green-dark)', 
                              background: 'var(--green-xlight)', 
                              padding: '2px 7px', 
                              borderRadius: 5, 
                              cursor: 'pointer',
                              border: 'none',
                              transition: 'transform 0.1s'
                            }}
                            title="Ajuste Rápido de Stock"
                          >
                            ⚡ Ajustar
                          </button>
                        </div>

                        {/* Inline micro progress bar */}
                        <div className="stock-progress-container">
                          <div 
                            className="stock-progress-fill" 
                            style={{ width: `${stockProgress}%`, backgroundColor: barColor }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Minimum stock threshold */}
                    <td style={{ padding: '14px 16px', color: 'var(--text2)', fontSize: 13 }}>
                      🛡️ {p.isBulk ? Number(p.minStock).toLocaleString('es-CO', { maximumFractionDigits: 3 }) : Math.round(Number(p.minStock)).toLocaleString('es-CO')} {p.isBulk ? (p.saleUnit || 'kg') : (p.unit || 'uds')}
                    </td>

                    {/* Purchase Price */}
                    <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'right', color: 'var(--text2)' }}>
                      {p.isBulk
                        ? <span title={`por ${p.saleUnit || 'unidad'}`}>{fmtUnitPrice(Number(p.purchasePrice), p.saleUnit)}<span style={{ fontSize: 10, color: 'var(--text3)' }}>/{p.saleUnit}</span></span>
                        : fmtMoney(p.purchasePrice)}
                    </td>

                    {/* Sale Price */}
                    <td style={{ padding: '14px 16px', fontSize: 13.5, fontWeight: 800, textAlign: 'right', color: 'var(--text)' }}>
                      {p.isBulk
                        ? <span title={`por ${p.saleUnit || 'unidad'}`}>{fmtUnitPrice(Number(p.salePrice), p.saleUnit)}<span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)' }}>/{p.saleUnit}</span></span>
                        : fmtMoney(p.salePrice)}
                    </td>

                    {/* Color-coded profit Margin */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span className={
                        margin > 40 
                          ? 'margin-badge-premium' 
                          : margin < 15 
                            ? 'margin-badge-low' 
                            : 'margin-badge-standard'
                      }>
                        {margin}%
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <StockBadge stock={p.stock} minStock={p.minStock} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openEdit(p)} 
                          style={{ background: 'var(--surface2)', borderRadius: 7, padding: '5px 7px', color: 'var(--text2)', cursor: 'pointer' }}
                          title="Editar Producto"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={async () => { 
                            if (!(await Alerts.confirm(`¿Eliminar ${p.name}?`, 'Esta acción no se puede deshacer y puede afectar ventas anteriores'))) return
                            await productsApi.remove(p.id)
                            Alerts.success('Producto eliminado de catálogo')
                            load() 
                          }} 
                          style={{ background: 'var(--out-bg)', borderRadius: 7, padding: '5px 7px', color: 'var(--out)', cursor: 'pointer' }}
                          title="Eliminar de catálogo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              
              {/* Empty state */}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '64px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text3)' }} strokeWidth={1.2} />
                    <p style={{ fontWeight: 600, fontSize: 14 }}>Sin productos en inventario</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>No hay artículos que coincidan con la búsqueda actual.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      </div>

      {/* ── Product Editor Modal ── */}
      {showModal && (
        <div className="modal-overlay-glass" onClick={() => setShowModal(false)}>
          <div className="modal-box-premium" style={{ width: 580, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {editing ? '📝 Editar Catálogo de Producto' : '📦 Registrar Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text3)', padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* Split, organized inputs layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Section 1: Basic Info */}
              <div>
                <div className="segmented-section-title" style={{ marginTop: 0 }}>
                  <Tag size={13} /> 1. Datos del Producto
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Nombre del Producto *</label>
                    <input 
                      type="text" 
                      value={form.name} 
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej. Alimento Premium Gato Cachorro 1.5kg" 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>SKU / Código de Barras</label>
                    <input 
                      type="text" 
                      value={form.sku} 
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                      placeholder="Código único..." 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Categoría</label>
                    <select 
                      value={form.category} 
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ fontSize: 13.5, height: 38 }}
                    >
                      {CATS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Observaciones / Descripción Corta</label>
                    <textarea 
                      value={form.description} 
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                      rows={2} 
                      placeholder="Detalles sobre presentación, sabor o proveedor..."
                      style={{ resize: 'none', width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Tipo de venta (granel primero) */}
              <div className="segmented-section">
                <div className="segmented-section-title" style={{ marginTop: 0 }}>
                  <Scale size={13} /> 2. Tipo de Venta
                </div>
                <div style={{
                  padding: '14px 16px',
                  background: form.isBulk ? 'hsl(200,95%,97%)' : 'var(--surface2)',
                  borderRadius: 10,
                  border: `1.5px solid ${form.isBulk ? 'hsl(200,80%,80%)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>¿Se vende a granel / por peso?</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 2 }}>
                        {form.isBulk
                          ? 'Completa el bulto; los precios y el stock se calculan solos abajo.'
                          : 'Producto por unidad (bolsa cerrada, accesorio, etc.)'}
                      </div>
                    </div>
                    <div
                      onClick={() => {
                        setBulkSaleManual(false)
                        setForm(f => {
                          const isBulk = !f.isBulk
                          const saleUnit = isBulk && f.saleUnit === 'unidad' ? 'g' : f.saleUnit
                          return { ...f, isBulk, saleUnit, unit: isBulk ? saleUnit : 'unidad' }
                        })
                      }}
                      style={{
                        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                        background: form.isBulk ? 'var(--green)' : 'var(--border2)',
                        position: 'relative', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, left: form.isBulk ? 22 : 3,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'left .2s',
                      }} />
                    </div>
                  </div>

                  {form.isBulk && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                            UNIDAD EN LA QUE VENDERÁS (precio y stock)
                          </label>
                          <select
                            value={form.saleUnit}
                            onChange={e => {
                              const saleUnit = e.target.value
                              setBulkSaleManual(false)
                              setForm(f => ({ ...f, saleUnit, unit: saleUnit }))
                            }}
                            style={{ fontSize: 13, height: 38 }}
                          >
                            <option value="g">Gramo (g) — recomendado alimentos</option>
                            <option value="kg">Kilogramo (kg)</option>
                            <option value="lb">Libra (lb)</option>
                            <option value="l">Litro (l)</option>
                            <option value="ml">Mililitro (ml)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{
                        padding: 14, borderRadius: 10,
                        background: 'hsl(45, 95%, 97%)', border: '1.5px solid hsl(45, 80%, 75%)',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calculator size={14} /> Datos del bulto / saco que compras
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>¿CUÁNTO TE COSTÓ EL BULTO? (COP)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={bulkCalc.packageCost}
                              onChange={e => patchBulkCalc({ packageCost: e.target.value })}
                              placeholder="Ej: 85000"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>PESO DE CADA BULTO</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={bulkCalc.packageWeight}
                              onChange={e => patchBulkCalc({ packageWeight: e.target.value })}
                              placeholder="Ej: 25"
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>UNIDAD DEL PESO</label>
                            <select
                              value={bulkCalc.packageUnit}
                              onChange={e => patchBulkCalc({ packageUnit: e.target.value as 'kg' | 'lb' | 'g' })}
                              style={{ fontSize: 13, height: 38 }}
                            >
                              <option value="kg">Kilogramos (kg)</option>
                              <option value="lb">Libras (lb)</option>
                              <option value="g">Gramos (g)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>¿CUÁNTOS BULTOS COMPRASTE?</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={bulkCalc.packageCount}
                              onChange={e => patchBulkCalc({ packageCount: e.target.value })}
                              placeholder="1"
                              disabled={!!editing}
                              style={{ background: editing ? 'var(--surface2)' : undefined }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>MARGEN DE GANANCIA (%)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={bulkCalc.marginPercent}
                              onChange={e => patchBulkCalc({ marginPercent: e.target.value })}
                              placeholder="20"
                            />
                          </div>
                        </div>

                        {bulkPreview ? (
                          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid var(--border)', fontSize: 12 }}>
                            <div style={{ fontWeight: 800, color: 'var(--green-dark)', marginBottom: 8 }}>
                              Costo calculado por {form.saleUnit}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>COMPRA / {form.saleUnit}</span>
                                <div style={{ fontWeight: 800 }}>{fmtUnitPrice(bulkPreview.purchasePerUnit, form.saleUnit)}</div>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>VENTA SUGERIDA / {form.saleUnit}</span>
                                <div style={{ fontWeight: 800, color: 'var(--green-dark)' }}>{fmtUnitPrice(bulkPreview.suggestedSalePerUnit, form.saleUnit)}</div>
                              </div>
                              {!editing && (
                                <>
                                  <div>
                                    <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>STOCK TOTAL</span>
                                    <div style={{ fontWeight: 700 }}>
                                      {bulkPreview.totalStock.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {form.saleUnit}
                                    </div>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>ALERTA (⅓ RESTANTE)</span>
                                    <div style={{ fontWeight: 700, color: '#d97706' }}>
                                      {bulkPreview.minStockSuggested.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {form.saleUnit}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, lineHeight: 1.4 }}>
                              {bulkPreview.weightInSaleUnit.toLocaleString('es-CO')} {form.saleUnit} por bulto × {bulkCalc.packageCount || 1} bulto(s).
                              Te avisamos cuando quede un tercio para reordenar.
                            </p>
                          </div>
                        ) : (
                          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
                            Ingresa costo y peso del bulto para calcular el precio por {form.saleUnit}.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Valores (auto desde granel o manual) */}
              <div className="segmented-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="segmented-section-title" style={{ marginBottom: 0 }}>
                    💰 3. Valores y Moneda
                  </div>
                  {form.salePrice > 0 && (
                    <span className={
                      modalMargin > 40 ? 'margin-badge-premium' : modalMargin < 15 ? 'margin-badge-low' : 'margin-badge-standard'
                    }>
                      Margen unitario: {modalMargin}%
                    </span>
                  )}
                </div>

                {form.isBulk && !bulkPreview && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                    Completa los datos del bulto en el paso 2 para llenar precios automáticamente.
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                      Precio de compra {form.isBulk ? `/ ${form.saleUnit}` : ''}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      readOnly={form.isBulk && !!bulkPreview}
                      value={form.purchasePrice ? String(form.purchasePrice) : ''}
                      onChange={e => !form.isBulk && setForm(f => ({ ...f, purchasePrice: parseDecimalInput(e.target.value) }))}
                      placeholder="0"
                      style={form.isBulk && bulkPreview ? { background: 'var(--surface2)', cursor: 'default' } : undefined}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                      Precio de venta * {form.isBulk ? `/ ${form.saleUnit}` : ''}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.salePrice ? String(form.salePrice) : ''}
                      onChange={e => {
                        if (form.isBulk) setBulkSaleManual(true)
                        setForm(f => ({ ...f, salePrice: parseDecimalInput(e.target.value) }))
                      }}
                      placeholder={form.isBulk ? 'Se sugiere según margen' : '0'}
                    />
                    {form.isBulk && bulkPreview && !bulkSaleManual && (
                      <button
                        type="button"
                        onClick={() => setBulkSaleManual(false)}
                        style={{ fontSize: 10, color: 'var(--green-dark)', fontWeight: 700, marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Usar sugerido: {fmtUnitPrice(bulkPreview.suggestedSalePerUnit, form.saleUnit)}
                      </button>
                    )}
                  </div>
                </div>

                {form.isBulk && bulkProfit && (
                  <div style={{
                    marginTop: 14, padding: 14, borderRadius: 10,
                    background: 'var(--green-xlight)', border: '1.5px solid rgba(16,185,129,0.25)',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                      Si vendes todo el stock a {fmtUnitPrice(form.salePrice, form.saleUnit)}/{form.saleUnit}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 12 }}>
                      <div>
                        <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>INVERSIÓN TOTAL</div>
                        <div style={{ fontWeight: 800 }}>{fmtMoney(bulkProfit.totalCost)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>INGRESO TOTAL</div>
                        <div style={{ fontWeight: 800 }}>{fmtMoney(bulkProfit.totalRevenue)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700 }}>GANANCIA TOTAL</div>
                        <div style={{ fontWeight: 800, color: bulkProfit.totalProfit >= 0 ? 'var(--green-dark)' : 'var(--out)', fontSize: 15 }}>
                          {fmtMoney(bulkProfit.totalProfit)}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 8 }}>
                      Equivale a un margen del <strong>{bulkProfit.marginOnBulkPercent}%</strong> sobre todo el bulto
                      ({bulkPreview?.totalStock.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {form.saleUnit}).
                    </p>
                  </div>
                )}

              </div>

              {/* Section 4: Stock */}
              <div className="segmented-section">
                <div className="segmented-section-title">
                  📈 4. Control de Stock y Alertas
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                      Stock {form.isBulk ? `(${form.saleUnit})` : 'inicial'}
                    </label>
                    <input
                      type="number"
                      disabled={!!editing || (form.isBulk && !!bulkPreview)}
                      value={form.stock}
                      step={form.isBulk ? '0.001' : '1'}
                      min="0"
                      onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                      style={{
                        background: editing || (form.isBulk && bulkPreview) ? 'var(--surface2)' : 'var(--surface)',
                        cursor: editing || (form.isBulk && bulkPreview) ? 'not-allowed' : 'text',
                      }}
                    />
                    {form.isBulk && bulkPreview && !editing && (
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Auto: bultos × peso</p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                      Alerta stock mín.
                    </label>
                    <input
                      type="number"
                      value={form.minStock}
                      step={form.isBulk ? '0.001' : '1'}
                      min="0"
                      onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))}
                    />
                    {form.isBulk && (
                      <p style={{ fontSize: 10, color: '#d97706', marginTop: 4, fontWeight: 600 }}>
                        Sugerido: ⅓ del stock (reordenar)
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Etiqueta unidad</label>
                    <input
                      type="text"
                      value={form.unit}
                      readOnly={form.isBulk}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      style={form.isBulk ? { background: 'var(--surface2)' } : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={loading} 
                className="btn-green" 
                style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: 13, borderRadius: 8 }}
              >
                {loading ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Registrar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Adjustment Modal (with live math forecasts) ── */}
      {stockModal && (
        <div className="modal-overlay-glass" onClick={() => setStockModal(null)}>
          <div className="modal-box-premium" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                ⚡ Ajuste Rápido de Stock
              </h3>
              <button onClick={() => setStockModal(null)} style={{ color: 'var(--text3)', padding: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Producto Seleccionado</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{stockModal.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                Stock actual: <strong>
                  {stockModal.isBulk
                    ? Number(stockModal.stock).toLocaleString('es-CO', { maximumFractionDigits: 3 })
                    : Math.round(Number(stockModal.stock)).toLocaleString('es-CO')
                  }
                </strong> {stockModal.isBulk ? (stockModal.saleUnit || 'kg') : (stockModal.unit || 'uds')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Quantity */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Cantidad a ajustar</label>
                <div className="premium-search-wrapper" style={{ minWidth: 'unset' }}>
                  <input 
                    type="number"
                    className="premium-search-input"
                    style={{ paddingLeft: '14px' }}
                    value={stockQty || ''} 
                    onChange={e => setStockQty(Math.max(0, Number(e.target.value)))} 
                    min={1} 
                    placeholder="Ingresa cantidad..."
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Concepto / Motivo</label>
                <div className="premium-search-wrapper" style={{ minWidth: 'unset' }}>
                  <SlidersHorizontal size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    className="premium-search-input"
                    value={stockNotes} 
                    onChange={e => setStockNotes(e.target.value)} 
                    placeholder="Ej. Compra a proveedor, avería, devolución..."
                  />
                </div>
              </div>

              {/* Price update — only for ENTRADA */}
              <div style={{
                borderTop: '1.5px dashed var(--border)',
                paddingTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <TrendingUp size={13} color="#d97706" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Actualizar precios al recibir mercancía (solo +Entrada)
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 2 }}>
                  Deja en blanco para conservar los precios actuales.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Nuevo precio de compra</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="premium-search-input"
                      style={{ paddingLeft: '12px' }}
                      value={stockNewPurchase}
                      onChange={e => setStockNewPurchase(e.target.value)}
                      placeholder={`Actual: ${fmtMoney(Number(stockModal.purchasePrice))}`}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Nuevo precio de venta</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="premium-search-input"
                      style={{ paddingLeft: '12px' }}
                      value={stockNewSale}
                      onChange={e => setStockNewSale(e.target.value)}
                      placeholder={`Actual: ${fmtMoney(Number(stockModal.salePrice))}`}
                    />
                  </div>
                </div>
              </div>

              {/* Reactive Stock Forecast Preview */}
              {stockQty > 0 && (
                <div style={{ borderTop: '1.5px dashed var(--border)', paddingTop: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                    🔮 Vista Previa del Ajuste
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Entrada Forecast */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'var(--green-xlight)', 
                      borderRadius: 10, 
                      padding: '10px 14px', 
                      border: '1px solid #a7f3d0' 
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 10.5, color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>Ingreso (+ Entrada)</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Sumará al inventario</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{stockModal.isBulk ? Number(stockModal.stock).toLocaleString('es-CO',{maximumFractionDigits:3}) : Math.round(Number(stockModal.stock))}</span>
                        <ArrowRight size={14} style={{ color: 'var(--green)' }} />
                        <span style={{ color: 'var(--green-dark)', fontSize: 15, fontWeight: 850 }}>
                          +{stockQty} &rarr; {stockModal.isBulk ? (Number(stockModal.stock)+stockQty).toLocaleString('es-CO',{maximumFractionDigits:3}) : Math.round(Number(stockModal.stock))+stockQty}
                        </span>
                      </div>
                    </div>
                    {/* Salida Forecast */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'var(--out-bg)', 
                      borderRadius: 10, 
                      padding: '10px 14px', 
                      border: '1px solid #fecdd3' 
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 10.5, color: '#be123c', fontWeight: 800, textTransform: 'uppercase' }}>Egreso (− Salida)</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Restará al inventario</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{stockModal.isBulk ? Number(stockModal.stock).toLocaleString('es-CO',{maximumFractionDigits:3}) : Math.round(Number(stockModal.stock))}</span>
                        <ArrowRight size={14} style={{ color: 'var(--out)' }} />
                        <span style={{ color: 'var(--out)', fontSize: 15, fontWeight: 850 }}>
                          -{stockQty} &rarr; {stockModal.isBulk ? Math.max(0,Number(stockModal.stock)-stockQty).toLocaleString('es-CO',{maximumFractionDigits:3}) : Math.max(0,Math.round(Number(stockModal.stock))-stockQty)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Operation actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button 
                type="button"
                onClick={() => setStockModal(null)} 
                style={{ flex: 1.2, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 12.5 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleStockAdjust('out')} 
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--out-bg)', color: 'var(--out)', cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}
              >
                − Salida
              </button>
              <button 
                onClick={() => handleStockAdjust('in')} 
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--ok-bg)', color: 'var(--ok)', cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}
              >
                + Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
