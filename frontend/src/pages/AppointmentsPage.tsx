import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsApi, customersApi, petsApi, servicesApi } from '../services/api'
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Droplet,
  Scissors,
  Sparkles,
  Smile,
  MessageCircle,
  User,
  Heart,
  Receipt,
  Phone,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addDays, subDays, isToday, parseISO } from 'date-fns'

// Helper to format ISO datetime strings to local time in 12-hour AM/PM format
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
import { es } from 'date-fns/locale'
import AutocompleteSearch from '../components/AutocompleteSearch'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const STATUS_CONFIG: any = {
  pending:     { label: 'Agendado',    color: '#64748b', bg: '#f1f5f9', icon: Clock },          // Scheduled - Slate
  bath:        { label: 'En espera',   color: '#d97706', bg: '#fffbeb', icon: Clock },          // Waiting - Amber
  in_progress: { label: 'En consulta', color: '#2563eb', bg: '#eff6ff', icon: PlayCircle },     // In Consultation - Blue
  done:        { label: 'Finalizado',  color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },   // Completed - Emerald
  delivered:   { label: 'Facturado',   color: '#0f766e', bg: '#f0fdfa', icon: Sparkles },       // Invoiced - Teal
  cancelled:   { label: 'Cancelado',   color: '#ef4444', bg: '#fef2f2', icon: XCircle },        // Cancelled - Red
}

