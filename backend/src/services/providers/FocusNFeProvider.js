// ════════════════════════════════════════════════════════════════════════════
// PROVIDER: FocusNFe
// ════════════════════════════════════════════════════════════════════════════
// Implementação do FiscalProviderInterface para a API FocusNFe.
// Documentação: https://focusnfe.com.br/doc/
//
// ENDPOINTS PRINCIPAIS:
// - POST   /v2/nfe                        → Autorizar NFe
// - GET    /v2/nfe/:ref                   → Consultar NFe
// - DELETE /v2/nfe/:ref                   → Cancelar NFe
// - GET    /v2/nfe/:ref.xml               → Download XML
// - GET    /v2/nfe/:ref/danfe             → Download DANFE
//
// AUTENTICAÇÃO:
// - Token Bearer via Header Authorization
// - Token armazenado em variável de ambiente: FOCUSNFE_API_TOKEN
//
// SEGURANÇA:
// - HTTPS obrigatório
// - Rate limiting do provider (10 req/seg)
// - Retry com backoff exponencial
// - Timeout configurável (30s padrão)
// - Validação de certificado A1
// ════════════════════════════════════════════════════════════════════════════

