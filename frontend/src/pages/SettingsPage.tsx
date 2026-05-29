import { Building2, Users, CreditCard, Bell, Shield, Palette, Save } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { clinicsApi } from '../services/api'
import toast from 'react-hot-toast'

const sections = [
  { key:'info',    icon:Building2,  label:'Información del negocio', desc:'Nombre, dirección, NIT, contacto.', color:'#10b981', bg:'#ecfdf5' },
  { key:'users',   icon:Users,      label:'Usuarios y roles',         desc:'Empleados, administradores.',       color:'#2563eb', bg:'#eff6ff' },
  { key:'payment', icon:CreditCard, label:'Métodos de pago',          desc:'Configura efectivo y transferencias.', color:'#7c3aed', bg:'#f5f3ff' },
  { key:'notifs',  icon:Bell,       label:'Notificaciones',           desc:'Alertas de stock y servicios.',     color:'#d97706', bg:'#fffbeb' },
  { key:'security',icon:Shield,     label:'Seguridad',                desc:'Cambio de contraseña.',             color:'#dc2626', bg:'#fef2f2' },
  { key:'theme',   icon:Palette,    label:'Apariencia',               desc:'Tema e idioma.',                    color:'#0891b2', bg:'#ecfeff' },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState<string|null>(null)
  const [form,   setForm]   = useState({ name:'', email:'', phone:'', address:'', nit:'' })
  const [loading,setLoading]= useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (user?.clinic) {
      setForm({
        name:    user.clinic.name    || '',
        email:   (user.clinic as any).email   || '',
        phone:   (user.clinic as any).phone   || '',
        address: (user.clinic as any).address || '',
        nit:     (user.clinic as any).nit     || '',
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user?.clinicId) return
    setLoading(true)
    try {
      await clinicsApi.update(user.clinicId, form)
      toast.success('Información guardada')
      setSaved(true); setTimeout(()=>setSaved(false),2500)
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
  }

  const infoRows = [
    ['Nombre comercial', form.name],
    ['NIT',              form.nit    ||'—'],
    ['Teléfono',         form.phone  ||'—'],
    ['Email',            form.email  ||'—'],
    ['Dirección',        form.address||'—'],
    ['Plan',             user?.clinic?.plan||'—'],
  ]

  return (
    <div className="page-content">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22,fontWeight:700 }}>Configuración</h1>
        <p style={{ color:'var(--text2)',fontSize:13,marginTop:2 }}>Personaliza tu veterinaria</p>
      </div>

      {/* Section cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14,marginBottom:24 }}>
        {sections.map(s=>(
          <button key={s.key} onClick={()=>setActive(active===s.key?null:s.key)}
            style={{ background:'var(--surface)',borderRadius:14,padding:'18px',textAlign:'left',cursor:'pointer',
              border:`1.5px solid ${active===s.key?s.color:'var(--border)'}`,
              boxShadow:active===s.key?`0 0 0 3px ${s.bg}`:'var(--shadow)',transition:'all .15s' }}>
            <div style={{ width:38,height:38,borderRadius:9,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10 }}>
              <s.icon size={17} color={s.color}/>
            </div>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:12,color:'var(--text3)',lineHeight:1.4 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Editable info panel */}
      <div className="card" style={{ padding:'22px 24px' }}>
        <h2 style={{ fontSize:15,fontWeight:700,marginBottom:18 }}>Información general</h2>

        {active === 'info' ? (
          <div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:18 }}>
              {[['Nombre comercial','name','text'],['NIT','nit','text'],['Teléfono','phone','tel'],['Email','email','email'],].map(([l,k,t])=>(
                <div key={k}>
                  <label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Dirección</label>
                <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/>
              </div>
            </div>
            <button onClick={handleSave} disabled={loading} className="btn-green" style={{ gap:8 }}>
              <Save size={14}/>
              {loading?'Guardando...':saved?'✓ Guardado':'Guardar cambios'}
            </button>
          </div>
        ) : (
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16 }}>
            {infoRows.map(([l,v])=>(
              <div key={l}>
                <div style={{ fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:700,marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:14,fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
