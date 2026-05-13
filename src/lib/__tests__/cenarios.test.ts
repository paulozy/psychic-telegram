import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { apurarAno, atualizarReducaoBase, atualizarValor, estadoInicial } from '../simulador.ts'
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
  test('Cenário 4 (heavy-disposal) 2027: venda_ativo gera ZERO tributo (isenção)', () => {
    const cenario = CENARIOS.find(c => c.nome === '4-heavy-2027')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)

    const d = estado[2027].venda_ativo_pre2026
    assert.equal(d.valCbs, 0, 'CBS de venda_ativo_pre2026 em 2027 deve ser 0 (isenção)')
    assert.equal(d.valIbsE, 0, 'IBS-E de venda_ativo em 2027 deve ser 0')
    assert.equal(d.valIbsM, 0, 'IBS-M de venda_ativo em 2027 deve ser 0')
  })

  test('Cenário 4 (heavy-disposal) 2029: venda_ativo gera ZERO tributo (isenção)', () => {
    const cenario = CENARIOS.find(c => c.nome === '4-heavy-2029')!
    let estado = estadoInicial()
    estado = cenario.setup(estado)

    const d = estado[2029].venda_ativo_pre2026
    assert.equal(d.valCbs, 0)
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

  test('Q3/Q4 2030: venda_ativo com ganho tributa só CBS sobre excedente', () => {
    // Pós 2ª rodada Arval: ganho = valor − custo, tributa CBS apenas em 2030-2031.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo_pos2026', 60_000)  // venda
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo_pos2026', 50_000)  // custo

    const d = estado[2030].venda_ativo_pos2026
    // ganho = 10.000 → CBS = 10k × 8,5% = 850
    assert.ok(Math.abs(d.valCbs - 850) < 1)
    assert.equal(d.valIbsE, 0, 'IBS-E isento em 2030 para venda_ativo')
    assert.equal(d.valIbsM, 0, 'IBS-M isento em 2030')
  })

  test('Q3/Q4 2032: venda_ativo com ganho tributa CBS + IBS sobre excedente', () => {
    // Pós 2ª rodada Arval: a partir de 2032, IBS também incide sobre o ganho.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2032, 'venda_ativo_pos2026', 100_000)
    estado = atualizarReducaoBase(estado, 2032, 'venda_ativo_pos2026', 60_000)  // custo

    const d = estado[2032].venda_ativo_pos2026
    // ganho = 40.000; CBS 8,5%, IBS-E 6,40%, IBS-M 1,00%
    assert.ok(Math.abs(d.valCbs - 40_000 * 0.085) < 1, `valCbs = ${d.valCbs}`)
    assert.ok(Math.abs(d.valIbsE - 40_000 * 0.064) < 1, `valIbsE = ${d.valIbsE}`)
    assert.ok(Math.abs(d.valIbsM - 40_000 * 0.010) < 1, `valIbsM = ${d.valIbsM}`)
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

  test('Q4 venda_ativo_pre2026: SEMPRE isenta, mesmo em 2030+ (3ª rodada)', () => {
    // Frota adquirida até 2026 nunca tributa CBS/IBS, independente do ano da venda.
    for (const ano of [2026, 2027, 2029, 2030, 2032, 2033]) {
      let estado = estadoInicial()
      estado = atualizarValor(estado, ano, 'venda_ativo_pre2026', 1_000_000)
      const d = estado[ano].venda_ativo_pre2026
      assert.equal(d.valCbs, 0, `CBS deve ser 0 em ${ano} para frota pré-2026`)
      assert.equal(d.valIbsE, 0, `IBS-E deve ser 0 em ${ano} para frota pré-2026`)
      assert.equal(d.valIbsM, 0, `IBS-M deve ser 0 em ${ano} para frota pré-2026`)
    }
  })

  test('Q4 venda_ativo_pos2026 em 2030: tributa CBS sobre ganho', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo_pos2026', 100_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo_pos2026', 60_000)  // custo

    const d = estado[2030].venda_ativo_pos2026
    // ganho = 40k → CBS 8,5% = 3.400; IBS isento em 2030-2031
    assert.ok(Math.abs(d.valCbs - 40_000 * 0.085) < 1)
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
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
