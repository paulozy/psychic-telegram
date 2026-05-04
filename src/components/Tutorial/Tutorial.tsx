'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { STEPS } from './steps'
import type { UseTutorial } from './useTutorial'

interface TutorialProps {
  ctrl: UseTutorial
  /** Esconde o tour temporariamente (ex.: modal de import aberto). */
  pausado?: boolean
  onInserirExemplo: () => void
  onLimparExemplo: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

type Side = 'top' | 'bottom' | 'left' | 'right' | 'center'

const PADDING = 8
const TOOLTIP_W = 360
const TOOLTIP_H_EST = 220

function readRect(target: string | null): Rect | null {
  if (typeof document === 'undefined' || !target) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function computeSide(rect: Rect | null): Side {
  if (!rect) return 'center'
  const vw = window.innerWidth
  const vh = window.innerHeight
  const bottom = rect.top + rect.height
  if (bottom + TOOLTIP_H_EST + 24 < vh) return 'bottom'
  if (rect.top > TOOLTIP_H_EST + 24) return 'top'
  return rect.left > vw / 2 ? 'left' : 'right'
}

function computeTooltipPos(rect: Rect | null, side: Side): { top: number; left: number } {
  if (!rect || side === 'center') {
    return {
      top: Math.max(20, (window.innerHeight - TOOLTIP_H_EST) / 2),
      left: Math.max(20, (window.innerWidth - TOOLTIP_W) / 2),
    }
  }
  const margin = 12
  const bottom = rect.top + rect.height
  const right = rect.left + rect.width
  const clampX = (x: number) => Math.max(16, Math.min(window.innerWidth - TOOLTIP_W - 16, x))
  const clampY = (y: number) => Math.max(16, Math.min(window.innerHeight - TOOLTIP_H_EST - 16, y))
  let top = 0
  let left = 0
  switch (side) {
    case 'bottom':
      top = bottom + margin
      left = clampX(rect.left + rect.width / 2 - TOOLTIP_W / 2)
      break
    case 'top':
      top = Math.max(16, rect.top - TOOLTIP_H_EST - margin)
      left = clampX(rect.left + rect.width / 2 - TOOLTIP_W / 2)
      break
    case 'right':
      top = clampY(rect.top + rect.height / 2 - TOOLTIP_H_EST / 2)
      left = Math.min(window.innerWidth - TOOLTIP_W - 16, right + margin)
      break
    case 'left':
      top = clampY(rect.top + rect.height / 2 - TOOLTIP_H_EST / 2)
      left = Math.max(16, rect.left - TOOLTIP_W - margin)
      break
  }
  return { top, left }
}

export function Tutorial({ ctrl, pausado, onInserirExemplo, onLimparExemplo }: TutorialProps) {
  const { state, fechar, proximo, anterior } = ctrl
  const [rect, setRect] = useState<Rect | null>(null)
  const [showFinal, setShowFinal] = useState(false)
  const step = STEPS[state.passo]

  // Recalcula posição quando passo muda ou janela muda
  useLayoutEffect(() => {
    if (!state.ativo || !step) return
    const update = () => setRect(readRect(step.target))
    update()
    // re-tenta após paint no caso de elemento aparecer só após render
    const t = window.setTimeout(update, 50)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [state.ativo, state.passo, step])

  // Keyboard nav
  useEffect(() => {
    if (!state.ativo || pausado || showFinal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        fechar()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (state.passo === STEPS.length - 1) {
          setShowFinal(true)
        } else {
          proximo()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        anterior()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.ativo, state.passo, pausado, showFinal, fechar, proximo, anterior])

  const handleProximo = useCallback(() => {
    if (state.passo === STEPS.length - 1) {
      setShowFinal(true)
    } else {
      proximo()
    }
  }, [state.passo, proximo])

  const handleAcao = useCallback(() => {
    if (!step?.acao) return
    if (step.acao.handler === 'inserirExemplo') {
      onInserirExemplo()
      proximo()
    }
  }, [step, onInserirExemplo, proximo])

  const handleManterFinal = useCallback(() => {
    setShowFinal(false)
    fechar()
  }, [fechar])

  const handleLimparFinal = useCallback(() => {
    onLimparExemplo()
    setShowFinal(false)
    fechar()
  }, [onLimparExemplo, fechar])

  if (!state.ativo) return null
  if (pausado) return null

  const side = computeSide(rect)
  const tooltipPos = computeTooltipPos(rect, side)

  // Modal de fim
  if (showFinal) {
    return (
      <div className="tutorial-final-backdrop">
        <div className="tutorial-final-box">
          <h3 className="modal-title">Tour concluído</h3>
          <p className="modal-text">
            Inserimos um exemplo de R$ 1.000.000 em Rec. Locação 2026 durante o tour.
            Quer manter os dados para explorar ou limpar para começar do zero?
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={handleLimparFinal}>Limpar exemplo</button>
            <button className="btn btn-primary" onClick={handleManterFinal}>Manter dados</button>
          </div>
        </div>
      </div>
    )
  }

  const isLast = state.passo === STEPS.length - 1

  return (
    <div className="tutorial-root" role="dialog" aria-label="Tutorial guiado">
      {/* Overlay com cutout via box-shadow no highlight */}
      {rect ? (
        <div
          className="tutorial-highlight"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className="tutorial-overlay-full" onClick={fechar} />
      )}

      <div
        className="tutorial-tooltip"
        data-side={side}
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_W }}
      >
        <div className="tutorial-progress">{state.passo + 1} / {STEPS.length}</div>
        <h3 className="tutorial-title">{step.titulo}</h3>
        <p className="tutorial-desc">{step.descricao}</p>
        {step.acao && (
          <button className="btn btn-primary tutorial-acao" onClick={handleAcao}>
            {step.acao.label}
          </button>
        )}
        <div className="tutorial-actions">
          <button className="btn btn-ghost btn-small" onClick={fechar}>Pular</button>
          <button
            className="btn btn-ghost btn-small"
            onClick={anterior}
            disabled={state.passo === 0}
          >
            Anterior
          </button>
          <button className="btn btn-primary btn-small" onClick={handleProximo}>
            {isLast ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
