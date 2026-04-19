// =============================================================
//  middlewares/validators.js
//
//  Validações de entrada usando express-validator.
//  Cada função retorna um array de middlewares que valida o body
//  e chama next() com erro se inválido.
// =============================================================

const { body, validationResult } = require('express-validator')

// Middleware que aplica o resultado das validações
const aplicarValidacao = (req, res, next) => {
  const erros = validationResult(req)
  if (!erros.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Dados inválidos.',
      errors: erros.array().map((e) => ({ campo: e.path, mensagem: e.msg })),
    })
  }
  next()
}

// ── Produto ───────────────────────────────────────────────────
const validarProduto = [
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório.')
    .isLength({ max: 100 }).withMessage('Nome deve ter no máximo 100 caracteres.'),

  body('categoria')
    .trim()
    .notEmpty().withMessage('Categoria é obrigatória.'),

  body('preco')
    .notEmpty().withMessage('Preço é obrigatório.')
    .isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que zero.'),

  body('disponivel')
    .optional()
    .isBoolean().withMessage('Disponível deve ser true ou false.'),

  body('icone')
    .optional()
    .isString().withMessage('Ícone deve ser uma string.'),

  aplicarValidacao,
]

// ── Pedido ────────────────────────────────────────────────────
const validarPedido = [
  body('nomeCliente')
    .trim()
    .notEmpty().withMessage('Nome do cliente é obrigatório.')
    .isLength({ max: 100 }).withMessage('Nome deve ter no máximo 100 caracteres.'),

  body('observacoes')
    .optional()
    .isString()
    .isLength({ max: 300 }).withMessage('Observações devem ter no máximo 300 caracteres.'),

  body('itens')
    .isArray({ min: 1 }).withMessage('O pedido deve conter pelo menos um item.'),

  body('itens.*.produtoId')
    .notEmpty().withMessage('ID do produto é obrigatório.'),

  body('itens.*.nomeProduto')
    .trim()
    .notEmpty().withMessage('Nome do produto é obrigatório.'),

  body('itens.*.quantidade')
    .isInt({ min: 1 }).withMessage('Quantidade deve ser maior que zero.'),

  body('itens.*.precoUnitario')
    .isFloat({ min: 0.01 }).withMessage('Preço unitário deve ser maior que zero.'),

  aplicarValidacao,
]

// ── Pagamento (rota /finalizar) ───────────────────────────────
const FORMAS_VALIDAS = ['pix', 'credito', 'debito', 'dinheiro']

const validarPagamento = [
  body('formaPagamento')
    .notEmpty().withMessage('Forma de pagamento é obrigatória.')
    .isIn(FORMAS_VALIDAS).withMessage(`Forma de pagamento deve ser uma de: ${FORMAS_VALIDAS.join(', ')}.`),

  body('valorRecebido')
    .notEmpty().withMessage('Valor recebido é obrigatório.')
    .isFloat({ min: 0.01 }).withMessage('Valor recebido deve ser maior que zero.'),

  body('troco')
    .notEmpty().withMessage('Troco é obrigatório (pode ser 0).')
    .isFloat({ min: 0 }).withMessage('Troco não pode ser negativo.'),

  aplicarValidacao,
]

module.exports = { validarProduto, validarPedido, validarPagamento }
