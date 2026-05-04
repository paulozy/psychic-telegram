'use client'

import { useCallback, useEffect, useState } from 'react'
import { STEPS } from './steps'

const STORAGE_KEY = 'arval-simulador-tour-v1'
const MIN_WIDTH = 768

export interface TutorialState {
  ativo: boolean
  passo: number
}

export interface UseTutorial {
  state: TutorialState
  abrir: () => void
  fechar: () => void
  proximo: () => void
  anterior: () => void
  irParaPasso: (n: number) => void
  /** True se a tela é grande o suficiente para o tour rodar. */
  desktop: boolean
}

export function useTutorial(): UseTutorial {
  const [state, setState] = useState<TutorialState>({ ativo: false, passo: 0 })
  const [desktop, setDesktop] = useState(true)

  // Detecta tamanho de tela (só no client)
  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= MIN_WIDTH)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-abre na primeira visita
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!desktop) return
    const seen = window.localStorage.getItem(STORAGE_KEY)
    if (seen) return
    const t = window.setTimeout(() => {
      setState({ ativo: true, passo: 0 })
    }, 300)
    return () => window.clearTimeout(t)
  }, [desktop])

  const marcarComoVisto = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'seen')
    }
  }, [])

  const abrir = useCallback(() => {
    setState({ ativo: true, passo: 0 })
  }, [])

  const fechar = useCallback(() => {
    setState({ ativo: false, passo: 0 })
    marcarComoVisto()
  }, [marcarComoVisto])

  const proximo = useCallback(() => {
    setState(s => {
      if (s.passo >= STEPS.length - 1) {
        marcarComoVisto()
        return { ativo: false, passo: 0 }
      }
      return { ativo: true, passo: s.passo + 1 }
    })
  }, [marcarComoVisto])

  const anterior = useCallback(() => {
    setState(s => ({ ativo: true, passo: Math.max(0, s.passo - 1) }))
  }, [])

  const irParaPasso = useCallback((n: number) => {
    setState({ ativo: true, passo: Math.max(0, Math.min(STEPS.length - 1, n)) })
  }, [])

  return { state, abrir, fechar, proximo, anterior, irParaPasso, desktop }
}
