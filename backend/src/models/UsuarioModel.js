// =============================================================
//  models/UsuarioModel.js — Acesso à tabela usuarios
// =============================================================

const pool = require('../config/database')

const UsuarioModel = {
  async findByUsuario(usuario) {
    const [rows] = await pool.execute(
      'SELECT id, usuario, senha_hash FROM usuarios WHERE usuario = ? LIMIT 1',
      [usuario],
    )
    return rows[0] ?? null
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, usuario FROM usuarios WHERE id = ? LIMIT 1',
      [id],
    )
    return rows[0] ?? null
  },

  async create({ usuario, senhaHash }) {
    const [result] = await pool.execute(
      'INSERT INTO usuarios (usuario, senha_hash) VALUES (?, ?)',
      [usuario, senhaHash],
    )
    return result
  },

  async existsByUsuario(usuario) {
    const [rows] = await pool.execute(
      'SELECT 1 FROM usuarios WHERE usuario = ? LIMIT 1',
      [usuario],
    )
    return rows.length > 0
  },

  // Retorna senha_hash para validação antes de alterar credenciais
  async findByIdWithHash(id) {
    const [rows] = await pool.execute(
      'SELECT id, usuario, senha_hash FROM usuarios WHERE id = ? LIMIT 1',
      [id],
    )
    return rows[0] ?? null
  },

  // Altera apenas o nome de usuário
  async updateUsuario(id, novoUsuario) {
    const [result] = await pool.execute(
      'UPDATE usuarios SET usuario = ? WHERE id = ?',
      [novoUsuario, id],
    )
    return result
  },

  // Altera apenas o hash da senha
  async updateSenha(id, novaSenhaHash) {
    const [result] = await pool.execute(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [novaSenhaHash, id],
    )
    return result
  },

  // Altera usuário e senha juntos numa única transação
  async updateUsuarioESenha(id, novoUsuario, novaSenhaHash) {
    const [result] = await pool.execute(
      'UPDATE usuarios SET usuario = ?, senha_hash = ? WHERE id = ?',
      [novoUsuario, novaSenhaHash, id],
    )
    return result
  },
}

module.exports = UsuarioModel
