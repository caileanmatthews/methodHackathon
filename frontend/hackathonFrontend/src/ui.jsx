// Small shared building blocks used across views.

export function Panel({ title, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-head">
          <h2>
            {Icon && <Icon size={16} aria-hidden />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Switch({ checked, onChange, disabled, children }) {
  return (
    <label className={`switch ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" aria-hidden />
      {children}
    </label>
  )
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Skeleton({ lines = 3 }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  )
}
