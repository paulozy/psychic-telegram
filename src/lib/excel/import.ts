import ExcelJS from 'exceljs'
import {
  ALIQUOTAS_POR_ANO,
  ANOS,
  OPERACOES,
  atualizarAliquota,
  atualizarValor,
  atualizarReducaoBase,
  estadoInicial,
} from '../simulador.ts'
import type { DadosOperacao, Estado } from '@/types/simulador'
import {
  ALIQUOTA_FIELDS,
  COL_ANO,
  COL_OPERACAO,
  COL_VALOR,
  HEADERS,
  SHEETS_DETALHE,
  SHEET_LEIAME,
  TEMPLATE_VERSION,
  TEMPLATE_VERSION_V1,
  TEMPLATE_VERSION_V2,
  type SheetDetalhe,
} from './schema.ts'

export interface ImportError {
  sheet: string
  cell?: string
  reason: string
}

export type ImportResult =
  | { ok: true; estado: Estado; mudancas: number }
  | { ok: false; errors: ImportError[] }

const SHEET_APURACAO = 'Apuração Geral'

function colLetter(col: number): string {
  let s = ''
  let n = col
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row}`
}

/** Extrai um número de uma célula ExcelJS, tolerando fórmulas, strings pt-BR e null. */
function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'object') {
    const obj = value as { result?: unknown; formula?: unknown; richText?: Array<{ text?: string }> }
    if ('result' in obj && obj.result !== undefined) return readNumber(obj.result)
    if (Array.isArray(obj.richText)) {
      const txt = obj.richText.map(r => r.text ?? '').join('')
      return readNumber(txt)
    }
    return null
  }
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/R\$/gi, '')
      .replace(/%/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
    if (cleaned === '' || cleaned === '-') return 0
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Lê texto puro de uma célula ExcelJS. */
function readString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value).trim()
  if (typeof value === 'object') {
    const obj = value as { result?: unknown; richText?: Array<{ text?: string }> }
    if ('result' in obj && obj.result !== undefined) return readString(obj.result)
    if (Array.isArray(obj.richText)) {
      return obj.richText.map(r => r.text ?? '').join('').trim()
    }
  }
  return String(value).trim()
}

function buildHeaderMap(ws: ExcelJS.Worksheet): Record<string, number> {
  const map: Record<string, number> = {}
  const headerRow = ws.getRow(2)
  for (let c = 1; c <= 20; c++) {
    const v = readString(headerRow.getCell(c).value)
    if (v) map[v] = c
  }
  return map
}

interface RowParsed {
  ano: number
  opKey: string
  valor: number
  reducaoBase?: number
  aliquotas: Partial<Pick<DadosOperacao, 'aliqPis' | 'aliqCof' | 'aliqCbs' | 'aliqIbsE' | 'aliqIbsM'>>
}

function parseDetalheSheet(
  ws: ExcelJS.Worksheet,
  sd: SheetDetalhe,
  errors: ImportError[]
): RowParsed[] {
  const rows: RowParsed[] = []

  // Valida headers obrigatórios
  const headerMap = buildHeaderMap(ws)
  const required = [
    HEADERS[COL_ANO - 1],
    HEADERS[COL_OPERACAO - 1],
    HEADERS[COL_VALOR - 1],
    ...ALIQUOTA_FIELDS.map(a => HEADERS[a.col - 1]),
  ]
  for (const h of required) {
    if (!(h in headerMap)) {
      errors.push({ sheet: sd.nome, reason: `Cabeçalho ausente: "${h}"` })
      return rows
    }
  }

  const colAno = headerMap[HEADERS[COL_ANO - 1]]
  const colOp  = headerMap[HEADERS[COL_OPERACAO - 1]]
  const colVal = headerMap[HEADERS[COL_VALOR - 1]]

  const opsValidos = sd.ops
    .map(k => OPERACOES.find(o => o.key === k))
    .filter((o): o is NonNullable<typeof o> => Boolean(o))

  const totalAnos = ANOS.length
  const totalRows = sd.ops.length * totalAnos

  for (let i = 0; i < totalRows; i++) {
    const rowIdx = 3 + i
    const row = ws.getRow(rowIdx)

    const anoRaw = row.getCell(colAno).value
    if (readString(anoRaw).toUpperCase() === 'TOTAL') break

    const ano = readNumber(anoRaw)
    if (ano === null || !ANOS.includes(ano)) {
      errors.push({
        sheet: sd.nome,
        cell: cellRef(colAno, rowIdx),
        reason: `Ano inválido: "${readString(anoRaw)}"`,
      })
      continue
    }

    const opLabel = readString(row.getCell(colOp).value)
    // Backward compat v1/v2: label "Venda Ativo" antigo mapeia para "Venda Ativo (pré-2026)" (premissa: frota antiga).
    const labelNormalizado = opLabel === 'Venda Ativo' ? 'Venda Ativo (pré-2026)' : opLabel
    const op = opsValidos.find(o => o.label === labelNormalizado)
    if (!op) {
      errors.push({
        sheet: sd.nome,
        cell: cellRef(colOp, rowIdx),
        reason: `Operação não reconhecida: "${opLabel}"`,
      })
      continue
    }

    const valor = readNumber(row.getCell(colVal).value)
    if (valor === null) {
      errors.push({
        sheet: sd.nome,
        cell: cellRef(colVal, rowIdx),
        reason: 'Valor não numérico',
      })
      continue
    }
    if (valor < 0) {
      errors.push({
        sheet: sd.nome,
        cell: cellRef(colVal, rowIdx),
        reason: 'Valor não pode ser negativo',
      })
      continue
    }

    const aliquotas: RowParsed['aliquotas'] = {}
    let aliqErro = false
    for (const { col, field } of ALIQUOTA_FIELDS) {
      const aliqCol = headerMap[HEADERS[col - 1]]
      const a = readNumber(row.getCell(aliqCol).value)
      if (a === null) {
        errors.push({
          sheet: sd.nome,
          cell: cellRef(aliqCol, rowIdx),
          reason: 'Alíquota não numérica',
        })
        aliqErro = true
        continue
      }
      if (a < 0 || a > 100) {
        errors.push({
          sheet: sd.nome,
          cell: cellRef(aliqCol, rowIdx),
          reason: `Alíquota fora da faixa 0–100: ${a}`,
        })
        aliqErro = true
        continue
      }
      aliquotas[field] = a
    }
    if (aliqErro) continue

    // VLA é opcional (templates v1 não têm essa coluna; só venda_ativo usa)
    let reducaoBase: number | undefined = undefined
    const colVla = headerMap['VLA']
    if (colVla !== undefined && op.key.startsWith('venda_ativo')) {
      const vlaRaw = row.getCell(colVla).value
      // Célula com "—" ou texto não numérico vira null em readNumber; aceitamos como ausente.
      const vlaNum = readNumber(vlaRaw)
      if (vlaNum !== null && vlaNum >= 0) {
        reducaoBase = vlaNum
      }
    }

    rows.push({ ano, opKey: op.key, valor, reducaoBase, aliquotas })
  }

  return rows
}

function checkVersao(wb: ExcelJS.Workbook, errors: ImportError[]): 'template-v1' | 'template-v2' | 'template-v3' | 'export' | 'invalido' {
  const leiaMe = wb.getWorksheet(SHEET_LEIAME)
  if (leiaMe) {
    const versao = readString(leiaMe.getCell('B2').value)
    if (versao === TEMPLATE_VERSION) return 'template-v3'
    if (versao === TEMPLATE_VERSION_V2) return 'template-v2'
    if (versao === TEMPLATE_VERSION_V1) return 'template-v1'
    errors.push({
      sheet: SHEET_LEIAME,
      cell: 'B2',
      reason: `Versão de template incompatível: "${versao || '(vazio)'}". Aceitos: ${TEMPLATE_VERSION}, ${TEMPLATE_VERSION_V2}, ${TEMPLATE_VERSION_V1}`,
    })
    return 'invalido'
  }
  // Sem Leia-me: aceita se for um arquivo exportado (tem Apuração Geral)
  if (wb.getWorksheet(SHEET_APURACAO)) return 'export'
  errors.push({
    sheet: SHEET_LEIAME,
    reason: `Sheet "${SHEET_LEIAME}" não encontrada — arquivo não parece ser um template válido`,
  })
  return 'invalido'
}

function contarMudancas(antes: Estado, depois: Estado): number {
  let n = 0
  for (const ano of ANOS) {
    for (const op of OPERACOES) {
      const a = antes[ano]?.[op.key]
      const d = depois[ano]?.[op.key]
      if (!a || !d) continue
      const fields: ReadonlyArray<keyof DadosOperacao> = [
        'valor', 'reducaoBase',
        'aliqPis', 'aliqCof', 'aliqCbs', 'aliqIbsE', 'aliqIbsM',
      ]
      for (const f of fields) {
        if (a[f] !== d[f]) n++
      }
    }
  }
  return n
}

export async function importarXlsx(file: File, estadoAtual: Estado): Promise<ImportResult> {
  const errors: ImportError[] = []
  const wb = new ExcelJS.Workbook()
  try {
    const buf = await file.arrayBuffer()
    await wb.xlsx.load(buf)
  } catch (e) {
    return {
      ok: false,
      errors: [{ sheet: '(arquivo)', reason: `Falha ao ler o arquivo XLSX: ${(e as Error).message}` }],
    }
  }

  const tipo = checkVersao(wb, errors)
  if (tipo === 'invalido') return { ok: false, errors }

  const todasRows: RowParsed[] = []
  for (const sd of SHEETS_DETALHE) {
    const ws = wb.getWorksheet(sd.nome)
    if (!ws) {
      errors.push({ sheet: sd.nome, reason: 'Sheet não encontrada' })
      continue
    }
    const rows = parseDetalheSheet(ws, sd, errors)
    todasRows.push(...rows)
  }

  if (errors.length > 0) return { ok: false, errors }

  // Reconstrói estado
  let novo = estadoInicial()
  for (const r of todasRows) {
    novo = atualizarValor(novo, r.ano, r.opKey, r.valor)
    if (r.reducaoBase !== undefined && r.opKey.startsWith('venda_ativo')) {
      novo = atualizarReducaoBase(novo, r.ano, r.opKey, r.reducaoBase)
    }
    const tabela = ALIQUOTAS_POR_ANO[r.ano][r.opKey]
    const defaults = {
      aliqPis: tabela.aliqPis,
      aliqCof: tabela.aliqCof,
      aliqCbs: tabela.aliqCbs,
      aliqIbsE: tabela.aliqIbsE,
      aliqIbsM: tabela.aliqIbsM,
    }
    for (const [field, val] of Object.entries(r.aliquotas) as Array<
      [keyof typeof defaults, number]
    >) {
      if (val !== defaults[field]) {
        novo = atualizarAliquota(novo, r.ano, r.opKey, field, val)
      }
    }
  }

  return { ok: true, estado: novo, mudancas: contarMudancas(estadoAtual, novo) }
}
