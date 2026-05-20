import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  estadoInicial,
  atualizarValor,
  atualizarReducaoBase,
  apurarAno,
  calcularOp,
  dadosIniciais,
} from '../simulador.ts'

// Nota: testes de integração ExcelJS real (round-trip via workbook em memória)
// não rodam sob `node --test --experimental-strip-types` porque `excel/import.ts`
// usa `@/lib/simulador` (tsconfig path) que o Node ESM não resolve em runtime.
// A cobertura do parsing fica no smoke manual descrito no plano.

const APROX = 1e-6

describe('apurarAno — categorização de receitas (defeito #1)', () => {
  test('receita_financeira não gera CBS/IBS em 2027+', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
    estado = atualizarValor(estado, 2030, 'receita_financeira', 200_000)

    const recFin2030 = estado[2030].receita_financeira
    assert.equal(recFin2030.valCbs, 0, 'CBS de receita_financeira deve ser zero')
    assert.equal(recFin2030.valIbsE, 0, 'IBS-E de receita_financeira deve ser zero')
    assert.equal(recFin2030.valIbsM, 0, 'IBS-M de receita_financeira deve ser zero')
  })

  test('receita_financeira entra em receitaForaBase e receitaTotal, NÃO em receitaPadrao', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
    estado = atualizarValor(estado, 2030, 'receita_financeira', 200_000)

    const a = apurarAno(estado, 2030)
    assert.equal(a.receitaPadrao, 1_000_000, 'receitaPadrao = só rec_locacao')
    assert.equal(a.receitaForaBase, 200_000, 'receitaForaBase = receita_financeira')
    assert.equal(a.receitaTributavel, 1_000_000, 'receitaTributavel exclui fora_base')
    assert.equal(a.receitaTotal, 1_200_000, 'receitaTotal inclui tudo')
  })

  test('com receita fora_base: cargaConsolidada > cargaSobreReceitaTotal (denominador maior)', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
    estado = atualizarValor(estado, 2030, 'receita_financeira', 500_000)

    const a = apurarAno(estado, 2030)
    assert.ok(a.cargaConsolidada > 0, 'cargaConsolidada deve ser positiva')
    assert.ok(
      a.cargaConsolidada > a.cargaSobreReceitaTotal,
      `cargaConsolidada (${a.cargaConsolidada}) deve ser > cargaSobreReceitaTotal (${a.cargaSobreReceitaTotal})`
    )
    // Hoje OPERACOES não tem operação com categoria='regime_especifico', então cargaPadrao === cargaConsolidada.
    // O invariante geral é cargaConsolidada ≥ cargaSobreReceitaTotal (denominador menor → carga maior).
    assert.equal(a.cargaPadrao, a.cargaConsolidada,
      'sem operação regime_especifico, cargaPadrao === cargaConsolidada')
  })

  test('estado vazio: todas as cargas zero, sem NaN/Infinity', () => {
    const estado = estadoInicial()
    const a = apurarAno(estado, 2030)
    assert.equal(a.cargaPadrao, 0)
    assert.equal(a.cargaConsolidada, 0)
    assert.equal(a.cargaSobreReceitaTotal, 0)
    assert.equal(a.cargaBruta, 0)
    assert.equal(a.totalAPagar, 0)
  })
})

describe('apurarAno — IBS unificado (defeito #3)', () => {
  test('IBS-E débito + IBS-M crédito compensam-se no saldo único', () => {
    // Cenário sintético: forçar valores brutos via dadosIniciais para isolar a lógica de apuração
    const estado = estadoInicial()
    // Inserir débito de IBS-E em rec_locacao
    estado[2030].rec_locacao = {
      ...dadosIniciais(),
      valor: 1_000_000,
      valIbsE: 100,  // débito de IBS-E
      valIbsM: 0,
    }
    // Inserir crédito de IBS-M em cred_serv
    estado[2030].cred_serv = {
      ...dadosIniciais(),
      valIbsE: 0,
      valIbsM: 30,   // crédito de IBS-M
    }

    const a = apurarAno(estado, 2030)
    assert.equal(a.ibsE.debito, 100)
    assert.equal(a.ibsE.credito, 0)
    assert.equal(a.ibsE.saldo, 100)
    assert.equal(a.ibsM.debito, 0)
    assert.equal(a.ibsM.credito, 30)
    assert.equal(a.ibsM.saldo, -30)

    // IBS unificado: saldo = 100 - 30 = 70 (não 100, como seria com a fórmula antiga)
    assert.equal(a.ibs.debito, 100)
    assert.equal(a.ibs.credito, 30)
    assert.equal(a.ibs.saldo, 70, 'IBS unificado: ibsE.saldo + ibsM.saldo')

    // totalAPagar reflete saldo unificado, não soma de Math.max(0, ·) separados
    assert.equal(a.totalAPagar, 70,
      'totalAPagar = 70 (IBS unificado), não 100 (E e M separados)')
  })

  test('IBS-E credor + IBS-M devedor: ambos compensam', () => {
    const estado = estadoInicial()
    estado[2030].rec_locacao = {
      ...dadosIniciais(),
      valor: 1_000_000,
      valIbsE: 0,
      valIbsM: 100,
    }
    estado[2030].cred_serv = {
      ...dadosIniciais(),
      valIbsE: 40,
      valIbsM: 0,
    }

    const a = apurarAno(estado, 2030)
    assert.equal(a.ibsE.saldo, -40, 'IBS-E credor')
    assert.equal(a.ibsM.saldo, 100, 'IBS-M devedor')
    assert.equal(a.ibs.saldo, 60, 'saldo unificado: 100 - 40 = 60')
    assert.equal(a.totalAPagar, 60)
  })

  test('IBS-E e IBS-M ambos credores: vai para saldoCredor, não totalAPagar', () => {
    const estado = estadoInicial()
    estado[2030].cred_serv = {
      ...dadosIniciais(),
      valIbsE: 50,
      valIbsM: 30,
    }

    const a = apurarAno(estado, 2030)
    assert.equal(a.ibsE.saldo, -50)
    assert.equal(a.ibsM.saldo, -30)
    assert.equal(a.ibs.saldo, -80, 'IBS unificado credor de 80')
    assert.equal(a.totalAPagar, 0, 'todos credores, nada a pagar')
    assert.equal(a.saldoCredor, 80, 'saldoCredor usa IBS unificado, não soma de E+M separados')
  })
})

