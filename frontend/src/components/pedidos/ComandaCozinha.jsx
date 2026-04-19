import { forwardRef } from 'react'
import { formatarHora } from '../../utils/formatters'

const ComandaCozinha = forwardRef(({ pedido }, ref) => {
  if (!pedido) return null

  const linha = '─'.repeat(32)
  const linhaDupla = '═'.repeat(32)

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '12px',
        width: '268px',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '8px 6px',
        lineHeight: '1.45',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#555' }}>
          *** COMANDA DE COZINHA ***
        </div>
        <div style={{ fontSize: '30px', fontWeight: 'bold', marginTop: '4px', letterSpacing: '1px', lineHeight: '1.2' }}>
          #{pedido.numero.toString().padStart(4, '0')}
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#555', fontSize: '10px' }}>
        {linhaDupla}
      </div>

      {/* Cliente + Hora */}
      <div style={{ margin: '6px 0' }}>
        <div style={{ fontSize: '19px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {pedido.nomeCliente}
        </div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
          {formatarHora(pedido.criadoEm)}
        </div>
        {pedido.observacoes && (
          <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 'bold', borderLeft: '3px solid #000', paddingLeft: '8px' }}>
            ⚠ OBS: {pedido.observacoes.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', color: '#555', fontSize: '10px' }}>
        {linha}
      </div>

      {/* Itens */}
      <div style={{ margin: '8px 0' }}>
        {pedido.itens.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '22px', minWidth: '36px', lineHeight: '1.2' }}>
              {item.quantidade}x
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '16px', lineHeight: '1.3' }}>{item.nomeProduto.toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: '#555', fontSize: '10px' }}>
        {linhaDupla}
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '6px', color: '#666' }}>
        Índios Churrasco Gourmet
      </div>

      {/* Espaço para corte */}
      <div style={{ marginTop: '20px' }} />
    </div>
  )
})

ComandaCozinha.displayName = 'ComandaCozinha'

export default ComandaCozinha
