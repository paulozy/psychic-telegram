import { useSyncExternalStore, useCallback, useRef } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const cache = useRef<{ raw: string | null; parsed: T } | null>(null)

  const getSnapshot = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue

    const raw = localStorage.getItem(key)
    if (cache.current && cache.current.raw === raw) return cache.current.parsed

    try {
      const parsed = raw ? JSON.parse(raw) : initialValue
      cache.current = { raw, parsed }
      return parsed
    } catch {
      return initialValue
    }
  }, [key, initialValue])

  const getServerSnapshot = useCallback((): T => initialValue, [initialValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const prev = getSnapshot()
    const toStore = typeof newValue === 'function' ? (newValue as (p: T) => T)(prev) : newValue
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(toStore))
      }
    } catch {
      // localStorage pode estar indisponível (private browsing, quota exceeded, etc)
    }
    // Notifica outros subscribers (outras abas, outros hooks)
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }, [key, getSnapshot])

  return [value, setValue]
}
