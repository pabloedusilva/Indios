#!/usr/bin/env node

// =============================================================
//  scripts/sync-versions.js
//
//  Sincroniza a versão entre os 3 package.json do monorepo.
//
//  Uso:
//    node scripts/sync-versions.js
//    node scripts/sync-versions.js 1.5.0
//
//  Se nenhuma versão for fornecida, usa a versão do package.json raiz.
//  Se uma versão for fornecida, atualiza todos os 3 arquivos.
// =============================================================

const fs = require('fs')
const path = require('path')

// Caminhos dos package.json
const ROOT_PKG = path.join(__dirname, '../package.json')
const FRONTEND_PKG = path.join(__dirname, '../frontend/package.json')
const BACKEND_PKG = path.join(__dirname, '../backend/package.json')

/**
 * Lê e parseia um package.json
 * @param {string} filePath
 * @returns {object}
 */
function readPackageJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Escreve um package.json com formatação consistente
 * @param {string} filePath
 * @param {object} data
 */
function writePackageJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n'
  fs.writeFileSync(filePath, content, 'utf-8')
}

/**
 * Valida formato de versão semântica
 * @param {string} version
 * @returns {boolean}
 */
function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version)
}

/**
 * Sincroniza versões entre os 3 package.json
 * @param {string} [targetVersion] - Versão alvo (opcional)
 */
function syncVersions(targetVersion) {
  console.log('[SYNC] Sincronizando versões do monorepo...\n')

  // Ler package.json raiz
  const rootPkg = readPackageJson(ROOT_PKG)
  const currentVersion = rootPkg.version

  // Determinar versão alvo
  const newVersion = targetVersion || currentVersion

  // Validar versão
  if (!isValidVersion(newVersion)) {
    console.error(`[ERROR] Versão inválida: ${newVersion}`)
    console.error('        Formato esperado: X.Y.Z (ex: 1.4.0)')
    process.exit(1)
  }

  console.log(`[INFO] Versão atual: ${currentVersion}`)
  console.log(`[INFO] Versão alvo:  ${newVersion}\n`)

  // Se versões são iguais e nenhuma versão foi fornecida, verificar consistência
  if (!targetVersion && currentVersion === newVersion) {
    const frontendPkg = readPackageJson(FRONTEND_PKG)
    const backendPkg = readPackageJson(BACKEND_PKG)

    if (
      frontendPkg.version === newVersion &&
      backendPkg.version === newVersion
    ) {
      console.log('[OK] Todas as versões já estão sincronizadas!')
      console.log(`     Raiz:     ${rootPkg.version}`)
      console.log(`     Frontend: ${frontendPkg.version}`)
      console.log(`     Backend:  ${backendPkg.version}`)
      return
    }
  }

  // Atualizar package.json raiz
  rootPkg.version = newVersion
  writePackageJson(ROOT_PKG, rootPkg)
  console.log(`[OK] Raiz atualizada:     ${newVersion}`)

  // Atualizar package.json frontend
  const frontendPkg = readPackageJson(FRONTEND_PKG)
  frontendPkg.version = newVersion
  writePackageJson(FRONTEND_PKG, frontendPkg)
  console.log(`[OK] Frontend atualizado: ${newVersion}`)

  // Atualizar package.json backend
  const backendPkg = readPackageJson(BACKEND_PKG)
  backendPkg.version = newVersion
  writePackageJson(BACKEND_PKG, backendPkg)
  console.log(`[OK] Backend atualizado:  ${newVersion}`)

  console.log('\n[SUCCESS] Sincronização concluída com sucesso!')
  console.log('\n[INFO] Próximos passos:')
  console.log('       1. Limpar cache do Vite: npm run clean:cache')
  console.log('       2. Reiniciar dev server: npm run dev (no frontend)')
  console.log('       3. Verificar versão na interface')
}

// Executar script
const targetVersion = process.argv[2]
syncVersions(targetVersion)
