import { MdOutlineLocalFireDepartment } from 'react-icons/md'

export default function Footer() {
  const ano = new Date().getFullYear()
  return (
    <footer className="bg-brand-surface border-t border-brand-border px-6 py-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-brand flex items-center justify-center">
            <MdOutlineLocalFireDepartment className="text-white" size={13} />
          </div>
          <span className="font-heading text-sm font-bold text-brand-text">Índios Churrasco Gourmet</span>
        </div>
        <p className="text-[11px] text-brand-text-3">© {ano} · Sistema de Gestão</p>
      </div>
    </footer>
  )
}
