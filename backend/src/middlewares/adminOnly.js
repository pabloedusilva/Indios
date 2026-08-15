// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Admin Only
// ════════════════════════════════════════════════════════════════════════════
// Middleware para proteger rotas que exigem privilégios de administrador.
// Usado especialmente para configurações fiscais sensíveis.
//
// VERIFICAÇÕES:
// - Usuário autenticado
// - Usuário possui role 'admin'
// - Token JWT válido e não expirado
//
// USO:
// router.put('/configuracao-fiscal', authMiddleware, adminOnly, controller.atualizar)
//
// RESPOSTA DE ERRO:
// HTTP 403 Forbidden
// {
//   erro: 'Acesso negado',
//   mensagem: 'Apenas administradores podem acessar este recurso'
// }
//
// AUDITORIA:
// - Log de todas as tentativas de acesso negado
// - Inclui: userId, IP, rota tentada, timestamp
// ════════════════════════════════════════════════════════════════════════════

const adminOnly = async (req, res, next) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.usuario) {
      console.warn(`[SECURITY] Tentativa de acesso sem autenticação - IP: ${req.ip}, Rota: ${req.originalUrl}`)
      return res.status(401).json({
        success: false,
        message: 'Autenticação requerida'
      })
    }

    // Verifica se o usuário é admin
    if (req.usuario.role !== 'admin') {
      // Log detalhado de segurança
      console.warn(`[SECURITY] Tentativa de acesso não autorizado:`, {
        usuario_id: req.usuario.id,
        usuario_nome: req.usuario.nome,
        role: req.usuario.role,
        ip: req.ip,
        rota: req.originalUrl,
        metodo: req.method,
        timestamp: new Date().toISOString()
      })
      
      // Registrar em audit_log se disponível
      try {
        const AuditLogModel = require('../models/AuditLogFiscalModel')
        await AuditLogModel.registrar({
          operacao: 'acesso_negado',
          entidade: 'sistema',
          entidade_id: null,
          usuario_id: req.usuario.id,
          resultado: 'erro',
          mensagem: `Tentativa de acesso não autorizado à rota ${req.originalUrl}`,
          dados_novos: {
            ip: req.ip,
            rota: req.originalUrl,
            metodo: req.method,
            role_usuario: req.usuario.role
          }
        })
      } catch (auditError) {
        console.error('[AdminOnly] Erro ao registrar em audit_log:', auditError.message)
      }
      
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem realizar esta ação.'
      })
    }

    // Usuário é admin, permite acesso
    next()
  } catch (error) {
    console.error('[AdminOnly] Erro ao verificar permissões:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões'
    })
  }
}

module.exports = adminOnly
