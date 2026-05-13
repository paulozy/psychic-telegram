import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANOS,
  OPERACOES,
  apurarAno,
  estadoInicial,
} from '../simulador.ts'
import { buildWorkbook } from '../exportXlsx.ts'
import { importarXlsx } from '../excel/import.ts'
import { CENARIOS } from './cenarios.ts'
import type { Estado, DadosOperacao } from '../../types/simulador.ts'

const APROX = 1e-6

/**
 * Round-trip helper: estado → buildWorkbook → writeBuffer → File → importarXlsx → estado'.
 * Usa Node 24 File nativo (sem polyfill).
 */
async function roundTrip(estadoOriginal: Estado): Promise<Estado> {
  const wb = buildWorkbook(estadoOriginal)
  const buffer = await wb.xlsx.writeBuffer()
  const file = new File([buffer], 'roundtrip.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const result = await importarXlsx(file, estadoInicial())
  if (!result.ok) {
    throw new Error(`Import falhou: ${JSON.stringify(result.errors)}`)
  }
  return result.estado
}

function assertOpEqual(a: DadosOperacao, b: DadosOperacao, ctx: string) {
  assert.equal(b.valor, a.valor, `${ctx}.valor`)
  assert.equal(b.reducaoBase, a.reducaoBase, `${ctx}.reducaoBase`)
  assert.equal(b.aliqPis, a.aliqPis, `${ctx}.aliqPis`)
  assert.equal(b.aliqCof, a.aliqCof, `${ctx}.aliqCof`)
  assert.equal(b.aliqCbs, a.aliqCbs, `${ctx}.aliqCbs`)
  assert.equal(b.aliqIbsE, a.aliqIbsE, `${ctx}.aliqIbsE`)
  assert.equal(b.aliqIbsM, a.aliqIbsM, `${ctx}.aliqIbsM`)

  // Valores derivados — tolerância de FP por segurança
  assert.ok(Math.abs(b.valPis - a.valPis) < APROX, `${ctx}.valPis: ${b.valPis} vs ${a.valPis}`)
  assert.ok(Math.abs(b.valCof - a.valCof) < APROX, `${ctx}.valCof`)
  assert.ok(Math.abs(b.valCbs - a.valCbs) < APROX, `${ctx}.valCbs`)
  assert.ok(Math.abs(b.valIbsE - a.valIbsE) < APROX, `${ctx}.valIbsE`)
  assert.ok(Math.abs(b.valIbsM - a.valIbsM) < APROX, `${ctx}.valIbsM`)
}

describe('XLSX round-trip — cenários canônicos', () => {
  const cenariosTeste = [
    '1-small-2033',
    '2-mid-2030',
    '3-large-2033',
    '4-heavy-2027',
    '5-edge-2033',
  ]

  for (const nome of cenariosTeste) {
    test(`round-trip preserva estado: ${nome}`, async () => {
      const cenario = CENARIOS.find(c => c.nome === nome)
      assert.ok(cenario, `Cenário ${nome} não encontrado em CENARIOS`)

      let original = estadoInicial()
      original = cenario.setup(original)

      const importado = await roundTrip(original)

      for (const ano of ANOS) {
        for (const op of OPERACOES) {
          assertOpEqual(original[ano][op.key], importado[ano][op.key], `${nome}/${ano}/${op.key}`)
        }
      }

      for (const ano of ANOS) {
        const apOrig = apurarAno(original, ano)
        const apImp = apurarAno(importado, ano)
        assert.ok(
          Math.abs(apOrig.totalAPagar - apImp.totalAPagar) < APROX,
          `${nome}/${ano}: totalAPagar ${apImp.totalAPagar} vs ${apOrig.totalAPagar}`
        )
        assert.ok(
          Math.abs(apOrig.cargaConsolidada - apImp.cargaConsolidada) < APROX,
          `${nome}/${ano}: cargaConsolidada ${apImp.cargaConsolidada} vs ${apOrig.cargaConsolidada}`
        )
        assert.ok(
          Math.abs(apOrig.saldoCredor - apImp.saldoCredor) < APROX,
          `${nome}/${ano}: saldoCredor ${apImp.saldoCredor} vs ${apOrig.saldoCredor}`
        )
      }
    })
  }
})
