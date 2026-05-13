import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  OPERACOES,
  aplicarAliquotasGlobais,
  atualizarAliquota,
  atualizarReducaoBase,
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

describe('XLSX round-trip — overrides do usuário', () => {
  test('alíquotas customizadas via aplicarAliquotasGlobais sobrevivem ao round-trip', async () => {
    let original = estadoInicial()
    original = atualizarValor(original, 2030, 'rec_locacao', 1_000_000)
    // Sobrescrever CBS em todas as operações de 2030
    original = aplicarAliquotasGlobais(original, 2030, { aliqCbs: 10 })

    const importado = await roundTrip(original)

    // Todas as ops em 2030 devem ter aliqCbs = 10 (override aplicado a todas)
    for (const op of OPERACOES) {
      assert.equal(
        importado[2030][op.key].aliqCbs, 10,
        `${op.key} deveria ter aliqCbs customizada 10`
      )
    }
  })

  test('custo de aquisição preservado em venda_ativo_pos2026', async () => {
    let original = estadoInicial()
    original = atualizarValor(original, 2030, 'venda_ativo_pos2026', 200_000)
    original = atualizarReducaoBase(original, 2030, 'venda_ativo_pos2026', 150_000)

    const importado = await roundTrip(original)
    const d = importado[2030].venda_ativo_pos2026

    assert.equal(d.valor, 200_000)
    assert.equal(d.reducaoBase, 150_000)
    // Ganho 50k × 8.5% CBS = 4.250
    assert.ok(
      Math.abs(d.valCbs - 50_000 * 0.085) < APROX,
      `valCbs = ${d.valCbs}, esperado 4250`
    )
  })

  test('alíquota override igual ao default colapsa para default (não polui state)', async () => {
    let original = estadoInicial()
    original = atualizarValor(original, 2030, 'rec_locacao', 1_000_000)
    // Default 2030 rec_locacao aliqCbs = 8.50. Aplicar mesmo valor "explicitamente".
    original = atualizarAliquota(original, 2030, 'rec_locacao', 'aliqCbs', 8.50)

    const importado = await roundTrip(original)
    // Após import, aliqCbs deve continuar 8.50 (mesmo que default — sem mudança visível)
    assert.equal(importado[2030].rec_locacao.aliqCbs, 8.50)
  })

  test('override de alíquota individual via atualizarAliquota é preservado', async () => {
    let original = estadoInicial()
    original = atualizarValor(original, 2030, 'rec_locacao', 1_000_000)
    // Default 2030 aliqCbs = 8.50. Sobrescrever para 12.34
    original = atualizarAliquota(original, 2030, 'rec_locacao', 'aliqCbs', 12.34)

    const importado = await roundTrip(original)

    // Override de operação específica deve sobreviver
    assert.equal(importado[2030].rec_locacao.aliqCbs, 12.34)
    // Outras operações 2030 mantêm default (não foram tocadas)
    assert.equal(importado[2030].cred_serv.aliqCbs, 8.50)
  })
})
