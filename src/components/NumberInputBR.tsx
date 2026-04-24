'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface NumberInputBRProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | ''
  onChange: (value: number) => void
  placeholder?: string
}

function parseBR(s: string): number | null {
  if (!s) return null
  const cleaned = s.trim()
    .replace(/\./g, '')   // remove TODOS os pontos de milhar
    .replace(',', '.')    // converte vírgula decimal em ponto
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function NumberInputBR({ value, onChange, className = '', placeholder = '', ...rest }: NumberInputBRProps) {
  const [display, setDisplay] = useState(() => {
    if (value === '' || value === 0) return ''
    return formatBRDisplay(value)
  })
  const isFocused = useRef(false)

  useEffect(() => {
    if (!isFocused.current) {
      setDisplay(value === '' || value === 0 ? '' : formatBRDisplay(value as number))
    }
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplay(raw)

    if (!raw) {
      onChange(0)
      return
    }

    const num = parseBR(raw)
    if (num !== null) {
      onChange(num)
    }
  }, [onChange])

  const handleBlur = useCallback(() => {
    isFocused.current = false

    if (display === '') {
      setDisplay('')
      onChange(0)
      return
    }

    const num = parseBR(display)
    if (num !== null) {
      onChange(num)
      setDisplay(formatBRDisplay(num))
    } else {
      setDisplay('')
      onChange(0)
    }
  }, [display, onChange])

  const handleFocus = useCallback(() => {
    isFocused.current = true
  }, [])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      {...rest}
    />
  )
}

function formatBRDisplay(num: number): string {
  if (num === 0) return ''
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
    useGrouping: true,
  })
}
