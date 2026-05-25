import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { estadoInicial, atualizarValor } from '../simulador.ts'
import { buildWorkbook } from '../exportXlsx.ts'
import { importarXlsx, type ImportResult } from '../excel/import.ts'

/**
 * Helper: import buffer e retorna result. Não joga exceção em falha — apenas retorna ok:false.
 */
async function importBuffer(buf: ArrayBuffer | Buffer): Promise<ImportResult> {
  const file = new File([buf], 'broken.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  return importarXlsx(file, estadoInicial())
}

/**
 * Helper: monta um workbook válido completo (Leia-me + Apuração Geral + sheets de detalhe).
 * Pode ser modificado in-place antes de re-serializar para simular cenários de erro.
 */
async function buildBaseWorkbook() {
  let estado = estadoInicial()
  estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
  return buildWorkbook(estado)
}

describe('XLSX import — cenários de erro', () => {
  test('arquivo não-XLSX (lixo): retorna erro de leitura', async () => {
    const buf = Buffer.from('isso não é um xlsx, é texto puro')
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    const err = result.errors[0]
    assert.match(err.reason, /Falha ao ler o arquivo XLSX/i)
  })

  test('sem sheet Leia-me e sem Apuração Geral: retorna erro', async () => {
    // Construir workbook sem nenhuma sheet conhecida pelo importer
    const wb = await buildBaseWorkbook()
    // Remove TODAS as worksheets relevantes
    const sheetsParaRemover = wb.worksheets.map(ws => ws.id)
    for (const id of sheetsParaRemover) {
      const ws = wb.getWorksheet(id)
      if (ws) wb.removeWorksheet(ws.id)
    }
    // Adiciona apenas uma sheet vazia para o workbook ser válido
    wb.addWorksheet('Vazia')

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Leia-me|não encontrada/i.test(e.reason)),
      `Esperava erro de Leia-me ausente, mas veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('versão desconhecida no Leia-me: rejeita import', async () => {
    const wb = await buildBaseWorkbook()
    const leiaMe = wb.getWorksheet('Leia-me')!
    leiaMe.getCell('B2').value = 'arval-template-v99'

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Versão de template incompatível/i.test(e.reason)),
      `Esperava erro de versão, mas veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('sheet de detalhe faltando: erro reportado', async () => {
    const wb = await buildBaseWorkbook()
    const ativo = wb.getWorksheet('Ativo')
    assert.ok(ativo, 'Sheet Ativo deveria existir antes de remover')
    wb.removeWorksheet(ativo.id)

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => e.sheet === 'Ativo' && /não encontrada/i.test(e.reason)),
      `Esperava erro de sheet Ativo ausente, veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('operação não reconhecida no label: erro reportado', async () => {
    const wb = await buildBaseWorkbook()
    // Sheet 'Rec. Locação' tem só uma op; primeira linha de dados é row 3, coluna 2 (Operação)
    const sheet = wb.getWorksheet('Rec. Locação')!
    sheet.getCell('B3').value = 'Operação Inexistente'

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Operação não reconhecida/i.test(e.reason)),
      `Esperava erro de operação não reconhecida, veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('valor não-numérico na célula Valor: erro reportado', async () => {
    const wb = await buildBaseWorkbook()
    const sheet = wb.getWorksheet('Rec. Locação')!
    // Coluna 3 = Valor da Operação. Row 3 = primeira linha de dados (2026)
    sheet.getCell('C3').value = 'abc-não-numérico'

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Valor não numérico/i.test(e.reason)),
      `Esperava erro de valor não numérico, veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('alíquota fora da faixa 0–100: erro reportado', async () => {
    const wb = await buildBaseWorkbook()
    const sheet = wb.getWorksheet('Rec. Locação')!
    // Coluna 5 = Alíq. PIS. Setar valor inválido (150)
    sheet.getCell('E3').value = 150

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Alíquota fora da faixa/i.test(e.reason)),
      `Esperava erro de alíquota fora da faixa, veio: ${JSON.stringify(result.errors)}`
    )
  })

  test('alíquota negativa: erro reportado', async () => {
    const wb = await buildBaseWorkbook()
    const sheet = wb.getWorksheet('Rec. Locação')!
    sheet.getCell('E3').value = -5

    const buf = await wb.xlsx.writeBuffer()
    const result = await importBuffer(buf)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.ok(
      result.errors.some(e => /Alíquota fora da faixa/i.test(e.reason)),
      `Esperava erro para alíquota negativa, veio: ${JSON.stringify(result.errors)}`
    )
  })
})
