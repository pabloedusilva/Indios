// ════════════════════════════════════════════════════════════════════════════
// routes/notasFiscais.js — Rotas de Notas Fiscais
// ════════════════════════════════════════════════════════════════════════════
// Endpoints protegidos por autenticação para gerenciar notas fiscais.
// ════════════════════════════════════════════════════════════════════════════

const express = require('express')
const router = express.Router()
const notasFiscaisController = require('../controllers/notasFiscaisController')
const { rateLimitEmissao, rateLimitCancelamento } = require('../middlewares/rateLimiters')
const { validarEmissaoNFe, validarCancelamento } = require('../middlewares/fiscalValidators')
const { requireAuth } = require('../middlewares/authMiddleware')

// Aplicar autenticação em todas as rotas
router.use(requireAuth)

/**
 * @route   GET /api/notas-fiscais
 * @desc    Listar notas fiscais com filtros
 * @access  Private
 * @query   status, periodo, busca, limite, pagina
 */
router.get('/', notasFiscaisController.listar)

/**
 * @route   GET /api/notas-fiscais/estatisticas
 * @desc    Obter estatísticas das notas
 * @access  Private
 */
router.get('/estatisticas', notasFiscaisController.obterEstatisticas)

/**
 * @route   GET /api/notas-fiscais/estatisticas/:periodo
 * @desc    Obter estatísticas por período específico
 * @access  Private
 * @params  periodo (formato YYYY-MM, ex: 2024-01)
 */
router.get('/estatisticas/:periodo', notasFiscaisController.obterEstatisticasPorPeriodo)

/**
 * @route   GET /api/notas-fiscais/download-mes/:periodo
 * @desc    Download de todas as notas autorizadas do mês em ZIP
 * @access  Private
 * @params  periodo (formato YYYY-MM, ex: 2024-01)
 * @important Esta rota DEVE vir antes de /:id para evitar conflito de rotas
 */
router.get('/download-mes/:periodo', notasFiscaisController.downloadMesZip)

/**
 * @route   GET /api/notas-fiscais/impostos/:periodo
 * @desc    Calcular impostos aproximados de todas as notas do período
 * @access  Private
 * @params  periodo (formato YYYY-MM, ex: 2024-01)
 * @important Esta rota DEVE vir antes de /:id para evitar conflito de rotas
 */
router.get('/impostos/:periodo', notasFiscaisController.calcularImpostosPeriodo)

/**
 * @route   GET /api/notas-fiscais/:id
 * @desc    Buscar nota por ID
 * @access  Private
 * @important Esta rota deve vir DEPOIS das rotas específicas (estatisticas, download-mes, impostos, etc)
 */
router.get('/:id', notasFiscaisController.buscarPorId)

/**
 * @route   POST /api/notas-fiscais
 * @desc    Emitir nova nota fiscal
 * @access  Private
 * @body    { pedidoId, cpfDestinatario?, ufDestinatario?, observacoes? }
 */
router.post('/', rateLimitEmissao, validarEmissaoNFe, notasFiscaisController.emitir)

/**
 * @route   GET /api/notas-fiscais/:id/status-rapido
 * @desc    Consultar status rápido (apenas banco, sem API)
 * @access  Private
 */
router.get('/:id/status-rapido', notasFiscaisController.consultarStatusRapido)

/**
 * @route   GET /api/notas-fiscais/:id/impostos
 * @desc    Calcular impostos aproximados de uma nota específica
 * @access  Private
 */
router.get('/:id/impostos', notasFiscaisController.calcularImpostosNota)

/**
 * @route   POST /api/notas-fiscais/:id/consultar-status
 * @desc    Consultar status na SEFAZ
 * @access  Private
 */
router.post('/:id/consultar-status', notasFiscaisController.consultarStatus)

/**
 * @route   POST /api/notas-fiscais/:id/cancelar
 * @desc    Cancelar nota fiscal
 * @access  Private (Admin only)
 * @body    { motivo }
 */
router.post('/:id/cancelar', rateLimitCancelamento, validarCancelamento, notasFiscaisController.cancelar)

/**
 * @route   GET /api/notas-fiscais/:id/xml
 * @desc    Download XML da nota
 * @access  Private
 */
router.get('/:id/xml', notasFiscaisController.downloadXML)

/**
 * @route   GET /api/notas-fiscais/:id/danfe
 * @desc    Download DANFE (PDF) da nota
 * @access  Private
 */
router.get('/:id/danfe', notasFiscaisController.downloadDANFE)

module.exports = router
