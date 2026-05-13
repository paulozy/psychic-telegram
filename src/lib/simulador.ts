import type { ApuracaoAno, DadosOperacao, Estado, Operacao } from '@/types/simulador'

export const OPERACOES: Operacao[] = [
  { key: 'rec_locacao',          label: 'Rec. Locação',           tipo: 'debito',  categoria: 'padrao'    },
  { key: 'receita_financeira',   label: 'Receita Financeira',     tipo: 'debito',  categoria: 'fora_base' },
  { key: 'venda_ativo_pre2026',  label: 'Venda Ativo (pré-2026)', tipo: 'debito',  categoria: 'padrao'    },
  { key: 'venda_ativo_pos2026',  label: 'Venda Ativo (pós-2026)', tipo: 'debito',  categoria: 'padrao'    },
  { key: 'cred_serv',            label: 'Serv. Tomados',          tipo: 'credito' },
  { key: 'compra_ativo',         label: 'Compra Ativo',           tipo: 'credito' },
  { key: 'cred_deprec',          label: 'Deprec. Fiscal',         tipo: 'credito' },
  { key: 'cred_juros',           label: 'Juros s/ Empréstimo',    tipo: 'credito' },
]

export const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

// ─── Tabela de alíquotas LC 214/2025 ───────────────────────────────────────

type AliquotaOp = {
  aliqPis:  number
  aliqCof:  number
  aliqCbs:  number
  aliqIbsE: number
  aliqIbsM: number
}

export const ALIQUOTAS_POR_ANO: Record<number, Record<string, AliquotaOp>> = {
  2026: {
    rec_locacao:        { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    // 2ª rodada Arval (Q2): "alíquota reduzida + isento a partir de 2027".
    // Decreto 8.426/2015: 0,65 PIS + 4,00 COFINS sobre receita financeira (regime não-cumulativo). Isento CBS/IBS.
    receita_financeira: { aliqPis: 0.65, aliqCof: 4.00, aliqCbs: 0,    aliqIbsE: 0,    aliqIbsM: 0    },
    // Q4 3ª rodada Arval: frota pré-2026 sempre isenta. Frota pós-2026 não existe em 2026.
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    cred_serv:    { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    compra_ativo: { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_deprec:  { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0,    aliqCof: 0,    aliqCbs: 0,    aliqIbsE: 0.10, aliqIbsM: 0    },
  },
  2027: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    // Q4 3ª rodada: pré-2026 sempre isenta (regra de transição).
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // Premissa conservadora (pendente 4ª rodada): pós-2026 vendida em 2027-2029 usa alíquotas plenas do ano.
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40, aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    // 2ª rodada Arval (Q6): a partir de 2027 o crédito é integral na compra (arts. 108/109). Esta rubrica não gera crédito.
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2028: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // Premissa conservadora (pendente 4ª rodada): pós-2026 vendida em 2027-2029.
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40, aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2029: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // Premissa conservadora (pendente 4ª rodada): pós-2026 vendida em 2029 — alíquotas plenas do ano.
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50, aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.00, aliqIbsE: 1.60, aliqIbsM: 0.25 },
  },
  2030: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    // Q4 3ª rodada: pré-2026 SEMPRE isenta, mesmo em 2030+.
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // 2ª rodada Arval (Q3/Q4): pós-2026 em 2030-2031 tributa apenas o GANHO (venda − custo) em CBS; IBS isento.
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50, aliqIbsE: 0, aliqIbsM: 0 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.15, aliqIbsE: 3.20, aliqIbsM: 0.50 },
  },
  2031: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // 2ª rodada Arval (Q3/Q4): pós-2026 em 2031 ainda só CBS sobre o ganho; IBS isento.
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50, aliqIbsE: 0, aliqIbsM: 0 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.30, aliqIbsE: 4.80, aliqIbsM: 0.75 },
  },
  2032: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    // 2ª rodada Arval (Q3/Q4): pós-2026 em 2032+ CBS + IBS sobre o ganho. Base = max(0, valor − custo).
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50, aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.50, aliqIbsE: 6.40, aliqIbsM: 1.00 },
  },
  2033: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,     aliqIbsM: 0    },
    venda_ativo_pre2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 0, aliqIbsE: 0, aliqIbsM: 0 },
    venda_ativo_pos2026: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50, aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,     aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 12.50, aliqIbsE: 16.00, aliqIbsM: 2.50 },
  },
}

