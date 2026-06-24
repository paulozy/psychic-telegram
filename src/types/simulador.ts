export type TipoOperacao = 'debito' | 'credito'

export type CategoriaReceita = 'padrao' | 'regime_especifico' | 'fora_base'

export type BucketAquisicao =
  | 'pre-jul-2024'
  | '2024-2026'
  | '2027-2028'
  | '2029'
  | '2030'
  | '2031'
  | '2032'
  | '2033+'

export interface Operacao {
  key: string
  label: string
  tipo: TipoOperacao
  categoria?: CategoriaReceita
}

export interface DadosOperacao {
  valor: number
  /** Redução de base aplicada antes do cálculo de CBS/IBS. Em venda_ativo equivale ao VLA (LC 214/2025 arts. 108/109 + 406). */
  reducaoBase: number
  /** Ano (ou intervalo) de aquisição do bem. Só usado em venda_ativo. Default '2024-2026'. */
  bucketAquisicao?: BucketAquisicao
  basePis: number
  aliqPis: number
  valPis: number
  baseCof: number
  aliqCof: number
  valCof: number
  baseCbs: number
  aliqCbs: number
  valCbs: number
  baseIbs: number
  aliqIbsE: number
  aliqIbsM: number
  valIbsE: number
  valIbsM: number
}

export type EstadoAno = Record<string, DadosOperacao>
export type Estado = Record<number, EstadoAno>

export interface ApuracaoTributo {
  debito: number
  credito: number
  saldo: number
}

export interface ApuracaoAno {
  pis: ApuracaoTributo
  cofins: ApuracaoTributo
  cbs: ApuracaoTributo
  ibs: ApuracaoTributo
  ibsE: ApuracaoTributo
  ibsM: ApuracaoTributo

  receitaPadrao: number
  receitaRegimeEspecifico: number
  receitaForaBase: number
  receitaTributavel: number
  receitaTotal: number

  totalAPagar: number
  saldoCredor: number

  cargaPadrao: number
  cargaConsolidada: number
  cargaSobreReceitaTotal: number
  cargaBruta: number
}

/** Formato de exibição de um termo/resultado de breakdown. */
export type BreakdownFormato = 'moeda' | 'percent' | 'pp' | 'fator'

/** Um termo (parcela) que entra numa fórmula de cálculo. */
export interface BreakdownTermo {
  label: string
  valor: number
  /** Default 'moeda'. */
  formato?: BreakdownFormato
  /** Operador mostrado antes do termo na lista (o 1º termo geralmente não tem). */
  operador?: '+' | '−' | '×' | '÷'
}

/**
 * Explicação derivada de como um número exibido foi calculado.
 * Sempre produzida a partir do MESMO cálculo de apurarAno/calcularOp — nunca
 * escrita à mão — para não sair de sincronia com o valor exibido.
 */
export interface Breakdown {
  titulo: string
  formula: string
  termos: BreakdownTermo[]
  resultado: number
  /** Default 'moeda'. */
  resultadoFormato?: BreakdownFormato
  /** Referência legal ou observação curta. */
  nota?: string
}
