// ════════════════════════════════════════════════════════════════════════════
// utils/zipHelper.js — Utilitário para criação de arquivos ZIP
// ════════════════════════════════════════════════════════════════════════════
// Funções para criar arquivos ZIP organizados de notas fiscais
// ════════════════════════════════════════════════════════════════════════════

const JSZip = require('jszip')

/**
 * Criar arquivo ZIP com XMLs de notas fiscais
 * @param {Array} notasComXml - Array de objetos { numero, chaveAcesso, xml }
 * @param {string} periodo - Período no formato YYYY-MM
 * @returns {Promise<Buffer>} Buffer do arquivo ZIP
 */
async function criarZipNotas(notasComXml, periodo) {
  const zip = new JSZip()
  
  // Criar pasta com nome do período
  const [ano, mes] = periodo.split('-')
  const nomePasta = `Notas_Fiscais_${periodo}`
  const pasta = zip.folder(nomePasta)
  
  // Adicionar cada XML ao ZIP usando chave de acesso como nome
  for (const { numero, chaveAcesso, xml } of notasComXml) {
    // A chave de acesso já vem com prefixo NFe do banco
    // Ex: NFe31260866614685000174650010000000411692290325
    // Usar diretamente como nome do arquivo
    const nomeArquivo = chaveAcesso 
      ? `${chaveAcesso}.xml`
      : `NFe_${String(numero).padStart(9, '0')}.xml`
    
    pasta.file(nomeArquivo, xml)
  }
  
  // Gerar buffer do ZIP
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9 // Máxima compressão
    }
  })
  
  return zipBuffer
}

/**
 * Formatar nome do arquivo ZIP
 * @param {string} periodo - Período no formato YYYY-MM
 * @returns {string} Nome do arquivo (ex: "Notas_Fiscais_2026-08.zip")
 */
function formatarNomeArquivoZip(periodo) {
  return `Notas_Fiscais_${periodo}.zip`
}

module.exports = {
  criarZipNotas,
  formatarNomeArquivoZip
}
