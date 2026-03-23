'use client'

interface TopbarProps {
  onLimpar: () => void
  onExportar: () => void
}

export function Topbar({ onLimpar, onExportar }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <div className="logo-mark">AR</div>
        <span className="logo-name">Simulador Tributário</span>
        <div className="logo-sep" />
        <span className="logo-sub">LC 214/2025 · Arval Brasil</span>
      </div>
      <div className="topbar-right">
        <button className="btn btn-ghost" onClick={onLimpar}>Limpar</button>
        <button className="btn btn-primary" onClick={onExportar}>Exportar XLSX</button>
      </div>
    </header>
  )
}
