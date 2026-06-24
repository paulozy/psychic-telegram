import { test, expect, seedScenario } from '../fixtures'
import { CENARIOS } from '../../src/lib/__tests__/cenarios.ts'
import { buildWorkbook } from '../../src/lib/exportXlsx.ts'
import { estadoInicial } from '../../src/lib/simulador.ts'
import ExcelJS from 'exceljs'
import path from 'node:path'
import fs from 'node:fs'

test.describe('XLSX — round-trip Export → Import', () => {
  test('cenário 2 baseline 2030: exportar abre planilha válida com Apuração Geral', async ({ page }) => {
    const cenario = CENARIOS.find(c => c.nome === '2-mid-2030')!
    await seedScenario(page, cenario)

    // Dispara export e captura download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Exportar/i }).click(),
    ])

    const xlsxPath = path.join('test-results', 'cenario2-export.xlsx')
    await download.saveAs(xlsxPath)
    expect(fs.existsSync(xlsxPath)).toBe(true)

    // Validar conteúdo do XLSX
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(xlsxPath)

    const apuracao = wb.getWorksheet('Apuração Geral')
    expect(apuracao, 'sheet Apuração Geral deve existir').toBeDefined()

    // Conferir que pelo menos um valor de rec_locacao aparece em alguma célula
    let encontrouRecLocacao = false
    apuracao!.eachRow((row, _) => {
      row.eachCell((cell, _) => {
        const v = cell.value
        if (typeof v === 'number' && Math.abs(v - 35_200_000) < 1) {
          encontrouRecLocacao = true
        }
      })
    })
    expect(encontrouRecLocacao, 'valor de rec_locacao (35.2M) deve aparecer no XLSX').toBe(true)

    // Cleanup
    fs.unlinkSync(xlsxPath)
  })

  test('importar XLSX com versão desconhecida exibe erro no modal', async ({ page }) => {
    // Construir XLSX e corromper a versão na sheet Leia-me já existente
    const wb = buildWorkbook(estadoInicial())
    const leiaMe = wb.getWorksheet('Leia-me')!
    leiaMe.getCell('B2').value = 'arval-template-v99'
    const buffer = await wb.xlsx.writeBuffer()

    const xlsxPath = path.join('test-results', 'versao-invalida.xlsx')
    fs.writeFileSync(xlsxPath, Buffer.from(buffer as ArrayBuffer))

    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(xlsxPath)

    // Modal abre mostrando o erro
    await expect(page.locator('.modal-backdrop')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.modal-backdrop')).toContainText(/Versão de template incompatível|v99/i)

    // Fechar modal
    await page.getByRole('button', { name: /Cancelar|Fechar/i }).click()
    await expect(page.locator('.modal-backdrop')).toBeHidden({ timeout: 5_000 })

    fs.unlinkSync(xlsxPath)
  })

  test('alíquotas customizadas via PainelAliquotas sobrevivem ao round-trip', async ({ page }) => {
    await page.goto('/')

    // 1. Preencher Rec. Locação para ter algo a exportar
    const card = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })
    await card.locator('.rec-valor-row .rec-input').first().fill('1000000')
    await card.locator('.rec-valor-row .rec-input').first().blur()

    // 2. Abrir PainelAliquotas e customizar CBS = 5%
    await page.getByRole('button', { name: /Configurar alíquotas/i }).click()
    const cbsLabel = page.locator('[data-tour="painel-aliquotas"] .pa-label')
      .filter({ hasText: /^CBS/ })
    await cbsLabel.locator('..').locator('.pa-input').fill('5')
    await cbsLabel.locator('..').locator('.pa-input').blur()

    // 3. Aplicar
    await page.getByRole('button', { name: /Aplicar a todas/i }).click()

    // 4. Exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Exportar/i }).click(),
    ])
    const xlsxPath = path.join('test-results', 'aliquotas-custom.xlsx')
    await download.saveAs(xlsxPath)

    // 5. Limpar e re-importar
    await page.evaluate(() => window.localStorage.removeItem('arval-simulador-v7'))
    await page.reload()
    await page.locator('input[type="file"]').setInputFiles(xlsxPath)
    await expect(page.locator('.modal-backdrop')).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page.locator('.modal-backdrop')).toBeHidden({ timeout: 5_000 })

    // 6. Validar: o card de CBS no TributoCard tem aliq 5 para rec_locacao em 2026
    // O card CBS aparece em 2026 (regime PIS/COFINS + CBS teste)
    const cbsAliqInput = page.locator('.tributo-card').filter({ has: page.locator('.tc-name', { hasText: 'CBS' }) })
      .locator('.field-inp.aliq').first()
    const value = await cbsAliqInput.inputValue()
    expect(value).toContain('5')

    fs.unlinkSync(xlsxPath)
  })

  test('round-trip: exportar → limpar → importar → valores restaurados', async ({ page }) => {
    const cenario = CENARIOS.find(c => c.nome === '1-small-2026')!
    await seedScenario(page, cenario)

    // 1. Exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Exportar/i }).click(),
    ])
    const xlsxPath = path.join('test-results', 'cenario1-roundtrip.xlsx')
    await download.saveAs(xlsxPath)

    // 2. Limpar localStorage e recarregar (mais robusto que botão Limpar)
    await page.evaluate(() => window.localStorage.removeItem('arval-simulador-v7'))
    await page.reload()
    await expect(page.locator('[data-tour="ano-tabs"]')).toBeVisible()

    // 3. Importar o arquivo salvo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(xlsxPath)

    // 4. Confirmar no modal de preview
    await expect(page.locator('.modal-backdrop')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Confirmar/i }).click()

    // Aguarda o modal desaparecer (confirmando que o import foi aplicado)
    await expect(page.locator('.modal-backdrop')).toBeHidden({ timeout: 10_000 })

    // 5. Garantir que ano 2026 está ativo antes de checar valor
    await page.locator('[data-tour="ano-tabs"] .ano-tab').filter({ hasText: '2026' }).click()
    await page.waitForTimeout(200) // pequeno delay para re-render após click

    const card = page.locator('.rec-card').filter({ hasText: 'Rec. Locação' })

    // Aguarda valor aparecer (re-render após setEstado)
    await expect(async () => {
      const v = await card.locator('.rec-valor-row .rec-input').first().inputValue()
      expect(v).toContain('7.360.000')
    }).toPass({ timeout: 10_000 })

    // Cleanup
    fs.unlinkSync(xlsxPath)
  })
})
