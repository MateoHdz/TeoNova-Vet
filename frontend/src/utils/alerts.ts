import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import toast from 'react-hot-toast'

const MySwal = withReactContent(Swal)

export const Alerts = {
  /**
   * Muestra un toast rápido de éxito
   */
  success: (msg: string, duration?: number) => {
    toast.success(msg, { duration: duration || 2000 })
  },

  /**
   * Muestra un toast rápido de error (para errores no críticos)
   */
  error: (msg: string, duration?: number) => {
    toast.error(msg, { duration: duration || 3000 })
  },

  /**
   * Muestra un modal de confirmación destructiva o importante
   * @returns true si el usuario aceptó
   */
  confirm: async (title: string, text: string = "Esta acción no se puede deshacer") => {
    const result = await MySwal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981', // var(--green)
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    })
    return result.isConfirmed
  },

  /**
   * Muestra un modal listando qué campos exactamente faltan por llenar
   */
  validationError: (missingFields: string[]) => {
    return MySwal.fire({
      icon: 'error',
      title: 'Faltan campos',
      html: `Por favor completa los siguientes campos obligatorios para continuar:<br/><br/><div style="text-align: left; background: #fee2e2; padding: 12px; border-radius: 8px; color: #991b1b; font-size: 14px;"><b>${missingFields.join('<br/>')}</b></div>`,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Entendido'
    })
  }
}
