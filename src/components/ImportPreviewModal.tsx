'use client'

import type { ImportError } from '@/lib/excel/import'

interface ImportPreviewModalProps {
  mudancas: number | null
  errors: ImportError[]
  onConfirmar: () => void
  onCancelar: () => void
}

export function ImportPreviewModal({ mudancas, errors, onConfirmar, onCancelar }: ImportPreviewModalProps) {
  const temErros = errors.length > 0
  const podeConfirmar = !temErros && mudancas !== null

  return (
    <div className="modal-backdrop" onClick={onCancelar}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">
          {temErros ? 'Erros na importação' : 'Confirmar importação'}
        </h3>

        {!temErros && mudancas !== null && (
          <p className="modal-text">
            {mudancas === 0
              ? 'Nenhuma alteração detectada — o arquivo é idêntico ao estado atual.'
              : `${mudancas} célula(s) serão atualizadas. O estado atual será substituído.`}
          </p>
        )}

        {temErros && (
          <>
            <p className="modal-text">
              {errors.length === 1
                ? '1 erro encontrado. Corrija o arquivo e tente novamente.'
                : `${errors.length} erros encontrados. Corrija o arquivo e tente novamente.`}
            </p>
            <ul className="modal-errors">
              {errors.slice(0, 50).map((e, i) => (
                <li key={i}>
                  <span className="modal-err-loc">
                    {e.sheet}{e.cell ? `!${e.cell}` : ''}
                  </span>
                  <span className="modal-err-reason">{e.reason}</span>
                </li>
              ))}
              {errors.length > 50 && (
                <li className="modal-err-more">… e mais {errors.length - 50} erro(s)</li>
              )}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancelar}>
            {temErros ? 'Fechar' : 'Cancelar'}
          </button>
          {!temErros && (
            <button
              className="btn btn-primary"
              onClick={onConfirmar}
              disabled={!podeConfirmar}
            >
              Confirmar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