// ─── Estado inicial ─────────────────────────────────────────────────────────

export function dadosIniciais(): DadosOperacao {
  return {
    valor: 0,
    reducaoBase: 0,
    basePis: 0, aliqPis: 0, valPis: 0,
    baseCof: 0, aliqCof: 0, valCof: 0,
    baseCbs: 0, aliqCbs: 0, valCbs: 0,
    baseIbs: 0, aliqIbsE: 0, aliqIbsM: 0, valIbsE: 0, valIbsM: 0,
  }
}

export function estadoInicial(): Estado {
  const s: Estado = {}
  ANOS.forEach(ano => {
    s[ano] = {}
    const aliqAno = ALIQUOTAS_POR_ANO[ano]
    OPERACOES.forEach(op => {
      const aliq = aliqAno[op.key]
      s[ano][op.key] = {
        ...dadosIniciais(),
        aliqPis:  aliq.aliqPis,
        aliqCof:  aliq.aliqCof,
        aliqCbs:  aliq.aliqCbs,
        aliqIbsE: aliq.aliqIbsE,
        aliqIbsM: aliq.aliqIbsM,
      }
    })
  })
  return s
}

// ─── Cálculo ─────────────────────────────────────────────────────────────────

/**
 * Recalcula uma operação a partir dos campos do estado.
 * Para receitas tipo débito, aplica a redução de base — para venda_ativo
 * representa o custo de aquisição (Q3/Q4 da 2ª rodada Arval): base = max(0, valor − custo).
 *
 * TODO Q9: quando o tributarista enviar os percentuais de redução de base
 * por ano (2030-2033), aplicar como fator adicional sobre `valorTributavel`.
 */
export function calcularOp(d: DadosOperacao, ano?: number, aplicarReducao?: boolean): DadosOperacao {
  const valPis = d.basePis * (d.aliqPis / 100)
  const valCof = d.baseCof * (d.aliqCof / 100)

  let baseCbs: number
  let baseIbs: number

  if (aplicarReducao && d.reducaoBase > 0) {
    const valorTributavel = Math.max(0, d.valor - d.reducaoBase)
    baseCbs = valorTributavel
    baseIbs = valorTributavel
  } else if (ano === 2026) {
    // 2026: base CBS/IBS = valor − PIS − COFINS
    baseCbs = Math.max(0, d.valor - valPis - valCof)
    baseIbs = Math.max(0, d.valor - valPis - valCof)
  } else {
    baseCbs = d.baseCbs
    baseIbs = d.baseIbs
  }

  return {
    ...d,
    baseCbs,
    baseIbs,
    valPis,
    valCof,
    valCbs:  baseCbs * (d.aliqCbs  / 100),
    valIbsE: baseIbs * (d.aliqIbsE / 100),
    valIbsM: baseIbs * (d.aliqIbsM / 100),
  }
}

export function totalOp(d: DadosOperacao): number {
  return d.valPis + d.valCof + d.valCbs + d.valIbsE + d.valIbsM
}

// ─── Agregações ──────────────────────────────────────────────────────────────

export function resultadoAno(estado: Estado, ano: number): number {
  let deb = 0, cred = 0
  OPERACOES.forEach(op => {
    const t = totalOp(estado[ano][op.key])
    if (op.tipo === 'debito') deb += t
    else cred += t
  })
  return deb - cred
}

export function resumoAno(estado: Estado, ano: number) {
  let receita = 0
  let tributos = 0
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    if (op.tipo === 'debito') receita += d.valor
    tributos += d.valPis + d.valCof + d.valCbs + d.valIbsE + d.valIbsM
  })
  const margem = receita > 0 ? (tributos / receita) * 100 : 0
  return { receita, tributos, margem }
}

