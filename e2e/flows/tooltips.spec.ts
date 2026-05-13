import { test, expect } from '../fixtures'

test.describe('Tooltips — atributos title presentes nos pontos-chave', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('rec-name das receitas tem title explicativo', async ({ page }) => {
    // Tab "Operações" (default): Rec. Locação + Receita Financeira
    for (const label of ['Rec. Locação', 'Receita Financeira']) {
      const card = page.locator('.rec-card').filter({ hasText: label })
      const span = card.locator('.rec-name').first()
      const title = await span.getAttribute('title')
      expect(title, `"${label}" sem tooltip`).toBeTruthy()
      expect(title!.length).toBeGreaterThan(20)
    }

    // Tab "Venda Ativo": pré-2026 + pós-2026
    await page.locator('.rec-tabs button').filter({ hasText: 'Venda Ativo' }).click()
    for (const label of ['Venda Ativo (pré-2026)', 'Venda Ativo (pós-2026)']) {
      const card = page.locator('.rec-card').filter({ hasText: label })
      const span = card.locator('.rec-name').first()
      const title = await span.getAttribute('title')
      expect(title, `"${label}" sem tooltip`).toBeTruthy()
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
    // Rec. Locação (tab Operações default): label "Redução"
    const cardLoc = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    const labelRed = cardLoc.locator('.rec-reducao-label')
    await expect(labelRed).toHaveText('Redução')
    expect(await labelRed.getAttribute('title')).toContain('CBS/IBS')

    // Tab Venda Ativo: ambos cards usam "Custo de aquisição"
    await page.locator('.rec-tabs button').filter({ hasText: 'Venda Ativo' }).click()
    const cardPre = page.locator('.rec-card').filter({ hasText: 'Venda Ativo (pré-2026)' })
    const labelCustoPre = cardPre.locator('.rec-reducao-label')
    await expect(labelCustoPre).toHaveText('Custo de aquisição')
    expect(await labelCustoPre.getAttribute('title')).toContain('ganho')
  })
})
