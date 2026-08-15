// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Rate Limiters
// ════════════════════════════════════════════════════════════════════════════
// Limitadores de taxa específicos para operações fiscais.
//
// LIMITADORES:
// - rateLimitEmissao         → Max 5 emissões por minuto por usuário
// - rateLimitCancelamento    → Max 3 cancelamentos por minuto
// - rateLimitConsulta        → Max 20 consultas por minuto
// - rateLimitConfig          → Max 10 alterações de config por minuto
//
// JUSTIFICATIVA:
// Protege contra:
// - Emissões acidentais em massa
// - Ataques de força bruta em endpoints sensíveis
// - Sobrecarga na API do provider externo
// - Custos excessivos por excesso de requisições
//
// IMPLEMENTAÇÃO:
// - Usa express-rate-limit
// - Baseado em IP + userId
// - Headers de resposta incluem: X-RateLimit-*
// ════════════════════════════════════════════════════════════════════════════

const rateLimit = require('express-rate-limit')

/**
 * Rate limiter para emissão de notas fiscais
 * Max: 5 requisições por minuto
 */
const rateLimitEmissao = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: {
    success: false,
    message: 'Muitas tentativas de emissão. Aguarde 1 minuto e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Rate limiter para cancelamento de notas
 * Max: 5 requisições por minuto
 * Identificador: IP padrão (com tratamento automático de IPv6)
 */
const rateLimitCancelamento = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 cancelamentos por minuto
  message: {
    success: false,
    message: 'Muitas tentativas de cancelamento. Aguarde um momento e tente novamente.',
    codigo: 'RATE_LIMIT_EXCEEDED',
    retry_after: 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usa o keyGenerator padrão (IP com tratamento automático de IPv6)
  // Handler customizado com log de violações
  handler: (req, res) => {
    console.warn(`[RATE_LIMIT] Cancelamento bloqueado:`, {
      ip: req.ip,
      usuario_id: req.usuario?.id || 'anonymous',
      usuario_nome: req.usuario?.nome || 'N/A',
      rota: req.originalUrl,
      timestamp: new Date().toISOString()
    })
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de cancelamento. Aguarde um momento e tente novamente.',
      codigo: 'RATE_LIMIT_EXCEEDED',
      retry_after: 60 // segundos
    })
  }
})

/**
 * Rate limiter para consultas de status
 * Max: 20 requisições por minuto
 */
const rateLimitConsulta = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20,
  message: {
    success: false,
    message: 'Muitas consultas. Aguarde 1 minuto e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Rate limiter para alterações de configuração
 * Max: 10 requisições por minuto (apenas admin)
 */
const rateLimitConfig = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: {
    success: false,
    message: 'Muitas alterações de configuração. Aguarde 1 minuto e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Rate limiter estrito genérico
 * Max: 5 requisições por minuto
 */
const rateLimitStrict = (name = 'strict') => rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: {
    success: false,
    message: `Muitas requisições para ${name}. Aguarde 1 minuto e tente novamente.`
  },
  standardHeaders: true,
  legacyHeaders: false
})

module.exports = {
  rateLimitEmissao,
  rateLimitCancelamento,
  rateLimitConsulta,
  rateLimitConfig,
  rateLimitStrict
}
