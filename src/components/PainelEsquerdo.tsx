'use client'

import { OPERACOES, ANOS, hasData, fmtBR } from '@/lib/simulador'
import type { Estado } from '@/types/simulador'

interface PainelEsquerdoProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
  onValorChange: (key: string, valor: number) => void
}

export function PainelEsquerdo({
  estado,
  anoAtivo,
  onSetAno,
  onValorChange,
}: PainelEsquerdoProps) {
  // totais do rodapé
  let totalDeb = 0, totalCred = 0
  OPERACOES.forEach(op => {
    const v = estado[anoAtivo][op.key].valor
    if (op.tipo === 'debito') totalDeb += v
    else totalCred += v
  })

  return (
    <aside className="left-panel">
      <div className="panel-head">
        <div className="panel-title">Operações</div>
        <div className="panel-sub">Valor por ano de apuração</div>
      </div>

      {/* Ano tabs */}
      <div className="ano-tabs">
        {ANOS.map(ano => (
          <button
            key={ano}
            className={`ano-tab ${ano === anoAtivo ? 'active' : ''} ${hasData(estado, ano) ? 'has-data' : ''}`}
            onClick={() => onSetAno(ano)}
          >
            {ano}
            <span className="dot" />
          </button>
        ))}
      </div>

      {/* Cards de receita */}
      <div className="receitas-scroll">
        {OPERACOES.map(op => {
          const d = estado[anoAtivo][op.key]
          return (
            <div
              key={op.key}
              className={`rec-card ${op.tipo === 'credito' ? 'tipo-cred' : ''}`}
            >
              <div className="rec-head">
                <span className="rec-name">{op.label}</span>
                <span className={`rec-tag ${op.tipo === 'debito' ? 'tag-deb' : 'tag-cred'}`}>
                  {op.tipo === 'debito' ? 'DÉB' : 'CRÉ'}
                </span>
              </div>
              <div className="rec-valor-row">
                <span className="rec-prefix">R$</span>
                <input
                  className="rec-input"
                  type="number"
                  placeholder="0,00"
                  value={d.valor || ''}
                  onChange={e => onValorChange(op.key, parseFloat(e.target.value) || 0)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Rodapé totais */}
      <div className="left-footer">
        <div className="ft-row">
          <span className="ft-label">Total débitos</span>
          <span className="ft-val deb">{totalDeb > 0 ? 'R$ ' + fmtBR(totalDeb) : '—'}</span>
        </div>
        <hr className="ft-divider" />
        <div className="ft-row">
          <span className="ft-label">Total créditos</span>
          <span className="ft-val cred">{totalCred > 0 ? 'R$ ' + fmtBR(totalCred) : '—'}</span>
        </div>
      </div>
    </aside>
  )
}
