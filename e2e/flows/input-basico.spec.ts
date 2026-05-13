import { test, expect } from '../fixtures'

test.describe('Fluxo básico — preencher valor e ver cálculo', () => {
  test('preencher Rec. Locação em 2026 atualiza ResultadoBar e ResumoTabela', async ({ page }) => {
    await page.goto('/')

    // Localizar card de Rec. Locação no painel esquerdo
    const cardLocacao = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    await expect(cardLocacao).toBeVisible()

    const input = cardLocacao.locator('.rec-valor-row .rec-input').first()
    await input.click()
    await input.fill('1000000')
    await input.blur()

    // Carga efetiva deve aparecer (positiva, não "—")
    const cargaCell = page.locator('.rt-row').filter({ hasText: 'Carga efetiva' })
      .locator('.rt-td-num').first()
    await expect(cargaCell).toBeVisible()
    const texto = await cargaCell.textContent()
    expect(texto).not.toBe('—')
    expect(texto).toMatch(/\d+,\d{2}%/)
  })

  test('Base efetiva atualiza ao informar redução', async ({ page }) => {
    await page.goto('/')

    const cardLocacao = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    const inputValor = cardLocacao.locator('.rec-valor-row .rec-input').first()
    await inputValor.click()
    await inputValor.fill('1000000')
    await inputValor.blur()

    // Informar redução de 200.000
    const inputReducao = cardLocacao.locator('.rec-reducao-row .rec-input').first()
    await expect(inputReducao).toBeVisible()
    await inputReducao.click()
    await inputReducao.fill('200000')
    await inputReducao.blur()

    // Base efetiva deve exibir R$ 800.000,00
    const base = cardLocacao.locator('.rec-base-efetiva')
    await expect(base).toBeVisible()
    await expect(base).toContainText('800.000,00')
  })

  test('aviso aparece quando redução > valor', async ({ page }) => {
    await page.goto('/')

    const cardLocacao = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    await cardLocacao.locator('.rec-valor-row .rec-input').first().fill('100')
    await cardLocacao.locator('.rec-valor-row .rec-input').first().blur()
    await cardLocacao.locator('.rec-reducao-row .rec-input').first().fill('500')
    await cardLocacao.locator('.rec-reducao-row .rec-input').first().blur()

    await expect(cardLocacao.locator('.rec-base-erro')).toBeVisible()
    await expect(cardLocacao.locator('.rec-base-erro')).toContainText('excede')
  })

  test('navegar entre anos preserva os valores digitados', async ({ page }) => {
    await page.goto('/')

    // Preencher em 2026
    const card = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    await card.locator('.rec-valor-row .rec-input').first().fill('500000')
    await card.locator('.rec-valor-row .rec-input').first().blur()

    // Trocar para 2030
    await page.locator('[data-tour="ano-tabs"] .ano-tab').filter({ hasText: '2030' }).click()

    // Voltar para 2026
    await page.locator('[data-tour="ano-tabs"] .ano-tab').filter({ hasText: '2026' }).click()

    // Valor preservado
    const value = await card.locator('.rec-valor-row .rec-input').first().inputValue()
    expect(value).toContain('500')
  })
})
