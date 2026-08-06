#!/usr/bin/env node
// =============================================================
// sync-release-to-db.js — Sincroniza Release do GitHub com BD
//
// Responsabilidades:
//   · Buscar release notes da última release no GitHub
//   · Detectar migrações de banco de dados aplicadas nesta release
//   · Criar ou atualizar entrada na tabela update_notes
//   · Enviar notificação para usuários via modal automático
//
// Uso:
//   GITHUB_TOKEN=xxx GITHUB_REPOSITORY=owner/repo DATABASE_URL=xxx node sync-release-to-db.js
//
// Variáveis de Ambiente:
//   GITHUB_TOKEN       - Token de acesso ao GitHub API
//   GITHUB_REPOSITORY  - Repositório no formato owner/repo
//   DATABASE_URL       - URL de conexão com PostgreSQL
// =============================================================

const fs = require('fs').promises;
const path = require('path');

// =============================================================
// Validação de variáveis de ambiente
// =============================================================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!GITHUB_TOKEN) {
  console.error('[ERROR] GITHUB_TOKEN não configurado');
  process.exit(1);
}

if (!GITHUB_REPOSITORY) {
  console.error('[ERROR] GITHUB_REPOSITORY não configurado');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('[ERROR] DATABASE_URL não configurado');
  process.exit(1);
}

// =============================================================
// Cliente PostgreSQL
// =============================================================
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// =============================================================
// Cliente GitHub API
// =============================================================
async function fetchLatestRelease() {
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  console.log(`[INFO] Buscando última release: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API retornou ${response.status}: ${await response.text()}`);
  }

  const release = await response.json();
  console.log(`[SUCCESS] Release encontrada: v${release.tag_name}`);

  return {
    version: release.tag_name.replace(/^v/, ''),
    title: release.name,
    body: release.body,
    createdAt: release.created_at,
  };
}

// =============================================================
// Detectar migrações desde a última release
// =============================================================
async function detectMigrationsSinceLastRelease() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  try {
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort()
      .reverse(); // Pegar as mais recentes primeiro

    const migrations = [];

    // Ler apenas as últimas 5 migrações (assumindo que não há mais de 5 por release)
    for (const file of sqlFiles.slice(0, 5)) {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extrair comentário de descrição (primeira linha não-vazia após o header)
      const lines = content.split('\n');
      let description = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('-- Migration')) {
          description = trimmed.replace(/^--\s*Migration\s*\d+:\s*/i, '').trim();
          break;
        }
      }

      if (description) {
        migrations.push({
          file,
          description,
        });
      }
    }

    console.log(`[INFO] ${migrations.length} migrações detectadas`);
    return migrations;
  } catch (error) {
    console.warn('[WARN] Não foi possível ler diretório de migrações:', error.message);
    return [];
  }
}

// =============================================================
// Parsear Release Notes do GitHub
// =============================================================
function parseReleaseNotes(body) {
  const melhorias = [];
  const correcoes = [];
  const migracoes = [];

  // Dividir por seções
  const sections = body.split(/##\s+/);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0]?.trim().toLowerCase() || '';

    // Novas Funcionalidades, Features, Melhorias, Refatorações, Performance
    if (
      title.includes('novas funcionalidades') ||
      title.includes('features') ||
      title.includes('melhorias') ||
      title.includes('refatorações') ||
      title.includes('refactor') ||
      title.includes('performance') ||
      title.includes('perf') ||
      title.includes('documentação') ||
      title.includes('docs')
    ) {
      for (const line of lines.slice(1)) {
        const match = line.match(/^\s*[-*]\s+(.+)/);
        if (match) {
          const item = match[1].trim();
          // Remover links e hash de commit do final
          const cleanItem = item.replace(/\s*\([a-f0-9]{7,}\)$/i, '').trim();
          melhorias.push(cleanItem);
        }
      }
    }

    // Correções de Bugs, Bug Fixes
    if (title.includes('correções') || title.includes('bug fixes') || title.includes('fixes') || title.includes('fix')) {
      for (const line of lines.slice(1)) {
        const match = line.match(/^\s*[-*]\s+(.+)/);
        if (match) {
          const item = match[1].trim();
          const cleanItem = item.replace(/\s*\([a-f0-9]{7,}\)$/i, '').trim();
          correcoes.push(cleanItem);
        }
      }
    }

    // Migrações de Banco de Dados
    if (title.includes('migrações') || title.includes('migrations') || title.includes('banco de dados')) {
      for (const line of lines.slice(1)) {
        const match = line.match(/^\s*[-*]\s+(.+)/);
        if (match) {
          migracoes.push(match[1].trim());
        }
      }
    }
  }

  return { melhorias, correcoes, migracoes };
}

