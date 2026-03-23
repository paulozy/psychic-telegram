'use client'

import { ANOS, resumoAno, fmtCompacto } from '@/lib/simulador'
import type { Estado } from '@/types/simulador'

interface ResumoTabelaProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
}

export function ResumoTabela({ estado, anoAtivo, onSetAno }: ResumoTabelaProps) {
  const dados = ANOS.map((ano, idx) => {
    const r = resumoAno(estado, ano)
    const anterior = idx > 0 ? resumoAno(estado, ANOS[idx - 1]) : null
    const deltaTrib = anterior !== null && (r.tributos !== 0 || anterior.tributos !== 0)
      ? r.tributos - anterior.tributos
      : null
    const deltaMarg = anterior !== null && anterior.margem > 0 && r.margem > 0
      ? r.margem - anterior.margem
      : null
    return { ano, ...r, deltaTrib, deltaMarg }
  })

  const algumDado = dados.some(d => d.receita > 0 || d.tributos > 0)
  if (!algumDado) return null

  function fmtPct(v: number) {
    return v.toFixed(2).replace('.', ',') + '%'
  }

  function fmtDelta(v: number) {
    const s = v > 0 ? '+' : ''
    return s + fmtCompacto(v)
  }

  function fmtDeltaPct(v: number) {
    const s = v > 0 ? '+' : ''
    return s + v.toFixed(2).replace('.', ',') + 'pp'
  }

  return (
    <div className="resumo-tabela">
      <div className="rt-title">Resumo por ano</div>
      <div className="rt-scroll">
        <table className="rt-table">
          <thead>
            <tr>
              <th className="rt-th rt-th-label" />
              {dados.map(({ ano }) => (
                <th
                  key={ano}
                  className={`rt-th rt-th-ano ${ano === anoAtivo ? 'active' : ''}`}
                  onClick={() => onSetAno(ano)}
                >
                  {ano}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="rt-row">
              <td className="rt-td rt-td-label">Receita bruta</td>
              {dados.map(({ ano, receita }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {receita > 0 ? fmtCompacto(receita) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row">
              <td className="rt-td rt-td-label">Total tributos</td>
              {dados.map(({ ano, tributos }) => (
                <td key={ano} className={`rt-td rt-td-num trib ${ano === anoAtivo ? 'active' : ''}`}>
                  {tributos > 0 ? fmtCompacto(tributos) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row">
              <td className="rt-td rt-td-label">Margem tributária</td>
              {dados.map(({ ano, margem }) => (
                <td key={ano} className={`rt-td rt-td-num marg ${ano === anoAtivo ? 'active' : ''}`}>
                  {margem > 0 ? fmtPct(margem) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label">Δ Tributos</td>
              {dados.map(({ ano, deltaTrib }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {deltaTrib === null ? '—' : (
                    <span className={deltaTrib > 0 ? 'delta-up' : deltaTrib < 0 ? 'delta-down' : ''}>
                      {fmtDelta(deltaTrib)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label">Δ Margem</td>
              {dados.map(({ ano, deltaMarg }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {deltaMarg === null ? '—' : (
                    <span className={deltaMarg > 0 ? 'delta-up' : deltaMarg < 0 ? 'delta-down' : ''}>
                      {fmtDeltaPct(deltaMarg)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
