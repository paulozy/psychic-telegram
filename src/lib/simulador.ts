import type { ApuracaoAno, Breakdown, BucketAquisicao, DadosOperacao, Estado, Operacao } from '@/types/simulador'

export const OPERACOES: Operacao[] = [
  { key: 'rec_locacao',         label: 'Rec. Locação',         tipo: 'debito',  categoria: 'padrao'    },
  { key: 'outras_receitas',     label: 'Outras Receitas',      tipo: 'debito',  categoria: 'padrao'    },
  { key: 'receita_financeira',  label: 'Receita Financeira',   tipo: 'debito',  categoria: 'fora_base' },
  { key: 'venda_ativo',         label: 'Venda Ativo',          tipo: 'debito',  categoria: 'padrao'    },
  { key: 'cred_serv',           label: 'Serv. Tomados',        tipo: 'credito' },
  { key: 'compra_ativo',        label: 'Compra Ativo',         tipo: 'credito' },
  { key: 'cred_deprec',         label: 'Deprec. Fiscal',       tipo: 'credito' },
  { key: 'cred_juros',          label: 'Juros s/ Empréstimo',  tipo: 'credito' },
]

export const BUCKETS_AQUISICAO: BucketAquisicao[] = [
  'pre-jul-2024', '2024-2026', '2027-2028',
  '2029', '2030', '2031', '2032', '2033+',
]

/**
 * Regra de tributação de venda de ativo conforme art. 406 LC 214/2025.
 * Depende do bucket de aquisição × ano de venda.
 *
 * CBS: proteção (alíquota zero sobre parcela ≤ VLA) só para bens 2024-2026 vendidos a partir de 2027.
 * IBS: proteção (alíquota zero sobre parcela ≤ VLA × fator) só para bens jul/2024-dez/2032 vendidos a partir de 2029.
 *      Fator decresce conforme ano de aquisição: 1.0 (até 2028), 0.9 (2029), 0.8 (2030), 0.7 (2031), 0.6 (2032).
 */
interface RegraVendaAtivo {
  aplicaProtecaoCBS: boolean
  aplicaProtecaoIBS: boolean
  fatorVLA_IBS: number
}

export function regraVendaAtivo(bucket: BucketAquisicao, anoVenda: number): RegraVendaAtivo {
  const cbsProtegida = bucket === '2024-2026' && anoVenda >= 2027

  let ibsProtegida = false
  let fatorIBS = 1.0
  if (anoVenda >= 2029) {
    switch (bucket) {
      case '2024-2026':
      case '2027-2028': ibsProtegida = true; fatorIBS = 1.0; break
      case '2029':      ibsProtegida = true; fatorIBS = 0.9; break
      case '2030':      ibsProtegida = true; fatorIBS = 0.8; break
      case '2031':      ibsProtegida = true; fatorIBS = 0.7; break
      case '2032':      ibsProtegida = true; fatorIBS = 0.6; break
      // pre-jul-2024 e 2033+: sem proteção
    }
  }

  return { aplicaProtecaoCBS: cbsProtegida, aplicaProtecaoIBS: ibsProtegida, fatorVLA_IBS: fatorIBS }
}

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
    // venda_ativo: alíquotas cheias do ano; a base depende do bucket de aquisição (ver regraVendaAtivo). 2026 IBS ainda em teste.
    venda_ativo:  { aliqPis: 0,    aliqCof: 0,    aliqCbs: 0,    aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_serv:    { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    compra_ativo: { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_deprec:  { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0,    aliqCof: 0,    aliqCbs: 0,    aliqIbsE: 0.10, aliqIbsM: 0    },
  },
  2027: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    // venda_ativo: alíquotas plenas; base depende do bucket (CBS proteção 2027+ se bucket 2024-2026).
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    // 2ª rodada Arval (Q6): a partir de 2027 o crédito é integral na compra (arts. 108/109). Esta rubrica não gera crédito.
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2028: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2029: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.00, aliqIbsE: 1.60, aliqIbsM: 0.25 },
  },
  2030: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    // 4ª rodada Arval: alíquotas plenas; base depende do bucket via regraVendaAtivo (art. 406).
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.15, aliqIbsE: 3.20, aliqIbsM: 0.50 },
  },
  2031: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.30, aliqIbsE: 4.80, aliqIbsM: 0.75 },
  },
  2032: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,    aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.50, aliqIbsE: 6.40, aliqIbsM: 1.00 },
  },
  2033: {
    rec_locacao:        { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    receita_financeira: { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,     aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0,     aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 12.50, aliqIbsE: 16.00, aliqIbsM: 2.50 },
  },
}

