// ════════════════════════════════════════════════════════════════════════════
// HOOK: useNotificationSound
// ════════════════════════════════════════════════════════════════════════════
// Hook para reproduzir sons de notificações de forma declarativa no React.
//
// USO:
// import { useNotificationSound } from '@/hooks/useNotificationSound'
// 
// function MeuComponente() {
//   const { playSuccess, playError } = useNotificationSound()
//   
//   const handleSave = async () => {
//     try {
//       await salvar()
//       playSuccess()
//       toast.success('Salvo com sucesso!')
//     } catch (err) {
//       playError()
//       toast.error('Erro ao salvar')
//     }
//   }
// }
// ════════════════════════════════════════════════════════════════════════════

import { useCallback } from 'react'
import { playNotificationSound, playErrorSound, playCashSound } from '../services/audioService'

export function useNotificationSound() {
  const playSuccess = useCallback(() => {
    playNotificationSound()
  }, [])

  const playError = useCallback(() => {
    playErrorSound()
  }, [])

  const playInfo = useCallback(() => {
    playNotificationSound()
  }, [])

  const playWarning = useCallback(() => {
    playNotificationSound()
  }, [])

  const playCash = useCallback(() => {
    playCashSound()
  }, [])

  return {
    playSuccess,
    playError,
    playInfo,
    playWarning,
    playCash,
  }
}

export default useNotificationSound