/** Totais brutos de cada tributo no ano — usado no painel de carga tributária. */
export function resumoTributosBrutos(estado: Estado, ano: number) {
  let pis = 0, cof = 0, cbs = 0, ibsE = 0, ibsM = 0
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    pis  += d.valPis
    cof  += d.valCof
    cbs  += d.valCbs
    ibsE += d.valIbsE
    ibsM += d.valIbsM
  })
  return { pis, cof, cbs, ibsE, ibsM, total: pis + cof + cbs + ibsE + ibsM }
}

/** Apuração de tributos com débito/crédito/saldo separados por tributo conforme LC 214/2025. */
export function apurarAno(estado: Estado, ano: number): ApuracaoAno {
  const zero = () => ({ debito: 0, credito: 0, saldo: 0 })

  const result: ApuracaoAno = {
    pis: zero(), cofins: zero(), cbs: zero(), ibs: zero(), ibsE: zero(), ibsM: zero(),
    receitaPadrao: 0,
    receitaRegimeEspecifico: 0,
    receitaForaBase: 0,
    receitaTributavel: 0,
    receitaTotal: 0,
    totalAPagar: 0,
    saldoCredor: 0,
    cargaPadrao: 0,
    cargaConsolidada: 0,
    cargaSobreReceitaTotal: 0,
    cargaBruta: 0,
  }

  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    const isDebito = op.tipo === 'debito'

    if (isDebito) {
      const cat = op.categoria ?? 'padrao'
      result.receitaTotal += d.valor
      if (cat === 'padrao')            result.receitaPadrao += d.valor
      if (cat === 'regime_especifico') result.receitaRegimeEspecifico += d.valor
      if (cat === 'fora_base')         result.receitaForaBase += d.valor
    }

    const accumulate = (tributo: keyof Pick<ApuracaoAno, 'pis' | 'cofins' | 'cbs' | 'ibsE' | 'ibsM'>, val: number) => {
      if (isDebito) result[tributo].debito += val
      else result[tributo].credito += val
    }

    accumulate('pis', d.valPis)
    accumulate('cofins', d.valCof)
    accumulate('cbs', d.valCbs)
    accumulate('ibsE', d.valIbsE)
    accumulate('ibsM', d.valIbsM)
  })

  result.receitaTributavel = result.receitaPadrao + result.receitaRegimeEspecifico

  // Saldos por tributo (E e M mantidos para drill-down/auditoria)
  ;(['pis', 'cofins', 'cbs', 'ibsE', 'ibsM'] as const).forEach(t => {
    result[t].saldo = result[t].debito - result[t].credito
  })

  // IBS é apurado pelo contribuinte como saldo ÚNICO (CG-IBS faz partilha E/M depois — LC 214/2025 arts. 39, 40)
  result.ibs.debito  = result.ibsE.debito  + result.ibsM.debito
  result.ibs.credito = result.ibsE.credito + result.ibsM.credito
  result.ibs.saldo   = result.ibs.debito   - result.ibs.credito

  // Total a pagar: 4 saldos (PIS, COFINS, CBS, IBS unificado) — não 5
  result.totalAPagar =
    Math.max(0, result.pis.saldo) +
    Math.max(0, result.cofins.saldo) +
    Math.max(0, result.cbs.saldo) +
    Math.max(0, result.ibs.saldo)

  result.saldoCredor =
    Math.abs(Math.min(0, result.pis.saldo)) +
    Math.abs(Math.min(0, result.cofins.saldo)) +
    Math.abs(Math.min(0, result.cbs.saldo)) +
    Math.abs(Math.min(0, result.ibs.saldo))

  // Três métricas de carga
  if (result.receitaPadrao > 0) {
    result.cargaPadrao = (result.totalAPagar / result.receitaPadrao) * 100
  }
  if (result.receitaTributavel > 0) {
    result.cargaConsolidada = (result.totalAPagar / result.receitaTributavel) * 100
    const totalDebito = result.pis.debito + result.cofins.debito + result.cbs.debito + result.ibs.debito
    result.cargaBruta = (totalDebito / result.receitaTributavel) * 100
  }
  if (result.receitaTotal > 0) {
    result.cargaSobreReceitaTotal = (result.totalAPagar / result.receitaTotal) * 100
  }

  return result
}

