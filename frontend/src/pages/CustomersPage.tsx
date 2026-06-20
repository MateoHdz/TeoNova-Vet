import { useEffect, useState } from 'react'
import { customersApi, petsApi } from '../services/api'
import { Plus, Search, Edit2, Eye, PawPrint, Phone, Mail, X } from 'lucide-react'
import { Alerts } from '../utils/alerts'
import Pagination from '../components/Pagination'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n)
const EMPTY_C = { name:'', phone:'', email:'', notes:'' }
const EMPTY_P = { name:'', species:'dog', breed:'', birthdate:'', notes:'' }
const COLORS = ['#10b981','#2563eb','#7c3aed','#d97706','#dc2626','#0891b2','#065f46','#1d4ed8']
const speciesLabel: any = { dog:'🐶 Perro', cat:'🐱 Gato', bird:'🐦 Ave', rabbit:'🐰 Conejo', other:'Otro' }

function Avatar({ name, size=36 }: { name:string; size?:number }) {
  const initials = name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'?'
  const color = COLORS[name?.charCodeAt(0)%COLORS.length||0]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.36, fontWeight:700, color:'#fff', flexShrink:0 }}>
      {initials}
    </div>
  )
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showPetModal, setShowPetModal] = useState<number|null>(null)
  const [showDetailModal, setShowDetailModal] = useState<any>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [editingPet, setEditingPet] = useState<any>(null)
  const [customerForm, setCustomerForm] = useState(EMPTY_C)
  const [petForm, setPetForm] = useState(EMPTY_P)
  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)

  const load = () => customersApi.list(search, page, limit).then((res: any) => {
    setCustomers(res.data || [])
    setTotal(res.total || 0)
  })

  useEffect(() => { setPage(1) }, [search, limit])
  useEffect(() => { load() }, [search, page, limit])

  const openCreateCustomer = () => { setEditingCustomer(null); setCustomerForm(EMPTY_C); setShowCustomerModal(true) }
  const openEditCustomer = (c: any) => {
    setEditingCustomer(c); setCustomerForm({ name:c.name, phone:c.phone||'', email:c.email||'', notes:c.notes||'' }); setShowCustomerModal(true)
  }

  const saveCustomer = async () => {
    const missing = []
    if (!customerForm.name) missing.push('Nombre')
    if (missing.length > 0) {
      Alerts.validationError(missing)
      return
    }

    setLoading(true)
    try {
      editingCustomer ? await customersApi.update(editingCustomer.id,customerForm) : await customersApi.create(customerForm)
      Alerts.success(editingCustomer ? 'Cliente actualizado' : 'Cliente registrado')
      setShowCustomerModal(false); load()
    } catch { Alerts.error('Error al guardar cliente') } finally { setLoading(false) }
  }

  const savePet = async () => {
    const missing = []
    if (!petForm.name) missing.push('Nombre de la mascota')
    if (missing.length > 0) {
      Alerts.validationError(missing)
      return
    }

    setLoading(true)
    try {
      editingPet ? await petsApi.update(editingPet.id,petForm) : await petsApi.create({ ...petForm, customerId:showPetModal })
      Alerts.success(editingPet ? 'Mascota actualizada' : 'Mascota registrada')
      setShowPetModal(null); load()
    } catch { Alerts.error('Error al guardar mascota') } finally { setLoading(false) }
  }

  return (
    <div className="page-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Clientes</h1>
          <p style={{ color:'var(--text2)', fontSize:13, marginTop:2 }}>CRM de Mrmax — relaciona dueños con sus mascotas</p>
        </div>
        <button onClick={openCreateCustomer} className="btn-green"><Plus size={15}/> Registrar cliente</button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 20 }}>
        <div className="premium-search-wrapper" style={{ maxWidth: 480 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="premium-search-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--surface2)', borderBottom:'1.5px solid var(--border)' }}>
              {['Cliente','Contacto','Mascotas','Compras','Total gastado','Acciones'].map(h=>(
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c:any)=>(
              <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--surface2)')}
                onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar name={c.name}/>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>ID: C{c.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'13px 16px' }}>
                  {c.phone&&<div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'var(--text2)' }}><Phone size={11}/>{c.phone}</div>}
                  {c.email&&<div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text3)', marginTop:2 }}><Mail size={11}/>{c.email}</div>}
                </td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ background:'var(--green-xlight)', color:'var(--green-dark)', fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20, display:'flex', alignItems:'center', gap:4 }}>
                      <PawPrint size={11}/> {c.pets?.length||0}
                    </div>
                    <button onClick={()=>{setEditingPet(null);setPetForm(EMPTY_P);setShowPetModal(c.id)}}
                      style={{ background:'none', border:'none', color:'var(--green)', cursor:'pointer', fontSize:12, fontWeight:600 }}>+ Agregar</button>
                  </div>
                </td>
                <td style={{ padding:'13px 16px', fontSize:14, fontWeight:600 }}>—</td>
                <td style={{ padding:'13px 16px', fontSize:14, fontWeight:700, color:'var(--green)' }}>—</td>
                <td style={{ padding:'13px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>setShowDetailModal(c)} style={{ background:'var(--surface2)', borderRadius:7, padding:'6px 8px', color:'var(--text2)' }}><Eye size={13}/></button>
                    <button onClick={()=>openEditCustomer(c)} style={{ background:'var(--surface2)', borderRadius:7, padding:'6px 8px', color:'var(--text2)' }}><Edit2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length===0&&<tr><td colSpan={6} style={{ padding:'52px', textAlign:'center', color:'var(--text3)' }}>Sin clientes registrados</td></tr>}
          </tbody>
        </table>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={setLimit}
        />
      </div>

      {/* Customer modal */}
      {showCustomerModal&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:420 }}>
            <h3 style={{ fontSize:17,fontWeight:700,marginBottom:20 }}>{editingCustomer?'Editar cliente':'Registrar cliente'}</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {[['Nombre *','name','text'],['Teléfono','phone','tel'],['Email','email','email']].map(([l,k,t])=>(
                <div key={k}><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={(customerForm as any)[k]} onChange={e=>setCustomerForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Notas</label>
                <textarea value={customerForm.notes} onChange={e=>setCustomerForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ resize:'none' }}/></div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button onClick={()=>setShowCustomerModal(false)} style={{ flex:1,padding:'10px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--surface)',cursor:'pointer',fontWeight:500 }}>Cancelar</button>
              <button onClick={saveCustomer} disabled={loading} className="btn-green" style={{ flex:1,justifyContent:'center' }}>{loading?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pet modal */}
      {showPetModal&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:420 }}>
            <h3 style={{ fontSize:17,fontWeight:700,marginBottom:20 }}>{editingPet?'Editar mascota':'Registrar mascota'}</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Nombre *</label>
                <input value={petForm.name} onChange={e=>setPetForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Especie</label>
                <select value={petForm.species} onChange={e=>setPetForm(f=>({...f,species:e.target.value}))}>
                  {Object.entries(speciesLabel).map(([v,l])=><option key={v} value={v}>{l as string}</option>)}
                </select></div>
              {[['Raza','breed','text'],['Fecha nacimiento','birthdate','date']].map(([l,k,t])=>(
                <div key={k}><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={(petForm as any)[k]} onChange={e=>setPetForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Notas</label>
                <textarea value={petForm.notes} onChange={e=>setPetForm(f=>({...f,notes:e.target.value}))} rows={2} style={{ resize:'none' }}/></div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button onClick={()=>setShowPetModal(null)} style={{ flex:1,padding:'10px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--surface)',cursor:'pointer',fontWeight:500 }}>Cancelar</button>
              <button onClick={savePet} disabled={loading} className="btn-green" style={{ flex:1,justifyContent:'center' }}>{loading?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetailModal&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:440 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:20 }}>
              <div style={{ display:'flex',gap:12,alignItems:'center' }}>
                <Avatar name={showDetailModal.name} size={48}/>
                <div><div style={{ fontSize:17,fontWeight:700 }}>{showDetailModal.name}</div>
                  <div style={{ fontSize:12,color:'var(--text3)' }}>ID: C{showDetailModal.id}</div></div>
              </div>
              <button onClick={()=>setShowDetailModal(null)} style={{ color:'var(--text3)', padding:0 }}><X size={18}/></button>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20,background:'var(--surface2)',borderRadius:10,padding:16 }}>
              {showDetailModal.phone&&<div><div style={{ fontSize:11,color:'var(--text3)' }}>TELÉFONO</div><div style={{ fontSize:13,fontWeight:600 }}>{showDetailModal.phone}</div></div>}
              {showDetailModal.email&&<div><div style={{ fontSize:11,color:'var(--text3)' }}>EMAIL</div><div style={{ fontSize:13,fontWeight:600 }}>{showDetailModal.email}</div></div>}
            </div>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><PawPrint size={14} color="var(--green)"/> Mascotas</div>
            {showDetailModal.pets?.length===0?<p style={{ color:'var(--text3)',fontSize:13 }}>Sin mascotas</p>:
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {showDetailModal.pets?.map((p:any)=>(
                  <div key={p.id} style={{ background:'var(--surface2)',borderRadius:10,padding:'10px 14px',border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:13,fontWeight:600 }}>{p.name}</div>
                    <div style={{ fontSize:12,color:'var(--text3)' }}>{speciesLabel[p.species]||p.species}{p.breed?` · ${p.breed}`:''}</div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}
    </div>
  )
}
