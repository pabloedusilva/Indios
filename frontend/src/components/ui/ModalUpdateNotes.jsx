// =============================================================
//  components/ui/ModalUpdateNotes.jsx
//
//  Modal de novidades com carrossel — suporta múltiplas páginas
//  de conteúdo com navegação por setas, sem distorção.
// =============================================================

import { useEffect, useRef, useState } from 'react'
import { MdClose, MdRocketLaunch, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import Portal from './Portal'

// Divide array em chunks (páginas)
function chunkArray(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export default function ModalUpdateNotes({ isOpen, onClose, nota }) {
  const overlayRef = useRef(null)
  const [paginaAtual, setPaginaAtual] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') voltarPagina()
      if (e.key === 'ArrowRight') avancarPagina()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, paginaAtual]) // eslint-disable-line

  // Reset página ao abrir
  useEffect(() => {
    if (isOpen) setPaginaAtual(0)
  }, [isOpen])

  if (!isOpen || !nota) return null

  const temMelhorias = Array.isArray(nota.melhorias) && nota.melhorias.length > 0
  const temCorrecoes = Array.isArray(nota.correcoes) && nota.correcoes.length > 0
  const isMajor      = nota.tipo === 'major'

  // Divide em páginas (6 itens por página)
  const ITENS_POR_PAGINA = 6
  const paginasMelhorias = temMelhorias ? chunkArray(nota.melhorias, ITENS_POR_PAGINA) : []
  const paginasCorrecoes = temCorrecoes ? chunkArray(nota.correcoes, ITENS_POR_PAGINA) : []
  
  // Combina páginas: melhorias primeiro, depois correções
  const todasPaginas = [...paginasMelhorias, ...paginasCorrecoes]
  const totalPaginas = todasPaginas.length
  const temMultiplasPaginas = totalPaginas > 1

  const paginaAtualConteudo = todasPaginas[paginaAtual] || []
  const ehPaginaMelhorias = paginaAtual < paginasMelhorias.length

  function avancarPagina() {
    if (paginaAtual < totalPaginas - 1) {
      setPaginaAtual(p => p + 1)
    }
  }

  function voltarPagina() {
    if (paginaAtual > 0) {
      setPaginaAtual(p => p - 1)
    }
  }

  return (
    <Portal>
      {/* Overlay — padrão do projeto */}
      <div
        ref={overlayRef}
        className="modal-overlay p-3 sm:p-5"
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      >
        {/* Box — quase tela cheia */}
        <div
          className="relative w-full rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            maxWidth: '900px',
            maxHeight: 'calc(100vh - 2.5rem)',
            animation: 'un-scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Imagem — ocupa todo o modal ───────────── */}
          <img
            src={nota.imagem || '/update/new-update.png'}
            alt="Nova atualização"
            draggable={false}
            className="w-full block"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: 'calc(100vh - 2.5rem)',
              objectFit: 'cover',
              objectPosition: 'center top',
            }}
          />

          {/* ── Gradiente inferior para legibilidade do conteúdo ── */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.88) 100%)',
            }}
          />

          {/* ── Badge de versão — canto superior esquerdo ── */}
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: isMajor
                ? 'linear-gradient(135deg, #C93517, #E8650A)'
                : 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
            }}
          >
            <MdRocketLaunch size={11} />
            v{nota.versao}
          </div>

          {/* ── Botão fechar — canto superior direito ── */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-all z-10"
          >
            <MdClose size={18} />
          </button>

          {/* ── Título fixo no topo ── */}
          <div
            className="absolute top-24 left-0 right-0 flex justify-center"
            style={{ pointerEvents: 'none', zIndex: 5 }}
          >
            <h2 
              className="font-heading text-2xl font-bold"
              style={{ 
                color: 'rgba(255,255,255,0.95)',
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                animation: 'un-fadeInUp 0.4s ease-out both',
              }}
            >
              Nota da versão {nota.versao}
            </h2>
          </div>

          {/* ── Conteúdo centralizado com carrossel ── */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-8 py-12"
            style={{ pointerEvents: 'none' }}
          >
            {/* Container de conteúdo com scroll */}
            <div 
              key={paginaAtual}
              className="max-w-lg w-full overflow-y-auto scrollbar-hide"
              style={{ 
                marginLeft: '18%',
                marginTop: '60px',
                maxHeight: '380px',
                animation: 'un-fadeInUp 0.4s 0.1s ease-out both',
                pointerEvents: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <ul className="space-y-2.5 text-left">
                {paginaAtualConteudo.map((item, i) => (
                  <li
                    key={`${paginaAtual}-${i}`}
                    className="flex items-start gap-2.5 text-sm leading-snug"
                    style={{ 
                      color: ehPaginaMelhorias ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)',
                      animation: `un-fadeInUp 0.4s ${0.08 * i}s ease-out both`,
                    }}
                  >
                    <span
                      className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ 
                        background: ehPaginaMelhorias 
                          ? 'linear-gradient(135deg, #C93517, #E8650A)'
                          : 'rgba(255,255,255,0.45)',
                        animation: `un-scaleInDot 0.4s ${0.08 * i}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* ── Navegação fixa na parte inferior ── */}
          {temMultiplasPaginas && (
            <div 
              className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3"
              style={{ 
                animation: 'un-fadeInUp 0.4s 0.15s ease-out both',
                pointerEvents: 'auto',
              }}
            >
              <button
                onClick={voltarPagina}
                disabled={paginaAtual === 0}
                aria-label="Página anterior"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                <MdChevronLeft size={20} />
              </button>

              <span 
                className="text-xs font-medium px-3"
                style={{ 
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              >
                {paginaAtual + 1} / {totalPaginas}
              </span>

              <button
                onClick={avancarPagina}
                disabled={paginaAtual === totalPaginas - 1}
                aria-label="Próxima página"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                <MdChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes un-scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes un-fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes un-scaleInDot {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1); }
        }
        /* Esconde scrollbar em todos os navegadores */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Portal>
  )
}
