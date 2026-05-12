'use client'

import { ANOS, apurarAno, fmtBR } from '@/lib/simulador'
import { TOOLTIPS_CONCEITO, TOOLTIPS_METRICA } from '@/lib/tooltips'
import type { Estado } from '@/types/simulador'
import { useState } from 'react'

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
    const a = apurarAno(estado, ano)
    const anterior = idx > 0 ? apurarAno(estado, ANOS[idx - 1]) : null
    const deltaTotal =
      anterior !== null && anterior.totalAPagar > 0 && a.totalAPagar > 0
        ? ((a.totalAPagar - anterior.totalAPagar) / anterior.totalAPagar) * 100
        : null
    const deltaCarga = anterior !== null ? a.cargaConsolidada - anterior.cargaConsolidada : null
    return { ano, ...a, deltaTotal, deltaCarga }
  })

  const algumDado = dados.some(d => d.receitaTotal > 0 || d.totalAPagar > 0)
  if (!algumDado) return null

  const maxCarga = Math.max(...dados.map(d => d.cargaConsolidada), 0.01)

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

  function fmtSigned(v: number): string {
    const abs = Math.abs(v)
    const prefix = v > 0 ? '+R$ ' : v < 0 ? '-R$ ' : 'R$ '
    return prefix + fmtBR(abs)
  }

  function handleAnoClick(ano: number) {
    onSetAno(ano)
    setExpandido(prev => (prev === ano ? null : ano))
  }

  return (
    <div className="resumo-tabela" data-tour="resumo-tabela">
      <div className="rt-title">Resumo por ano</div>

      <div className="rt-scroll">
        <table className="rt-table">
          <thead>
            <tr>
              <th className="rt-th rt-th-label" />
              {dados.map(({ ano, cargaConsolidada }) => {
                const barPct = maxCarga > 0 ? (cargaConsolidada / maxCarga) * 100 : 0
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
                          style={{ width: cargaConsolidada > 0 ? `${barPct}%` : '0%' }}
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
              <td className="rt-td rt-td-label" title={TOOLTIPS_METRICA.receitaBruta}>Receita bruta</td>
              {dados.map(({ ano, receitaTotal }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {receitaTotal > 0 ? 'R$ ' + fmtBR(receitaTotal) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row">
              <td className="rt-td rt-td-label" title={TOOLTIPS_METRICA.tributosDebitos}>Tributos s/ débitos</td>
              {dados.map(({ ano, pis, cofins, cbs, ibsE, ibsM }) => {
                const totalDebitos = pis.debito + cofins.debito + cbs.debito + ibsE.debito + ibsM.debito
                return (
                  <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                    {totalDebitos > 0 ? 'R$ ' + fmtBR(totalDebitos) : '—'}
                  </td>
                )
              })}
            </tr>
            <tr className="rt-row">
              <td className="rt-td rt-td-label" title={TOOLTIPS_METRICA.creditosCompensaveis}>Créditos compensáveis</td>
              {dados.map(({ ano, pis, cofins, cbs, ibsE, ibsM }) => {
                const totalCreditos = pis.credito + cofins.credito + cbs.credito + ibsE.credito + ibsM.credito
                return (
                  <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                    {totalCreditos > 0 ? 'R$ ' + fmtBR(totalCreditos) : '—'}
                  </td>
                )
              })}
            </tr>
            <tr className="rt-row">
              <td
                className="rt-td rt-td-label"
                title={TOOLTIPS_METRICA.resultadoLiquido}
              >
                Resultado líquido
              </td>
              {dados.map(({ ano, pis, cofins, cbs, ibs }) => {
                const totalDebitos = pis.debito + cofins.debito + cbs.debito + ibs.debito
                const totalCreditos = pis.credito + cofins.credito + cbs.credito + ibs.credito
                const liquido = totalCreditos - totalDebitos
                return (
                  <td key={ano} className={`rt-td rt-td-num trib ${ano === anoAtivo ? 'active' : ''}`}>
                    {liquido !== 0 ? fmtSigned(liquido) : '—'}
                  </td>
                )
              })}
            </tr>
            <tr className="rt-row">
              <td
                className="rt-td rt-td-label"
                title={TOOLTIPS_METRICA.cargaEfetiva}
              >
                Carga efetiva
              </td>
              {dados.map(({ ano, cargaConsolidada }) => (
                <td key={ano} className={`rt-td rt-td-num marg ${ano === anoAtivo ? 'active' : ''}`}>
                  {cargaConsolidada > 0 ? fmtPct(cargaConsolidada) : '—'}
                </td>
              ))}
            </tr>
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label" title={TOOLTIPS_METRICA.deltaCarga}>Δ Carga vs ano anterior</td>
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
            <tr className="rt-row rt-row-delta">
              <td className="rt-td rt-td-label" title={TOOLTIPS_METRICA.deltaTributos}>Δ Tributos</td>
              {dados.map(({ ano, deltaTotal }) => (
                <td key={ano} className={`rt-td rt-td-num ${ano === anoAtivo ? 'active' : ''}`}>
                  {deltaTotal === null ? '—' : (
                    <span className={deltaTotal > 0 ? 'delta-up' : deltaTotal < 0 ? 'delta-down' : ''}>
                      {fmtDeltaPct(deltaTotal)}
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
          onFechar={() => setExpandido(null)}
        />
      )}
    </div>
  )
}

function BreakdownAno({
  estado, ano, onFechar,
}: {
  estado: Estado
  ano: number
  onFechar: () => void
}) {
  const a = apurarAno(estado, ano)

  const tributos = [
    { label: 'PIS', data: a.pis, cor: 'dot-pis', so2026: true },
    { label: 'COFINS', data: a.cofins, cor: 'dot-cofins', so2026: true },
    { label: 'CBS', data: a.cbs, cor: 'dot-cbs', so2026: false },
    { label: 'IBS Estadual', data: a.ibsE, cor: 'dot-ibs', so2026: false },
    { label: 'IBS Municipal', data: a.ibsM, cor: 'dot-ibs', so2026: false },
  ].filter(t => !(t.so2026 && ano !== 2026))

  return (
    <div className="rt-breakdown">
      <div className="rt-bd-header">
        <span className="rt-bd-title">Apuração {ano}</span>
        <button className="rt-bd-close" onClick={onFechar}>✕</button>
      </div>

      <div className="rt-bd-apuracao-table">
        <div className="rt-bd-apuracao-header">
          <span className="rt-bd-apuracao-col rt-bd-apuracao-tributo" title={TOOLTIPS_CONCEITO.colunaTributo}>Tributo</span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num" title={TOOLTIPS_CONCEITO.colunaDebito}>Débito</span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num" title={TOOLTIPS_CONCEITO.colunaCredito}>Crédito</span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num" title={TOOLTIPS_CONCEITO.colunaSaldo}>Saldo</span>
        </div>

        {tributos.map(t => (
          <div key={t.label} className="rt-bd-apuracao-row">
            <span className="rt-bd-apuracao-col rt-bd-apuracao-tributo">
              <span className={`tc-dot ${t.cor}`} />
              {t.label}
            </span>
            <span className="rt-bd-apuracao-col rt-bd-apuracao-num">
              R$ {fmtBR(t.data.debito)}
            </span>
            <span className="rt-bd-apuracao-col rt-bd-apuracao-num">
              R$ {fmtBR(t.data.credito)}
            </span>
            <span className={`rt-bd-apuracao-col rt-bd-apuracao-num ${t.data.saldo > 0 ? 'saldo-positivo' : t.data.saldo < 0 ? 'saldo-credor' : ''}`}>
              R$ {fmtBR(Math.abs(t.data.saldo))}
            </span>
          </div>
        ))}

        <div className="rt-bd-apuracao-row rt-bd-apuracao-total">
          <span className="rt-bd-apuracao-col rt-bd-apuracao-tributo">Total</span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num">
            R$ {fmtBR(a.pis.debito + a.cofins.debito + a.cbs.debito + a.ibsE.debito + a.ibsM.debito)}
          </span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num">
            R$ {fmtBR(a.pis.credito + a.cofins.credito + a.cbs.credito + a.ibsE.credito + a.ibsM.credito)}
          </span>
          <span className="rt-bd-apuracao-col rt-bd-apuracao-num">
            R$ {fmtBR(a.totalAPagar)}
          </span>
        </div>
      </div>

      <div className="rt-bd-footer">
        <div className="rt-bd-footer-row">
          <span
            className="rt-bd-footer-label"
            title={TOOLTIPS_METRICA.cargaBruta}
          >
            Carga bruta
          </span>
          <span className="rt-bd-footer-val">{a.cargaBruta.toFixed(2).replace('.', ',')}%</span>
        </div>
        <div className="rt-bd-footer-row">
          <span
            className="rt-bd-footer-label"
            title={TOOLTIPS_METRICA.cargaPadrao}
          >
            Carga padrão (atividade-fim)
          </span>
          <span className="rt-bd-footer-val">{a.cargaPadrao.toFixed(2).replace('.', ',')}%</span>
        </div>
        <div className="rt-bd-footer-row">
          <span
            className="rt-bd-footer-label"
            title={TOOLTIPS_METRICA.cargaConsolidada}
          >
            Carga consolidada (tributável)
          </span>
          <span className="rt-bd-footer-val">{a.cargaConsolidada.toFixed(2).replace('.', ',')}%</span>
        </div>
        <div className="rt-bd-footer-row">
          <span
            className="rt-bd-footer-label"
            title={TOOLTIPS_METRICA.cargaSobreTotal}
          >
            Carga sobre receita total
          </span>
          <span className="rt-bd-footer-val">{a.cargaSobreReceitaTotal.toFixed(2).replace('.', ',')}%</span>
        </div>
      </div>
    </div>
  )
}
