import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  estadoInicial,
  atualizarValor,
  atualizarReducaoBase,
  apurarAno,
  breakdownSaldoTributo,
  breakdownResultadoLiquido,
  breakdownCarga,
  breakdownReceitaBruta,
  breakdownTributosTotais,
  breakdownDelta,
  breakdownBaseEfetiva,
  breakdownOperacoesTotais,
} from '../simulador.ts'

const APROX = 1e-6

/**
 * Reconstrói o resultado de um breakdown a partir dos seus termos, aplicando
 * o operador de cada termo (o 1º termo entra positivo). Para cargas (÷ × 100)
 * o resultado não é uma soma simples, então esses casos são testados à parte.
 */
function reconstruirSoma(termos: { valor: number; operador?: string }[]): number {
  return termos.reduce((acc, t, i) => {
    if (i === 0 || t.operador === '+') return acc + t.valor
    if (t.operador === '−') return acc - t.valor
    return acc
  }, 0)
}

function cenarioRico() {
  let estado = estadoInicial()
  estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
  estado = atualizarValor(estado, 2030, 'outras_receitas', 300_000)
  estado = atualizarValor(estado, 2030, 'receita_financeira', 200_000)
  estado = atualizarValor(estado, 2030, 'cred_serv', 150_000)
  estado = atualizarValor(estado, 2030, 'compra_ativo', 80_000)
  // ano anterior para os deltas
  estado = atualizarValor(estado, 2029, 'rec_locacao', 900_000)
  estado = atualizarValor(estado, 2029, 'cred_serv', 100_000)
  return estado
}

describe('breakdownSaldoTributo', () => {
  test('resultado bate com apurarAno e termos reconstroem (Débito − Crédito)', () => {
    const estado = cenarioRico()
    for (const t of ['pis', 'cofins', 'cbs', 'ibs'] as const) {
      const b = breakdownSaldoTributo(estado, 2030, t)
      const saldo = apurarAno(estado, 2030)[t].saldo
      assert.equal(b.resultado, saldo, `resultado ${t} deve bater com apurarAno`)
      assert.ok(Math.abs(reconstruirSoma(b.termos) - saldo) < APROX, `termos ${t} reconstroem o saldo`)
    }
  })

  test('IBS tem nota de saldo único', () => {
    const b = breakdownSaldoTributo(cenarioRico(), 2030, 'ibs')
    assert.match(b.nota ?? '', /saldo único/i)
  })
})

describe('breakdownResultadoLiquido', () => {
  test('resultado = saldoCredor − totalAPagar (convenção da ResultadoBar)', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    const b = breakdownResultadoLiquido(estado, 2030)
    assert.ok(Math.abs(b.resultado - (a.saldoCredor - a.totalAPagar)) < APROX)
  })

  test('resultado = Total créditos − Total débitos e termos reconstroem', () => {
    const estado = cenarioRico()
    const b = breakdownResultadoLiquido(estado, 2030)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })
})

describe('breakdownCarga', () => {
  test('cada tipo bate com a carga correspondente de apurarAno', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    assert.equal(breakdownCarga(estado, 2030, 'padrao').resultado, a.cargaPadrao)
    assert.equal(breakdownCarga(estado, 2030, 'consolidada').resultado, a.cargaConsolidada)
    assert.equal(breakdownCarga(estado, 2030, 'sobreTotal').resultado, a.cargaSobreReceitaTotal)
    assert.equal(breakdownCarga(estado, 2030, 'bruta').resultado, a.cargaBruta)
  })

  test('termos (num ÷ den × 100) reconstroem o resultado', () => {
    const estado = cenarioRico()
    const b = breakdownCarga(estado, 2030, 'consolidada')
    const [num, den] = b.termos
    assert.ok(Math.abs((num.valor / den.valor) * 100 - b.resultado) < APROX)
  })

  test('resultadoFormato é percent', () => {
    assert.equal(breakdownCarga(cenarioRico(), 2030, 'consolidada').resultadoFormato, 'percent')
  })
})

