'use client'

import { OPERACOES, fmtBR, fmtCompacto } from '@/lib/simulador'
import type { Estado, DadosOperacao } from '@/types/simulador'

interface TributoCardProps {
  estado: Estado
  ano: number
  tributo: 'pis' | 'cofins' | 'cbs' | 'ibs'
  onAliquotaChange: (key: string, field: keyof DadosOperacao, valor: number) => void
}

const CONFIG = {
  pis: {
    label: 'PIS',
    dotClass: 'dot-pis',
    badgeClass: 'tb-active',
    badgeLabel: 'vigente 2026',
    apenasEm2026: true,
    layout: 'layout-std' as const,
    colunas: ['Operação', 'Base (da esquerda)', 'Alíq. %', 'Valor PIS'],
  },
  cofins: {
    label: 'COFINS',
    dotClass: 'dot-cofins',
    badgeClass: 'tb-active',
    badgeLabel: 'vigente 2026',
    apenasEm2026: true,
    layout: 'layout-std' as const,
    colunas: ['Operação', 'Base (da esquerda)', 'Alíq. %', 'Valor COFINS'],
  },
  cbs: {
    label: 'CBS',
    dotClass: 'dot-cbs',
    badgeClass: 'tb-active',
    badgeLabel: 'vigente',
    apenasEm2026: false,
    layout: 'layout-std' as const,
    colunas: ['Operação', 'Base (da esquerda)', 'Alíq. %', 'Valor CBS'],
  },
  ibs: {
    label: 'IBS',
    dotClass: 'dot-ibs',
    badgeClass: 'tb-active-g',
    badgeLabel: 'vigente',
    apenasEm2026: false,
    layout: 'layout-ibs' as const,
    colunas: ['Operação', 'Base (da esquerda)', 'Alíq. Est.%', 'Alíq. Mun.%', 'IBS Estadual', 'IBS Municipal'],
  },
}

const CAMPOS_TRIBUTO = {
  pis:    { aliq: 'aliqPis'  as keyof DadosOperacao, val: 'valPis'  as keyof DadosOperacao },
  cofins: { aliq: 'aliqCof'  as keyof DadosOperacao, val: 'valCof'  as keyof DadosOperacao },
  cbs:    { aliq: 'aliqCbs'  as keyof DadosOperacao, val: 'valCbs'  as keyof DadosOperacao },
}

export function TributoCard({ estado, ano, tributo, onAliquotaChange }: TributoCardProps) {
  const cfg = CONFIG[tributo]
  const is2026 = ano === 2026

  // Badge logic
  let badgeClass = 'tb-inactive'
  let badgeLabel = 'não aplicável em 2026'
  if (tributo === 'pis' || tributo === 'cofins') {
    badgeClass = is2026 ? 'tb-active' : 'tb-inactive'
    badgeLabel = is2026 ? 'vigente 2026' : 'encerrado'
  } else {
    badgeClass = !is2026 ? cfg.badgeClass : 'tb-inactive'
    badgeLabel = !is2026 ? cfg.badgeLabel : 'não aplicável em 2026'
  }

  // Total do card
  let total = 0
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    if (tributo === 'pis')    total += d.valPis
    if (tributo === 'cofins') total += d.valCof
    if (tributo === 'cbs')    total += d.valCbs
    if (tributo === 'ibs')    total += d.valIbsE + d.valIbsM
  })

  return (
    <div className="tributo-card">
      <div className="tc-head">
        <span className="tc-name">
          <span className={`tc-dot ${cfg.dotClass}`} />
          {cfg.label}
          <span className={`tc-badge ${badgeClass}`}>{badgeLabel}</span>
        </span>
        <span className="tc-total">{fmtCompacto(total)}</span>
      </div>

      {/* Header colunas */}
      <div className={`tc-col-header ${cfg.layout}`}>
        {cfg.colunas.map(col => (
          <span key={col} className="col-label">{col}</span>
        ))}
      </div>

      {/* Linhas por operação */}
      <div className="tc-rows">
        {OPERACOES.map(op => {
          const d = estado[ano][op.key]

          if (tributo === 'ibs') {
            return (
              <div key={op.key} className="tc-row layout-ibs">
                <span className="tc-row-label">
                  {op.label}
                  <span className={`op-badge ${op.tipo === 'debito' ? 'op-d' : 'op-c'}`}>
                    {op.tipo === 'debito' ? 'D' : 'C'}
                  </span>
                </span>
                <input
                  className="field-inp field-base-display"
                  readOnly
                  value={d.baseIbs ? fmtBR(d.baseIbs) : ''}
                  placeholder="0,00"
                />
                <input
                  className="field-inp aliq"
                  type="number"
                  step="0.0001"
                  placeholder="Est.%"
                  value={d.aliqIbsE || ''}
                  onChange={e => onAliquotaChange(op.key, 'aliqIbsE', parseFloat(e.target.value) || 0)}
                />
                <input
                  className="field-inp aliq"
                  type="number"
                  step="0.0001"
                  placeholder="Mun.%"
                  value={d.aliqIbsM || ''}
                  onChange={e => onAliquotaChange(op.key, 'aliqIbsM', parseFloat(e.target.value) || 0)}
                />
                <input
                  className="field-inp result"
                  readOnly
                  value={fmtBR(d.valIbsE) || ''}
                  placeholder="—"
                />
                <input
                  className="field-inp result-g"
                  readOnly
                  value={fmtBR(d.valIbsM) || ''}
                  placeholder="—"
                />
              </div>
            )
          }

          const campos = CAMPOS_TRIBUTO[tributo as 'pis' | 'cofins' | 'cbs']
          const baseDisplay = tributo === 'cbs' ? d.baseCbs : d.valor

          return (
            <div key={op.key} className="tc-row layout-std">
              <span className="tc-row-label">
                {op.label}
                <span className={`op-badge ${op.tipo === 'debito' ? 'op-d' : 'op-c'}`}>
                  {op.tipo === 'debito' ? 'D' : 'C'}
                </span>
              </span>
              <input
                className="field-inp field-base-display"
                readOnly
                value={baseDisplay ? fmtBR(baseDisplay) : ''}
                placeholder="0,00"
              />
              <input
                className="field-inp aliq"
                type="number"
                step="0.0001"
                placeholder="%"
                value={(d[campos.aliq] as number) || ''}
                onChange={e => onAliquotaChange(op.key, campos.aliq, parseFloat(e.target.value) || 0)}
              />
              <input
                className="field-inp result"
                readOnly
                value={fmtBR(d[campos.val] as number) || ''}
                placeholder="—"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
