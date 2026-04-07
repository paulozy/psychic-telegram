'use client'

import { useState, useCallback } from 'react'
import { Topbar } from './Topbar'
import { PainelEsquerdo } from './PainelEsquerdo'
import { ResultadoBar } from './ResultadoBar'
import { TributoCard } from './TributoCard'
import { ResumoTabela } from './ResumoTabela'
import {
  estadoInicial,
  atualizarValor,
  atualizarAliquota,
} from '@/lib/simulador'
import { exportarXlsx } from '@/lib/exportXlsx'
import type { Estado, DadosOperacao } from '@/types/simulador'

export function Simulador() {
  const [estado, setEstado] = useState<Estado>(estadoInicial)
  const [anoAtivo, setAnoAtivo] = useState(2026)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  const handleSetAno = useCallback((ano: number) => {
    setAnoAtivo(ano)
  }, [])

  const handleValorChange = useCallback((key: string, valor: number) => {
    setEstado(prev => atualizarValor(prev, anoAtivo, key, valor))
  }, [anoAtivo])

  const handleAliquotaChange = useCallback((
    key: string,
    field: keyof DadosOperacao,
    valor: number
  ) => {
    setEstado(prev => atualizarAliquota(prev, anoAtivo, key, field, valor))
  }, [anoAtivo])

  const handleLimpar = useCallback(() => {
    setEstado(estadoInicial())
    showToast('Dados limpos')
  }, [])

  const handleExportar = useCallback(async () => {
    await exportarXlsx(estado)
    showToast('Exportação concluída')
  }, [estado])

  const is2026 = anoAtivo === 2026

  return (
    <div className="shell">
      <Topbar onLimpar={handleLimpar} onExportar={handleExportar} />

      <div className="body">
        <PainelEsquerdo
          estado={estado}
          anoAtivo={anoAtivo}
          onSetAno={handleSetAno}
          onValorChange={handleValorChange}
        />

        <div className="right-panel">
          <ResultadoBar
            estado={estado}
            anoAtivo={anoAtivo}
            onSetAno={handleSetAno}
          />

          <div className="impostos-area">
            <ResumoTabela
              estado={estado}
              anoAtivo={anoAtivo}
              onSetAno={handleSetAno}
            />

            {is2026 && (
              <div className="imp-section-label">
                PIS / COFINS — regime vigente 2026
              </div>
            )}

            {is2026 && (
              <>
                <TributoCard
                  estado={estado}
                  ano={anoAtivo}
                  tributo="pis"
                  onAliquotaChange={handleAliquotaChange}
                />
                <TributoCard
                  estado={estado}
                  ano={anoAtivo}
                  tributo="cofins"
                  onAliquotaChange={handleAliquotaChange}
                />
              </>
            )}

            {!is2026 && (
              <div className="imp-section-label">CBS / IBS — novo regime</div>
            )}

            <TributoCard
              estado={estado}
              ano={anoAtivo}
              tributo="cbs"
              onAliquotaChange={handleAliquotaChange}
            />
            <TributoCard
              estado={estado}
              ano={anoAtivo}
              tributo="ibs"
              onAliquotaChange={handleAliquotaChange}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}
