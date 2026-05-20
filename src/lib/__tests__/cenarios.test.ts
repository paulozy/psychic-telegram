import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { apurarAno, atualizarBucketAquisicao, atualizarReducaoBase, atualizarValor, estadoInicial } from '../simulador.ts'
import { CENARIOS } from './cenarios.ts'

const TOLERANCIA_PP = 2

describe('Cenários canônicos — invariantes universais', () => {
  for (const cenario of CENARIOS) {
    test(`${cenario.nome}: ${cenario.descricao}`, () => {
      let estado = estadoInicial()
      estado = cenario.setup(estado)
      const a = apurarAno(estado, cenario.ano)

      // 1. Sem NaN / Infinity em nenhum campo numérico
      const camposNumericos: ReadonlyArray<keyof typeof a> = [
        'totalAPagar', 'saldoCredor',
        'receitaPadrao', 'receitaTributavel', 'receitaTotal',
        'cargaPadrao', 'cargaConsolidada', 'cargaSobreReceitaTotal', 'cargaBruta',
      ]
      for (const campo of camposNumericos) {
        const v = a[campo] as number
        assert.ok(Number.isFinite(v),
          `${cenario.nome}: campo ${campo} não é número finito (${v})`)
      }

      // 2. Cargas em ordem natural: padrao ≥ consolidada ≥ sobreReceitaTotal (com tolerância FP)
      assert.ok(a.cargaConsolidada >= a.cargaSobreReceitaTotal - 1e-9,
        `${cenario.nome}: cargaConsolidada (${a.cargaConsolidada.toFixed(2)}) deve ser ≥ cargaSobreReceitaTotal (${a.cargaSobreReceitaTotal.toFixed(2)})`)

      // 3. Receita total bate com cenário
      assert.equal(a.receitaTotal, cenario.esperado.receitaTotal,
        `${cenario.nome}: receitaTotal ${a.receitaTotal} ≠ esperado ${cenario.esperado.receitaTotal}`)

      // 4. Faixa esperada de cargaConsolidada (com tolerância)
      const min = cenario.esperado.cargaConsolidadaMin - TOLERANCIA_PP
      const max = cenario.esperado.cargaConsolidadaMax + TOLERANCIA_PP
      assert.ok(
        a.cargaConsolidada >= min,
        `${cenario.nome}: cargaConsolidada ${a.cargaConsolidada.toFixed(2)}% abaixo do mínimo ${min}%`
      )
      assert.ok(
        a.cargaConsolidada <= max,
        `${cenario.nome}: cargaConsolidada ${a.cargaConsolidada.toFixed(2)}% acima do máximo ${max}%`
      )

      // 5. Em 2027+, PIS/COFINS extintos
      if (cenario.ano >= 2027) {
        assert.equal(a.pis.saldo, 0, `${cenario.nome}: PIS deve ser 0 em ${cenario.ano}`)
        assert.equal(a.cofins.saldo, 0, `${cenario.nome}: COFINS deve ser 0 em ${cenario.ano}`)
      }

      // 6. totalAPagar nunca negativo
      assert.ok(a.totalAPagar >= 0,
        `${cenario.nome}: totalAPagar ${a.totalAPagar} não pode ser negativo`)
    })
  }
})

