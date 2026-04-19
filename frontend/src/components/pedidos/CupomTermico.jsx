import { forwardRef } from 'react'
import { formatarData, formatarHora, formatarMoeda } from '../../utils/formatters'

const CupomTermico = forwardRef(({ pedido }, ref) => {
  if (!pedido) return null

  const linha = '─'.repeat(32)
  const linhaDupla = '═'.repeat(32)

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '11px',
        width: '250px',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '8px 14px',
        lineHeight: '1.4',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>
          ÍNDIOS CHURRASCO GOURMET
        </div>
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          Aqui o Churrasco tem mais sabor
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
        {linhaDupla}
      </div>

      {/* Dados do pedido */}
      <div style={{ margin: '4px 0' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>
          PEDIDO #{pedido.numero.toString().padStart(4, '0')}
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
        {linha}
      </div>

      {/* Cliente */}
      <div style={{ margin: '5px 0' }}>
        <div><strong>Cliente:</strong> {pedido.nomeCliente}</div>
        <div><strong>Data:</strong> {formatarData(pedido.criadoEm)}</div>
        <div><strong>Hora:</strong> {formatarHora(pedido.criadoEm)}</div>
        {pedido.observacoes && (
          <div><strong>Obs:</strong> {pedido.observacoes}</div>
        )}
      </div>

      <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
        {linha}
      </div>

      {/* Cabeçalho dos itens */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '4px',
        fontWeight: 'bold',
        fontSize: '11px',
        marginBottom: '4px',
        paddingBottom: '4px',
        borderBottom: '1px dashed #ccc',
      }}>
        <span>ITEM</span>
        <span style={{ textAlign: 'center' }}>QTD</span>
        <span style={{ textAlign: 'right' }}>TOTAL</span>
      </div>

      {/* Itens */}
      {pedido.itens.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '6px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: '4px',
            fontSize: '12px',
          }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.nomeProduto}
            </span>
            <span style={{ textAlign: 'center', color: '#555' }}>
              {item.quantidade}x
            </span>
            <span style={{ textAlign: 'right' }}>
              {formatarMoeda(item.quantidade * item.precoUnitario)}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#777', paddingLeft: '4px' }}>
            {formatarMoeda(item.precoUnitario)} cada
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
        {linhaDupla}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        fontSize: '14px',
        margin: '6px 0',
      }}>
        <span>TOTAL</span>
        <span>{formatarMoeda(pedido.total)}</span>
      </div>

      {/* Pagamento */}
      {pedido.formaPagamento && (
        <>
          <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
            {linha}
          </div>
          <div style={{ margin: '6px 0', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Forma de Pagamento:</span>
              <span style={{ fontWeight: 'bold' }}>
                {{ pix: 'PIX', credito: 'Cartão Crédito', debito: 'Cartão Débito', dinheiro: 'Dinheiro' }[pedido.formaPagamento] ?? pedido.formaPagamento}
              </span>
            </div>
            {pedido.formaPagamento === 'dinheiro' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                  <span>Valor Recebido:</span>
                  <span>{formatarMoeda(pedido.valorRecebido)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontWeight: 'bold' }}>
                  <span>Troco:</span>
                  <span>{formatarMoeda(pedido.troco)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', color: '#666', fontSize: '10px' }}>
        {linha}
      </div>

      {/* Rodapé */}
      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '10px' }}>
        <div>Obrigado pela preferência!</div>
        <div style={{ marginTop: '3px', fontSize: '9px', color: '#666' }}>
          Índios Churrasco Gourmet
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '9px', color: '#aaa' }}>
        {linhaDupla}
      </div>

      {/* Espaço para corte */}
      <div style={{ marginTop: '24px' }} />
    </div>
  )
})

CupomTermico.displayName = 'CupomTermico'
export default CupomTermico
