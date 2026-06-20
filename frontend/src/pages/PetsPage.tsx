import { useEffect, useState } from 'react'
import { petsApi, customersApi } from '../services/api'
import { Plus, Search, Edit2, Trash2, PawPrint, X } from 'lucide-react'
import { Alerts } from '../utils/alerts'
import Pagination from '../components/Pagination'

const EMPTY = { name:'', species:'dog', breed:'', birthdate:'', notes:'', customerId:'' }
const speciesLabel: any = { dog:'Perro', cat:'Gato', bird:'Ave', rabbit:'Conejo', other:'Otro' }
const speciesIcon: any = { dog:'🐶', cat:'🐱', bird:'🐦', rabbit:'🐰', other:'🐾' }
const speciesColor: any = { dog:'#ecfdf5', cat:'#eff6ff', bird:'#fef9c3', rabbit:'#fce7f3', other:'#f3f4f6' }

export default function PetsPage() {
  const [pets, setPets] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)

  const load = () => petsApi.list(search, undefined, page, limit).then((res: any) => {
    setPets(res.data || [])
    setTotal(res.total || 0)
  })

  useEffect(() => { setPage(1) }, [search, limit])
  useEffect(() => { load() }, [search, page, limit])

  useEffect(() => { customersApi.list().then((c: any) => setCustomers(c.data || c)) }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ name:p.name, species:p.species, breed:p.breed||'', birthdate:p.birthdate||'', notes:p.notes||'', customerId:p.customerId||'' })
    setShowModal(true)
  }

  const save = async () => {
    const missing = []
    if (!form.customerId) missing.push('Dueño')
    if (!form.name) missing.push('Nombre')
    if (missing.length > 0) {
      Alerts.validationError(missing)
      return
    }

    setLoading(true)
    try {
      editing ? await petsApi.update(editing.id,form) : await petsApi.create(form)
      Alerts.success(editing ? 'Mascota actualizada' : 'Mascota registrada')
      setShowModal(false); load()
    } catch { Alerts.error('Error al guardar mascota') } finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    if (!(await Alerts.confirm('¿Eliminar mascota?', 'Esta acción no se puede deshacer'))) return
    try {
      await petsApi.remove(id)
      Alerts.success('Eliminada')
      load()
    } catch { Alerts.error('Error al eliminar') }
  }

  const calcAge = (birthdate: string) => {
    if (!birthdate) return null
    const diff = Date.now() - new Date(birthdate).getTime()
    const years = Math.floor(diff/1000/60/60/24/365)
    return years === 0 ? '< 1 año' : `${years} año${years>1?'s':''}`
  }

  return (
    <div className="page-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Mascotas</h1>
          <p style={{ color:'var(--text2)', fontSize:13, marginTop:2 }}>Pacientes registrados en Mrmax Veterinaria</p>
        </div>
        <button onClick={openCreate} className="btn-green"><Plus size={15}/> Registrar mascota</button>
      </div>

      <div className="card" style={{ padding: '10px 14px', marginBottom: 24 }}>
        <div className="premium-search-wrapper" style={{ maxWidth: 480 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar mascota por nombre o raza..."
            className="premium-search-input"
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginBottom: 24 }}>
        {pets.map((p:any)=>(
          <div key={p.id} className="card" style={{ padding:'20px', overflow:'hidden' }}>
            {/* Species icon */}
            <div style={{ width:52, height:52, borderRadius:14, background:speciesColor[p.species]||'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:14 }}>
              {speciesIcon[p.species]||'🐾'}
            </div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:3 }}>{p.name}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>
              {p.breed||speciesLabel[p.species]} {calcAge(p.birthdate)?`· ${calcAge(p.birthdate)}`:''}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14, background:'var(--surface2)', borderRadius:10, padding:'10px 12px' }}>
              <div><div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Especie</div>
                <div style={{ fontSize:13, fontWeight:600 }}>{speciesLabel[p.species]||p.species}</div></div>
              <div><div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Dueño</div>
                <div style={{ fontSize:13, fontWeight:600 }}>{p.customer?.name||'—'}</div></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, padding:'7px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:12, fontWeight:600, color:'var(--text2)', cursor:'pointer' }}>
                Servicios
              </button>
              <button style={{ flex:1, padding:'7px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:12, fontWeight:600, color:'var(--text2)', cursor:'pointer' }}>
                Compras
              </button>
              <button onClick={()=>openEdit(p)} style={{ padding:'7px 10px', borderRadius:8, background:'var(--surface2)', border:'none', cursor:'pointer', color:'var(--text2)' }}><Edit2 size={13}/></button>
              <button onClick={()=>remove(p.id)} style={{ padding:'7px 10px', borderRadius:8, background:'var(--out-bg)', border:'none', cursor:'pointer', color:'var(--out)' }}><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
        {pets.length===0&&(
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
            <PawPrint size={36} style={{ margin:'0 auto 10px', display:'block' }} strokeWidth={1.2}/>
            Sin mascotas registradas
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(total / limit)}
        totalItems={total}
        itemsPerPage={limit}
        onPageChange={setPage}
        onItemsPerPageChange={setLimit}
      />

      {showModal&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:420 }}>
            <h3 style={{ fontSize:17,fontWeight:700,marginBottom:20 }}>{editing?'Editar mascota':'Registrar mascota'}</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Dueño *</label>
                <select value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))}>
                  <option value="">Seleccionar cliente</option>
                  {customers.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Nombre *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Especie</label>
                <select value={form.species} onChange={e=>setForm(f=>({...f,species:e.target.value}))}>
                  {Object.entries(speciesLabel).map(([v,l])=><option key={v} value={v}>{speciesIcon[v]} {l as string}</option>)}
                </select></div>
              {[['Raza','breed','text'],['Fecha nacimiento','birthdate','date']].map(([l,k,t])=>(
                <div key={k}><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Notas</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ resize:'none' }}/></div>
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
