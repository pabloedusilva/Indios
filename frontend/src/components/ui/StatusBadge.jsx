const STATUS_PEDIDO = {
  preparando: { label: 'Preparando', cor: 'badge-pending'    },
  pronto:     { label: 'Pronto',     cor: 'badge-ready'      },
  finalizado: { label: 'Finalizado', cor: 'badge-delivered'  },
  cancelado:  { label: 'Cancelado', cor: 'badge-cancelled'  },
}

const dotColor = {
  preparando: 'bg-amber-400',
  pronto:    'bg-emerald-500',
  finalizado: 'bg-blue-500',
  cancelado: 'bg-red-400',
}

export default function StatusBadge({ status }) {
  const info = STATUS_PEDIDO[status] || { label: status, cor: 'badge-pending' }
  return (
    <span className={info.cor}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status] || 'bg-gray-400'} inline-block`} />
      {info.label}
    </span>
  )
}
