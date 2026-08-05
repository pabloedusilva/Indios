// =============================================================
//  models/UsuarioModel.js — Acesso à tabela usuarios
// =============================================================

const pool = require('../config/database')

const UsuarioModel = {
  async findByUsuario(usuario) {
    const result = await pool.query(
      'SELECT id, usuario, senha_hash, role FROM usuarios WHERE usuario = $1 LIMIT 1',
      [usuario],
    )
    return result.rows[0] ?? null
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, usuario, role FROM usuarios WHERE id = $1 LIMIT 1',
      [id],
    )
    return result.rows[0] ?? null
  },

  async create({ usuario, senhaHash }) {
    const result = await pool.query(
      'INSERT INTO usuarios (usuario, senha_hash) VALUES ($1, $2) RETURNING id',
      [usuario, senhaHash],
    )
    return result
  },

  async existsByUsuario(usuario) {
    const result = await pool.query(
      'SELECT 1 FROM usuarios WHERE usuario = $1 LIMIT 1',
      [usuario],
    )
    return result.rows.length > 0
  },

  // Retorna senha_hash para validação antes de alterar credenciais
  async findByIdWithHash(id) {
    const result = await pool.query(
      'SELECT id, usuario, senha_hash, role FROM usuarios WHERE id = $1 LIMIT 1',
      [id],
    )
    return result.rows[0] ?? null
  },

  // Altera apenas o nome de usuário
  async updateUsuario(id, novoUsuario) {
    const result = await pool.query(
      'UPDATE usuarios SET usuario = $1 WHERE id = $2',
      [novoUsuario, id],
    )
    return result
  },

  // Altera apenas o hash da senha
  async updateSenha(id, novaSenhaHash) {
    const result = await pool.query(
      'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
      [novaSenhaHash, id],
    )
    return result
  },

  // Altera usuário e senha juntos numa única transação
  async updateUsuarioESenha(id, novoUsuario, novaSenhaHash) {
    const result = await pool.query(
      'UPDATE usuarios SET usuario = $1, senha_hash = $2 WHERE id = $3',
      [novoUsuario, novaSenhaHash, id],
    )
    return result
  },
}

module.exports = UsuarioModel
