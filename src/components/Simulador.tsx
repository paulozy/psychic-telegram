'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useState } from 'react'
import { Topbar } from './Topbar'
import { PainelEsquerdo } from './PainelEsquerdo'
import { ResultadoBar } from './ResultadoBar'
import { TributoCard } from './TributoCard'
import { ResumoTabela } from './ResumoTabela'
import { ImportPreviewModal } from './ImportPreviewModal'
import { Tutorial } from './Tutorial/Tutorial'
import { useTutorial } from './Tutorial/useTutorial'
import {
  estadoInicial,
  atualizarValor,
  atualizarAliquota,
  aplicarAliquotasGlobais,
} from '@/lib/simulador'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { exportarXlsx } from '@/lib/exportXlsx'
import { gerarTemplate } from '@/lib/excel/template'
import { importarXlsx, type ImportError } from '@/lib/excel/import'
import type { Estado, DadosOperacao } from '@/types/simulador'

export function Simulador() {
  const estadoBase = useMemo(() => estadoInicial(), [])
  const [estado, setEstado] = useLocalStorage<Estado>('arval-simulador-v2', estadoBase)
  const [anoAtivo, setAnoAtivo] = useState(2026)
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [importPreview, setImportPreview] = useState<{ estado: Estado; mudancas: number } | null>(null)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tutorial = useTutorial()

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

  const handleAliquotasGlobais = useCallback((
    aliquotas: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>
  ) => {
    setEstado(prev => aplicarAliquotasGlobais(prev, anoAtivo, aliquotas))
    showToast('Alíquotas aplicadas a todas as operações')
  }, [anoAtivo])

  const handleLimpar = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arval-simulador-v2')
    }
    setEstado(estadoInicial())
    showToast('Dados limpos')
  }, [])

  const handleExportar = useCallback(async () => {
    await exportarXlsx(estado)
    showToast('Exportação concluída')
  }, [estado])

  const handleBaixarTemplate = useCallback(async () => {
    await gerarTemplate()
    showToast('Template baixado')
  }, [])

  const handleImportarClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await importarXlsx(file, estado)
    if (result.ok) {
      setImportPreview({ estado: result.estado, mudancas: result.mudancas })
      setImportErrors([])
    } else {
      setImportPreview(null)
      setImportErrors(result.errors)
    }
    setModalAberto(true)
  }, [estado])

  const handleConfirmarImport = useCallback(() => {
    if (importPreview) {
      setEstado(importPreview.estado)
      showToast(importPreview.mudancas === 0 ? 'Nenhuma alteração' : 'Importação concluída')
    }
    setModalAberto(false)
    setImportPreview(null)
    setImportErrors([])
  }, [importPreview])

  const handleCancelarImport = useCallback(() => {
    setModalAberto(false)
    setImportPreview(null)
    setImportErrors([])
  }, [])

  const handleInserirExemplo = useCallback(() => {
    setEstado(prev => atualizarValor(prev, 2026, 'rec_locacao', 1_000_000))
    setAnoAtivo(2026)
  }, [setEstado])

  const handleLimparExemplo = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arval-simulador-v2')
    }
    setEstado(estadoInicial())
  }, [setEstado])

  const is2026 = anoAtivo === 2026

  return (
    <div className="shell">
      <Topbar
        onLimpar={handleLimpar}
        onExportar={handleExportar}
        onBaixarTemplate={handleBaixarTemplate}
        onImportar={handleImportarClick}
        onAbrirTutorial={() => {
          if (!tutorial.desktop) {
            showToast('Tutorial disponível apenas em desktop')
            return
          }
          tutorial.abrir()
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      <div className="body">
        <PainelEsquerdo
          estado={estado}
          anoAtivo={anoAtivo}
          onSetAno={handleSetAno}
          onValorChange={handleValorChange}
          onAliquotasGlobais={handleAliquotasGlobais}
        />

        <div className="right-panel">
          <ResultadoBar
            estado={estado}
            anoAtivo={anoAtivo}
            onSetAno={handleSetAno}
          />

          <div className="impostos-area" data-tour="tributos">
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

      {modalAberto && (
        <ImportPreviewModal
          mudancas={importPreview?.mudancas ?? null}
          errors={importErrors}
          onConfirmar={handleConfirmarImport}
          onCancelar={handleCancelarImport}
        />
      )}

      <Tutorial
        ctrl={tutorial}
        pausado={modalAberto}
        onInserirExemplo={handleInserirExemplo}
        onLimparExemplo={handleLimparExemplo}
      />

      {/* Toast */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}
