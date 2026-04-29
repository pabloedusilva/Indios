// =============================================================
//  components/ui/Portal.jsx
//
//  Renderiza filhos diretamente no <body> via createPortal,
//  garantindo que modais com position:fixed cubram toda a tela
//  independente de qualquer ancestral com overflow ou transform.
// =============================================================

import { createPortal } from 'react-dom'

export default function Portal({ children }) {
  return createPortal(children, document.body)
}
