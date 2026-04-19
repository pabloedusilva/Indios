// =============================================================
//  controllers/authController.js — Login, logout e verificação
// =============================================================

const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const UsuarioModel = require('../models/UsuarioModel')

const JWT_SECRET     = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const IS_PROD        = process.env.NODE_ENV === 'production'

// Configuração padrão do cookie de autenticação
function cookieOptions() {
  return {
    httpOnly: true,                     // inacessível via JS no cliente
    secure:   IS_PROD,                  // HTTPS only em produção
    sameSite: 'strict',                 // proteção contra CSRF
    path:     '/',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
async function login(req, res, next) {
  try {
    const { usuario, senha } = req.body

    if (!usuario || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Usuário e senha são obrigatórios.',
      })
    }

    const user = await UsuarioModel.findByUsuario(usuario.trim())

    // Compara mesmo se user não existe (para evitar timing attacks)
    const senhaValida = user
      ? await bcrypt.compare(senha, user.senha_hash)
      : await bcrypt.compare(senha, '$2a$12$invalidhashfortimingnull00000000000000000000000000000')

    if (!user || !senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha inválidos.',
      })
    }

    const token = jwt.sign(
      { sub: user.id, usuario: user.usuario },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN },
    )

    res.cookie('auth_token', token, cookieOptions())

    return res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      usuario: { id: user.id, usuario: user.usuario },
    })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────
function logout(req, res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'strict',
    path:     '/',
  })
  return res.json({ success: true, message: 'Sessão encerrada.' })
}

// ── GET /api/auth/me ──────────────────────────────────────────
//  Rota protegida — só chega aqui se requireAuth passou
async function me(req, res, next) {
  try {
    const user = await UsuarioModel.findById(req.usuario.id)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' })
    }
    return res.json({
      success: true,
      usuario: { id: user.id, usuario: user.usuario },
    })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/auth/configuracoes ───────────────────────────────
//  Rota protegida — permite alterar usuário e/ou senha
//  Exige a senha atual para qualquer alteração (MFA leve)
async function atualizarConfiguracoes(req, res, next) {
  try {
    const { senhaAtual, novoUsuario, novaSenha } = req.body

    // ── Validações de entrada ──────────────────────────────
    if (!senhaAtual) {
      return res.status(400).json({
        success: false,
        message: 'A senha atual é obrigatória para alterar as configurações.',
      })
    }

    const alterarUsuario = typeof novoUsuario === 'string' && novoUsuario.trim().length > 0
    const alterarSenha   = typeof novaSenha   === 'string' && novaSenha.length > 0

    if (!alterarUsuario && !alterarSenha) {
      return res.status(400).json({
        success: false,
        message: 'Informe ao menos um campo para alterar (usuário ou senha).',
      })
    }

    if (alterarUsuario) {
      const u = novoUsuario.trim()
      if (u.length < 3 || u.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'O usuário deve ter entre 3 e 30 caracteres.',
        })
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(u)) {
        return res.status(400).json({
          success: false,
          message: 'O usuário pode conter apenas letras, números, ponto, traço e underscore.',
        })
      }
    }

    if (alterarSenha && novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter no mínimo 6 caracteres.',
      })
    }

    // ── Carrega usuário com hash para verificar senha atual ─
    const user = await UsuarioModel.findByIdWithHash(req.usuario.id)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado.' })
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, user.senha_hash)
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta.',
      })
    }

    // ── Verifica conflito de nome de usuário ───────────────
    if (alterarUsuario) {
      const u = novoUsuario.trim()
      const jaExiste = await UsuarioModel.existsByUsuario(u)
      if (jaExiste && u !== user.usuario) {
        return res.status(409).json({
          success: false,
          message: 'Este nome de usuário já está em uso.',
        })
      }
    }

    // ── Aplica as alterações ───────────────────────────────
    const SALT_ROUNDS = 12
    const usuarioFinal  = alterarUsuario ? novoUsuario.trim() : user.usuario
    const hashFinal     = alterarSenha   ? await bcrypt.hash(novaSenha, SALT_ROUNDS) : user.senha_hash

    if (alterarUsuario && alterarSenha) {
      await UsuarioModel.updateUsuarioESenha(user.id, usuarioFinal, hashFinal)
    } else if (alterarUsuario) {
      await UsuarioModel.updateUsuario(user.id, usuarioFinal)
    } else {
      await UsuarioModel.updateSenha(user.id, hashFinal)
    }

    // ── Re-emite o cookie JWT com os dados atualizados ─────
    const token = jwt.sign(
      { sub: user.id, usuario: usuarioFinal },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN },
    )
    res.cookie('auth_token', token, cookieOptions())

    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso.',
      usuario: { id: user.id, usuario: usuarioFinal },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, logout, me, atualizarConfiguracoes }
