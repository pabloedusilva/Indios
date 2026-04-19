// =============================================================
//  config/migrations.js — Criação das tabelas no banco de dados
//
//  Execute uma vez para configurar o banco:
//    npm run setup
//
//  Usa CREATE TABLE IF NOT EXISTS — seguro para reexecutar.
// =============================================================

require('dotenv').config()

const mysql = require('mysql2/promise')

async function executarMigrations() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL)
  console.log('[Migrations] Conectado ao banco de dados.')

  try {

    // ── 0. Tabela: categorias ────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id        CHAR(36)      NOT NULL DEFAULT (UUID()),
        nome      VARCHAR(100)  NOT NULL,
        criado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_categoria_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('[Migrations] Tabela "categorias" OK.')

    // ── 0b. Tabela: estatisticas_mensais ─────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS estatisticas_mensais (
        id                     CHAR(36)       NOT NULL DEFAULT (UUID()),
        mes                    CHAR(7)        NOT NULL COMMENT 'Formato YYYY-MM',
        faturamento            DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
        total_pedidos          INT UNSIGNED   NOT NULL DEFAULT 0,
        finalizados            INT UNSIGNED   NOT NULL DEFAULT 0,
        cancelados             INT UNSIGNED   NOT NULL DEFAULT 0,
        ticket_medio           DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
        taxa_cancelamento      DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
        melhor_dia             DATE           NULL COMMENT 'Data com maior faturamento',
        melhor_dia_faturamento DECIMAL(12,2)  NULL,
        melhor_dia_pedidos     INT UNSIGNED   NULL,
        top_produtos           JSON           NOT NULL COMMENT 'Array [{nome, quantidade, receita}]',
        pagamentos             JSON           NOT NULL COMMENT 'Array [{forma, qtd, total}]',
        por_dia                JSON           NOT NULL COMMENT 'Array [{dia, pedidos, faturamento, cancelados}]',
        atualizado_em          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_estatisticas_mes (mes)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Estatísticas mensais pré-calculadas — últimos 3 meses';
    `)
    console.log('[Migrations] Tabela "estatisticas_mensais" OK.')

    // ── 1. Tabela: produtos ──────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS produtos (
        id            CHAR(36)       NOT NULL DEFAULT (UUID()),
        nome          VARCHAR(100)   NOT NULL,
        categoria     VARCHAR(100)   NOT NULL,
        preco         DECIMAL(10,2)  NOT NULL,
        disponivel    BOOLEAN        NOT NULL DEFAULT true,
        criado_em     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT chk_produto_preco CHECK (preco > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('[Migrations] Tabela "produtos" OK.')

    // ── 2. Tabela: pedidos ───────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id              CHAR(36)      NOT NULL DEFAULT (UUID()),
        numero          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
        nome_cliente    VARCHAR(100)  NOT NULL,
        observacoes     VARCHAR(300)  NOT NULL DEFAULT '',
        status          VARCHAR(20)   NOT NULL DEFAULT 'preparando',
        total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        criado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pronto_em       DATETIME      NULL,
        entregue_em     DATETIME      NULL,
        pagamento_em    DATETIME      NULL,
        forma_pagamento VARCHAR(20)   NULL,
        valor_recebido  DECIMAL(10,2) NULL,
        troco           DECIMAL(10,2) NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        UNIQUE KEY uk_pedido_numero (numero),
        CONSTRAINT chk_pedido_status
          CHECK (status IN ('preparando','pronto','finalizado','cancelado')),
        CONSTRAINT chk_pedido_total
          CHECK (total >= 0),
        CONSTRAINT chk_pedido_forma_pagamento
          CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix','credito','debito','dinheiro')),
        CONSTRAINT chk_pedido_valor_recebido
          CHECK (valor_recebido IS NULL OR valor_recebido >= 0),
        CONSTRAINT chk_pedido_troco
          CHECK (troco IS NULL OR troco >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('[Migrations] Tabela "pedidos" OK.')

    // ── 3. Tabela: itens_pedido ──────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS itens_pedido (
        id              CHAR(36)      NOT NULL DEFAULT (UUID()),
        pedido_id       CHAR(36)      NOT NULL,
        produto_id      CHAR(36)      NOT NULL,
        nome_produto    VARCHAR(100)  NOT NULL,
        preco_unitario  DECIMAL(10,2) NOT NULL,
        quantidade      INT UNSIGNED  NOT NULL,
        subtotal        DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
        PRIMARY KEY (id),
        KEY idx_itens_pedido_id (pedido_id),
        KEY idx_itens_produto_id (produto_id),
        CONSTRAINT fk_itens_pedido
          FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        CONSTRAINT fk_itens_produto
          FOREIGN KEY (produto_id) REFERENCES produtos(id),
        CONSTRAINT chk_item_preco
          CHECK (preco_unitario > 0),
        CONSTRAINT chk_item_quantidade
          CHECK (quantidade > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('[Migrations] Tabela "itens_pedido" OK.')

    // ── 4. Índices adicionais ────────────────────────────────
    // Executados separadamente — ignora erro se já existem
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_pedidos_status     ON pedidos (status)',
      'CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em  ON pedidos (criado_em)',
      'CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria)',
    ]

    for (const sql of indices) {
      try { await conn.execute(sql) } catch (_) { /* índice já existe */ }
    }
    console.log('[Migrations] Indices OK.')

    // ── 5. Tabela: resumo_dashboard ──────────────────────────
    // Linha única que é atualizada em tempo real por triggers
    // AFTER INSERT / AFTER UPDATE na tabela pedidos.
    // Substitui a antiga VIEW pelo mesmo nome.

    // Remove a VIEW antiga (se ainda existir)
    try { await conn.execute('DROP VIEW IF EXISTS resumo_dashboard') } catch (_) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS resumo_dashboard (
        id            TINYINT UNSIGNED NOT NULL DEFAULT 1
                      COMMENT 'Sempre 1 — linha única de resumo do dia',
        data_ref      DATE             NOT NULL DEFAULT (CURDATE())
                      COMMENT 'Dia de referência (horário Brasília)',
        total_pedidos INT UNSIGNED     NOT NULL DEFAULT 0,
        faturamento   DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
        preparando    INT UNSIGNED     NOT NULL DEFAULT 0,
        prontos       INT UNSIGNED     NOT NULL DEFAULT 0,
        finalizados   INT UNSIGNED     NOT NULL DEFAULT 0,
        cancelados    INT UNSIGNED     NOT NULL DEFAULT 0,
        atualizado_em DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                      ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Resumo diário em tempo real — 1 linha, atualizada por triggers'
    `)
    console.log('[Migrations] Tabela "resumo_dashboard" OK.')

    // SQL reutilizado pelos dois triggers (INSERT e UPDATE)
    const TRIGGER_SELECT = `
      SELECT
        1,
        DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')),
        COUNT(CASE WHEN status != 'cancelado' THEN 1 END),
        COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0),
        COUNT(CASE WHEN status = 'preparando' THEN 1 END),
        COUNT(CASE WHEN status = 'pronto'     THEN 1 END),
        COUNT(CASE WHEN status = 'finalizado' THEN 1 END),
        COUNT(CASE WHEN status = 'cancelado'  THEN 1 END)
      FROM pedidos
      WHERE DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))
          = DATE(CONVERT_TZ(NOW(),     '+00:00', '-03:00'))`

    const UPSERT_COLS = `
      ON DUPLICATE KEY UPDATE
        data_ref      = VALUES(data_ref),
        total_pedidos = VALUES(total_pedidos),
        faturamento   = VALUES(faturamento),
        preparando    = VALUES(preparando),
        prontos       = VALUES(prontos),
        finalizados   = VALUES(finalizados),
        cancelados    = VALUES(cancelados)`

    // Drop e recria triggers para garantir versão atualizada
    await conn.query('DROP TRIGGER IF EXISTS trg_pedidos_ai')
    await conn.query('DROP TRIGGER IF EXISTS trg_pedidos_au')

    await conn.query(`
      CREATE TRIGGER trg_pedidos_ai
      AFTER INSERT ON pedidos
      FOR EACH ROW
      BEGIN
        INSERT INTO resumo_dashboard
          (id, data_ref, total_pedidos, faturamento, preparando, prontos, finalizados, cancelados)
        ${TRIGGER_SELECT}
        ${UPSERT_COLS};
      END
    `)

    await conn.query(`
      CREATE TRIGGER trg_pedidos_au
      AFTER UPDATE ON pedidos
      FOR EACH ROW
      BEGIN
        INSERT INTO resumo_dashboard
          (id, data_ref, total_pedidos, faturamento, preparando, prontos, finalizados, cancelados)
        ${TRIGGER_SELECT}
        ${UPSERT_COLS};
      END
    `)
    console.log('[Migrations] Triggers "resumo_dashboard" OK.')

    // Popula a linha inicial com os dados de hoje
    await conn.execute(`
      INSERT INTO resumo_dashboard
        (id, data_ref, total_pedidos, faturamento, preparando, prontos, finalizados, cancelados)
      ${TRIGGER_SELECT}
      ${UPSERT_COLS}
    `)
    console.log('[Migrations] Dados iniciais "resumo_dashboard" OK.')

    // ── 6. Tabela: usuarios ──────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id            CHAR(36)      NOT NULL DEFAULT (UUID()),
        usuario       VARCHAR(50)   NOT NULL,
        senha_hash    VARCHAR(255)  NOT NULL,
        criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_usuario_usuario (usuario)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('[Migrations] Tabela "usuarios" OK.')

    // ── 7. Tabela: pagamentos_servidor ───────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pagamentos_servidor (
        id             CHAR(36)       NOT NULL DEFAULT (UUID()),
        usuario_id     CHAR(36)       NOT NULL COMMENT 'Quem gerou a preference',
        valor          DECIMAL(10,2)  NOT NULL COMMENT 'Valor cobrado',
        status         VARCHAR(20)    NOT NULL DEFAULT 'pendente'
                                      COMMENT 'pendente | pago',
        preference_id  VARCHAR(255)   NOT NULL COMMENT 'ID da preference Mercado Pago',
        payment_id     VARCHAR(255)   NULL     COMMENT 'ID do pagamento confirmado pelo webhook',
        mes_referencia CHAR(7)        NOT NULL COMMENT 'YYYY-MM do ciclo de cobrança',
        criado_em      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pago_em        DATETIME       NULL     COMMENT 'Data/hora da confirmação (UTC)',
        PRIMARY KEY (id),
        UNIQUE KEY uk_pagamento_preference (preference_id),
        KEY idx_pagamento_mes     (mes_referencia),
        KEY idx_pagamento_usuario (usuario_id),
        KEY idx_pagamento_status  (status),
        CONSTRAINT chk_pagamento_status
          CHECK (status IN ('pendente','pago')),
        CONSTRAINT chk_pagamento_valor
          CHECK (valor > 0),
        CONSTRAINT fk_pagamento_usuario
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Cobranças mensais Mercado Pago — histórico de pagamentos';
      `)
    console.log('[Migrations] Tabela "pagamentos_servidor" OK.')

    console.log('\n[Migrations] Todas as tabelas criadas com sucesso!')

  } finally {
    await conn.end()
  }
}

executarMigrations().catch((err) => {
  console.error('[Migrations] ERRO:', err.message)
  process.exit(1)
})
