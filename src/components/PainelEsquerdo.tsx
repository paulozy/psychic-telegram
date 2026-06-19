'use client'

import { BUCKETS_AQUISICAO, OPERACOES, ANOS, hasData, fmtBR } from '@/lib/simulador'
import { NumberInputBR } from './NumberInputBR'
import { PainelAliquotas } from './PainelAliquotas'
import { TOOLTIPS_CONCEITO, TOOLTIPS_OPERACAO } from '@/lib/tooltips'
import type { BucketAquisicao, Estado, DadosOperacao } from '@/types/simulador'

interface PainelEsquerdoProps {
  estado: Estado
  anoAtivo: number
  onSetAno: (ano: number) => void
  onValorChange: (key: string, valor: number) => void
  onReducaoChange: (key: string, valor: number) => void
  onBucketChange: (bucket: BucketAquisicao) => void
  onAliquotasGlobais: (aliquotas: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>) => void
}

function labelReducao(opKey: string): string {
  return opKey === 'venda_ativo' ? 'Custo de aquisição' : 'Redução'
}

function tooltipReducao(opKey: string): string {
  return opKey === 'venda_ativo' ? TOOLTIPS_CONCEITO.custoAquisicao : TOOLTIPS_CONCEITO.reducaoBase
}

const BUCKET_LABELS: Record<BucketAquisicao, string> = {
  'pre-jul-2024': 'Antes de jul/2024',
  '2024-2026':    '2024 – 2026',
  '2027-2028':    '2027 – 2028',
  '2029':         '2029',
  '2030':         '2030',
  '2031':         '2031',
  '2032':         '2032',
  '2033+':        '2033 em diante',
}

export function PainelEsquerdo({
  estado,
  anoAtivo,
  onSetAno,
  onValorChange,
  onReducaoChange,
  onBucketChange,
  onAliquotasGlobais,
}: PainelEsquerdoProps) {
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
      <div className="ano-tabs" data-tour="ano-tabs">
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

      {/* Painel de alíquotas */}
      <PainelAliquotas
        anoAtivo={anoAtivo}
        onAplicarAliquotas={onAliquotasGlobais}
      />

      {/* Cards de receita */}
      <div className="receitas-scroll" data-tour="operacoes">
        {OPERACOES.map(op => {
          const d = estado[anoAtivo][op.key]
          return (
            <div
              key={op.key}
              className={`rec-card ${op.tipo === 'credito' ? 'tipo-cred' : ''}`}
            >
              <div className="rec-head">
                <span className="rec-name" title={TOOLTIPS_OPERACAO[op.key]}>{op.label}</span>
                <span
                  className={`rec-tag ${op.tipo === 'debito' ? 'tag-deb' : 'tag-cred'}`}
                  title={op.tipo === 'debito' ? TOOLTIPS_CONCEITO.badgeDebito : TOOLTIPS_CONCEITO.badgeCredito}
                >
                  {op.tipo === 'debito' ? 'DÉB' : 'CRÉ'}
                </span>
              </div>
              <div className="rec-valor-row">
                <span className="rec-prefix">R$</span>
                <NumberInputBR
                  key={`${op.key}-${anoAtivo}`}
                  className="rec-input"
                  placeholder="0,00"
                  value={d.valor}
                  onChange={valor => onValorChange(op.key, valor)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
              {op.tipo === 'debito' && (
                <>
                  <div className="rec-reducao-row">
                    <span className="rec-reducao-label" title={tooltipReducao(op.key)}>
                      {labelReducao(op.key)}
                    </span>
                    <span className="rec-prefix">R$</span>
                    <NumberInputBR
                      key={`red-${op.key}-${anoAtivo}`}
                      className="rec-input"
                      placeholder="0,00"
                      value={d.reducaoBase}
                      onChange={valor => onReducaoChange(op.key, valor)}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  {op.key === 'venda_ativo' && (
                    <div className="rec-bucket-row" title={TOOLTIPS_CONCEITO.bucketAquisicao}>
                      <span className="rec-reducao-label">Ano de aquisição</span>
                      <select
                        className="rec-bucket-select"
                        value={d.bucketAquisicao ?? '2024-2026'}
                        onChange={e => onBucketChange(e.target.value as BucketAquisicao)}
                        onClick={e => e.stopPropagation()}
                      >
                        {BUCKETS_AQUISICAO.map(b => (
                          <option key={b} value={b}>{BUCKET_LABELS[b]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {d.valor > 0 && d.reducaoBase <= d.valor && (
                    <small className="rec-base-efetiva">
                      Base efetiva: R$ {fmtBR(Math.max(0, d.valor - d.reducaoBase))}
                    </small>
                  )}
                  {d.valor > 0 && d.reducaoBase > d.valor && (
                    op.key === 'venda_ativo' ? (
                      <small className="rec-base-aviso">Custo de aquisição acima do valor de venda</small>
                    ) : (
                      <small className="rec-base-erro">Redução excede o valor</small>
                    )
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Rodapé totais */}
      <div className="left-footer">
        <div className="ft-row">
          <span className="ft-label" title={TOOLTIPS_CONCEITO.totalDebitos}>Total débitos</span>
          <span className="ft-val deb">{totalDeb > 0 ? 'R$ ' + fmtBR(totalDeb) : '—'}</span>
        </div>
        <hr className="ft-divider" />
        <div className="ft-row">
          <span className="ft-label" title={TOOLTIPS_CONCEITO.totalCreditos}>Total créditos</span>
          <span className="ft-val cred">{totalCred > 0 ? 'R$ ' + fmtBR(totalCred) : '—'}</span>
        </div>
      </div>
    </aside>
  )
}
