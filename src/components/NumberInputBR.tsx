'use client'

import { useState, useCallback } from 'react'

interface NumberInputBRProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number | ''
  onChange: (value: number) => void
  placeholder?: string
}

export function NumberInputBR({ value, onChange, className = '', placeholder = '', ...rest }: NumberInputBRProps) {
  const [display, setDisplay] = useState(() => {
    if (value === '' || value === 0) return ''
    return formatBRDisplay(value)
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplay(raw)

    if (!raw) {
      onChange(0)
      return
    }

    const normalized = raw.replace(',', '.')
    const num = parseFloat(normalized)
    if (!isNaN(num)) {
      onChange(num)
    }
  }, [onChange])

  const handleBlur = useCallback(() => {
    if (display === '') {
      setDisplay('')
      onChange(0)
      return
    }

    const normalized = display.replace(',', '.')
    const num = parseFloat(normalized)
    if (!isNaN(num)) {
      onChange(num)
      setDisplay(formatBRDisplay(num))
    } else {
      setDisplay('')
      onChange(0)
    }
  }, [display, onChange])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
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
