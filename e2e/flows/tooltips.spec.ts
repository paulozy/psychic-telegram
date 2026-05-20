import { test, expect } from '../fixtures'

test.describe('Tooltips — atributos title presentes nos pontos-chave', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('rec-name das receitas tem title explicativo', async ({ page }) => {
    // Lista única (sem tabs): receitas + Venda Ativo unificado
    for (const label of ['Rec. Locação', 'Receita Financeira', 'Venda Ativo']) {
      const card = page.locator('.rec-card').filter({ hasText: label }).first()
      const span = card.locator('.rec-name').first()
      const title = await span.getAttribute('title')
      expect(title, `"${label}" sem tooltip`).toBeTruthy()
      expect(title!.length).toBeGreaterThan(20)
    }
  })

  test('badge DEB/CRÉ tem tooltip diferenciado', async ({ page }) => {
    const debBadge = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
      .locator('.rec-tag').first()
    const titleDeb = await debBadge.getAttribute('title')
    expect(titleDeb).toContain('débito')

    const credBadge = page.locator('.rec-card').filter({ hasText: 'Serv. Tomados' })
      .locator('.rec-tag').first()
    const titleCred = await credBadge.getAttribute('title')
    expect(titleCred).toContain('crédito')
  })

  test('Total débitos e Total créditos têm tooltips', async ({ page }) => {
    const totalDeb = page.locator('.ft-label').filter({ hasText: 'Total débitos' })
    expect(await totalDeb.getAttribute('title')).toBeTruthy()

    const totalCred = page.locator('.ft-label').filter({ hasText: 'Total créditos' })
    expect(await totalCred.getAttribute('title')).toBeTruthy()
  })

  test('linhas do ResumoTabela tem tooltips', async ({ page }) => {
    // ResumoTabela só renderiza com dados — popular Rec. Locação primeiro
    const cardLoc = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    await cardLoc.locator('.rec-valor-row .rec-input').first().fill('1000000')
    await cardLoc.locator('.rec-valor-row .rec-input').first().blur()

    const labels = ['Receita bruta', 'Carga efetiva', 'Resultado líquido']
    for (const label of labels) {
      const cell = page.locator('.rt-td-label').filter({ hasText: label })
      const title = await cell.getAttribute('title')
      expect(title, `"${label}" sem tooltip`).toBeTruthy()
    }
  })

  test('label de Custo/Redução tem tooltip dinâmico', async ({ page }) => {
    // Rec. Locação: label "Redução"
    const cardLoc = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    const labelRed = cardLoc.locator('.rec-reducao-label').first()
    await expect(labelRed).toHaveText('Redução')
    expect(await labelRed.getAttribute('title')).toContain('CBS/IBS')

    // Venda Ativo: label "Custo de aquisição"
    const cardVA = page.locator('.rec-card').filter({ hasText: 'Venda Ativo' }).first()
    const labelCusto = cardVA.locator('.rec-reducao-label').first()
    await expect(labelCusto).toHaveText('Custo de aquisição')
    expect(await labelCusto.getAttribute('title')).toContain('VLA')
  })

  test('Venda Ativo expõe dropdown de bucket de aquisição', async ({ page }) => {
    const cardVA = page.locator('.rec-card').filter({ hasText: 'Venda Ativo' }).first()
    const select = cardVA.locator('.rec-bucket-select')
    await expect(select).toBeVisible()
    // Default deve ser 2024-2026
    await expect(select).toHaveValue('2024-2026')
    // Deve ter 8 opções
    const options = select.locator('option')
    await expect(options).toHaveCount(8)
  })
})
