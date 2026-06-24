'use client'

import { ANOS, apurarAno, breakdownResultadoLiquido, fmtCompacto } from '@/lib/simulador'
import { CalcPopover } from './CalcPopover'
import type { Estado } from '@/types/simulador'

/** Resultado do ano na convenção da barra: positivo = crédito a tomar, negativo = a pagar. */
function resultadoLiquido(estado: Estado, ano: number): number {
  const a = apurarAno(estado, ano)
  return a.saldoCredor - a.totalAPagar
}

interface ResultadoBarProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
}

export function ResultadoBar({ estado, anoAtivo, onSetAno }: ResultadoBarProps) {
  return (
    <div className="resultado-bar" data-tour="resultado-bar">
      {ANOS.map((ano, idx) => {
        // Convenção: positivo = crédito a tomar, negativo = a pagar.
        const res = resultadoLiquido(estado, ano)
        const anoAnterior = idx > 0 ? ANOS[idx - 1] : null
        const resAnterior = anoAnterior ? resultadoLiquido(estado, anoAnterior) : null

        let pctStr = ''
        let pctClass = ''
        if (resAnterior && resAnterior !== 0 && res !== 0) {
          const pct = ((res - resAnterior) / Math.abs(resAnterior)) * 100
          pctStr = `${pct > 0 ? '▲' : '▼'}${Math.abs(pct).toFixed(0)}%`
          pctClass = pct > 0 ? 'up' : 'down'
        }

        return (
          <div
            key={ano}
            className={`res-ano-card ${ano === anoAtivo ? 'active' : ''}`}
            onClick={() => onSetAno(ano)}
          >
            <span className="res-year">
              {ano}
              <CalcPopover
                breakdown={res ? breakdownResultadoLiquido(estado, ano) : null}
                label={`Como é calculado o resultado de ${ano}`}
              />
            </span>
            <span className="res-val">{res ? fmtCompacto(res) : '—'}</span>
            <span className={`res-pct ${pctClass}`}>{pctStr || '\u00a0'}</span>
          </div>
        )
      })}
    </div>
  )
}