describe('calcularOp — VLA na venda de ativo (defeito #2)', () => {
  test('parcela ≤ VLA: alíquota zero CBS e IBS', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 100_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 120_000)  // VLA > valor

    const d = estado[2030].venda_ativo
    assert.equal(d.valCbs, 0, 'CBS zero quando VLA cobre todo o valor')
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
  })

  test('art. 406 — bucket 2024-2026 vendido em 2030: CBS + IBS sobre ganho (fator IBS 1,0)', () => {
    // 4ª rodada: bucket 2024-2026 → CBS protegida (ganho-only) + IBS protegida fator 1,0 desde 2029.
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 200_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 150_000)
    // bucketAquisicao default = '2024-2026'

    const d = estado[2030].venda_ativo
    // ganho = 50.000
    assert.ok(Math.abs(d.valCbs - 50_000 * 0.085) < APROX, `valCbs = ${d.valCbs}`)
    assert.ok(Math.abs(d.valIbsE - 50_000 * 0.032) < APROX, `valIbsE = ${d.valIbsE}`)
    assert.ok(Math.abs(d.valIbsM - 50_000 * 0.005) < APROX, `valIbsM = ${d.valIbsM}`)
  })

  test('ganho zero (custo > valor): nenhum tributo em 2030+', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 60_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 80_000)  // custo > valor

    const d = estado[2030].venda_ativo
    assert.equal(d.valCbs, 0, 'CBS zero quando custo > valor (venda com prejuízo)')
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
  })

  test('custo = 0 (default): tributa valor integral em 2032+', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2032, 'venda_ativo', 100_000)
    // não chama atualizarReducaoBase — custo permanece 0

    const d = estado[2032].venda_ativo
    // 2032: CBS 8.50 + IBS-E 6.40 + IBS-M 1.00 = 15.90% sobre valor integral
    assert.ok(Math.abs(d.valCbs - 100_000 * 0.085) < APROX,
      'sem custo, CBS sobre valor integral')
    assert.ok(Math.abs(d.valIbsE - 100_000 * 0.064) < APROX, 'IBS-E sobre valor integral')
  })

  test('calcularOp é determinística — pure function', () => {
    const base = { ...dadosIniciais(), valor: 100_000, reducaoBase: 30_000, aliqCbs: 8.5 }
    const r1 = calcularOp(base, 2030, true)
    const r2 = calcularOp(base, 2030, true)
    assert.deepEqual(r1, r2)
  })

  test('redução de base em rec_locacao reduz CBS/IBS proporcionalmente', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
    estado = atualizarReducaoBase(estado, 2030, 'rec_locacao', 100_000)
    const d = estado[2030].rec_locacao
    // base = 900.000; CBS 8,50% = 76.500
    assert.ok(Math.abs(d.valCbs - 76_500) < APROX,
      `valCbs = ${d.valCbs}, esperado 76500`)
  })

  test('redução em receita_financeira (fora_base) é preservada mas não afeta tributo', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'receita_financeira', 200_000)
    estado = atualizarReducaoBase(estado, 2030, 'receita_financeira', 50_000)
    const d = estado[2030].receita_financeira
    // alíquotas zeradas em 2030 → val* sempre 0
    assert.equal(d.valCbs, 0)
    assert.equal(d.valIbsE, 0)
    assert.equal(d.valIbsM, 0)
    assert.equal(d.reducaoBase, 50_000, 'redução é preservada para uso futuro')
  })
})

