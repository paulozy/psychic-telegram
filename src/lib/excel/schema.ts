import type { DadosOperacao } from '@/types/simulador'

export const TEMPLATE_VERSION = 'arval-template-v2'
export const TEMPLATE_VERSION_V1 = 'arval-template-v1'

export const SHEET_LEIAME = 'Leia-me'

export interface SheetDetalhe {
  nome: string
  ops: string[]
}

export const SHEETS_DETALHE: SheetDetalhe[] = [
  { nome: 'Rec. Locação',       ops: ['rec_locacao'] },
  { nome: 'Receita Financeira', ops: ['receita_financeira'] },
  { nome: 'Ativo',              ops: ['venda_ativo', 'compra_ativo'] },
  { nome: 'Serv. Tomados',      ops: ['cred_serv'] },
  { nome: 'Deprec. Fiscal',     ops: ['cred_deprec'] },
  { nome: 'Juros s-Empréstimo', ops: ['cred_juros'] },
]

export const HEADERS = [
  'Ano', 'Operação', 'Valor da Operação',
  'Base PIS', 'Alíq. PIS (%)', 'Valor PIS',
  'Base COFINS', 'Alíq. COFINS (%)', 'Valor COFINS',
  'Base CBS', 'Alíq. CBS (%)', 'Valor CBS',
  'Base IBS', 'Alíq. IBS Est. (%)', 'Alíq. IBS Mun. (%)',
  'Valor IBS Est.', 'Valor IBS Mun.', 'Total Tributos',
  'VLA',
] as const

export const COL_ANO = 1
export const COL_OPERACAO = 2
export const COL_VALOR = 3
export const COL_ALIQ_PIS = 5
export const COL_ALIQ_COF = 8
export const COL_ALIQ_CBS = 11
export const COL_ALIQ_IBS_E = 14
export const COL_ALIQ_IBS_M = 15
export const COL_VLA = 19

export const COLS_EDITAVEIS: ReadonlyArray<number> = [
  COL_VALOR, COL_ALIQ_PIS, COL_ALIQ_COF, COL_ALIQ_CBS, COL_ALIQ_IBS_E, COL_ALIQ_IBS_M,
]

export const ALIQUOTA_FIELDS: ReadonlyArray<{
  col: number
  field: keyof Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>
}> = [
  { col: COL_ALIQ_PIS,   field: 'aliqPis'  },
  { col: COL_ALIQ_COF,   field: 'aliqCof'  },
  { col: COL_ALIQ_CBS,   field: 'aliqCbs'  },
  { col: COL_ALIQ_IBS_E, field: 'aliqIbsE' },
  { col: COL_ALIQ_IBS_M, field: 'aliqIbsM' },
]