export function hasData(estado: Estado, ano: number): boolean {
  return OPERACOES.some(op => {
    const d = estado[ano][op.key]
    return d.valor > 0 || d.baseCbs > 0 || d.basePis > 0
  })
}

// ─── Mutações ────────────────────────────────────────────────────────────────

function aplicarReducaoPara(key: string): boolean {
  return OPERACOES.find(o => o.key === key)?.tipo === 'debito'
}

/** Atualiza o valor de uma operação e recalcula, aplicando redução de base quando a operação é de débito. */
export function atualizarValor(
  estado: Estado,
  ano: number,
  key: string,
  valor: number
): Estado {
  const d = calcularOp({
    ...estado[ano][key],
    valor,
    basePis: valor,
    baseCof: valor,
    baseCbs: valor,
    baseIbs: valor,
  }, ano, aplicarReducaoPara(key))
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: d },
  }
}

/** Atualiza a redução de base de uma receita (tipo débito) e recalcula. Valores negativos são clampeados em 0. */
export function atualizarReducaoBase(
  estado: Estado,
  ano: number,
  key: string,
  valor: number
): Estado {
  const d = calcularOp({
    ...estado[ano][key],
    reducaoBase: Math.max(0, valor),
  }, ano, aplicarReducaoPara(key))
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: d },
  }
}

/** Atualiza uma alíquota manualmente (override do usuário) e recalcula. */
export function atualizarAliquota(
  estado: Estado,
  ano: number,
  key: string,
  field: keyof DadosOperacao,
  valor: number
): Estado {
  const atualizado = calcularOp({ ...estado[ano][key], [field]: valor }, ano, aplicarReducaoPara(key))
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: atualizado },
  }
}

/** Re-aplica as alíquotas da tabela para todas as operações de um ano. */
export function aplicarAliquotasDoAno(estado: Estado, ano: number): Estado {
  const aliqAno = ALIQUOTAS_POR_ANO[ano]
  const novoAno = { ...estado[ano] }
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    const aliq = aliqAno[op.key]
    novoAno[op.key] = calcularOp({
      ...d,
      aliqPis:  aliq.aliqPis,
      aliqCof:  aliq.aliqCof,
      aliqCbs:  aliq.aliqCbs,
      aliqIbsE: aliq.aliqIbsE,
      aliqIbsM: aliq.aliqIbsM,
      basePis: d.valor,
      baseCof: d.valor,
      baseCbs: d.valor,
      baseIbs: d.valor,
    }, ano, op.tipo === 'debito')
  })
  return { ...estado, [ano]: novoAno }
}

/** Aplica alíquotas especificadas pelo usuário a todas as operações de um ano. */
export function aplicarAliquotasGlobais(
  estado: Estado,
  ano: number,
  aliquotasAplicar: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>
): Estado {
  const novoAno = { ...estado[ano] }
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    const novosDados = {
      ...d,
      aliqPis:  'aliqPis' in aliquotasAplicar ? aliquotasAplicar.aliqPis! : d.aliqPis,
      aliqCof:  'aliqCof' in aliquotasAplicar ? aliquotasAplicar.aliqCof! : d.aliqCof,
      aliqCbs:  'aliqCbs' in aliquotasAplicar ? aliquotasAplicar.aliqCbs! : d.aliqCbs,
      aliqIbsE: 'aliqIbsE' in aliquotasAplicar ? aliquotasAplicar.aliqIbsE! : d.aliqIbsE,
      aliqIbsM: 'aliqIbsM' in aliquotasAplicar ? aliquotasAplicar.aliqIbsM! : d.aliqIbsM,
    }
    novoAno[op.key] = calcularOp(novosDados, ano, op.tipo === 'debito')
  })
  return { ...estado, [ano]: novoAno }
}

// ─── Formatação ──────────────────────────────────────────────────────────────

export function fmtBR(v: number | null | undefined): string {
  if (!v) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

export function fmtCompacto(v: number): string {
  if (!v) return '—'
  const abs = Math.abs(v)
  const s = v < 0 ? '−' : ''
  if (abs >= 1e9) return `${s}R$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${s}R$${(abs / 1e6).toFixed(1)}M`
  return `${s}R$${fmtBR(abs)}`
}
