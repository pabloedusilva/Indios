// ════════════════════════════════════════════════════════════════════════════
// SERVICE: Audio Service
// ════════════════════════════════════════════════════════════════════════════
// Serviço para reproduzir sons de notificações.
//
// SONS DISPONÍVEIS:
// - notificacao.mp3: Para notificações de sucesso, info e avisos
// - erro.mp3: Para notificações de erro
//
// USO:
// import { playNotificationSound, playErrorSound } from '@/services/audioService'
// playNotificationSound() // Toca som de notificação normal
// playErrorSound()        // Toca som de erro
//
// BOAS PRÁTICAS:
// - Áudios são carregados sob demanda (lazy loading)
// - Tratamento de erros silencioso (não quebra a aplicação se áudio não existir)
// - Respeita preferências do usuário (pode ser silenciado)
// - Controle de volume configurável
// ════════════════════════════════════════════════════════════════════════════

// Configurações
const AUDIO_CONFIG = {
  volume: 0.5, // Volume padrão (0.0 a 1.0)
  enabled: true, // Habilitar/desabilitar sons
}

// Caminhos dos áudios (relativos à pasta public)
const SOUNDS = {
  notification: '/sounds/notificacao.mp3',
  error: '/sounds/erro.mp3',
  cash: '/sounds/cash.mp3',
}

// Cache de instâncias de Audio
const audioCache = {}

/**
 * Cria ou retorna instância de áudio do cache
 * @param {string} soundPath - Caminho do arquivo de áudio
 * @returns {HTMLAudioElement}
 */
function getAudioInstance(soundPath) {
  if (!audioCache[soundPath]) {
    audioCache[soundPath] = new Audio(soundPath)
    audioCache[soundPath].volume = AUDIO_CONFIG.volume
  }
  return audioCache[soundPath]
}

/**
 * Reproduz um som de notificação
 * @param {string} soundPath - Caminho do arquivo de áudio
 * @returns {Promise<void>}
 */
async function playSound(soundPath) {
  // Se sons estão desabilitados, não fazer nada
  if (!AUDIO_CONFIG.enabled) {
    return
  }

  try {
    const audio = getAudioInstance(soundPath)
    
    // Reset para permitir tocar o mesmo som múltiplas vezes
    audio.currentTime = 0
    
    // Tentar reproduzir
    await audio.play()
  } catch (error) {
    // Falha silenciosa - não quebrar a aplicação se áudio não existir ou falhar
  }
}

/**
 * Reproduz som de notificação normal (sucesso, info, aviso)
 * @returns {Promise<void>}
 */
export async function playNotificationSound() {
  await playSound(SOUNDS.notification)
}

/**
 * Reproduz som de erro
 * @returns {Promise<void>}
 */
export async function playErrorSound() {
  await playSound(SOUNDS.error)
}

/**
 * Reproduz som de dinheiro/caixa (finalização de pedido)
 * @returns {Promise<void>}
 */
export async function playCashSound() {
  await playSound(SOUNDS.cash)
}

/**
 * Configura o volume dos sons
 * @param {number} volume - Volume de 0.0 (mudo) a 1.0 (máximo)
 */
export function setVolume(volume) {
  const clampedVolume = Math.max(0, Math.min(1, volume))
  AUDIO_CONFIG.volume = clampedVolume
  
  // Atualizar volume de todas as instâncias em cache
  Object.values(audioCache).forEach(audio => {
    audio.volume = clampedVolume
  })
}

/**
 * Habilita ou desabilita sons
 * @param {boolean} enabled - true para habilitar, false para desabilitar
 */
export function setSoundsEnabled(enabled) {
  AUDIO_CONFIG.enabled = enabled
}

/**
 * Retorna se os sons estão habilitados
 * @returns {boolean}
 */
export function areSoundsEnabled() {
  return AUDIO_CONFIG.enabled
}

/**
 * Retorna o volume atual
 * @returns {number}
 */
export function getVolume() {
  return AUDIO_CONFIG.volume
}

/**
 * Limpa o cache de áudios
 */
export function clearAudioCache() {
  Object.values(audioCache).forEach(audio => {
    audio.pause()
    audio.src = ''
  })
  Object.keys(audioCache).forEach(key => delete audioCache[key])
}

export default {
  playNotificationSound,
  playErrorSound,
  playCashSound,
  setVolume,
  setSoundsEnabled,
  areSoundsEnabled,
  getVolume,
  clearAudioCache,
}
