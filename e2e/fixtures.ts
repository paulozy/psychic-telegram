import { test as base, expect, type Page } from '@playwright/test'
import type { Cenario } from '../src/lib/__tests__/cenarios.ts'
import { estadoInicial } from '../src/lib/simulador.ts'

/**
 * Test extension com setup padrão:
 * - Tour marcado como completo (evita modal bloqueando testes).
 * - Helper seedScenario para popular o estado antes da navegação.
 *
 * IMPORTANT: addInitScript roda em TODA navegação (inclusive reload), então
 * o que setamos aqui é persistente. NÃO fazemos clear automático — cada teste
 * que quer estado vazio simplesmente não chama seedScenario.
 *
 * Entre testes, Playwright já isola via browser contexts.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('arval-simulador-tour-v1', JSON.stringify({ completed: true }))
    })
    await use(page)
  },
})

/**
 * Pré-popula o estado do simulador com o cenário canônico.
 * Chama page.goto('/') ao final. Use antes de qualquer interação.
 */
export async function seedScenario(page: Page, cenario: Cenario) {
  let estado = estadoInicial()
  estado = cenario.setup(estado)
  const json = JSON.stringify(estado)

  await page.addInitScript(payload => {
    window.localStorage.setItem('arval-simulador-v7', payload)
  }, json)

  await page.goto('/')
}

export { expect }