describe('Cenários canônicos — checagens específicas', () => {
  test('Cenário 4 (heavy-disposal) 2027: CBS zero (custo > venda); IBS regular (ainda sem proteção)', () => {
    // Setup: bucket '2024-2026' + custo 13M > venda 10,26M.
    // CBS protegida desde 2027 → base = max(0, 10,26M - 13M) = 0. CBS = 0.
    // IBS NÃO protegida em 2027 (proteção só desde 2029) → base = valor cheio.
    const cenario = CENARIOS.find(c => c.nome === '4-heavy-2027')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)

    const d = estado[2027].venda_ativo
    assert.equal(d.valCbs, 0, 'CBS = 0 quando custo > venda (art. 406)')
    // IBS sem proteção em 2027 → tributo cheio sobre venda: 10,26M × (0,05+0,05)% = 10.260
    assert.ok(d.valIbsE > 0, 'IBS-E > 0 em 2027 (sem proteção; cobra venda integral)')
  })

  test('Cenário 4 (heavy-disposal) 2029: venda_ativo isenta via custo > venda', () => {
    const cenario = CENARIOS.find(c => c.nome === '4-heavy-2029')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)

    const d = estado[2029].venda_ativo
    assert.equal(d.valCbs, 0, 'CBS = 0 (custo > venda, bucket 2024-2026)')
    // Em 2029, bucket 2024-2026 ganha proteção IBS (fator 1,0). Custo > venda → IBS zero.
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
  })

  test('Cenário 5 (edge) 2026: receita_financeira fora_base não entra em receitaPadrao', () => {
    const cenario = CENARIOS.find(c => c.nome === '5-edge-2026')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)
    const a = apurarAno(estado, 2026)

    assert.equal(a.receitaPadrao, 38_000_000, 'receitaPadrao = só rec_locacao')
    assert.equal(a.receitaForaBase, 2_000_000, 'receitaForaBase = receita_financeira')
    assert.equal(a.receitaTributavel, 38_000_000, 'tributavel exclui fora_base')
    assert.equal(a.receitaTotal, 40_000_000, 'total inclui tudo')
  })

  test('Cenário 5 (edge) 2033: carga próxima do nominal (~27%)', () => {
    const cenario = CENARIOS.find(c => c.nome === '5-edge-2033')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)
    const a = apurarAno(estado, 2033)

    // CBS 8.5% + IBS-E 16% + IBS-M 2.5% = 27% nominal sobre rec_locacao (única tributada)
    // receitaTributavel = 38M, débito ≈ 38M × 27% = 10.26M, créditos = 0 → carga = 27%
    assert.ok(a.cargaConsolidada > 24 && a.cargaConsolidada < 30,
      `Cenário 5 2033: carga ${a.cargaConsolidada.toFixed(2)}% deve estar próxima de 27%`)
  })

  test('art. 406 — bucket 2024-2026 em 2030: CBS sobre ganho, IBS também sobre ganho (fator 1,0)', () => {
    // 4ª rodada: bucket 2024-2026 tem proteção CBS desde 2027 E proteção IBS desde 2029 com fator 1,0.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 60_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 50_000)
    // bucketAquisicao default = '2024-2026'

    const d = estado[2030].venda_ativo
    // ganho = 10.000
    // CBS 8,5% × 10k = 850 (proteção CBS aplicada)
    assert.ok(Math.abs(d.valCbs - 850) < 1, `valCbs = ${d.valCbs}, esperado 850`)
    // IBS protegida fator 1,0 → base = max(0, 60k - 50k×1,0) = 10k. IBS-E 3,2% = 320; IBS-M 0,5% = 50.
    assert.ok(Math.abs(d.valIbsE - 320) < 1, `valIbsE = ${d.valIbsE}, esperado 320`)
    assert.ok(Math.abs(d.valIbsM - 50) < 1, `valIbsM = ${d.valIbsM}, esperado 50`)
  })

  test('art. 406 — bucket 2024-2026 em 2032: CBS + IBS sobre ganho (fator 1,0)', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2032, 'venda_ativo', 100_000)
    estado = atualizarReducaoBase(estado, 2032, 'venda_ativo', 60_000)

    const d = estado[2032].venda_ativo
    // ganho = 40.000; CBS 8,5% × 40k = 3.400; IBS-E 6,40% × 40k = 2.560; IBS-M 1,00% × 40k = 400.
    assert.ok(Math.abs(d.valCbs - 3_400) < 1, `valCbs = ${d.valCbs}`)
    assert.ok(Math.abs(d.valIbsE - 2_560) < 1, `valIbsE = ${d.valIbsE}`)
    assert.ok(Math.abs(d.valIbsM - 400) < 1, `valIbsM = ${d.valIbsM}`)
  })

  test('Q6 2027+: cred_deprec não gera crédito (alíquotas zeradas)', () => {
    // Pós 2ª rodada Arval: a partir de 2027, crédito vem integralmente de compra_ativo.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2027, 'cred_deprec', 1_000_000)

    const d = estado[2027].cred_deprec
    assert.equal(d.valCbs, 0, 'CBS zero em cred_deprec 2027+')
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
  })

  test('art. 406 — bucket 2024-2026: isenção via custo ≥ venda (ganho zero)', () => {
    // Para frota pré-2026 vendida com custo informado >= venda, ganho = 0 → tributo = 0.
    for (const ano of [2027, 2029, 2030, 2032, 2033]) {
      let estado = estadoInicial()
      estado = atualizarValor(estado, ano, 'venda_ativo', 1_000_000)
      estado = atualizarReducaoBase(estado, ano, 'venda_ativo', 1_500_000)  // custo > venda
      const d = estado[ano].venda_ativo
      assert.equal(d.valCbs, 0, `CBS = 0 em ${ano} (custo > venda)`)
      // IBS protegido só em 2029+
      if (ano >= 2029) {
        assert.equal(d.valIbsE, 0, `IBS-E = 0 em ${ano} (protegido)`)
        assert.equal(d.valIbsM, 0, `IBS-M = 0 em ${ano} (protegido)`)
      }
    }
  })

  test('art. 406 — bucket 2030 em 2031: CBS regular sobre tudo, IBS protegido fator 0,8', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2031, 'venda_ativo', 100_000)
    estado = atualizarReducaoBase(estado, 2031, 'venda_ativo', 80_000)  // VLA
    estado = atualizarBucketAquisicao(estado, 2031, '2030')

    const d = estado[2031].venda_ativo
    // CBS: bucket 2030 NÃO tem proteção CBS (fora janela jul/24-dez/26) → base = valor cheio.
    // CBS = 100k × 8,5% = 8.500
    assert.ok(Math.abs(d.valCbs - 8_500) < 1, `valCbs = ${d.valCbs}, esperado 8500`)
    // IBS: bucket 2030 + 2031 → proteção com fator 0,8. base = max(0, 100k - 80k×0,8) = max(0, 100k - 64k) = 36k.
    // IBS-E 4,80% × 36k = 1.728; IBS-M 0,75% × 36k = 270.
    assert.ok(Math.abs(d.valIbsE - 1_728) < 1, `valIbsE = ${d.valIbsE}`)
    assert.ok(Math.abs(d.valIbsM - 270) < 1, `valIbsM = ${d.valIbsM}`)
  })

  test('Q2 2026: receita_financeira tributa 0,65 PIS + 4,00 COFINS', () => {
    // Pós 2ª rodada Arval: alíquota reduzida Decreto 8.426/2015.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2026, 'receita_financeira', 1_000_000)

    const d = estado[2026].receita_financeira
    assert.ok(Math.abs(d.valPis - 6_500) < 1, `valPis = ${d.valPis}, esperado 6500`)
    assert.ok(Math.abs(d.valCof - 40_000) < 1, `valCof = ${d.valCof}, esperado 40000`)
  })
})

describe('Cenários canônicos — determinismo', () => {
  test('apurarAno é determinística — mesma entrada produz output byte-equal', () => {
    const cenario = CENARIOS.find(c => c.nome === '2-mid-2030')!
    let e1 = estadoInicial(); e1 = cenario.setup(e1)
    let e2 = estadoInicial(); e2 = cenario.setup(e2)
    const a1 = apurarAno(e1, cenario.ano)
    const a2 = apurarAno(e2, cenario.ano)
    assert.equal(JSON.stringify(a1), JSON.stringify(a2),
      'apurarAno deveria retornar output idêntico para a mesma entrada')
  })

  test('Múltiplas chamadas de apurarAno sobre mesmo estado não modificam o estado', () => {
    const cenario = CENARIOS.find(c => c.nome === '3-large-2030')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)
    const snapshot = JSON.stringify(estado)

    apurarAno(estado, 2030)
    apurarAno(estado, 2030)
    apurarAno(estado, 2030)

    assert.equal(JSON.stringify(estado), snapshot,
      'apurarAno não deve mutar o estado de entrada')
  })
})
