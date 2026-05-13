/**
 * @file version.js
 * @description Fonte única da verdade para a versão da aplicação no frontend.
 *
 * A versão é injetada em build-time pelo Vite a partir do package.json raiz
 * do monorepo (via `define` no vite.config.js). Isso garante que:
 *
 *  - A versão exibida sempre reflete exatamente o build implantado.
 *  - Em rollbacks, a versão exibida volta automaticamente para a versão
 *    do build anterior — sem nenhuma edição manual.
 *  - Nunca busca a "última release" do GitHub em runtime; a versão é
 *    estática e imutável após o build.
 *
 * Uso:
 *   import { APP_VERSION } from '@/utils/version'
 *   // → "1.4.0"
 */

/**
 * Versão da aplicação injetada em build-time pelo Vite.
 * Lida do package.json raiz do monorepo via `import.meta.env.VITE_APP_VERSION`.
 *
 * Fallback para 'dev' em ambiente de desenvolvimento local quando a variável
 * não estiver disponível (ex.: testes unitários sem build completo).
 *
 * @type {string}
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev'