const EMPTY_FORM = {
  customerId: '',
  petId: '',
  serviceId: '',
  scheduledAt: new Date().toISOString().slice(0, 16),
  price: '',
  notes: '',
}

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [customers, setCustomers] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // WhatsApp notification modal
  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean
    phone: string
    message: string
    ownerName: string
    petName: string
  } | null>(null)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const load = () => {
    const start = new Date(selectedDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(selectedDate)
    end.setHours(23, 59, 59, 999)
    appointmentsApi
      .list({ from: start.toISOString(), to: end.toISOString() })
      .then(setAppointments)
      .catch(() => {})
  }

  useEffect(() => {
    load()
  }, [selectedDate])

  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {})
    servicesApi.list().then(setServices).catch(() => {})
  }, [])

  const handleCustomerChange = (id: string) => {
    setForm((f: any) => ({ ...f, customerId: id, petId: '' }))
    if (id) petsApi.list(Number(id)).then(setPets).catch(() => {})
    else setPets([])
  }

  const handleServiceChange = (id: string) => {
    const svc = services.find((s: any) => String(s.id) === id)
    setForm((f: any) => ({
      ...f,
      serviceId: id,
      price: svc && !svc.isPriceVariable ? svc.basePrice : f.price,
    }))
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, scheduledAt: format(selectedDate, 'yyyy-MM-dd') + 'T09:00' })
    setShowModal(true)
  }

  const openEdit = (a: any) => {
    setEditingId(a.id)
    setForm({
      customerId: String(a.customerId || ''),
      petId: String(a.petId || ''),
      serviceId: String(a.serviceId || ''),
      scheduledAt: format(parseISO(a.scheduledAt), "yyyy-MM-dd'T'HH:mm"),
      price: String(a.price || ''),
      notes: a.notes || '',
    })
    if (a.customerId) petsApi.list(a.customerId).then(setPets).catch(() => {})
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.serviceId || !form.scheduledAt) {
      toast.error('Servicio y fecha son requeridos')
      return
    }
    setLoading(true)
    try {
      const payload = {
        customerId: form.customerId ? Number(form.customerId) : undefined,
        petId: form.petId ? Number(form.petId) : undefined,
        serviceId: form.serviceId ? Number(form.serviceId) : undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        price: Number(form.price || 0),
        notes: form.notes || undefined,
      }
      if (editingId) await appointmentsApi.update(editingId, payload)
      else await appointmentsApi.create(payload)
      toast.success(editingId ? 'Cita actualizada' : 'Cita agendada')
      setShowModal(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await appointmentsApi.updateStatus(id, status)
      toast.success('Estado de la cita actualizado')

      // Trigger WhatsApp modal when marked as Finalizado (done)
      if (status === 'done') {
        const appt = appointments.find((a) => a.id === id)
        if (appt) {
          const ownerName = appt.customer?.name || 'Cliente'
          const petName = appt.pet?.name || 'su mascota'
          const phone = appt.customer?.phone || ''
          const defaultMsg = `Hola, ${ownerName}. \nTe informamos que ${petName} ya finalizó su servicio y está listo(a) para ser recogido(a). Atentamente, el equipo de la veterinaria.`
          setWhatsappModal({
            isOpen: true,
            phone,
            message: defaultMsg,
            ownerName,
            petName,
          })
        }
      }
      load()
    } catch {
      toast.error('Error al actualizar el estado')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Cancelar esta cita?')) return
    await appointmentsApi.remove(id)
    toast.success('Cita cancelada')
    load()
  }

  const sendWhatsapp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const encodedText = encodeURIComponent(text)
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`
    window.open(url, '_blank')
    setWhatsappModal(null)
  }

  const filtered =
    filterStatus === 'all'
      ? appointments
      : appointments.filter((a) => a.status === filterStatus)

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => ['pending', 'in_progress', 'bath', 'cut'].includes(a.status)).length,
    done: appointments.filter((a) => ['done', 'delivered'].includes(a.status)).length,
  }

  return (
    <div className="page-content" style={{ background: '#f8fafc', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Agenda Veterinaria</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
            {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button onClick={openCreate} className="btn-green" style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
          <Plus size={15} /> Agendar Cita
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['Total Hoy', stats.total, '#6b7280', '#f3f4f6', 'Citas programadas'],
          ['En curso / Pendientes', stats.pending, '#d97706', '#fffbeb', 'Mascotas en servicio'],
          ['Realizadas / Entregadas', stats.done, '#10b981', '#ecfdf5', 'Servicios finalizados'],
        ].map(([l, v, c, bg, desc]: any) => (
          <div key={l} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: c,
                border: `1px solid rgba(0,0,0,0.03)`
              }}
            >
              {v}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{l}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: date navigator + status filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Date navigator */}
          <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 4 }}>
              <button
                onClick={() => setSelectedDate((d) => subDays(d, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Día anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {/* Day Dropdown */}
                <select
                  value={selectedDate.getDate()}
                  onChange={(e) => {
                    const newDate = new Date(selectedDate)
                    newDate.setDate(Number(e.target.value))
                    setSelectedDate(newDate)
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    width: '56px',
                  }}
                >
                  {Array.from(
                    { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
                    (_, idx) => idx + 1
                  ).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* Month Dropdown */}
                <select
                  value={selectedDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(selectedDate)
                    const nextMonth = Number(e.target.value)
                    const maxDays = new Date(newDate.getFullYear(), nextMonth + 1, 0).getDate()
                    newDate.setDate(Math.min(newDate.getDate(), maxDays))
                    newDate.setMonth(nextMonth)
                    setSelectedDate(newDate)
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    width: 'auto',
                    flex: 1,
                  }}
                >
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={selectedDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(selectedDate)
                    const nextYear = Number(e.target.value)
                    const maxDays = new Date(nextYear, newDate.getMonth() + 1, 0).getDate()
                    newDate.setDate(Math.min(newDate.getDate(), maxDays))
                    newDate.setFullYear(nextYear)
                    setSelectedDate(newDate)
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    width: '74px',
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Día siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {/* Week strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text3)', paddingBottom: 4 }}>
                  {d}
                </div>
              ))}
              {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                const d = addDays(selectedDate, offset)
                const isSelected = format(d, 'yyyy-MM-dd') === dateStr
                const today = isToday(d)
                return (
                  <button
                    key={offset}
                    onClick={() => setSelectedDate(d)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isSelected || today ? 700 : 500,
                      background: isSelected ? 'var(--green)' : today ? 'var(--green-xlight)' : 'transparent',
                      color: isSelected ? '#fff' : today ? 'var(--green-dark)' : 'var(--text)',
                      transition: 'all 0.1s',
                    }}
                  >
                    {format(d, 'd')}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button
                onClick={() => setSelectedDate(new Date())}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: 8,
                  border: '1.5px solid var(--green)',
                  background: 'var(--green-xlight)',
                  color: 'var(--green-dark)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Ir a Hoy
              </button>
            </div>
          </div>

          {/* Status filter */}
          <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Filtrar por Estado
            </div>
            {[
              ['all', 'Todos los estados', '#6b7280', '#f3f4f6'],
              ...Object.entries(STATUS_CONFIG).map(([k, v]: any) => [k, v.label, v.color, v.bg]),
            ].map(([val, label, c, bg]: any) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 3,
                  background: filterStatus === val ? bg : 'transparent',
                  fontWeight: filterStatus === val ? 700 : 500,
                  fontSize: 13,
                  color: filterStatus === val ? c : 'var(--text2)',
                  transition: 'all .12s',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: appointments list */}
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--text3)', gap: 14 }}>
              <Calendar size={48} strokeWidth={1.2} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text2)' }}>Sin citas agendadas</p>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>No hay registros para este día</p>
              </div>
              <button onClick={openCreate} className="btn-green" style={{ fontSize: 13, padding: '8px 16px' }}>
                <Plus size={13} /> Agendar Cita
              </button>
            </div>
          ) : (
            <div>
              {/* Header Titles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1.5fr 1fr 100px 220px 80px',
                  gap: 0,
                  background: 'var(--surface2)',
                  borderBottom: '1.5px solid var(--border)',
                }}
              >
                {['Hora', 'Servicio / Mascota', 'Dueño / Teléfono', 'Valor', 'Flujo de Progreso', 'Acciones'].map((h) => (
                  <div
                    key={h}
                    style={{
                      padding: '12px 14px',
                      fontSize: 10,
                      fontWeight: 800,
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {filtered
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((a: any) => {
                  const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending
                  const IconComp = cfg.icon
                  const timeStr = formatLocalTime(a.scheduledAt)
                  
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1.5fr 1fr 100px 220px 80px',
                        gap: 0,
                        borderBottom: '1px solid var(--border)',
                        transition: 'background .15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      {/* Time */}
                      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
                          {timeStr}
                        </span>
                      </div>

                      {/* Service + Pet */}
                      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: cfg.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: `1px solid rgba(0,0,0,0.03)`,
                          }}
                        >
                          <IconComp size={15} color={cfg.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.service?.name || 'Servicio'}
                          </div>
                          {a.pet ? (
                            <div style={{ fontSize: 12, color: 'var(--green-dark)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Heart size={12} color="var(--green-dark)" /> {a.pet.name} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({a.pet.breed || a.pet.species})</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Sin mascota</div>
                          )}
                        </div>
                      </div>

                      {/* Owner / Phone */}
                      <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {a.customer?.name || 'Sin cliente'}
                        </span>
                        {a.customer?.phone && (
                          <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={11} color="var(--text3)" /> {a.customer.phone}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--green-dark)' }}>
                          {fmt(a.price)}
                        </span>
                      </div>

                      {/* Status / Transition Flow */}
                      <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                        {/* Current Status Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 20,
                              background: cfg.bg,
                              color: cfg.color,
                              border: `1px solid rgba(0,0,0,0.05)`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                            {cfg.label}
                          </span>
                        </div>

                        {/* Interactive flow navigation buttons */}
                        {a.status !== 'cancelled' && a.status !== 'delivered' && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {a.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(a.id, 'bath')}
                                  style={{
                                    background: '#fffbeb',
                                    border: '1px solid rgba(217, 119, 6, 0.2)',
                                    borderRadius: '6px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#d97706',
                                    cursor: 'pointer',
                                  }}
                                >
                                  En espera
                                </button>
                                <button
                                  onClick={() => handleStatusChange(a.id, 'in_progress')}
                                  style={{
                                    background: '#eff6ff',
                                    border: '1px solid rgba(37, 99, 235, 0.2)',
                                    borderRadius: '6px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                  }}
                                >
                                  A consulta
                                </button>
                              </>
                            )}
                            {a.status === 'bath' && (
                              <button
                                onClick={() => handleStatusChange(a.id, 'in_progress')}
                                style={{
                                  background: '#eff6ff',
                                  border: '1px solid rgba(37, 99, 235, 0.2)',
                                  borderRadius: '6px',
                                  padding: '3px 7px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                }}
                              >
                                A consulta
                              </button>
                            )}
                            {a.status === 'in_progress' && (
                              <button
                                onClick={() => handleStatusChange(a.id, 'done')}
                                style={{
                                  background: '#ecfdf5',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  borderRadius: '6px',
                                  padding: '3px 7px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#10b981',
                                  cursor: 'pointer',
                                }}
                              >
                                Finalizar
                              </button>
                            )}
                            {a.status === 'done' && (
                              <>
                                <button
                                  onClick={() => {
                                    navigate('/pos', {
                                      state: {
                                        preloadedCheckout: {
                                          appointmentId: a.id,
                                          customerId: a.customerId,
                                          petId: a.petId,
                                          serviceId: a.serviceId,
                                          price: a.price,
                                          description: a.service?.name || 'Servicio'
                                        }
                                      }
                                    })
                                  }}
                                  style={{
                                    background: 'var(--green-xlight)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'var(--green-dark)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Receipt size={12} /> Cobrar
                                </button>
                                <button
                                  onClick={() => handleStatusChange(a.id, 'delivered')}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--text2)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Smile size={12} /> Entregar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => openEdit(a)}
                          style={{
                            background: 'var(--surface)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 6,
                            padding: '6px',
                            cursor: 'pointer',
                            color: 'var(--text2)',
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{
                            background: 'var(--out-bg)',
                            border: '1px solid rgba(153, 27, 27, 0.15)',
                            borderRadius: 6,
                            padding: '6px',
                            cursor: 'pointer',
                            color: 'var(--out)',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Modal */}
      {whatsappModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width: 440, borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={20} color="#25D366" />
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Notificar por WhatsApp</h3>
              </div>
              <button onClick={() => setWhatsappModal(null)} style={{ color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Teléfono del Dueño
                </label>
                <input
                  type="text"
                  value={whatsappModal.phone}
                  onChange={(e) => setWhatsappModal({ ...whatsappModal, phone: e.target.value })}
                  placeholder="Ej. +573001234567"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Mensaje a Enviar
                </label>
                <textarea
                  value={whatsappModal.message}
                  onChange={(e) => setWhatsappModal({ ...whatsappModal, message: e.target.value })}
                  rows={4}
                  style={{ resize: 'none', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '13.5px' }}
                />
              </div>

              <div
                style={{
                  background: '#f0fdf4',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Info size={14} color="#15803d" />
                <span>Al hacer clic en enviar, se abrirá WhatsApp Web/App pre-completado con este número y texto.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setWhatsappModal(null)}
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
                Cerrar
              </button>
              <button
                onClick={() => sendWhatsapp(whatsappModal.phone, whatsappModal.message)}
                disabled={!whatsappModal.phone}
                className="btn-green"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13.5px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                }}
              >
                <MessageCircle size={15} /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Edit/Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width: 480, borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {editingId ? 'Editar Cita Veterinaria' : 'Agendar Nueva Cita'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Service */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Servicio Requerido *
                </label>
                <AutocompleteSearch
                  placeholder="Buscar servicio en el catálogo..."
                  items={services}
                  onSelect={(s: any) => handleServiceChange(String(s.id))}
                  selectedValue={services.find((s: any) => String(s.id) === String(form.serviceId))}
                  onClear={() => handleServiceChange('')}
                  labelKey="name"
                  iconType="service"
                />
              </div>

              {/* Date & Time */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Fecha Programada *
                  </label>
                  {(() => {
                    const dateObj = form.scheduledAt ? new Date(form.scheduledAt) : new Date();
                    const year = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();
                    const month = isNaN(dateObj.getTime()) ? new Date().getMonth() : dateObj.getMonth();
                    const day = isNaN(dateObj.getTime()) ? new Date().getDate() : dateObj.getDate();
                    const hour = isNaN(dateObj.getTime()) ? 9 : dateObj.getHours();
                    const minute = isNaN(dateObj.getTime()) ? 0 : dateObj.getMinutes();

                    const updateDateTime = (newY: number, newM: number, newD: number, newH: number, newMin: number) => {
                      const yyyy = String(newY);
                      const MM = String(newM + 1).padStart(2, '0');
                      const dd = String(newD).padStart(2, '0');
                      const HH = String(newH).padStart(2, '0');
                      const mm = String(newMin).padStart(2, '0');
                      setForm((f: any) => ({ ...f, scheduledAt: `${yyyy}-${MM}-${dd}T${HH}:${mm}` }));
                    };

                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8 }}>
                        {/* Day Selector */}
                        <select
                          value={day}
                          onChange={(e) => updateDateTime(year, month, Number(e.target.value), hour, minute)}
                          style={{ fontSize: 13, padding: '8px 10px' }}
                        >
                          {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        {/* Month Selector */}
                        <select
                          value={month}
                          onChange={(e) => {
                            const newM = Number(e.target.value);
                            const maxD = new Date(year, newM + 1, 0).getDate();
                            const newD = Math.min(day, maxD);
                            updateDateTime(year, newM, newD, hour, minute);
                          }}
                          style={{ fontSize: 13, padding: '8px 10px' }}
                        >
                          {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mName, idx) => (
                            <option key={idx} value={idx}>{mName}</option>
                          ))}
                        </select>

                        {/* Year Selector */}
                        <select
                          value={year}
                          onChange={(e) => {
                            const newY = Number(e.target.value);
                            const maxD = new Date(newY, month + 1, 0).getDate();
                            const newD = Math.min(day, maxD);
                            updateDateTime(newY, month, newD, hour, minute);
                          }}
                          style={{ fontSize: 13, padding: '8px 10px' }}
                        >
                          {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yNum) => (
                            <option key={yNum} value={yNum}>{yNum}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Hora Programada *
                  </label>
                  {(() => {
                    const dateObj = form.scheduledAt ? new Date(form.scheduledAt) : new Date();
                    const year = isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear();
                    const month = isNaN(dateObj.getTime()) ? new Date().getMonth() : dateObj.getMonth();
                    const day = isNaN(dateObj.getTime()) ? new Date().getDate() : dateObj.getDate();
                    const hour = isNaN(dateObj.getTime()) ? 9 : dateObj.getHours();
                    const minute = isNaN(dateObj.getTime()) ? 0 : dateObj.getMinutes();

                    const updateDateTime = (newY: number, newM: number, newD: number, newH: number, newMin: number) => {
                      const yyyy = String(newY);
                      const MM = String(newM + 1).padStart(2, '0');
                      const dd = String(newD).padStart(2, '0');
                      const HH = String(newH).padStart(2, '0');
                      const mm = String(newMin).padStart(2, '0');
                      setForm((f: any) => ({ ...f, scheduledAt: `${yyyy}-${MM}-${dd}T${HH}:${mm}` }));
                    };

                    const minutesList = Array.from({ length: 12 }, (_, i) => i * 5);
                    if (!minutesList.includes(minute)) {
                      minutesList.push(minute);
                      minutesList.sort((a, b) => a - b);
                    }

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {/* Hour Selector */}
                        <select
                          value={hour}
                          onChange={(e) => updateDateTime(year, month, day, Number(e.target.value), minute)}
                          style={{ fontSize: 13, padding: '8px 10px' }}
                        >
                          {Array.from({ length: 24 }, (_, idx) => idx).map((h) => {
                            const hour12 = h % 12 === 0 ? 12 : h % 12;
                            const ampm = h >= 12 ? 'PM' : 'AM';
                            return (
                              <option key={h} value={h}>
                                {String(hour12).padStart(2, '0')}:00 {ampm} ({String(h).padStart(2, '0')}:00)
                              </option>
                            );
                          })}
                        </select>

                        {/* Minute Selector */}
                        <select
                          value={minute}
                          onChange={(e) => updateDateTime(year, month, day, hour, Number(e.target.value))}
                          style={{ fontSize: 13, padding: '8px 10px' }}
                        >
                          {minutesList.map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, '0')} min
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Price */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Precio Cotizado ($)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((f: any) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Customer */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Dueño / Cliente
                </label>
                <AutocompleteSearch
                  placeholder="Seleccionar cliente responsable..."
                  items={customers}
                  onSelect={(c: any) => handleCustomerChange(String(c.id))}
                  selectedValue={customers.find((c: any) => String(c.id) === String(form.customerId))}
                  onClear={() => handleCustomerChange('')}
                  labelKey="name"
                  sublabelKey="phone"
                  iconType="customer"
                />
              </div>

              {/* Pet */}
              {form.customerId && pets.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    Mascotas Relacionadas
                  </label>
                  <AutocompleteSearch
                    placeholder="Seleccionar mascota..."
                    items={pets}
                    onSelect={(p: any) => setForm((f: any) => ({ ...f, petId: String(p.id) }))}
                    selectedValue={pets.find((p: any) => String(p.id) === String(form.petId))}
                    onClear={() => setForm((f: any) => ({ ...f, petId: '' }))}
                    labelKey="name"
                    sublabelKey="species"
                    iconType="pet"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                  Observaciones de Cita
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Instrucciones especiales, alergias, estado de ánimo de la mascota..."
                  style={{ resize: 'none', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowModal(false)}
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
              <button onClick={handleSave} disabled={loading} className="btn-green" style={{ flex: 1, justifyContent: 'center', fontSize: '13.5px' }}>
                {loading ? 'Guardando...' : editingId ? 'Actualizar Cita' : 'Agendar Cita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