describe('XLSX import — backward compat VLA (F1)', () => {
  // Estes testes simulam a sequência que importarXlsx executa após parsear a planilha:
  // atualizarValor(...) seguido de atualizarReducaoBase(...) condicionalmente.

  test('v1 sem VLA: comportamento equivalente a vla=0 (tributação cheia)', () => {
    let estado = estadoInicial()
    // Simula reconstrução de uma linha v1 (sem vla undefined no RowParsed)
    estado = atualizarValor(estado, 2030, 'venda_ativo', 200_000)
    // NÃO chama atualizarReducaoBase — emulando ausência da coluna VLA na planilha v1

    const d = estado[2030].venda_ativo
    assert.equal(d.reducaoBase, 0, 'reducaoBase permanece 0 quando não informado')
    // 2030 venda_ativo: aliqCbs 8.50 → CBS sobre valor cheio
    assert.ok(Math.abs(d.valCbs - 200_000 * 0.085) < APROX,
      `valCbs = ${d.valCbs}, esperado ${200_000 * 0.085}`)
  })

  test('v2 com VLA informado: tributa só o excedente', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 200_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', 150_000)  // como o importer faria

    const d = estado[2030].venda_ativo
    assert.equal(d.reducaoBase, 150_000)
    assert.ok(Math.abs(d.valCbs - 50_000 * 0.085) < APROX,
      `valCbs = ${d.valCbs}, esperado ${50_000 * 0.085}`)
  })

  test('round-trip: estado preservado após reconstrução com VLA', () => {
    // Original
    let original = estadoInicial()
    original = atualizarValor(original, 2030, 'venda_ativo', 200_000)
    original = atualizarReducaoBase(original, 2030, 'venda_ativo', 150_000)
    const dOrig = original[2030].venda_ativo

    // "Reconstrução" — equivalente ao que importarXlsx faz ao ler dados emitidos pelo exportXlsx
    let reconstruido = estadoInicial()
    reconstruido = atualizarValor(reconstruido, 2030, 'venda_ativo', dOrig.valor)
    reconstruido = atualizarReducaoBase(reconstruido, 2030, 'venda_ativo', dOrig.reducaoBase)
    const dRecon = reconstruido[2030].venda_ativo

    assert.equal(dRecon.valor, dOrig.valor, 'valor preservado')
    assert.equal(dRecon.reducaoBase, dOrig.reducaoBase, 'reducaoBase preservado')
    assert.ok(Math.abs(dRecon.valCbs - dOrig.valCbs) < APROX, 'valCbs preservado')
    assert.ok(Math.abs(dRecon.valIbsE - dOrig.valIbsE) < APROX, 'valIbsE preservado')
    assert.ok(Math.abs(dRecon.valIbsM - dOrig.valIbsM) < APROX, 'valIbsM preservado')
  })

  test('VLA negativo é clampeado em 0 (defesa em profundidade)', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 100_000)
    estado = atualizarReducaoBase(estado, 2030, 'venda_ativo', -50_000)

    const d = estado[2030].venda_ativo
    assert.equal(d.reducaoBase, 0, 'atualizarReducaoBase clampa negativos em 0')
    // CBS aplicada sobre valor cheio (já que reducaoBase=0)
    assert.ok(Math.abs(d.valCbs - 100_000 * 0.085) < APROX)
  })
})

describe('regression — comportamento equivalente ao antigo em casos simples', () => {
  test('ano 2030 só com rec_locacao: cargaPadrao ≈ alíquota total padrão', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)

    const a = apurarAno(estado, 2030)
    // 2030 rec_locacao: aliqCbs 8.50 + aliqIbsE 3.20 + aliqIbsM 0.50 = 12.20% sobre valor
    const cargaEsperada = 8.50 + 3.20 + 0.50
    assert.ok(
      Math.abs(a.cargaPadrao - cargaEsperada) < 0.01,
      `cargaPadrao = ${a.cargaPadrao.toFixed(2)}%, esperado ~${cargaEsperada}%`
    )
    // sem fora_base, as 3 cargas são iguais
    assert.equal(a.cargaPadrao, a.cargaConsolidada)
    assert.equal(a.cargaConsolidada, a.cargaSobreReceitaTotal)
  })

  test('2026: PIS+COFINS aplicam-se em rec_locacao (regime antigo)', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2026, 'rec_locacao', 1_000_000)

    const d = estado[2026].rec_locacao
    assert.equal(d.aliqPis, 1.65)
    assert.equal(d.aliqCof, 7.60)
    assert.ok(Math.abs(d.valPis - 16_500) < APROX, 'PIS = 1.65% × 1M')
    assert.ok(Math.abs(d.valCof - 76_000) < APROX, 'COFINS = 7.60% × 1M')
  })
})
