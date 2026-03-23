import type { DadosOperacao, Estado, Operacao } from '@/types/simulador'

export const OPERACOES: Operacao[] = [
  { key: 'rec_locacao', label: 'Rec. Locação', tipo: 'debito' },
  { key: 'rec_ativo', label: 'Rec. Ativo', tipo: 'debito' },
  { key: 'cred_serv', label: 'Serv. Tomados', tipo: 'credito' },
  { key: 'cred_deprec', label: 'Deprec. Fiscal', tipo: 'credito' },
  { key: 'cred_juros', label: 'Juros s/ Empréstimo', tipo: 'credito' },
]

export const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]

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
    OPERACOES.forEach(op => { s[ano][op.key] = dadosIniciais() })
  })
  return s
}

export function calcularOp(d: DadosOperacao, ano?: number): DadosOperacao {
  const valPis = d.basePis * (d.aliqPis / 100)
  const valCof = d.baseCof * (d.aliqCof / 100)

  // Em 2026 a base de CBS e IBS é o valor da operação menos PIS e COFINS
  const baseCbs = ano === 2026 ? Math.max(0, d.valor - valPis - valCof) : d.baseCbs
  const baseIbs = ano === 2026 ? Math.max(0, d.valor - valPis - valCof) : d.baseIbs

  return {
    ...d,
    baseCbs,
    baseIbs,
    valPis,
    valCof,
    valCbs: baseCbs * (d.aliqCbs / 100),
    valIbsE: baseIbs * (d.aliqIbsE / 100),
    valIbsM: baseIbs * (d.aliqIbsM / 100),
  }
}

export function totalOp(d: DadosOperacao): number {
  return d.valPis + d.valCof + d.valCbs + d.valIbsE + d.valIbsM
}

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

export function hasData(estado: Estado, ano: number): boolean {
  return OPERACOES.some(op => {
    const d = estado[ano][op.key]
    return d.valor > 0 || d.baseCbs > 0 || d.basePis > 0
  })
}

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
    baseCbs: valor, // será recalculada em calcularOp se ano === 2026
    baseIbs: valor,
  }, ano)
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: d },
  }
}

export function atualizarAliquota(
  estado: Estado,
  ano: number,
  key: string,
  field: keyof DadosOperacao,
  valor: number
): Estado {
  const atualizado = calcularOp({ ...estado[ano][key], [field]: valor }, ano)
  return {
    ...estado,
    [ano]: { ...estado[ano], [key]: atualizado },
  }
}

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