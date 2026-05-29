import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const EMPTY = { name:'', email:'', password:'', role:'employee' }
const COLORS: any = { admin:'#2563eb', employee:'#10b981' }
const COLORS_BG: any = { admin:'#eff6ff', employee:'#ecfdf5' }

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const load = () => api.get('/users').then(r=>setUsers(r.data))
  useEffect(()=>{ load() },[])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (u: any) => {
    setEditing(u); setForm({ name:u.name, email:u.email, password:'', role:u.role }); setShowModal(true)
  }

  const save = async () => {
    if (!form.name||!form.email) { toast.error('Nombre y email requeridos'); return }
    if (!editing&&!form.password) { toast.error('Contraseña requerida'); return }
    setLoading(true)
    try {
      const data: any = { name:form.name, email:form.email, role:form.role }
      if (form.password) data.password = form.password
      editing ? await api.put(`/users/${editing.id}`,data) : await api.post('/users',{...data,password:form.password})
      toast.success(editing?'Usuario actualizado':'Usuario creado')
      setShowModal(false); load()
    } catch (e:any) { toast.error(e.response?.data?.message||'Error') }
    finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('¿Desactivar este usuario?')) return
    await api.delete(`/users/${id}`); toast.success('Usuario desactivado'); load()
  }

  const initials = (name: string) => name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'U'

  return (
    <div className="page-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>Usuarios y roles</h1>
          <p style={{ color:'var(--text2)', fontSize:13, marginTop:2 }}>Empleados, administradores y permisos</p>
        </div>
        <button onClick={openCreate} className="btn-green"><Plus size={15}/> Nuevo usuario</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {users.map((u:any)=>(
          <div key={u.id} className="card" style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:COLORS_BG[u.role]||'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:COLORS[u.role]||'#6b7280', flexShrink:0 }}>
                  {initials(u.name)}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{u.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>{u.email}</div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:COLORS_BG[u.role], color:COLORS[u.role] }}>
                    {u.role==='admin'?'Administrador':'Empleado'}
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>openEdit(u)} style={{ background:'var(--surface2)', borderRadius:7, padding:'6px 8px', color:'var(--text2)' }}><Edit2 size={13}/></button>
                <button onClick={()=>remove(u.id)} style={{ background:'var(--out-bg)', borderRadius:7, padding:'6px 8px', color:'var(--out)' }}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
        {users.length===0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
            <UserCog size={36} style={{ margin:'0 auto 10px', display:'block' }} strokeWidth={1.2}/>
            Sin usuarios
          </div>
        )}
      </div>

      {showModal&&(
        <div className="modal-overlay">
          <div className="modal-box" style={{ width:400 }}>
            <h3 style={{ fontSize:17,fontWeight:700,marginBottom:20 }}>{editing?'Editar usuario':'Nuevo usuario'}</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              {[['Nombre completo *','name','text'],['Correo electrónico *','email','email'],
                [`Contraseña${editing?' (vacío = no cambiar)':' *'}`,'password','password']
              ].map(([l,k,t])=>(
                <div key={k}><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
              ))}
              <div><label style={{ fontSize:12,fontWeight:500,color:'var(--text2)',display:'block',marginBottom:4 }}>Rol</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="employee">Empleado</option>
                  <option value="admin">Administrador</option>
                </select></div>
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
