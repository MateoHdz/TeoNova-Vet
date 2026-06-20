import { useEffect, useState } from 'react'
import { servicesApi } from '../services/api'
import { Plus, Edit2, Trash2, Scissors, X } from 'lucide-react'
import { Alerts } from '../utils/alerts'
import { useAuthStore } from '../store/authStore'
import { Link } from 'react-router-dom'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n)
const typeLabel: any = { bath:'Baño', haircut:'Corte', boarding:'Guardería', other:'Otro' }
const typeIcon:  any = { bath:'🛁', haircut:'✂️', boarding:'🏠', other:'⭐' }
const typeColor: any = { bath:'#0891b2', haircut:'#7c3aed', boarding:'#10b981', other:'#d97706' }
const typeBg:    any = { bath:'#ecfeff', haircut:'#f5f3ff', boarding:'#ecfdf5', other:'#fffbeb' }
const EMPTY = { name:'', type:'bath', description:'', basePrice:'', isPriceVariable:false }

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<any>(null)
  const [form, setForm]           = useState<any>(EMPTY)
  const [loading, setLoading]     = useState(false)
  const isAdmin = useAuthStore(s => s.isAdmin)

  const load = () => servicesApi.list().then(setServices).catch(()=>{})
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit   = (s: any) => {
    setEditing(s)
    setForm({ name:s.name, type:s.type, description:s.description||'', basePrice:String(s.basePrice||''), isPriceVariable:s.isPriceVariable })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name) { Alerts.validationError(['Nombre']); return }
    setLoading(true)
    try {
      const payload = { ...form, basePrice: Number(form.basePrice||0) }
      editing ? await servicesApi.update(editing.id, payload) : await servicesApi.create(payload)
      Alerts.success(editing ? 'Servicio actualizado' : 'Servicio creado')
      setShowModal(false); load()
    } catch { Alerts.error('Error al guardar') }
    finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    if (!(await Alerts.confirm('¿Eliminar este servicio?', 'Se eliminará del catálogo, pero no afectará citas pasadas'))) return
    try {
      await servicesApi.remove(id)
      Alerts.success('Eliminado')
      load()
    } catch { Alerts.error('Error al eliminar') }
  }

  return (
    <div className="page-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Servicios</h1>
          <p style={{ color:'var(--text2)', fontSize:13, marginTop:2 }}>
            Catálogo de servicios ofrecidos · {services.length} activos
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link to="/appointments" style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', background:'var(--surface2)', color:'var(--text2)', border:'1.5px solid var(--border)', borderRadius:8, fontWeight:600, fontSize:14, textDecoration:'none' }}>
            📅 Ver agenda
          </Link>
          {isAdmin() && (
            <button onClick={openCreate} className="btn-green"><Plus size={15}/> Nuevo servicio</button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background:'var(--blue-light)', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 16px', marginBottom:22, fontSize:13, color:'#1e40af', display:'flex', alignItems:'center', gap:8 }}>
        💡 Para agendar un servicio ve a <Link to="/appointments" style={{ fontWeight:700, color:'#1e40af' }}>Agenda</Link>. Aquí solo gestionas el catálogo.
      </div>

      {/* Services grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
        {services.map((s:any) => (
          <div key={s.id} className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:typeBg[s.type]||'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                {typeIcon[s.type]||'⭐'}
              </div>
              {isAdmin() && (
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={()=>openEdit(s)} style={{ background:'var(--surface2)', border:'none', borderRadius:6, padding:'5px 7px', cursor:'pointer', color:'var(--text2)' }}><Edit2 size={13}/></button>
                  <button onClick={()=>remove(s.id)} style={{ background:'var(--out-bg)', border:'none', borderRadius:6, padding:'5px 7px', cursor:'pointer', color:'var(--out)' }}><Trash2 size={13}/></button>
                </div>
              )}
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{s.name}</div>
            <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:typeBg[s.type], color:typeColor[s.type] }}>
              {typeLabel[s.type]}
            </span>
            {s.description && (
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:8, lineHeight:1.4 }}>{s.description}</p>
            )}
            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              {s.isPriceVariable ? (
                <span style={{ fontSize:15,fontWeight:700,color:'#7c3aed' }}>Precio variable</span>
              ) : (
                <span style={{ fontSize:20,fontWeight:800,color:'var(--green)' }}>{fmt(s.basePrice)}</span>
              )}
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
            <Scissors size={36} style={{ margin:'0 auto 10px', display:'block' }} strokeWidth={1.2}/>
            Sin servicios. {isAdmin() && <button onClick={openCreate} style={{ color:'var(--green)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Crear el primero</button>}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:17,fontWeight:700 }}>{editing?'Editar servicio':'Nuevo servicio'}</h3>
              <button onClick={()=>setShowModal(false)} style={{ color:'var(--text3)',padding:0 }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {[['Nombre *','name','text'],['Precio base','basePrice','number']].map(([l,k,t])=>(
                <div key={k}>
                  <label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={form[k]} onChange={e=>setForm((f:any)=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Tipo</label>
                <select value={form.type} onChange={e=>setForm((f:any)=>({...f,type:e.target.value}))}>
                  {Object.entries(typeLabel).map(([v,l])=><option key={v} value={v}>{typeIcon[v]} {l as string}</option>)}
                </select>
              </div>
              <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13 }}>
                <input type="checkbox" checked={form.isPriceVariable} onChange={e=>setForm((f:any)=>({...f,isPriceVariable:e.target.checked}))} style={{ width:'auto',accentColor:'var(--green)' }}/>
                Precio variable (se define al agendar)
              </label>
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Descripción</label>
                <textarea value={form.description} onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))} rows={2} style={{ resize:'none' }}/>
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button onClick={()=>setShowModal(false)} style={{ flex:1,padding:'10px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--surface)',cursor:'pointer',fontWeight:500 }}>Cancelar</button>
              <button onClick={save} disabled={loading} className="btn-green" style={{ flex:1,justifyContent:'center' }}>{loading?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
