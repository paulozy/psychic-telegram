'use client'

import { ANOS, resultadoAno, fmtCompacto } from '@/lib/simulador'
import type { Estado } from '@/types/simulador'

interface ResultadoBarProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
}

export function ResultadoBar({ estado, anoAtivo, onSetAno }: ResultadoBarProps) {
  return (
    <div className="resultado-bar">
      {ANOS.map((ano, idx) => {
        const res = resultadoAno(estado, ano)
        const anoAnterior = idx > 0 ? ANOS[idx - 1] : null
        const resAnterior = anoAnterior ? resultadoAno(estado, anoAnterior) : null

        let pctStr = ''
        let pctClass = ''
        if (resAnterior && resAnterior !== 0 && res !== 0) {
          const pct = ((res - resAnterior) / Math.abs(resAnterior)) * 100
          pctStr = `${pct > 0 ? '▲' : '▼'}${Math.abs(pct).toFixed(0)}%`
          pctClass = pct > 0 ? 'up' : 'down'
        }

        const valClass = res > 0 ? 'pos' : res < 0 ? 'neg' : 'zero'

        return (
          <div
            key={ano}
            className={`res-ano-card ${ano === anoAtivo ? 'active' : ''}`}
            onClick={() => onSetAno(ano)}
          >
            <span className="res-year">{ano}</span>
            <span className={`res-val ${valClass}`}>{res ? fmtCompacto(res) : '—'}</span>
            <span className={`res-pct ${pctClass}`}>{pctStr || '\u00a0'}</span>
          </div>
        )
      })}
    </div>
  )
}
