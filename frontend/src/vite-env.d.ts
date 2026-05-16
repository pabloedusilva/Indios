/// <reference types="vite/client" />

/**
 * Tipagem para variáveis de ambiente customizadas do Vite.
 * 
 * Estende a interface ImportMetaEnv para incluir variáveis
 * injetadas via vite.config.js (define).
 */
interface ImportMetaEnv {
  /**
   * Versão da aplicação injetada em build-time.
   * 
   * Lida do package.json raiz do monorepo e embutida
   * estaticamente no bundle durante o build.
   * 
   * @example "1.3.0"
   */
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
