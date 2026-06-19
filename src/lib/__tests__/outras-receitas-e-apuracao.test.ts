import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import type ExcelJS from 'exceljs'
import {
  ANOS,
  apurarAno,
  atualizarAliquota,
  atualizarValor,
  estadoInicial,
} from '../simulador.ts'
import { buildWorkbook } from '../exportXlsx.ts'
import { importarXlsx } from '../excel/import.ts'
import type { Estado } from '../../types/simulador.ts'

const APROX = 1e-6

async function roundTrip(estadoOriginal: Estado): Promise<Estado> {
  const wb = buildWorkbook(estadoOriginal)
  const buffer = await wb.xlsx.writeBuffer()
  const file = new File([buffer], 'roundtrip.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const result = await importarXlsx(file, estadoInicial())
  if (!result.ok) throw new Error(`Import falhou: ${JSON.stringify(result.errors)}`)
  return result.estado
}

/** Acha a linha de dados de um `ano` dentro de uma seção da aba "Apuração Geral". */
function linhaSecao(ws: ExcelJS.Worksheet, secao: string, ano: number): ExcelJS.Row | null {
  let secRow = -1
  ws.eachRow((r, n) => {
    if (r.getCell(1).value === secao) secRow = n
  })
  if (secRow < 0) return null
  for (let i = 0; i < ANOS.length; i++) {
    const r = ws.getRow(secRow + 2 + i)
    if (r.getCell(1).value === ano) return r
  }
  return null
}

// ─── Tarefa 2: PIS/COFINS débito − crédito ──────────────────────────────────

describe('Apuração PIS/COFINS — débito − crédito (não-cumulativo)', () => {
  test('saldo de PIS/COFINS = débito − crédito, não a soma bruta', () => {
    let e = estadoInicial()
    e = atualizarValor(e, 2026, 'rec_locacao', 1_000_000) // débito
    e = atualizarValor(e, 2026, 'cred_serv', 400_000)     // crédito
    e = atualizarValor(e, 2026, 'compra_ativo', 200_000)  // crédito

    const a = apurarAno(e, 2026)

    // PIS: débito 16.500 (1M × 1,65%); crédito 9.900 (600k × 1,65%) → saldo 6.600
    assert.ok(Math.abs(a.pis.debito - 16_500) < APROX, `pis.debito=${a.pis.debito}`)
    assert.ok(Math.abs(a.pis.credito - 9_900) < APROX, `pis.credito=${a.pis.credito}`)
    assert.ok(Math.abs(a.pis.saldo - 6_600) < APROX, `pis.saldo=${a.pis.saldo}`)
    // saldo (6.600) é menor que a soma bruta débito+crédito (26.400)
    assert.ok(a.pis.saldo < a.pis.debito + a.pis.credito)

    // COFINS: débito 76.000; crédito 45.600 → saldo 30.400
    assert.ok(Math.abs(a.cofins.saldo - 30_400) < APROX, `cofins.saldo=${a.cofins.saldo}`)
    assert.ok(Math.abs(a.cofins.saldo - (a.cofins.debito - a.cofins.credito)) < APROX)
  })

  test('saldo credor de um tributo NÃO abate débito de outro (max por tributo)', () => {
    let e = estadoInicial()
    e = atualizarValor(e, 2026, 'rec_locacao', 100_000) // gera débito de PIS/COFINS/CBS
    // Crédito artificial só de PIS (zera CBS/COFINS/IBS do crédito) → PIS vira credor
    e = atualizarAliquota(e, 2026, 'cred_serv', 'aliqCof', 0)
    e = atualizarAliquota(e, 2026, 'cred_serv', 'aliqCbs', 0)
    e = atualizarAliquota(e, 2026, 'cred_serv', 'aliqIbsE', 0)
    e = atualizarAliquota(e, 2026, 'cred_serv', 'aliqPis', 50)
    e = atualizarValor(e, 2026, 'cred_serv', 100_000) // PIS crédito enorme

    const a = apurarAno(e, 2026)

    assert.ok(a.pis.saldo < 0, `PIS deve ser credor, saldo=${a.pis.saldo}`)
    assert.ok(a.cbs.saldo > 0, `CBS deve ser devedor, saldo=${a.cbs.saldo}`)

    // Total a pagar = Σ max(0, saldo) — o crédito de PIS não reduz a CBS devedora.
    const esperadoAPagar =
      Math.max(0, a.pis.saldo) + Math.max(0, a.cofins.saldo) +
      Math.max(0, a.cbs.saldo) + Math.max(0, a.ibs.saldo)
    assert.ok(Math.abs(a.totalAPagar - esperadoAPagar) < APROX, `totalAPagar=${a.totalAPagar}`)
    // A CBS devedora entra integralmente (não foi abatida pelo crédito de PIS)
    assert.ok(a.totalAPagar >= a.cbs.saldo - APROX)
    // E o crédito de PIS aparece como saldo credor
    assert.ok(a.saldoCredor >= Math.abs(a.pis.saldo) - APROX)
  })
})

describe('Aba "Apuração Geral" (XLSX) deriva de apurarAno', () => {
  test('seção RESULTADO bate com apurarAno em todos os anos', async () => {
    let e = estadoInicial()
    e = atualizarValor(e, 2026, 'rec_locacao', 5_000_000)
    e = atualizarValor(e, 2026, 'cred_serv', 1_000_000)
    e = atualizarValor(e, 2030, 'rec_locacao', 8_000_000)
    e = atualizarValor(e, 2030, 'compra_ativo', 3_000_000)
    e = atualizarValor(e, 2033, 'outras_receitas', 2_000_000)

    const ws = buildWorkbook(e).getWorksheet('Apuração Geral')!

    for (const ano of ANOS) {
      const a = apurarAno(e, ano)
      const row = linhaSecao(ws, 'RESULTADO', ano)
      assert.ok(row, `linha RESULTADO ${ano} deve existir`)
      const num = (c: number) => Number(row!.getCell(c).value)
      assert.ok(Math.abs(num(2) - a.pis.saldo) < APROX, `${ano} PIS saldo`)
      assert.ok(Math.abs(num(3) - a.cofins.saldo) < APROX, `${ano} COFINS saldo`)
      assert.ok(Math.abs(num(4) - a.cbs.saldo) < APROX, `${ano} CBS saldo`)
      assert.ok(Math.abs(num(5) - a.ibs.saldo) < APROX, `${ano} IBS saldo`)
      assert.ok(Math.abs(num(6) - a.totalAPagar) < APROX, `${ano} total a pagar`)
      assert.ok(Math.abs(num(7) - a.saldoCredor) < APROX, `${ano} saldo credor`)
    }
  })

  test('RESULTADO tem colunas próprias de PIS e COFINS (não embutidas em CBS)', () => {
    const ws = buildWorkbook(estadoInicial()).getWorksheet('Apuração Geral')!
    let secRow = -1
    ws.eachRow((r, n) => { if (r.getCell(1).value === 'RESULTADO') secRow = n })
    const hdr = ws.getRow(secRow + 1)
    const headers = (hdr.values as unknown[]).map(v => String(v ?? ''))
    assert.ok(headers.some(h => h.includes('PIS')), 'deve haver coluna PIS')
    assert.ok(headers.some(h => h.includes('COFINS')), 'deve haver coluna COFINS')
  })
})

// ─── Tarefa 1: Outras Receitas (clone de rec_locacao) ───────────────────────

describe('Outras Receitas — clone tributário da Rec. Locação', () => {
  test('mesmo valor → mesmos tributos que rec_locacao em todos os anos', () => {
    for (const ano of ANOS) {
      let e = estadoInicial()
      e = atualizarValor(e, ano, 'rec_locacao', 1_000_000)
      e = atualizarValor(e, ano, 'outras_receitas', 1_000_000)
      const rl = e[ano].rec_locacao
      const or = e[ano].outras_receitas
      for (const f of ['valPis', 'valCof', 'valCbs', 'valIbsE', 'valIbsM'] as const) {
        assert.ok(Math.abs(rl[f] - or[f]) < APROX, `${ano} ${f}: rl=${rl[f]} or=${or[f]}`)
      }
    }
  })

  test('entra em receitaPadrao (categoria padrão)', () => {
    let e = estadoInicial()
    e = atualizarValor(e, 2030, 'outras_receitas', 2_000_000)
    const a = apurarAno(e, 2030)
    assert.ok(Math.abs(a.receitaPadrao - 2_000_000) < APROX, `receitaPadrao=${a.receitaPadrao}`)
  })

  test('workbook contém aba "Outras Receitas"', () => {
    const wb = buildWorkbook(estadoInicial())
    assert.ok(wb.getWorksheet('Outras Receitas'), 'aba "Outras Receitas" deve existir')
  })

  test('round-trip preserva valor e override de alíquota de outras_receitas', async () => {
    let e = estadoInicial()
    e = atualizarValor(e, 2030, 'outras_receitas', 1_500_000)
    e = atualizarAliquota(e, 2030, 'outras_receitas', 'aliqCbs', 9.99)

    const importado = await roundTrip(e)
    const d = importado[2030].outras_receitas
    assert.equal(d.valor, 1_500_000)
    assert.equal(d.aliqCbs, 9.99)
  })
})
