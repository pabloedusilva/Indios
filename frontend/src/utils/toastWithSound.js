// ════════════════════════════════════════════════════════════════════════════
// UTILITY: Toast with Sound
// ════════════════════════════════════════════════════════════════════════════
// Wrapper do react-hot-toast que adiciona sons automaticamente.
//
// USO:
// import { toast } from '@/utils/toastWithSound'
// 
// // Uso idêntico ao react-hot-toast, mas com som automático
// toast.success('Operação concluída!') // Toca som de notificação
// toast.error('Erro ao processar')     // Toca som de erro
// toast.info('Informação importante')  // Toca som de notificação
// toast.warning('Atenção!')            // Toca som de notificação
//
// // Toast silencioso (sem som)
// toast.silent.success('Sem som')
// toast.silent.error('Sem som')
// ════════════════════════════════════════════════════════════════════════════

import reactHotToast from 'react-hot-toast'
import { playNotificationSound, playErrorSound } from '../services/audioService'

// Wrapper para toast.success com som
const success = (message, options) => {
  playNotificationSound()
  return reactHotToast.success(message, options)
}

// Wrapper para toast.error com som
const error = (message, options) => {
  playErrorSound()
  return reactHotToast.error(message, options)
}

// Wrapper para toast.info com som (usa som de notificação)
const info = (message, options) => {
  playNotificationSound()
  return reactHotToast(message, { icon: 'ℹ️', ...options })
}

// Wrapper para toast.warning com som (usa som de notificação)
const warning = (message, options) => {
  playNotificationSound()
  return reactHotToast(message, { icon: '⚠️', ...options })
}

// Toast silenciosos (sem som) - útil para atualizações não críticas
const silent = {
  success: (message, options) => reactHotToast.success(message, options),
  error: (message, options) => reactHotToast.error(message, options),
  info: (message, options) => reactHotToast(message, { icon: 'ℹ️', ...options }),
  warning: (message, options) => reactHotToast(message, { icon: '⚠️', ...options }),
}

// Exportar wrapper com mesmas funcionalidades do original
export const toast = Object.assign(
  // Função padrão (toast genérico)
  (message, options) => {
    playNotificationSound()
    return reactHotToast(message, options)
  },
  {
    // Métodos com som
    success,
    error,
    info,
    warning,
    
    // Toast silenciosos
    silent,
    
    // Métodos passthrough (sem som customizado)
    loading: reactHotToast.loading,
    promise: reactHotToast.promise,
    custom: reactHotToast.custom,
    dismiss: reactHotToast.dismiss,
    remove: reactHotToast.remove,
  }
)

export default toast
