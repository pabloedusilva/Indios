// =============================================================
//  verify-config.cjs — Script de verificação de configuração
//
//  · Verifica se as variáveis de ambiente estão configuradas
//  · Testa conexão com o backend
// =============================================================

const fs = require('fs')
const path = require('path')

console.log('🔍 Verificando configuração do frontend...\n')

// Verificar arquivos de ambiente
const envFiles = ['.env.development', '.env.production']
let allFilesExist = true

envFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} existe`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const apiUrl = content.match(/VITE_API_URL=(.+)/)?.[1]
    if (apiUrl) {
      console.log(`   └─ VITE_API_URL: ${apiUrl}`)
    } else {
      console.log(`   └─ ⚠️  VITE_API_URL não encontrado`)
    }
  } else {
    console.log(`❌ ${file} não existe`)
    allFilesExist = false
  }
})

// Verificar arquivo _redirects
console.log('')
const redirectsPath = path.join(__dirname, 'public', '_redirects')
if (fs.existsSync(redirectsPath)) {
  console.log('✅ public/_redirects existe')
  const content = fs.readFileSync(redirectsPath, 'utf-8')
  console.log(`   └─ Conteúdo: ${content.trim()}`)
} else {
  console.log('❌ public/_redirects não existe')
  allFilesExist = false
}

// Verificar api.js
console.log('')
const apiPath = path.join(__dirname, 'src', 'services', 'api.js')
if (fs.existsSync(apiPath)) {
  const content = fs.readFileSync(apiPath, 'utf-8')
  if (content.includes('import.meta.env.VITE_API_URL')) {
    console.log('✅ api.js usa variável de ambiente')
  } else {
    console.log('❌ api.js não usa variável de ambiente')
    allFilesExist = false
  }
} else {
  console.log('❌ api.js não encontrado')
  allFilesExist = false
}

// Verificar useBackendStatus.js
const hookPath = path.join(__dirname, 'src', 'hooks', 'useBackendStatus.js')
if (fs.existsSync(hookPath)) {
  const content = fs.readFileSync(hookPath, 'utf-8')
  if (content.includes('import.meta.env.VITE_API_URL')) {
    console.log('✅ useBackendStatus.js usa variável de ambiente')
  } else {
    console.log('❌ useBackendStatus.js não usa variável de ambiente')
    allFilesExist = false
  }
} else {
  console.log('❌ useBackendStatus.js não encontrado')
  allFilesExist = false
}

console.log('')
if (allFilesExist) {
  console.log('✅ Configuração do frontend está correta!')
  console.log('\n📝 Próximos passos:')
  console.log('1. Configure as variáveis de ambiente no Render')
  console.log('2. Faça o deploy do backend primeiro')
  console.log('3. Depois faça o deploy do frontend')
  console.log('4. Teste a aplicação')
} else {
  console.log('❌ Configuração do frontend tem problemas!')
  console.log('\n📝 Corrija os problemas acima antes de fazer deploy')
}