describe('breakdownReceitaBruta', () => {
  test('resultado = receitaTotal e termos somam ao total', () => {
    const estado = cenarioRico()
    const b = breakdownReceitaBruta(estado, 2030)
    assert.equal(b.resultado, apurarAno(estado, 2030).receitaTotal)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })
})

describe('breakdownTributosTotais', () => {
  test('débito: termos somam ao total de débitos (5 tributos)', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    const b = breakdownTributosTotais(estado, 2030, 'debito')
    const esperado = a.pis.debito + a.cofins.debito + a.cbs.debito + a.ibsE.debito + a.ibsM.debito
    assert.ok(Math.abs(b.resultado - esperado) < APROX)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })

  test('crédito: termos somam ao total de créditos', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    const b = breakdownTributosTotais(estado, 2030, 'credito')
    const esperado = a.pis.credito + a.cofins.credito + a.cbs.credito + a.ibsE.credito + a.ibsM.credito
    assert.ok(Math.abs(b.resultado - esperado) < APROX)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })
})

describe('breakdownDelta', () => {
  test('primeiro ano (2026) retorna null', () => {
    assert.equal(breakdownDelta(cenarioRico(), 2026, 'carga'), null)
    assert.equal(breakdownDelta(cenarioRico(), 2026, 'tributos'), null)
  })

  test('carga: resultado = carga ano − carga anterior (pp)', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    const ant = apurarAno(estado, 2029)
    const b = breakdownDelta(estado, 2030, 'carga')!
    assert.ok(Math.abs(b.resultado - (a.cargaConsolidada - ant.cargaConsolidada)) < APROX)
    assert.equal(b.resultadoFormato, 'pp')
  })

  test('tributos: resultado = variação % do total a pagar', () => {
    const estado = cenarioRico()
    const a = apurarAno(estado, 2030)
    const ant = apurarAno(estado, 2029)
    const esperado = ((a.totalAPagar - ant.totalAPagar) / ant.totalAPagar) * 100
    const b = breakdownDelta(estado, 2030, 'tributos')!
    assert.ok(Math.abs(b.resultado - esperado) < APROX)
  })
})

describe('breakdownBaseEfetiva', () => {
  test('resultado = max(0, valor − redução) e termos reconstroem', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'rec_locacao', 1_000_000)
    estado = atualizarReducaoBase(estado, 2030, 'rec_locacao', 250_000)
    const b = breakdownBaseEfetiva(estado, 2030, 'rec_locacao')
    assert.equal(b.resultado, 750_000)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })

  test('venda_ativo usa label "Custo de aquisição" e tem nota do art. 406', () => {
    let estado = estadoInicial()
    estado = atualizarValor(estado, 2030, 'venda_ativo', 500_000)
    const b = breakdownBaseEfetiva(estado, 2030, 'venda_ativo')
    assert.equal(b.termos[1].label, 'Custo de aquisição')
    assert.match(b.nota ?? '', /406/)
  })
})

describe('breakdownOperacoesTotais', () => {
  test('débito: resultado = soma dos valores das operações de débito', () => {
    const estado = cenarioRico()
    const ea = estado[2030]
    const esperado = ea.rec_locacao.valor + ea.outras_receitas.valor + ea.receita_financeira.valor + ea.venda_ativo.valor
    const b = breakdownOperacoesTotais(estado, 2030, 'debito')
    assert.equal(b.resultado, esperado)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })

  test('crédito: resultado = soma dos valores das operações de crédito', () => {
    const estado = cenarioRico()
    const ea = estado[2030]
    const esperado = ea.cred_serv.valor + ea.compra_ativo.valor + ea.cred_deprec.valor + ea.cred_juros.valor
    const b = breakdownOperacoesTotais(estado, 2030, 'credito')
    assert.equal(b.resultado, esperado)
    assert.ok(Math.abs(reconstruirSoma(b.termos) - b.resultado) < APROX)
  })
})