// "Outras Receitas" é um clone tributário da Rec. Locação: replica as alíquotas dela
// em todos os anos. Mantido derivado (não duplicado) para nunca sair de sincronia.
for (const ano of ANOS) {
  ALIQUOTAS_POR_ANO[ano].outras_receitas = { ...ALIQUOTAS_POR_ANO[ano].rec_locacao }
}

// ─── Estado inicial ─────────────────────────────────────────────────────────

export function dadosIniciais(): DadosOperacao {
  return {
    valor: 0,
    reducaoBase: 0,
    bucketAquisicao: '2024-2026',  // default mais comum (Arval frota antiga)
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
 *
 * Para `venda_ativo`: aplica matriz do art. 406 LC 214/2025 (`regraVendaAtivo`):
 *   - CBS protegida (bens 2024-2026 vendidos 2027+): base = max(0, valor − VLA).
 *   - IBS protegida (bens 2024-2032 vendidos 2029+): base = max(0, valor − VLA × fator).
 *   - Fora da proteção: base = valor (alíquota cheia sobre venda integral).
 *
 * Para outras receitas de débito: aplica redução de base genérica se `aplicarReducao=true`.
 */
export function calcularOp(
  d: DadosOperacao,
  ano?: number,
  aplicarReducao?: boolean,
  opKey?: string,
): DadosOperacao {
  const valPis = d.basePis * (d.aliqPis / 100)
  const valCof = d.baseCof * (d.aliqCof / 100)

  let baseCbs: number
  let baseIbs: number

  if (opKey === 'venda_ativo' && ano !== undefined) {
    const bucket = d.bucketAquisicao ?? '2024-2026'
    const regra = regraVendaAtivo(bucket, ano)
    baseCbs = regra.aplicaProtecaoCBS ? Math.max(0, d.valor - d.reducaoBase) : d.valor
    baseIbs = regra.aplicaProtecaoIBS
      ? Math.max(0, d.valor - d.reducaoBase * regra.fatorVLA_IBS)
      : d.valor
  } else if (aplicarReducao && d.reducaoBase > 0) {
    const valorTributavel = Math.max(0, d.valor - d.reducaoBase)
    baseCbs = valorTributavel
    baseIbs = valorTributavel
  } else if (ano === 2026) {
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

// ─── Agregações ──────────────────────────────────────────────────────────────

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

// ─── Breakdowns (explicação derivada dos cálculos) ─────────────────────────────
// Cada função abaixo NÃO recalcula nada novo: lê os mesmos valores de
// apurarAno/calcularOp e os reorganiza num objeto Breakdown. Assim a explicação
// exibida no popover "Como é calculado" nunca diverge do número exibido.

const LABEL_TRIBUTO: Record<'pis' | 'cofins' | 'cbs' | 'ibs', string> = {
  pis: 'PIS', cofins: 'COFINS', cbs: 'CBS', ibs: 'IBS',
}

/** Adiciona operador '+' a partir do 2º termo (o 1º fica sem operador). */
function comOperadorSoma(termos: { label: string; valor: number }[]): Breakdown['termos'] {
  return termos.map((t, i) => (i > 0 ? { ...t, operador: '+' as const } : t))
}

/** Saldo de um tributo: Débito − Crédito (TributoCard). */
export function breakdownSaldoTributo(
  estado: Estado,
  ano: number,
  tributo: 'pis' | 'cofins' | 'cbs' | 'ibs',
): Breakdown {
  const t = apurarAno(estado, ano)[tributo]
  const nome = LABEL_TRIBUTO[tributo]
  return {
    titulo: `Saldo ${nome}`,
    formula: 'Saldo = Débito − Crédito',
    termos: [
      { label: `Débito ${nome}`, valor: t.debito },
      { label: `Crédito ${nome}`, valor: t.credito, operador: '−' },
    ],
    resultado: t.saldo,
    nota: tributo === 'ibs'
      ? 'IBS apurado como saldo único (Estadual + Municipal). LC 214/2025 arts. 39 e 40.'
      : undefined,
  }
}

/**
 * Resultado líquido: Total créditos − Total débitos (tributos).
 * Equivale a saldoCredor − totalAPagar exibido na ResultadoBar.
 */
export function breakdownResultadoLiquido(estado: Estado, ano: number): Breakdown {
  const a = apurarAno(estado, ano)
  const totalDebitos = a.pis.debito + a.cofins.debito + a.cbs.debito + a.ibs.debito
  const totalCreditos = a.pis.credito + a.cofins.credito + a.cbs.credito + a.ibs.credito
  return {
    titulo: 'Resultado líquido',
    formula: 'Resultado = Total créditos − Total débitos',
    termos: [
      { label: 'Total créditos', valor: totalCreditos },
      { label: 'Total débitos', valor: totalDebitos, operador: '−' },
    ],
    resultado: totalCreditos - totalDebitos,
    nota: 'Positivo = saldo credor a recuperar; negativo = a recolher.',
  }
}

type TipoCarga = 'padrao' | 'consolidada' | 'sobreTotal' | 'bruta'

/** Cargas tributárias: numerador ÷ denominador × 100 (ResumoTabela). */
export function breakdownCarga(estado: Estado, ano: number, tipo: TipoCarga): Breakdown {
  const a = apurarAno(estado, ano)
  const totalDebito = a.pis.debito + a.cofins.debito + a.cbs.debito + a.ibs.debito
  const cfg = {
    padrao: {
      titulo: 'Carga padrão (atividade-fim)',
      numLabel: 'Total a pagar', num: a.totalAPagar,
      denLabel: 'Receita padrão', den: a.receitaPadrao,
      resultado: a.cargaPadrao,
    },
    consolidada: {
      titulo: 'Carga efetiva (consolidada)',
      numLabel: 'Total a pagar', num: a.totalAPagar,
      denLabel: 'Receita tributável', den: a.receitaTributavel,
      resultado: a.cargaConsolidada,
    },
    sobreTotal: {
      titulo: 'Carga sobre receita total',
      numLabel: 'Total a pagar', num: a.totalAPagar,
      denLabel: 'Receita total', den: a.receitaTotal,
      resultado: a.cargaSobreReceitaTotal,
    },
    bruta: {
      titulo: 'Carga bruta',
      numLabel: 'Total de débitos', num: totalDebito,
      denLabel: 'Receita tributável', den: a.receitaTributavel,
      resultado: a.cargaBruta,
    },
  }[tipo]

  return {
    titulo: cfg.titulo,
    formula: `Carga = ${cfg.numLabel} ÷ ${cfg.denLabel} × 100`,
    termos: [
      { label: cfg.numLabel, valor: cfg.num },
      { label: cfg.denLabel, valor: cfg.den, operador: '÷' },
    ],
    resultado: cfg.resultado,
    resultadoFormato: 'percent',
  }
}

/** Receita bruta = soma dos valores das operações de débito (ResumoTabela). */
export function breakdownReceitaBruta(estado: Estado, ano: number): Breakdown {
  const ea = estado[ano]
  const termos = OPERACOES
    .filter(o => o.tipo === 'debito')
    .map(o => ({ label: o.label, valor: ea[o.key].valor }))
    .filter(t => t.valor !== 0)
  return {
    titulo: 'Receita bruta',
    formula: 'Receita bruta = soma das receitas (operações de débito)',
    termos: comOperadorSoma(termos),
    resultado: apurarAno(estado, ano).receitaTotal,
  }
}

/** Total de tributos sobre débitos ou créditos, por tributo (ResumoTabela). */
export function breakdownTributosTotais(
  estado: Estado,
  ano: number,
  lado: 'debito' | 'credito',
): Breakdown {
  const a = apurarAno(estado, ano)
  const tributos: Array<[keyof Pick<ApuracaoAno, 'pis' | 'cofins' | 'cbs' | 'ibsE' | 'ibsM'>, string]> = [
    ['pis', 'PIS'], ['cofins', 'COFINS'], ['cbs', 'CBS'],
    ['ibsE', 'IBS Estadual'], ['ibsM', 'IBS Municipal'],
  ]
  const termos = tributos
    .map(([k, label]) => ({ label, valor: a[k][lado] }))
    .filter(t => t.valor !== 0)
  const total = tributos.reduce((s, [k]) => s + a[k][lado], 0)
  return {
    titulo: lado === 'debito' ? 'Tributos sobre débitos' : 'Créditos compensáveis',
    formula: `Total = PIS + COFINS + CBS + IBS (Estadual + Municipal) sobre ${lado === 'debito' ? 'débitos' : 'créditos'}`,
    termos: comOperadorSoma(termos),
    resultado: total,
  }
}

/** Variação ano-a-ano da carga consolidada (pp) ou do total a pagar (%). Null no 1º ano. */
export function breakdownDelta(
  estado: Estado,
  ano: number,
  metrica: 'carga' | 'tributos',
): Breakdown | null {
  const idx = ANOS.indexOf(ano)
  if (idx <= 0) return null
  const anoAnt = ANOS[idx - 1]
  const a = apurarAno(estado, ano)
  const ant = apurarAno(estado, anoAnt)

  if (metrica === 'carga') {
    return {
      titulo: `Δ Carga (${anoAnt} → ${ano})`,
      formula: 'Δ = Carga do ano − Carga do ano anterior',
      termos: [
        { label: `Carga ${ano}`, valor: a.cargaConsolidada, formato: 'percent' },
        { label: `Carga ${anoAnt}`, valor: ant.cargaConsolidada, formato: 'percent', operador: '−' },
      ],
      resultado: a.cargaConsolidada - ant.cargaConsolidada,
      resultadoFormato: 'pp',
    }
  }

  const delta = ant.totalAPagar > 0 ? ((a.totalAPagar - ant.totalAPagar) / ant.totalAPagar) * 100 : 0
  return {
    titulo: `Δ Tributos (${anoAnt} → ${ano})`,
    formula: 'Δ% = (Total ano − Total anterior) ÷ Total anterior × 100',
    termos: [
      { label: `Total a pagar ${ano}`, valor: a.totalAPagar },
      { label: `Total a pagar ${anoAnt}`, valor: ant.totalAPagar, operador: '−' },
    ],
    resultado: delta,
    resultadoFormato: 'percent',
  }
}

/** Base efetiva de uma operação: Valor − Redução/Custo (PainelEsquerdo). */
export function breakdownBaseEfetiva(estado: Estado, ano: number, opKey: string): Breakdown {
  const d = estado[ano][opKey]
  const labelReducao = opKey === 'venda_ativo' ? 'Custo de aquisição' : 'Redução de base'
  return {
    titulo: 'Base efetiva',
    formula: `Base efetiva = Valor − ${labelReducao}`,
    termos: [
      { label: 'Valor da operação', valor: d.valor },
      { label: labelReducao, valor: d.reducaoBase, operador: '−' },
    ],
    resultado: Math.max(0, d.valor - d.reducaoBase),
    nota: opKey === 'venda_ativo'
      ? 'Parcela protegida pelo VLA conforme ano de aquisição (art. 406 LC 214/2025).'
      : undefined,
  }
}

/** Total de operações de débito/crédito = soma dos valores informados (PainelEsquerdo). */
export function breakdownOperacoesTotais(
  estado: Estado,
  ano: number,
  tipo: 'debito' | 'credito',
): Breakdown {
  const ea = estado[ano]
  const ops = OPERACOES.filter(o => o.tipo === tipo)
  const termos = ops
    .map(o => ({ label: o.label, valor: ea[o.key].valor }))
    .filter(t => t.valor !== 0)
  return {
    titulo: tipo === 'debito' ? 'Total débitos' : 'Total créditos',
    formula: `Total = soma dos valores das operações de ${tipo === 'debito' ? 'débito' : 'crédito'}`,
    termos: comOperadorSoma(termos),
    resultado: ops.reduce((s, o) => s + ea[o.key].valor, 0),
  }
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
  }, ano, aplicarReducaoPara(key), key)
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
  }, ano, aplicarReducaoPara(key), key)
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: d },
  }
}

/** Atualiza o bucket de ano de aquisição da operação venda_ativo e recalcula. */
export function atualizarBucketAquisicao(
  estado: Estado,
  ano: number,
  bucket: BucketAquisicao
): Estado {
  const key = 'venda_ativo'
  const d = calcularOp({
    ...estado[ano][key],
    bucketAquisicao: bucket,
  }, ano, true, key)
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
  const atualizado = calcularOp({ ...estado[ano][key], [field]: valor }, ano, aplicarReducaoPara(key), key)
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
    }, ano, op.tipo === 'debito', op.key)
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
    novoAno[op.key] = calcularOp(novosDados, ano, op.tipo === 'debito', op.key)
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
