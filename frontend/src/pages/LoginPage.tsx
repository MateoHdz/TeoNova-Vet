import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      setAuth(data.user, data.access_token)
      // Superadmin goes to super panel, everyone else to dashboard
      navigate(data.user.role === 'superadmin' ? '/super' : '/')
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Credenciales incorrectas'
      toast.error(Array.isArray(msg) ? msg[0] : msg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafb', display:'flex', alignItems:'stretch', fontFamily:'var(--font)' }}>
      {/* Left panel - hidden on small mobile */}
      <div style={{
        width:'42%', background:'linear-gradient(160deg,#059669,#10b981 50%,#34d399)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:48, flexShrink:0
      }} className="login-left">
        <div style={{ marginBottom:32, textAlign:'center' }}>
          <div style={{ width:72,height:72,background:'rgba(255,255,255,.2)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
            <PawPrint size={36} color="#fff" strokeWidth={2}/>
          </div>
          <h1 style={{ fontSize:32,fontWeight:800,color:'#fff',margin:0 }}>VetPOS</h1>
          <p style={{ color:'rgba(255,255,255,.8)',fontSize:15,marginTop:6 }}>Sistema para Veterinarias</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:14,width:'100%',maxWidth:280 }}>
          {['Ventas rápidas con POS','Control de inventario','Agenda de servicios','Multi-clínica'].map(f=>(
            <div key={f} style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:22,height:22,borderRadius:'50%',background:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <span style={{ color:'#fff',fontSize:11 }}>✓</span>
              </div>
              <span style={{ color:'rgba(255,255,255,.9)',fontSize:14 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32 }}>
        <div style={{ width:'100%',maxWidth:380 }}>
          <h2 style={{ fontSize:26,fontWeight:800,marginBottom:6 }}>Bienvenido</h2>
          <p style={{ color:'var(--text3)',fontSize:14,marginBottom:32 }}>Ingresa a tu cuenta</p>

          <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div>
              <label style={{ fontSize:13,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:6 }}>Correo electrónico</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                required autoFocus placeholder="admin@mrmax.com"
                style={{ fontSize:14,padding:'11px 14px' }}/>
            </div>
            <div>
              <label style={{ fontSize:13,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:6 }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  required placeholder="••••••••" style={{ fontSize:14,padding:'11px 14px',paddingRight:44 }}/>
                <button type="button" onClick={()=>setShowPwd(!showPwd)}
                  style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',padding:0 }}>
                  {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ padding:'13px',background:loading?'#6ee7b7':'var(--green)',color:'#fff',borderRadius:10,fontSize:15,fontWeight:700,cursor:loading?'not-allowed':'pointer',border:'none',transition:'background .15s',marginTop:4 }}>
              {loading?'Ingresando...':'Ingresar al sistema'}
            </button>
          </form>

          <p style={{ fontSize:12,color:'var(--text3)',marginTop:24,textAlign:'center' }}>
            © {new Date().getFullYear()} VetPOS · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Hide left panel on mobile via inline media query hack */}
      <style>{`
        @media (max-width: 640px) {
          .login-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
