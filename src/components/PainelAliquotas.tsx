'use client'

import { useState, useCallback } from 'react'
import { NumberInputBR } from './NumberInputBR'
import type { DadosOperacao } from '@/types/simulador'

interface PainelAliquotasProps {
  anoAtivo: number
  onAplicarAliquotas: (aliquotas: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>) => void
}

export function PainelAliquotas({ anoAtivo, onAplicarAliquotas }: PainelAliquotasProps) {
  const [expandido, setExpandido] = useState(false)
  const [pis, setPis] = useState<number>('')
  const [cof, setCof] = useState<number>('')
  const [cbs, setCbs] = useState<number>('')
  const [ibsE, setIbsE] = useState<number>('')
  const [ibsM, setIbsM] = useState<number>('')

  const is2026 = anoAtivo === 2026

  const handleAplicar = useCallback(() => {
    const aliquotas: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>> = {}

    if (is2026) {
      if (pis !== '') aliquotas.aliqPis = pis as number
      if (cof !== '') aliquotas.aliqCof = cof as number
    }

    if (cbs !== '') aliquotas.aliqCbs = cbs as number
    if (ibsE !== '') aliquotas.aliqIbsE = ibsE as number
    if (ibsM !== '') aliquotas.aliqIbsM = ibsM as number

    onAplicarAliquotas(aliquotas)

    setPis('')
    setCof('')
    setCbs('')
    setIbsE('')
    setIbsM('')
    setExpandido(false)
  }, [pis, cof, cbs, ibsE, ibsM, is2026, onAplicarAliquotas])

  const temValores = [
    ...(is2026 ? [pis, cof] : []),
    cbs, ibsE, ibsM
  ].some(v => v !== '')

  return (
    <div className="painel-aliquotas">
      <button
        className="painel-aliquotas-toggle"
        onClick={() => setExpandido(!expandido)}
      >
        ⚙ Configurar alíquotas
        {temValores && <span className="painel-aliquotas-dot" />}
      </button>

      {expandido && (
        <div className="painel-aliquotas-content">
          <div className="pa-subtitle">Aplicar alíquotas a todas as operações do ano {anoAtivo}</div>

          {is2026 && (
            <>
              <div className="pa-field">
                <label className="pa-label">PIS (%)</label>
                <NumberInputBR
                  className="pa-input"
                  placeholder="ex: 1,65"
                  value={pis}
                  onChange={setPis}
                />
              </div>

              <div className="pa-field">
                <label className="pa-label">COFINS (%)</label>
                <NumberInputBR
                  className="pa-input"
                  placeholder="ex: 7,60"
                  value={cof}
                  onChange={setCof}
                />
              </div>
            </>
          )}

          {!is2026 && (
            <div className="pa-field">
              <label className="pa-label">CBS (%)</label>
              <NumberInputBR
                className="pa-input"
                placeholder="ex: 8,50"
                value={cbs}
                onChange={setCbs}
              />
            </div>
          )}

          {is2026 && (
            <div className="pa-field">
              <label className="pa-label">CBS (%)</label>
              <NumberInputBR
                className="pa-input"
                placeholder="ex: 0,90"
                value={cbs}
                onChange={setCbs}
              />
            </div>
          )}

          <div className="pa-field">
            <label className="pa-label">IBS Estadual (%)</label>
            <NumberInputBR
              className="pa-input"
              placeholder="ex: 0,10"
              value={ibsE}
              onChange={setIbsE}
            />
          </div>

          <div className="pa-field">
            <label className="pa-label">IBS Municipal (%)</label>
            <NumberInputBR
              className="pa-input"
              placeholder="ex: 0"
              value={ibsM}
              onChange={setIbsM}
            />
          </div>

          <button
            className="pa-btn-aplicar"
            onClick={handleAplicar}
            disabled={!temValores}
          >
            Aplicar a todas as operações
          </button>
        </div>
      )}
    </div>
  )
}
