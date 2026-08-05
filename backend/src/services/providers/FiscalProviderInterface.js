// ════════════════════════════════════════════════════════════════════════════
// INTERFACE: Fiscal Provider
// ════════════════════════════════════════════════════════════════════════════
// Interface abstrata para providers de emissão fiscal.
// Permite trocar facilmente entre FocusNFe, WebMania, Enotas, etc.
//
// CONTRATO:
// Qualquer provider deve implementar todos estes métodos:
//
// - async autenticar(credentials)
// - async emitir(xmlNFe, config)
// - async consultar(chaveAcesso)
// - async cancelar(chaveAcesso, motivo)
// - async downloadXML(chaveAcesso)
// - async downloadPDF(chaveAcesso)
// - async validarCertificado(certificado, senha)
// - async testarConexao()
//
// RETORNO PADRONIZADO:
// {
//   sucesso: boolean,
//   dados: object,
//   erro: { codigo, mensagem, detalhes }
// }
// ════════════════════════════════════════════════════════════════════════════

