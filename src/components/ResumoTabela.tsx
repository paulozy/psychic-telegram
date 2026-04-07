'use client'

import { useState } from 'react'
import { ANOS, resumoAno, resumoTributosBrutos, fmtCompacto, fmtBR } from '@/lib/simulador'
import type { Estado } from '@/types/simulador'

interface ResumoTabelaProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
}

export function ResumoTabela({ estado, anoAtivo, onSetAno }: ResumoTabelaProps) {
  const [expandido, setExpandido] = useState<number | null>(null)

  // Carga de referência: PIS + COFINS de rec_locacao em 2026 (lida do estado — dinâmica)
  const ref2026 = estado[2026].rec_locacao
  const cargaAliq2026 = ref2026.aliqPis + ref2026.aliqCof

  function cargaAliqFromEstado(ano: number): number {
    const a = estado[ano].rec_locacao
    return ano === 2026
      ? a.aliqPis + a.aliqCof
      : a.aliqCbs + a.aliqIbsE + a.aliqIbsM
  }

  const dados = ANOS.map((ano, idx) => {
    const r = resumoAno(estado, ano)
    const anterior = idx > 0 ? resumoAno(estado, ANOS[idx - 1]) : null
    const deltaTribPct =
      anterior !== null && anterior.tributos > 0 && r.tributos > 0
        ? ((r.tributos - anterior.tributos) / anterior.tributos) * 100
        : null
    const deltaCarga = ano === 2026 ? null : cargaAliqFromEstado(ano) - cargaAliq2026
    return { ano, ...r, deltaTribPct, deltaCarga }
  })

  const algumDado = dados.some(d => d.receita > 0 || d.tributos > 0)
  if (!algumDado) return null

  const maxCarga = Math.max(...dados.map(d => d.margem), 0.01)

  function fmtPct(v: number) {
    return v.toFixed(2).replace('.', ',') + '%'
  }

  function fmtDeltaPct(v: number) {
    const s = v > 0 ? '+' : ''
    return s + v.toFixed(1).replace('.', ',') + '%'
  }

  function fmtDeltaCarga(v: number) {
    const s = v > 0 ? '+' : ''
    return s + v.toFixed(2).replace('.', ',') + ' pp'
  }

  function handleAnoClick(ano: number) {
    onSetAno(ano)
    setExpandido(prev => (prev === ano ? null : ano))
  }

  return (
    <div className="resumo-tabela">
      <div className="rt-title">Resumo por ano</div>

      <div className="rt-scroll">
        <table className="rt-table">
          <thead>
            <tr>
              <th className="rt-th rt-th-label" />
              {dados.map(({ ano, margem }) => {
                const barPct = maxCarga > 0 ? (margem / maxCarga) * 100 : 0
                const isAtivo = ano === anoAtivo
                const isExp = expandido === ano
                return (
                  <th
                    key={ano}
                    className={`rt-th rt-th-ano ${isAtivo ? 'active' : ''} ${isExp ? 'rt-th-exp' : ''}`}
                    onClick={() => handleAnoClick(ano)}
                  >
                    <div className="rt-th-content">
                      <span>{ano}</span>
                      <div className="rt-bar-track">
                        <div
                          className={`rt-bar-fill ${isAtivo ? 'rt-bar-active' : ''}`}
                          style={{ width: margem > 0 ? `${barPct}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="rt-row">
              <td className="rt-td rt-td-label">Receita bruta</td>
              {dados.map(({ ano, receita }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {receita > 0 ? 'R$ ' + fmtBR(receita) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row">
              <td className="rt-td rt-td-label">Carga tributária</td>
              {dados.map(({ ano, margem }) => (
                <td key={ano} className={`rt-td rt-td-num marg ${ano === anoAtivo ? 'active' : ''}`}>
                  {margem > 0 ? fmtPct(margem) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label">Δ Carga vs 2026</td>
              {dados.map(({ ano, deltaCarga }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {deltaCarga === null ? <span className="rt-base-tag">base</span> : (
                    <span className={deltaCarga > 0 ? 'delta-up' : deltaCarga < 0 ? 'delta-down' : ''}>
                      {fmtDeltaCarga(deltaCarga)}
                    </span>
                  )}
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
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label">Δ Tributos</td>
              {dados.map(({ ano, deltaTribPct }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {deltaTribPct === null ? '—' : (
                    <span className={deltaTribPct > 0 ? 'delta-up' : deltaTribPct < 0 ? 'delta-down' : ''}>
                      {fmtDeltaPct(deltaTribPct)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {expandido !== null && (
        <BreakdownAno
          estado={estado}
          ano={expandido}
          receita={dados.find(d => d.ano === expandido)!.receita}
          onFechar={() => setExpandido(null)}
        />
      )}
    </div>
  )
}

function BreakdownAno({
  estado, ano, receita, onFechar,
}: {
  estado: Estado
  ano: number
  receita: number
  onFechar: () => void
}) {
  const t = resumoTributosBrutos(estado, ano)

  const linhas = [
    { label: 'PIS',           val: t.pis,  cor: 'dot-pis'    },
    { label: 'COFINS',        val: t.cof,  cor: 'dot-cofins' },
    { label: 'CBS',           val: t.cbs,  cor: 'dot-cbs'    },
    { label: 'IBS Estadual',  val: t.ibsE, cor: 'dot-ibs'    },
    { label: 'IBS Municipal', val: t.ibsM, cor: 'dot-ibs'    },
  ].filter(l => l.val > 0)

  const carga = receita > 0 ? (t.total / receita) * 100 : 0

  return (
    <div className="rt-breakdown">
      <div className="rt-bd-header">
        <span className="rt-bd-title">Breakdown {ano}</span>
        <button className="rt-bd-close" onClick={onFechar}>✕</button>
      </div>

      <div className="rt-bd-rows">
        {linhas.map(l => (
          <div key={l.label} className="rt-bd-row">
            <span className="rt-bd-label">
              <span className={`tc-dot ${l.cor}`} />
              {l.label}
            </span>
            <div className="rt-bd-bar-track">
              <div
                className="rt-bd-bar-fill"
                style={{ width: t.total > 0 ? `${(l.val / t.total) * 100}%` : '0%' }}
              />
            </div>
            <span className="rt-bd-val">R$ {fmtBR(l.val) || '—'}</span>
            <span className="rt-bd-pct">
              {t.total > 0
                ? ((l.val / t.total) * 100).toFixed(1).replace('.', ',') + '%'
                : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="rt-bd-footer">
        <span className="rt-bd-footer-label">Total tributos</span>
        <span className="rt-bd-footer-val">{fmtCompacto(t.total)}</span>
        {carga > 0 && (
          <span className="rt-bd-footer-carga">
            {carga.toFixed(2).replace('.', ',')}% da receita
          </span>
        )}
      </div>
    </div>
  )
}
