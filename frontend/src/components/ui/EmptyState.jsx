export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-bg border border-brand-border flex items-center justify-center mb-4 text-brand-text-3">
          <Icon size={26} />
        </div>
      )}
      <h3 className="font-heading text-base font-bold text-brand-text-2 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-brand-text-3 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
