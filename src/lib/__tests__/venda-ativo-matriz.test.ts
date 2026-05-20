/**
 * Matriz art. 406 LC 214/2025 — testa todas as combinações (bucket × ano de venda)
 * para venda_ativo.
 *
 * Regras canônicas:
 *   - CBS: proteção (base = max(0, valor − VLA)) apenas se bucket = '2024-2026' E ano ≥ 2027.
 *   - IBS: proteção (base = max(0, valor − VLA × fator)) apenas se ano ≥ 2029 e bucket ∈ {2024-2026, 2027-2028, 2029, 2030, 2031, 2032}.
 *     Fator: 1.0 (bucket ≤ 2028), 0.9 (2029), 0.8 (2030), 0.7 (2031), 0.6 (2032).
 *   - Sem proteção: base = valor cheio (alíquota plena sobre venda integral).
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALIQUOTAS_POR_ANO,
  BUCKETS_AQUISICAO,
  atualizarBucketAquisicao,
  atualizarReducaoBase,
  atualizarValor,
  estadoInicial,
  regraVendaAtivo,
} from '../simulador.ts'
import type { BucketAquisicao } from '../../types/simulador.ts'

const APROX = 1e-6
const VALOR = 100_000
const VLA   = 60_000

function setupVenda(ano: number, bucket: BucketAquisicao) {
  let estado = estadoInicial()
  estado = atualizarValor(estado, ano, 'venda_ativo', VALOR)
  estado = atualizarReducaoBase(estado, ano, 'venda_ativo', VLA)
  estado = atualizarBucketAquisicao(estado, ano, bucket)
  return estado[ano].venda_ativo
}

describe('regraVendaAtivo — matriz canônica', () => {
  const anos = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

  for (const bucket of BUCKETS_AQUISICAO) {
    for (const ano of anos) {
      test(`bucket=${bucket} × ano=${ano}: regra coerente com a tabela do art. 406`, () => {
        const regra = regraVendaAtivo(bucket, ano)
        const cbsProtEsperada = bucket === '2024-2026' && ano >= 2027
        assert.equal(
          regra.aplicaProtecaoCBS, cbsProtEsperada,
          `CBS proteção esperada=${cbsProtEsperada} mas veio ${regra.aplicaProtecaoCBS}`
        )

        const bucketProtegeIBS = ['2024-2026', '2027-2028', '2029', '2030', '2031', '2032'].includes(bucket)
        const ibsProtEsperada = ano >= 2029 && bucketProtegeIBS
        assert.equal(
          regra.aplicaProtecaoIBS, ibsProtEsperada,
          `IBS proteção esperada=${ibsProtEsperada} mas veio ${regra.aplicaProtecaoIBS}`
        )

        if (ibsProtEsperada) {
          const fatorEsperado =
            bucket === '2029' ? 0.9
            : bucket === '2030' ? 0.8
            : bucket === '2031' ? 0.7
            : bucket === '2032' ? 0.6
            : 1.0
          assert.equal(regra.fatorVLA_IBS, fatorEsperado)
        }
      })
    }
  }
})

describe('calcularOp venda_ativo — bases calculadas conforme matriz', () => {
  test('bucket 2024-2026, ano 2027: CBS protegida (base=ganho), IBS sem proteção (base=valor)', () => {
    const d = setupVenda(2027, '2024-2026')
    assert.equal(d.baseCbs, VALOR - VLA, 'CBS base = ganho (40k)')
    assert.equal(d.baseIbs, VALOR, 'IBS base = valor cheio (sem proteção em 2027)')
  })

  test('bucket 2024-2026, ano 2030: CBS e IBS protegidos (fator 1,0)', () => {
    const d = setupVenda(2030, '2024-2026')
    assert.equal(d.baseCbs, VALOR - VLA)
    assert.equal(d.baseIbs, VALOR - VLA * 1.0)
    // Alíquotas 2030 venda_ativo: CBS 8,5; IBS 3,2 + 0,5
    const aliq = ALIQUOTAS_POR_ANO[2030].venda_ativo
    assert.ok(Math.abs(d.valCbs  - (VALOR - VLA) * aliq.aliqCbs  / 100) < APROX)
    assert.ok(Math.abs(d.valIbsE - (VALOR - VLA) * aliq.aliqIbsE / 100) < APROX)
    assert.ok(Math.abs(d.valIbsM - (VALOR - VLA) * aliq.aliqIbsM / 100) < APROX)
  })

  test('bucket 2030, ano 2031: CBS cheia (bucket fora janela), IBS fator 0,8', () => {
    const d = setupVenda(2031, '2030')
    assert.equal(d.baseCbs, VALOR, 'CBS sem proteção: bucket 2030 não está em 2024-2026')
    assert.equal(d.baseIbs, VALOR - VLA * 0.8, 'IBS base = valor − VLA×0,8 = 52k')
  })

  test('bucket pré-jul-2024, ano 2030: nenhuma proteção (CBS e IBS cheios)', () => {
    const d = setupVenda(2030, 'pre-jul-2024')
    assert.equal(d.baseCbs, VALOR)
    assert.equal(d.baseIbs, VALOR)
  })

  test('bucket 2033+, ano 2033: nenhuma proteção (fora da janela)', () => {
    const d = setupVenda(2033, '2033+')
    assert.equal(d.baseCbs, VALOR)
    assert.equal(d.baseIbs, VALOR)
  })

  test('bucket 2029, ano 2029: CBS cheia, IBS fator 0,9', () => {
    const d = setupVenda(2029, '2029')
    assert.equal(d.baseCbs, VALOR, 'CBS sem proteção: bucket 2029 ≠ 2024-2026')
    assert.equal(d.baseIbs, VALOR - VLA * 0.9, 'IBS base = 100k − 54k = 46k')
  })

  test('bucket 2032, ano 2033: CBS cheia, IBS fator 0,6', () => {
    const d = setupVenda(2033, '2032')
    assert.equal(d.baseCbs, VALOR)
    assert.equal(d.baseIbs, VALOR - VLA * 0.6, 'IBS base = 100k − 36k = 64k')
  })

  test('ganho zero (custo ≥ venda): CBS protegida vira zero; IBS protegida vira zero', () => {
    // bucket 2024-2026 + ano 2030 → CBS + IBS protegidas com fator 1
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 100_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 150_000) // VLA > valor
    estado = atualizarBucketAquisicao(estado, 2030, '2024-2026')
    const d = estado[2030].venda_ativo
    assert.equal(d.baseCbs, 0)
    assert.equal(d.baseIbs, 0)
    assert.equal(d.valCbs, 0)
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
  })

  test('ano 2026 (regime PIS/COFINS): bucket é irrelevante, IBS-E aplica sobre valor', () => {
    // Em 2026 não há proteção possível (ano < 2027 e < 2029).
    const d = setupVenda(2026, '2024-2026')
    assert.equal(d.baseCbs, VALOR, 'CBS sem proteção (ano < 2027)')
    assert.equal(d.baseIbs, VALOR, 'IBS sem proteção (ano < 2029)')
  })

  test('bucket 2031, ano 2032: IBS fator 0,7', () => {
    const d = setupVenda(2032, '2031')
    assert.equal(d.baseIbs, VALOR - VLA * 0.7, 'IBS base = 100k − 42k = 58k')
  })
})
