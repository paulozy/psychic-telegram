'use client'

import { useState } from 'react'
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react'
import { fmtBR } from '@/lib/simulador'
import type { Breakdown, BreakdownFormato } from '@/types/simulador'

/** Formata um valor de termo/resultado conforme o tipo. fmtBR(0) devolve '', então tratamos zero aqui. */
function fmtValor(v: number, formato?: BreakdownFormato): string {
  switch (formato) {
    case 'percent':
      return v.toFixed(2).replace('.', ',') + '%'
    case 'pp':
      return (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + ' pp'
    case 'fator':
      return v.toFixed(2).replace('.', ',')
    default: {
      const sinal = v < 0 ? '−R$ ' : 'R$ '
      const abs = Math.abs(v)
      return sinal + (abs === 0 ? '0,00' : fmtBR(abs))
    }
  }
}

interface CalcPopoverProps {
  /** Breakdown a exibir. Se null, o gatilho não é renderizado (sem dado para explicar). */
  breakdown: Breakdown | null
  /** Rótulo acessível do botão-gatilho. */
  label?: string
}

/**
 * Botão "ƒ" que abre, em click/tap, um popover explicando como o número foi
 * calculado: fórmula + os valores reais que entraram nela. Posicionamento via
 * Floating UI (flip/shift), fecha por Escape ou clique fora.
 */
export function CalcPopover({ breakdown, label = 'Como é calculado' }: CalcPopoverProps) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

  if (!breakdown) return null

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        className={`calc-help ${open ? 'open' : ''}`}
        aria-label={label}
        // stopPropagation: gatilhos vivem dentro de cards/headers com onClick (troca de ano).
        {...getReferenceProps({ onClick: (e) => e.stopPropagation() })}
      >
        ƒ
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              className="calc-popover"
              style={floatingStyles}
              {...getFloatingProps({ onClick: (e) => e.stopPropagation() })}
            >
              <div className="calc-pop-title">{breakdown.titulo}</div>
              <div className="calc-pop-formula">{breakdown.formula}</div>

              <div className="calc-pop-termos">
                {breakdown.termos.map((t, i) => (
                  <div key={i} className="calc-pop-termo">
                    <span className="calc-pop-termo-label">
                      {t.operador && <span className="calc-pop-op">{t.operador}</span>}
                      {t.label}
                    </span>
                    <span className="calc-pop-termo-val">{fmtValor(t.valor, t.formato)}</span>
                  </div>
                ))}
              </div>

              <div className="calc-pop-resultado">
                <span className="calc-pop-res-label">Resultado</span>
                <span className="calc-pop-res-val">
                  {fmtValor(breakdown.resultado, breakdown.resultadoFormato)}
                </span>
              </div>

              {breakdown.nota && <div className="calc-pop-nota">{breakdown.nota}</div>}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  )
}
