export type TipoOperacao = 'debito' | 'credito'

export interface Operacao {
  key: string
  label: string
  tipo: TipoOperacao
}

export interface DadosOperacao {
  valor: number
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
