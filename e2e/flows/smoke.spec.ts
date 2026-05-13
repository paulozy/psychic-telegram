import { test, expect } from '../fixtures'

test.describe('Smoke — carregamento da página', () => {
  test('aplicação carrega e exibe a barra de anos', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.shell')).toBeVisible()
    await expect(page.locator('[data-tour="ano-tabs"]')).toBeVisible()

    const anoButtons = page.locator('[data-tour="ano-tabs"] .ano-tab')
    await expect(anoButtons).toHaveCount(8)
  })

  test('topbar com botões principais é renderizado', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Exportar/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Importar/i })).toBeVisible()
  })
})