// =============================================================
// Determinar tipo de release (major, minor, patch)
// =============================================================
function getReleaseType(version) {
  const [major, minor, patch] = version.split('.').map(Number);

  if (major > 0 && minor === 0 && patch === 0) {
    return 'major';
  }

  if (minor > 0) {
    return 'minor';
  }

  return 'patch';
}

// =============================================================
// Salvar no banco de dados
// =============================================================
async function saveUpdateNote(release, migrations) {
  const { version, title, body } = release;
  const tipo = getReleaseType(version);
  const { melhorias, correcoes, migracoes } = parseReleaseNotes(body);

  // Combinar todas as melhorias
  const allMelhorias = [...melhorias];
  
  // Adicionar migrações detectadas automaticamente
  const migrationItems = migrations.map(m => `🗄️ Banco de Dados: ${m.description}`);
  allMelhorias.push(...migrationItems);
  
  // Adicionar migrações da seção do release notes (se houver)
  allMelhorias.push(...migracoes);

  // Descrição da release
  const descricao =
    allMelhorias.length > 0 || correcoes.length > 0
      ? 'Nova versão disponível com melhorias e correções.'
      : 'Atualização de manutenção e estabilidade.';

  // Título padrão se não houver
  const finalTitle = title || `Versão ${version}`;

  console.log('[INFO] Salvando update note no banco de dados...');
  console.log(`  Versão: ${version}`);
  console.log(`  Tipo: ${tipo}`);
  console.log(`  Título: ${finalTitle}`);
  console.log(`  Melhorias: ${allMelhorias.length}`);
  console.log(`  Correções: ${correcoes.length}`);
  
  if (allMelhorias.length > 0) {
    console.log('[INFO] Detalhes das melhorias:');
    allMelhorias.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
  }
  
  if (correcoes.length > 0) {
    console.log('[INFO] Detalhes das correções:');
    correcoes.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  }

  const query = `
    INSERT INTO update_notes (versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (versao) DO UPDATE SET
      tipo = EXCLUDED.tipo,
      titulo = EXCLUDED.titulo,
      descricao = EXCLUDED.descricao,
      melhorias = EXCLUDED.melhorias,
      correcoes = EXCLUDED.correcoes,
      imagem = EXCLUDED.imagem,
      ativo = EXCLUDED.ativo,
      atualizado_em = CURRENT_TIMESTAMP
    RETURNING id, versao, tipo, titulo
  `;

  const values = [
    version,
    tipo,
    finalTitle,
    descricao,
    JSON.stringify(allMelhorias),
    JSON.stringify(correcoes),
    '/update/new-update.png',
    true,
  ];

  const result = await pool.query(query, values);
  const note = result.rows[0];

  console.log(`[SUCCESS] Update note salva: ID=${note.id}, versão=${note.versao}`);
  return note;
}

// =============================================================
// Main
// =============================================================
async function main() {
  try {
    console.log('[INFO] Iniciando sincronização de release com banco de dados...');

    // 1. Buscar última release do GitHub
    const release = await fetchLatestRelease();

    // 2. Detectar migrações aplicadas nesta release
    const migrations = await detectMigrationsSinceLastRelease();

    if (migrations.length > 0) {
      console.log('[INFO] Migrações detectadas:');
      migrations.forEach(m => console.log(`  - ${m.file}: ${m.description}`));
    }

    // 3. Salvar no banco de dados
    await saveUpdateNote(release, migrations);

    console.log('[SUCCESS] Sincronização concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Falha na sincronização:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
