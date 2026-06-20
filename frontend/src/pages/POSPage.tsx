import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { productsApi, servicesApi, customersApi, petsApi, salesApi, appointmentsApi } from '../services/api'
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, Scissors, Check, Coins, ChevronDown, X, Receipt } from 'lucide-react'
import { Alerts } from '../utils/alerts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import AutocompleteSearch from '../components/AutocompleteSearch'
import { fmtMoney, fmtUnitPrice, parseDecimalInput } from '../utils/money'
import { BULK_QUICK_QTY } from '../utils/bulkUnits'

const fmt = fmtMoney

interface CartItem {
  key: string
  itemType: 'product' | 'service'
  id: number
  description: string
  quantity: number
  unitPrice: number
  purchasePrice: number
  serviceDateStart?: string
  serviceDateEnd?: string
  serviceNotes?: string
}

const COP_QUICK_BILLS = [5000, 10000, 20000, 50000, 100000]

export default function POSPage() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [tab, setTab] = useState<'products' | 'services'>('products')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [selectedPet, setSelectedPet] = useState<any>(null)

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [discount, setDiscount] = useState(0)
  const [cashReceived, setCashReceived] = useState(0)
  const [boardingModal, setBoardingModal] = useState<any>(null)
  const [bulkModal, setBulkModal] = useState<any>(null)   // For bulk/weighted products
  const [loading, setLoading] = useState(false)

  // Preloaded appointment context state
  const [preloadedAppointmentId, setPreloadedAppointmentId] = useState<number | null>(null)
  const [preloadedDetails, setPreloadedDetails] = useState<any>(null)

  // Load catalog + all customers on mount
  const loadCatalog = () => {
    productsApi.list().then(setProducts).catch(() => {})
    servicesApi.list().then(setServices).catch(() => {})
    customersApi.list().then(setAllCustomers).catch(() => {})
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  // Auto-preload from location state when customers are loaded
  useEffect(() => {
    if (allCustomers.length > 0 && location.state?.preloadedCheckout) {
      const checkout = location.state.preloadedCheckout
      
      // Avoid duplicate preloading triggers
      if (preloadedAppointmentId === checkout.appointmentId) return

      setPreloadedAppointmentId(checkout.appointmentId)
      setPreloadedDetails(checkout)

      const customer = allCustomers.find((c) => c.id === Number(checkout.customerId))
      if (customer) {
        setSelectedCustomer(customer)
        setSelectedPet(null)
        
        // Fetch pets for preloaded customer and select the correct one
        petsApi.list(undefined, customer.id).then((customerPets) => {
          setPets(customerPets)
          const matchingPet = customerPets.find((p: any) => p.id === Number(checkout.petId))
          if (matchingPet) setSelectedPet(matchingPet)
        }).catch(() => {})
      }

      // Preload service with historical snapshot (name, agreed price) preserved
      const serviceId = checkout.serviceId
      const serviceName = checkout.description || 'Servicio'
      const servicePrice = Number(checkout.price || 0)
      const key = `service-${serviceId}-${Date.now()}`

      setCart([
        {
          key,
          itemType: 'service',
          id: Number(serviceId),
          description: serviceName,
          quantity: 1,
          unitPrice: servicePrice,
          purchasePrice: 0
        }
      ])

      Alerts.success('Servicio precargado desde la agenda')
      
      // Clear route state to prevent reload on refresh
      navigate('.', { replace: true, state: null })
    }
  }, [allCustomers, location.state, preloadedAppointmentId, navigate])

  // Derive categories from product catalog
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    return ['Todos', ...unique]
  }, [products])

  // Filtered list depending on tab, search query, and category
  const filteredCatalog = useMemo(() => {
    const query = search.toLowerCase()
    if (tab === 'products') {
      return products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query))
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory
        return matchesSearch && matchesCategory
      })
    } else {
      return services.filter((s) => s.name.toLowerCase().includes(query))
    }
  }, [tab, search, selectedCategory, products, services])

  const addProduct = (p: any) => {
    if (Number(p.stock) === 0) {
      Alerts.error(`${p.name} está agotado`)
      return
    }
    // Bulk products: open quantity modal instead of instant add
    if (p.isBulk) {
      setBulkModal({ product: p, qty: '', targetPrice: '', mode: 'qty' })
      return
    }
    const key = `product-${p.id}`
    
    const ex = cart.find((i) => i.key === key)
    if (ex && ex.quantity >= Number(p.stock)) {
      Alerts.error(`Stock máximo disponible: ${p.stock}`)
      return
    }

    if (!ex) {
      Alerts.success(`${p.name} agregado al carrito`)
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [
        ...prev,
        {
          key,
          itemType: 'product',
          id: p.id,
          description: p.name,
          quantity: 1,
          unitPrice: Number(p.salePrice),
          purchasePrice: Number(p.purchasePrice),
        },
      ]
    })
  }

  // Add a bulk/weighted product to cart with the specified decimal quantity
  const addBulkToCart = () => {
    if (!bulkModal) return
    const { product } = bulkModal
    const qty = parseDecimalInput(String(bulkModal.qty))
    if (!qty || qty <= 0) {
      Alerts.error('Ingresa una cantidad válida')
      return
    }
    if (qty > Number(product.stock)) {
      Alerts.error(`Stock disponible: ${product.stock} ${product.saleUnit || 'kg'}`)
      return
    }
    const key = `product-${product.id}-${Date.now()}` // unique per bulk entry
    setCart((prev) => [
      ...prev,
      {
        key,
        itemType: 'product',
        id: product.id,
        description: `${product.name} (${qty} ${product.saleUnit || 'kg'})`,
        quantity: qty,
        unitPrice: Number(product.salePrice),
        purchasePrice: Number(product.purchasePrice),
      },
    ])
    setBulkModal(null)
    Alerts.success(`${product.name} agregado al carrito`)
  }

  const addService = (s: any) => {
    if (s.type === 'boarding') {
      setBoardingModal(s)
      return
    }
    const key = `service-${s.id}-${Date.now()}`
    setCart((prev) => [
      ...prev,
      {
        key,
        itemType: 'service',
        id: s.id,
        description: s.name,
        quantity: 1,
        unitPrice: Number(s.basePrice),
        purchasePrice: 0,
      },
    ])
    Alerts.success(`${s.name} agregado al carrito`)
  }

  const updateQty = (key: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.key !== key) return i
          const newQty = i.quantity + delta
          if (newQty <= 0) return null as any
          if (i.itemType === 'product' && delta > 0) {
            const prod = products.find((p) => p.id === i.id)
            if (prod && newQty > prod.stock) {
              Alerts.error(`Stock máximo disponible: ${prod.stock}`)
              return i
            }
          }
          return { ...i, quantity: newQty }
        })
        .filter(Boolean)
    )

  const updatePrice = (key: string, newPrice: number) => {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, unitPrice: newPrice } : i)))
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const total = Math.max(0, subtotal - discount)
  const change = paymentMethod === 'cash' && cashReceived >= total ? cashReceived - total : 0

  const selectCustomer = (c: any) => {
    setSelectedCustomer(c)
    setSelectedPet(null)
    petsApi.list(undefined, c.id).then(setPets).catch(() => {})
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setSelectedPet(null)
    setPets([])
  }

  const discardPreload = () => {
    setPreloadedAppointmentId(null)
    setPreloadedDetails(null)
    setCart([])
    clearCustomer()
    Alerts.success('Servicio precargado cancelado')
  }

  const handleSale = async () => {
    if (cart.length === 0) {
      Alerts.error('El carrito está vacío')
      return
    }
    setLoading(true)
    try {
      await salesApi.create({
        customerId: selectedCustomer?.id || undefined,
        petId: selectedPet?.id || undefined,
        paymentMethod,
        discount: discount || 0,
        items: cart.map((i) => ({
          itemType: i.itemType,
          ...(i.itemType === 'product' ? { productId: i.id } : { serviceId: i.id }),
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          purchasePrice: i.purchasePrice,
          serviceDateStart: i.serviceDateStart,
          serviceDateEnd: i.serviceDateEnd,
          serviceNotes: i.serviceNotes,
        })),
        notes: preloadedAppointmentId ? `Facturación de la Cita #${preloadedAppointmentId}` : undefined,
      })
      
      // Update preloaded appointment status to Invoiced (delivered)
      if (preloadedAppointmentId) {
        try {
          await appointmentsApi.updateStatus(preloadedAppointmentId, 'delivered')
        } catch (err) {
          console.error('Error updating preloaded appointment status:', err)
        }
      }

      Alerts.success('¡Venta registrada con éxito!')
      setCart([])
      setDiscount(0)
      setCashReceived(0)
      setPreloadedAppointmentId(null)
      setPreloadedDetails(null)
      clearCustomer()
      loadCatalog()
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Error al registrar venta'
      Alerts.error(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickCash = (bill: number) => {
    setCashReceived((prev) => prev + bill)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
      {/* ── Left: Catalog Grid ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px 20px 20px 24px' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Ventas</h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {(['products', 'services'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t)
                  setSearch('')
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--green-dark)' : 'var(--text2)',
                  boxShadow: tab === t ? 'var(--shadow)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {t === 'products' ? (
                  <>
                    <Package size={14} /> Productos
                  </>
                ) : (
                  <>
                    <Scissors size={14} /> Servicios
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search and category filter row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar por nombre o descripción de ${tab === 'products' ? 'producto (o SKU)' : 'servicio'}...`}
              style={{
                paddingLeft: 42,
                height: 44,
                borderRadius: '12px',
                border: '1.5px solid var(--border)',
                fontSize: '14px',
                width: '100%',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
              }}
            />
          </div>

          {/* Dynamic Categories Scrollbar (Only for products) */}
          {tab === 'products' && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    background: selectedCategory === cat ? 'var(--green)' : 'var(--surface)',
                    color: selectedCategory === cat ? '#fff' : 'var(--text2)',
                    border: selectedCategory === cat ? '1px solid var(--green)' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== cat) {
                      e.currentTarget.style.borderColor = 'var(--green)'
                      e.currentTarget.style.color = 'var(--green-dark)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== cat) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text2)'
                    }
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid Catalog */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 12,
            alignContent: 'start',
            paddingRight: '4px',
          }}
        >
          {filteredCatalog.map((item: any) => {
            const stockAmount = Number(item.stock)
            const outOfStock = tab === 'products' && stockAmount === 0
            const cartItemKey = tab === 'products' ? `product-${item.id}` : `service-${item.id}`
            const cartQty = cart.filter((c) => c.itemType === tab.slice(0, -1) && c.id === item.id).reduce((acc, curr) => acc + curr.quantity, 0)
            const lowStock = tab === 'products' && stockAmount <= Number(item.min_stock)

            return (
              <div
                key={item.id}
                onClick={() => (tab === 'products' ? addProduct(item) : addService(item))}
                style={{
                  background: outOfStock ? 'var(--out-bg)' : 'var(--surface)',
                  border: cartQty > 0 ? '1.8px solid var(--green)' : outOfStock ? '1px solid #fecaca' : '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: outOfStock ? 0.55 : 1,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '190px',
                  boxShadow: cartQty > 0 ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'var(--shadow)',
                }}
                onMouseEnter={(e) => {
                  if (!outOfStock) {
                    e.currentTarget.style.borderColor = 'var(--green)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.06)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = cartQty > 0 ? 'var(--green)' : 'var(--border)'
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = cartQty > 0 ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'var(--shadow)'
                }}
              >
                {/* Visual Category/Stock Indicators */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: tab === 'products' ? 'var(--green-dark)' : '#2563eb',
                      background: tab === 'products' ? 'var(--green-xlight)' : '#eff6ff',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tab === 'products' ? item.category || 'Varios' : 'Servicio'}
                  </span>

                  {tab === 'products' && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '20px',
                        background: outOfStock ? 'var(--out-bg)' : lowStock ? 'var(--low-bg)' : 'rgba(16, 185, 129, 0.08)',
                        color: outOfStock ? 'var(--out)' : lowStock ? 'var(--low)' : 'var(--green-dark)',
                      }}
                    >
                      {outOfStock ? 'Agotado' : item.isBulk 
                        ? (item.saleUnit === 'g' 
                            ? `${(stockAmount / 1000).toLocaleString('es-CO', { maximumFractionDigits: 3 })} kg`
                            : `${stockAmount.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${item.saleUnit || 'kg'}`)
                        : `Stock: ${Math.floor(stockAmount)}`}
                    </span>
                  )}
                </div>

                {/* Mid section: Icon & Details */}
                <div style={{ marginTop: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.name}
                  </div>
                  {item.sku && (
                    <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'monospace', display: 'block', marginBottom: 2 }}>
                      {item.sku}
                    </span>
                  )}
                </div>

                {/* Bottom row: Price and cart quantity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
                    {tab === 'products'
                      ? item.isBulk
                        ? <span style={{ fontSize: 14 }}>{fmtUnitPrice(Number(item.salePrice), item.saleUnit)}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>/{item.saleUnit}</span></span>
                        : fmt(item.salePrice)
                      : item.isPriceVariable ? 'Variable' : fmt(item.basePrice)}
                  </div>

                  {cartQty > 0 ? (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--green)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {cartQty}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--surface2)',
                        color: 'var(--text2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Plus size={12} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filteredCatalog.length === 0 && (
            <div
              style={{
                gridColumn: '1/-1',
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--text3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ fontSize: '28px' }}>🔍</div>
              <span style={{ fontWeight: 600, color: 'var(--text2)' }}>No se encontraron {tab === 'products' ? 'productos' : 'servicios'}</span>
              <span style={{ fontSize: '12px' }}>Intenta cambiando el filtro de búsqueda o de categoría</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Checkout & Cart Panel ── */}
      <div
        style={{
          width: 370,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.02)',
        }}
      >
        {/* Cart Header */}
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to bottom, #fafbfb, #ffffff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} color="var(--green)" />
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Carrito de Compra</span>
            </div>
          </div>

          {/* Autocomplete Customer Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {preloadedAppointmentId && (
              <div
                style={{
                  background: 'var(--green-xlight)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Receipt size={14} color="var(--green-dark)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--green-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Cita precargada #{preloadedAppointmentId}
                  </span>
                </div>
                <button
                  onClick={discardPreload}
                  style={{
                    color: 'var(--text3)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                  }}
                  title="Cancelar precarga"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <AutocompleteSearch
              placeholder="Buscar dueño / cliente..."
              items={allCustomers}
              onSelect={selectCustomer}
              selectedValue={selectedCustomer}
              onClear={clearCustomer}
              labelKey="name"
              sublabelKey="phone"
              iconType="customer"
            />

            {/* Pet selector (visible only when customer has pets) */}
            {selectedCustomer && (
              <div>
                {pets.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedPet?.id || ''}
                      onChange={(e) => setSelectedPet(pets.find((p: any) => p.id === +e.target.value) || null)}
                      style={{
                        fontSize: '13px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        width: '100%',
                        appearance: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">🐾 Seleccionar mascota (opcional)</option>
                      {pets.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.breed || p.species})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} color="var(--text3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', paddingLeft: 4 }}>
                    El cliente no tiene mascotas registradas.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 18px' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', gap: 14 }}>
              <div style={{ padding: 18, background: '#f8fafc', borderRadius: '50%' }}>
                <ShoppingCart size={32} strokeWidth={1.5} color="var(--text3)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text2)' }}>Tu carrito está vacío</p>
                <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: 4 }}>Selecciona productos o servicios de la lista</p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '8px',
                        background: item.itemType === 'service' ? '#eff6ff' : 'var(--green-xlight)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.itemType === 'service' ? <Scissors size={13} color="#2563eb" /> : <Package size={13} color="var(--green)" />}
                    </div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </span>
                      {item.serviceDateStart && (
                        <span style={{ fontSize: '10px', color: 'var(--text2)' }}>
                          📅 {item.serviceDateStart} a {item.serviceDateEnd}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCart((p) => p.filter((i) => i.key !== item.key))
                      Alerts.success('Removido del carrito')
                    }}
                    style={{ color: 'var(--text3)', padding: 4, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Quantity editor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface2)', borderRadius: '8px', padding: '2px' }}>
                    <button
                      onClick={() => updateQty(item.key, -1)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <Minus size={10} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 800, minWidth: 24, textAlign: 'center', color: 'var(--text)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.key, 1)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {item.itemType === 'service' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text3)' }}>$</span>
                      <input 
                        type="number" 
                        value={item.unitPrice || ''} 
                        onChange={(e) => updatePrice(item.key, Number(e.target.value))}
                        style={{ width: 80, textAlign: 'right', fontSize: 13.5, fontWeight: 800, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', background: 'var(--surface)' }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text)' }}>
                      {fmt(item.quantity * item.unitPrice)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Billing Footer Panel */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', background: 'linear-gradient(to top, #fafbfb, #ffffff)' }}>
          {/* Payment Method Selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              ['cash', '💵', 'Efectivo'],
              ['card', '💳', 'Tarjeta'],
              ['transfer', '🏦', 'Transf.'],
            ].map(([v, e, l]) => (
              <button
                key={v}
                onClick={() => {
                  setPaymentMethod(v as any)
                  setCashReceived(0)
                }}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: '10px',
                  border: paymentMethod === v ? '1.8px solid var(--green)' : '1px solid var(--border)',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: paymentMethod === v ? 'var(--green-xlight)' : 'var(--surface)',
                  color: paymentMethod === v ? 'var(--green-dark)' : 'var(--text2)',
                  cursor: 'pointer',
                  boxShadow: paymentMethod === v ? '0 2px 6px rgba(16, 185, 129, 0.05)' : 'none',
                  transition: 'all 0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span>{e}</span>
                <span>{l}</span>
              </button>
            ))}
          </div>

          {/* Discount & Received Input Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {/* Discount */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500, flex: 1 }}>Descuento</span>
              <div style={{ position: 'relative', width: 110 }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text3)' }}>$</span>
                <input
                  type="number"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    fontSize: '13px',
                    padding: '6px 8px 6px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                />
              </div>
            </div>

            {/* Quick COP Cash helper */}
            {paymentMethod === 'cash' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px dashed var(--border)', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text2)', fontWeight: 700 }}>
                  <Coins size={12} color="var(--green)" />
                  <span>Billetes Rápidos:</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {COP_QUICK_BILLS.map((bill) => (
                    <button
                      key={bill}
                      onClick={() => handleQuickCash(bill)}
                      style={{
                        padding: '4px 6px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--green-xlight)'
                        e.currentTarget.style.borderColor = 'var(--green)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      +{bill / 1000}k
                    </button>
                  ))}
                  <button
                    onClick={() => setCashReceived(0)}
                    style={{
                      padding: '4px 6px',
                      background: '#ffe4e6',
                      border: '1px solid #fecdd3',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--out)',
                      cursor: 'pointer',
                    }}
                  >
                    Borrar
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text2)', flex: 1, fontWeight: 500 }}>Efectivo recibido</span>
                  <input
                    type="number"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="0"
                    style={{
                      width: 110,
                      textAlign: 'right',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  />
                </div>
                {cashReceived > 0 && cashReceived >= total && (
                  <div style={{ fontSize: '12px', color: 'var(--green-dark)', fontWeight: 800, textAlign: 'right', marginTop: 2 }}>
                    Vueltas: {fmt(change)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtotal, discount & total summaries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)' }}>
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)' }}>
                <span>Descuento</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>- {fmt(discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <span style={{ color: 'var(--text)' }}>Total</span>
              <span style={{ color: 'var(--green-dark)' }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Charge Button */}
          <button
            onClick={handleSale}
            disabled={loading || cart.length === 0}
            className="btn-green"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              fontSize: '14.5px',
              borderRadius: '10px',
              height: 46,
              opacity: cart.length === 0 ? 0.5 : 1,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: cart.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
            }}
          >
            {loading ? 'Procesando...' : `Cobrar ${fmt(total)}`}
          </button>
        </div>
      </div>

      {/* Boarding modal */}
      {boardingModal && (
        <BoardingModal
          service={boardingModal}
          onConfirm={(s: any, days: number, price: number, start: string, end: string, notes: string) => {
            const key = `service-${s.id}-${Date.now()}`
            setCart((prev) => [
              ...prev,
              {
                key,
                itemType: 'service',
                id: s.id,
                description: s.name,
                quantity: days,
                unitPrice: price,
                purchasePrice: 0,
                serviceDateStart: start,
                serviceDateEnd: end,
                serviceNotes: notes,
              },
            ])
            setBoardingModal(null)
            Alerts.success('Hospedaje de guardería agregado')
          }}
          onClose={() => setBoardingModal(null)}
        />
      )}

      {/* ── Bulk / Weighted Product Quantity Modal ── */}
      {bulkModal && (() => {
        const bp = bulkModal.product
        const unit = bp.saleUnit || 'kg'
        const pricePerUnit = Number(bp.salePrice)
        const stockAvailable = Number(bp.stock)
        const currentQty = parseDecimalInput(String(bulkModal.qty)) || 0
        const currentSubtotal = Math.round(currentQty * pricePerUnit)
        const quickQty = BULK_QUICK_QTY[unit] || BULK_QUICK_QTY.kg

        return (
          <div className="modal-overlay" onClick={() => setBulkModal(null)}>
            <div className="modal-box" style={{ width: 420, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚖️ Venta a Granel
                </h3>
                <button onClick={() => setBulkModal(null)} style={{ color: 'var(--text3)', cursor: 'pointer', padding: 0, background: 'none', border: 'none' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Product info summary */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{bp.name}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Precio: <strong style={{ color: 'var(--text)' }}>{fmtUnitPrice(pricePerUnit, unit)}/{unit}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Disponible: <strong style={{ color: 'var(--green-dark)' }}>{stockAvailable.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {unit}</strong>
                  </div>
                </div>
              </div>

              {/* Mode toggle */}
              <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 9, padding: 3, gap: 2, marginBottom: 14 }}>
                {([['qty', `Por ${unit}`], ['price', 'Por precio $']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setBulkModal((prev: any) => ({ ...prev, mode, qty: '', targetPrice: '' }))}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                      background: bulkModal.mode === mode ? 'var(--surface)' : 'transparent',
                      color: bulkModal.mode === mode ? 'var(--text)' : 'var(--text2)',
                      boxShadow: bulkModal.mode === mode ? 'var(--shadow)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input based on mode */}
              {bulkModal.mode === 'qty' ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Cantidad ({unit})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bulkModal.qty}
                    onChange={e => setBulkModal((prev: any) => ({ ...prev, qty: e.target.value }))}
                    placeholder={unit === 'g' ? 'Ej: 350' : `Ej: 1,5 ${unit}`}
                    autoFocus
                    style={{ fontSize: 16, fontWeight: 700, padding: '10px 14px' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {quickQty.map(({ label, amount }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setBulkModal((prev: any) => ({ ...prev, qty: String(amount) }))}
                        disabled={amount > stockAvailable}
                        style={{
                          padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: amount > stockAvailable ? 'not-allowed' : 'pointer',
                          opacity: amount > stockAvailable ? 0.45 : 1,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Quiero pagar (COP)
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={bulkModal.targetPrice}
                    onChange={e => {
                      const tp = parseDecimalInput(e.target.value)
                      const calcQty = pricePerUnit > 0 ? Math.round((tp / pricePerUnit) * 1000) / 1000 : 0
                      setBulkModal((prev: any) => ({ ...prev, targetPrice: e.target.value, qty: calcQty > 0 ? String(calcQty) : '' }))
                    }}
                    placeholder="Ej: 7500"
                    autoFocus
                    style={{ fontSize: 16, fontWeight: 700, padding: '10px 14px' }}
                  />
                  {currentQty > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green-dark)', fontWeight: 700 }}>
                      = {currentQty.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {unit}
                    </div>
                  )}
                </div>
              )}

              {/* Live preview */}
              {currentQty > 0 && (
                <div style={{ marginTop: 14, background: 'var(--green-xlight)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>{currentQty.toLocaleString('es-CO', { maximumFractionDigits: 3 })} {unit} × {fmtUnitPrice(pricePerUnit, unit)}</span>
                    <strong style={{ color: 'var(--green-dark)', fontSize: 15 }}>{fmt(currentSubtotal)}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Stock restante: {(stockAvailable - currentQty).toLocaleString('es-CO', { maximumFractionDigits: 3 })} {unit}
                  </div>
                  {currentQty > stockAvailable && (
                    <div style={{ fontSize: 11, color: 'var(--out)', fontWeight: 700, marginTop: 2 }}>
                      ⚠ Supera el stock disponible
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  onClick={() => setBulkModal(null)}
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={addBulkToCart}
                  disabled={currentQty <= 0 || currentQty > stockAvailable}
                  className="btn-green"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 13, borderRadius: 8, opacity: (currentQty <= 0 || currentQty > stockAvailable) ? 0.5 : 1 }}
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function BoardingModal({ service, onConfirm, onClose }: any) {
  const [start, setStart] = useState(new Date().toISOString().split('T')[0])
  const [end, setEnd] = useState('')
  const [price, setPrice] = useState(30000)
  const [notes, setNotes] = useState('')
  
  const days = useMemo(() => {
    if (!start || !end) return 0
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    return Math.max(1, Math.ceil((endMs - startMs) / 86400000))
  }, [start, end])

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ width: 400, borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Guardería — {service.name}</h3>
          <button onClick={onClose} style={{ color: 'var(--text3)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Entrada</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Fecha Salida</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Precio por Día (COP)</label>
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Observaciones de Hospedaje</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej. Alergias, hábitos de comida, medicación..."
              style={{ resize: 'none', borderRadius: '8px', border: '1.5px solid var(--border)' }}
            />
          </div>
          {days > 0 && (
            <div style={{ background: 'var(--green-xlight)', borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong>{days}</strong> día{days > 1 ? 's' : ''} × {fmt(price)}
              </span>
              <strong style={{ color: 'var(--green-dark)', fontSize: '15px' }}>{fmt(days * price)}</strong>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13.5px',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => days > 0 && onConfirm(service, days, price, start, end, notes)}
            disabled={days === 0}
            className="btn-green"
            style={{ flex: 1, justifyContent: 'center', opacity: days === 0 ? 0.5 : 1, fontSize: '13.5px' }}
          >
            Agregar al Carrito
          </button>
        </div>
      </div>
    </div>
  )
}
