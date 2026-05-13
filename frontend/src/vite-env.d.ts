/// <reference types="vite/client" />

/**
 * Declarações de tipo para variáveis de ambiente injetadas pelo Vite em build-time.
 *
 * VITE_APP_VERSION é lida do package.json raiz do monorepo via vite.config.js
 * e injetada como constante estática durante o build. Isso garante que a versão
 * exibida no frontend sempre corresponde exatamente ao build implantado.
 *
 * @see frontend/vite.config.js — seção `define`
 * @see frontend/src/utils/version.js — ponto de consumo
 */
interface ImportMetaEnv {
  /** Versão da aplicação lida do package.json raiz (ex.: "1.4.0"). Imutável após o build. */
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
