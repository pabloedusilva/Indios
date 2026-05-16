// =============================================================
//  utils/version.js
//
//  Exporta a versão da aplicação injetada em build-time.
//
//  A versão é lida do package.json raiz do monorepo durante o
//  build pelo Vite e embutida estaticamente no bundle via
//  import.meta.env.VITE_APP_VERSION.
//
//  Isso garante que:
//    • Cada bundle carrega sua própria versão (suporte a rollback)
//    • Não há chamadas para GitHub API em runtime
//    • A versão é sempre sincronizada com semantic-release
//    • Funciona perfeitamente com GitHub Actions e Render
//
//  Uso:
//    import { APP_VERSION } from '@/utils/version'
//    console.log(`Versão: v${APP_VERSION}`)
// =============================================================

/**
 * Versão da aplicação injetada em build-time.
 * 
 * Em produção: versão do package.json raiz (ex: "1.3.0")
 * Em desenvolvimento: fallback para "dev"
 * 
 * @type {string}
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev'

/**
 * Versão formatada com prefixo "v" para exibição.
 * 
 * @type {string}
 * @example "v1.3.0" ou "vdev"
 */
export const APP_VERSION_DISPLAY = `v${APP_VERSION}`
