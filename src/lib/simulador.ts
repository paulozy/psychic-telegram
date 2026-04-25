import type { ApuracaoAno, DadosOperacao, Estado, Operacao } from '@/types/simulador'

export const OPERACOES: Operacao[] = [
  { key: 'rec_locacao',  label: 'Rec. Locação',        tipo: 'debito'  },
  { key: 'venda_ativo',  label: 'Venda Ativo',          tipo: 'debito'  },
  { key: 'cred_serv',    label: 'Serv. Tomados',        tipo: 'credito' },
  { key: 'compra_ativo', label: 'Compra Ativo',         tipo: 'credito' },
  { key: 'cred_deprec',  label: 'Deprec. Fiscal',       tipo: 'credito' },
  { key: 'cred_juros',   label: 'Juros s/ Empréstimo',  tipo: 'credito' },
]

export const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

// ─── Tabela de alíquotas LC 214/2025 ───────────────────────────────────────

type AliquotaOp = {
  aliqPis:  number
  aliqCof:  number
  aliqCbs:  number
  aliqIbsE: number
  aliqIbsM: number
  pRedIbs?: number  // redução de base IBS — somente venda_ativo 2029–2032
}

export const ALIQUOTAS_POR_ANO: Record<number, Record<string, AliquotaOp>> = {
  2026: {
    rec_locacao:  { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    venda_ativo:  { aliqPis: 0,    aliqCof: 0,    aliqCbs: 0,    aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_serv:    { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    compra_ativo: { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_deprec:  { aliqPis: 1.65, aliqCof: 7.60, aliqCbs: 0.90, aliqIbsE: 0.10, aliqIbsM: 0    },
    cred_juros:   { aliqPis: 0,    aliqCof: 0,    aliqCbs: 0,    aliqIbsE: 0.10, aliqIbsM: 0    },
  },
  2027: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2028: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.40,  aliqIbsE: 0.05, aliqIbsM: 0.05 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 10.85, aliqIbsE: 0.05, aliqIbsM: 0.05 },
  },
  2029: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 0,     aliqIbsE: 1.60, aliqIbsM: 0.25, pRedIbs: 90 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 1.60, aliqIbsM: 0.25 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.00, aliqIbsE: 1.60, aliqIbsM: 0.25 },
  },
  2030: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50, pRedIbs: 80 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 3.20, aliqIbsM: 0.50 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.15, aliqIbsE: 3.20, aliqIbsM: 0.50 },
  },
  2031: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75, pRedIbs: 70 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 4.80, aliqIbsM: 0.75 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.30, aliqIbsE: 4.80, aliqIbsM: 0.75 },
  },
  2032: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00, pRedIbs: 60 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 6.40, aliqIbsM: 1.00 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 11.50, aliqIbsE: 6.40, aliqIbsM: 1.00 },
  },
  2033: {
    rec_locacao:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    venda_ativo:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_serv:    { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    compra_ativo: { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_deprec:  { aliqPis: 0, aliqCof: 0, aliqCbs: 8.50,  aliqIbsE: 16.00, aliqIbsM: 2.50 },
    cred_juros:   { aliqPis: 0, aliqCof: 0, aliqCbs: 12.50, aliqIbsE: 16.00, aliqIbsM: 2.50 },
  },
}

// ─── Estado inicial ─────────────────────────────────────────────────────────

export function dadosIniciais(): DadosOperacao {
  return {
    valor: 0,
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
 * @param pRedIbs  Percentual de redução de base IBS (somente venda_ativo 2029–2032).
 *                 Quando fornecido, baseIbs = valor × (1 - pRedIbs/100).
 */
export function calcularOp(d: DadosOperacao, ano?: number, pRedIbs?: number): DadosOperacao {
  const valPis = d.basePis * (d.aliqPis / 100)
  const valCof = d.baseCof * (d.aliqCof / 100)

  let baseCbs: number
  let baseIbs: number

  if (pRedIbs !== undefined) {
    // Venda Ativo 2029–2032: CBS usa base cheia; IBS usa base reduzida
    baseCbs = d.baseCbs
    baseIbs = d.valor * (1 - pRedIbs / 100)
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
    pis: zero(),
    cofins: zero(),
    cbs: zero(),
    ibs: zero(),
    ibsE: zero(),
    ibsM: zero(),
    receita: 0,
    totalAPagar: 0,
    saldoCreedor: 0,
    cargaEfetiva: 0,
    cargaBruta: 0,
  }

  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    const isDebito = op.tipo === 'debito'

    if (isDebito) result.receita += d.valor

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

  // Calcular saldos por tributo
  ;(['pis', 'cofins', 'cbs', 'ibsE', 'ibsM'] as const).forEach(t => {
    result[t].saldo = result[t].debito - result[t].credito
  })

  // IBS consolidado = E + M
  result.ibs.debito = result.ibsE.debito + result.ibsM.debito
  result.ibs.credito = result.ibsE.credito + result.ibsM.credito
  result.ibs.saldo = result.ibsE.saldo + result.ibsM.saldo

  // Totais
  const todosOsSaldos = [result.pis, result.cofins, result.cbs, result.ibsE, result.ibsM]
  result.totalAPagar = todosOsSaldos.reduce((acc, t) => acc + Math.max(0, t.saldo), 0)
  result.saldoCreedor = todosOsSaldos.reduce((acc, t) => acc + Math.abs(Math.min(0, t.saldo)), 0)

  // Cargas
  if (result.receita > 0) {
    result.cargaEfetiva = (result.totalAPagar / result.receita) * 100
    const totalDebitoTrib = result.pis.debito + result.cofins.debito + result.cbs.debito + result.ibsE.debito + result.ibsM.debito
    result.cargaBruta = (totalDebitoTrib / result.receita) * 100
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

/** Atualiza o valor de uma operação e recalcula, aplicando pRedIbs quando necessário. */
export function atualizarValor(
  estado: Estado,
  ano: number,
  key: string,
  valor: number
): Estado {
  const aliq = ALIQUOTAS_POR_ANO[ano]?.[key]
  const d = calcularOp({
    ...estado[ano][key],
    valor,
    basePis: valor,
    baseCof: valor,
    baseCbs: valor,
    baseIbs: valor,
  }, ano, aliq?.pRedIbs)
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
  const aliq = ALIQUOTAS_POR_ANO[ano]?.[key]
  const atualizado = calcularOp({ ...estado[ano][key], [field]: valor }, ano, aliq?.pRedIbs)
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
    }, ano, aliq.pRedIbs)
  })
  return { ...estado, [ano]: novoAno }
}

/** Aplica alíquotas especificadas pelo usuário a todas as operações de um ano. */
export function aplicarAliquotasGlobais(
  estado: Estado,
  ano: number,
  aliquotasAplicar: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>
): Estado {
  const aliqAno = ALIQUOTAS_POR_ANO[ano]
  const novoAno = { ...estado[ano] }
  OPERACOES.forEach(op => {
    const d = estado[ano][op.key]
    const aliq = aliqAno[op.key]
    const novosDados = {
      ...d,
      aliqPis:  'aliqPis' in aliquotasAplicar ? aliquotasAplicar.aliqPis! : d.aliqPis,
      aliqCof:  'aliqCof' in aliquotasAplicar ? aliquotasAplicar.aliqCof! : d.aliqCof,
      aliqCbs:  'aliqCbs' in aliquotasAplicar ? aliquotasAplicar.aliqCbs! : d.aliqCbs,
      aliqIbsE: 'aliqIbsE' in aliquotasAplicar ? aliquotasAplicar.aliqIbsE! : d.aliqIbsE,
      aliqIbsM: 'aliqIbsM' in aliquotasAplicar ? aliquotasAplicar.aliqIbsM! : d.aliqIbsM,
    }
    novoAno[op.key] = calcularOp(novosDados, ano, aliq.pRedIbs)
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
