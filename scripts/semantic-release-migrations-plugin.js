// =============================================================
// semantic-release-migrations-plugin.js
// Plugin customizado para detectar e documentar migrações
// =============================================================

const fs = require('fs').promises;
const path = require('path');

/**
 * Detecta migrações SQL adicionadas desde a última release
 * @param {string} fromTag - Tag da release anterior
 * @param {string} toRef - Referência atual (geralmente HEAD)
 * @returns {Promise<Array>} Lista de migrações detectadas
 */
async function detectNewMigrations(fromTag, toRef) {
  const { execSync } = require('child_process');
  
  try {
    // Buscar arquivos SQL adicionados ou modificados desde a última tag
    const command = fromTag 
      ? `git diff --name-only --diff-filter=A ${fromTag}..${toRef} -- backend/migrations/*.sql`
      : `git ls-files backend/migrations/*.sql`;
    
    const output = execSync(command, { encoding: 'utf-8' }).trim();
    
    if (!output) {
      return [];
    }

    const migrationFiles = output.split('\n').filter(Boolean);
    const migrations = [];

    for (const file of migrationFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Extrair descrição da migração (comentário Migration XXX)
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
          const fileName = path.basename(file);
          migrations.push({
            file: fileName,
            description,
          });
        }
      } catch (error) {
        console.warn(`[WARN] Não foi possível ler migração ${file}:`, error.message);
      }
    }

    return migrations;
  } catch (error) {
    console.warn('[WARN] Erro ao detectar migrações:', error.message);
    return [];
  }
}

/**
 * Plugin do semantic-release
 */
module.exports = {
  /**
   * Etapa: analyzeCommits
   * Detecta migrações e adiciona ao contexto
   */
  analyzeCommits: async (pluginConfig, context) => {
    const { lastRelease, logger } = context;
    
    logger.log('🔍 Detectando migrações de banco de dados...');
    
    const fromTag = lastRelease.gitTag || null;
    const toRef = 'HEAD';
    
    const migrations = await detectNewMigrations(fromTag, toRef);
    
    if (migrations.length > 0) {
      logger.log(`${migrations.length} migração(ões) detectada(s):`);
      migrations.forEach(m => logger.log(`   - ${m.file}: ${m.description}`));
      
      // Armazenar no contexto para uso posterior
      context.migrations = migrations;
    } else {
      logger.log('Nenhuma migração detectada nesta release');
      context.migrations = [];
    }
    
    // Retornar null para não interferir no cálculo de versão
    return null;
  },

  /**
   * Etapa: generateNotes
   * Adiciona seção de migrações nas release notes
   */
  generateNotes: async (pluginConfig, context) => {
    const { migrations = [], logger } = context;
    
    if (migrations.length === 0) {
      return '';
    }

    logger.log('Adicionando migrações às release notes...');

    const notes = [
      '',
      '### Migrações de Banco de Dados',
      '',
      ...migrations.map(m => `* **${m.file}**: ${m.description}`),
      '',
    ].join('\n');

    return notes;
  },

  /**
   * Etapa: prepare
   * Atualizar CHANGELOG.md com migrações
   */
  prepare: async (pluginConfig, context) => {
    const { migrations = [], logger, nextRelease } = context;
    
    if (migrations.length === 0) {
      return;
    }

    logger.log('Atualizando CHANGELOG.md com migrações...');

    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    try {
      let changelog = await fs.readFile(changelogPath, 'utf-8');
      
      // Encontrar a seção da versão atual
      const versionHeader = `## [${nextRelease.version}]`;
      const versionIndex = changelog.indexOf(versionHeader);
      
      if (versionIndex === -1) {
        logger.warn('[WARN] Não foi possível encontrar seção da versão no CHANGELOG.md');
        return;
      }

      // Encontrar próxima seção ou fim do arquivo
      const nextSectionIndex = changelog.indexOf('\n## ', versionIndex + versionHeader.length);
      const insertPosition = nextSectionIndex > -1 ? nextSectionIndex : changelog.length;

      // Criar seção de migrações
      const migrationsSection = [
        '',
        '### Migrações de Banco de Dados',
        '',
        ...migrations.map(m => `* **${m.file}**: ${m.description}`),
        '',
      ].join('\n');

      // Inserir no CHANGELOG
      changelog = 
        changelog.slice(0, insertPosition) +
        migrationsSection +
        changelog.slice(insertPosition);

      await fs.writeFile(changelogPath, changelog, 'utf-8');
      logger.log('CHANGELOG.md atualizado com sucesso');
    } catch (error) {
      logger.warn('[WARN] Erro ao atualizar CHANGELOG.md:', error.message);
    }
  },
};
