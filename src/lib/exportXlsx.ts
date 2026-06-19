import ExcelJS from 'exceljs'
import type { Estado } from '@/types/simulador'
import { ANOS, OPERACOES, apurarAno, regraVendaAtivo } from './simulador.ts'
import {
  COL_BUCKET,
  COL_FATOR_IBS,
  HEADERS,
  SHEET_LEIAME,
  TEMPLATE_VERSION,
} from './excel/schema.ts'
import type { DadosOperacao } from '@/types/simulador'

// ─── Colors ────────────────────────────────────────────────────────────────

const CLR_TITLE   = { argb: 'FF1F3864' }
const CLR_SECTION = { argb: 'FF2E75B6' }
const CLR_HEADER  = { argb: 'FFD6E4F0' }
const CLR_ALT     = { argb: 'FFF5F9FF' }
const CLR_WHITE   = { argb: 'FFFFFFFF' }
const CLR_BLACK   = { argb: 'FF000000' }

const FMT_MONEY = '"R$ "#,##0.00'
const FMT_PCT   = '0.00"%"'

// ─── Helpers ────────────────────────────────────────────────────────────────

function zero(estado: Estado, ano: number, key: string): DadosOperacao {
  return estado[ano]?.[key] ?? {
    valor: 0,
    reducaoBase: 0,
    bucketAquisicao: '2024-2026',
    basePis: 0, aliqPis: 0, valPis: 0,
    baseCof: 0, aliqCof: 0, valCof: 0,
    baseCbs: 0, aliqCbs: 0, valCbs: 0,
    baseIbs: 0, aliqIbsE: 0, aliqIbsM: 0, valIbsE: 0, valIbsM: 0,
  }
}

function totalOp(d: DadosOperacao): number {
  return d.valPis + d.valCof + d.valCbs + d.valIbsE + d.valIbsM
}

function applyTitleStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 14, color: CLR_WHITE }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_TITLE }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function applySectionStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: CLR_WHITE }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_SECTION }
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: CLR_BLACK }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_HEADER }
  cell.border = { bottom: { style: 'thin' } }
  cell.alignment = { horizontal: 'center', wrapText: true }
}

function applyTotalStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true }
  cell.border = { top: { style: 'double' } }
}

function applyAltFill(cell: ExcelJS.Cell, rowIdx: number) {
  if (rowIdx % 2 === 0) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_ALT }
  }
}

// rowIdx: 0-based index within data rows (for alternating)
function setMoney(cell: ExcelJS.Cell, value: number, rowIdx: number) {
  cell.value = value
  cell.numFmt = FMT_MONEY
  applyAltFill(cell, rowIdx)
}

function setPct(cell: ExcelJS.Cell, value: number, rowIdx: number) {
  cell.value = value
  cell.numFmt = FMT_PCT
  applyAltFill(cell, rowIdx)
}

// ─── Detail sheet (one or two operations) ──────────────────────────────────

interface OpGroup {
  key: string
  label: string
}

function addDetailSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  opGroups: OpGroup[],
  estado: Estado
) {
  const ws = wb.addWorksheet(sheetName)

  // Column widths
  ws.getColumn(1).width = 8   // Ano
  ws.getColumn(2).width = 20  // Operação
  for (let i = 3; i <= 19; i++) ws.getColumn(i).width = 16
  ws.getColumn(COL_BUCKET).width = 18
  ws.getColumn(COL_FATOR_IBS).width = 12

  // Row 1 — title
  ws.getRow(1).height = 22
  ws.mergeCells('A1:U1')
  const titleCell = ws.getCell('A1')
  titleCell.value = sheetName.toUpperCase()
  applyTitleStyle(titleCell)

  // Row 2 — column headers (importado de schema para evitar duplicação com o template)
  const hdrRow = ws.getRow(2)
  hdrRow.height = 30
  HEADERS.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  // Data rows
  let rowNum = 3
  const totals = new Array(19).fill(0)
  const sheetTemVendaAtivo = opGroups.some(g => g.key === 'venda_ativo')

  for (const { key, label } of opGroups) {
    // Totals for this op group (for TOTAL row within group boundary, but plan says one TOTAL overall)
    for (let ai = 0; ai < ANOS.length; ai++) {
      const ano = ANOS[ai]
      const d = zero(estado, ano, key)
      const total = totalOp(d)
      const row = ws.getRow(rowNum)
      row.height = 18

      const vals = [
        ano, label, d.valor,
        d.basePis, d.aliqPis, d.valPis,
        d.baseCof, d.aliqCof, d.valCof,
        d.baseCbs, d.aliqCbs, d.valCbs,
        d.baseIbs, d.aliqIbsE, d.aliqIbsM,
        d.valIbsE, d.valIbsM, total,
      ]

      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        if (ci === 0) {
          // Ano
          cell.value = v as number
          applyAltFill(cell, ai)
        } else if (ci === 1) {
          // Label
          cell.value = v as string
          applyAltFill(cell, ai)
        } else if (ci === 4 || ci === 7 || ci === 10 || ci === 13 || ci === 14) {
          // Alíquotas
          setPct(cell, v as number, ai)
        } else {
          setMoney(cell, v as number, ai)
        }
      })

      // accumulate totals (skip Ano and Label cols, indices 2–17)
      for (let ci = 2; ci < 18; ci++) {
        totals[ci] += vals[ci] as number
      }

      // Col 19 — VLA / Custo de aquisição (índice 18 no array totals/vals).
      // Aplica a venda_ativo; outras ops mostram "—".
      const vlaCell = row.getCell(19)
      if (key === 'venda_ativo') {
        setMoney(vlaCell, d.reducaoBase, ai)
        totals[18] += d.reducaoBase
      } else {
        vlaCell.value = '—'
        applyAltFill(vlaCell, ai)
      }

      // Col 20 — Bucket aquisição. Só venda_ativo; outras = "—".
      const bucketCell = row.getCell(COL_BUCKET)
      if (key === 'venda_ativo') {
        bucketCell.value = d.bucketAquisicao ?? '2024-2026'
        applyAltFill(bucketCell, ai)
      } else {
        bucketCell.value = '—'
        applyAltFill(bucketCell, ai)
      }

      // Col 21 — Fator IBS (derivado de bucket × ano via art. 406)
      const fatorCell = row.getCell(COL_FATOR_IBS)
      if (key === 'venda_ativo') {
        const regra = regraVendaAtivo(d.bucketAquisicao ?? '2024-2026', ano)
        if (regra.aplicaProtecaoIBS) {
          fatorCell.value = regra.fatorVLA_IBS
          fatorCell.numFmt = '0.00'
        } else {
          fatorCell.value = '—'
        }
      } else {
        fatorCell.value = '—'
      }
      applyAltFill(fatorCell, ai)

      rowNum++
    }
  }

  // TOTAL row
  const totalRow = ws.getRow(rowNum)
  totalRow.height = 18
  totalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(totalRow.getCell(1))
  totalRow.getCell(2).value = ''
  applyTotalStyle(totalRow.getCell(2))

  for (let ci = 2; ci < 18; ci++) {
    const cell = totalRow.getCell(ci + 1)
    if (ci === 4 || ci === 7 || ci === 10 || ci === 13 || ci === 14) {
      // Alíquotas — average would not be meaningful; leave blank
      cell.value = ''
    } else {
      cell.value = totals[ci]
      cell.numFmt = FMT_MONEY
    }
    applyTotalStyle(cell)
  }

  // Col 19 — total da VLA (só faz sentido em sheet com venda_ativo)
  const vlaTotalCell = totalRow.getCell(19)
  if (sheetTemVendaAtivo) {
    vlaTotalCell.value = totals[18]
    vlaTotalCell.numFmt = FMT_MONEY
  } else {
    vlaTotalCell.value = '—'
  }
  applyTotalStyle(vlaTotalCell)

  // Col 20 — bucket total (vazio; agregar bucket não faz sentido)
  const bucketTotalCell = totalRow.getCell(COL_BUCKET)
  bucketTotalCell.value = ''
  applyTotalStyle(bucketTotalCell)

  // Col 21 — fator IBS total (vazio; média de fatores não faz sentido)
  const fatorTotalCell = totalRow.getCell(COL_FATOR_IBS)
  fatorTotalCell.value = ''
  applyTotalStyle(fatorTotalCell)
}

// ─── Apuração Geral ─────────────────────────────────────────────────────────

/**
 * Escreve uma tabela (anos nas linhas) com cabeçalho de seção, linha de cabeçalho,
 * dados e uma linha TOTAL. Coluna 0 = Ano (numérica); demais colunas = moeda.
 * Retorna o índice da próxima linha livre (já com um espaçador).
 */
function addTabela(
  ws: ExcelJS.Worksheet,
  startRow: number,
  titulo: string,
  headers: string[],
  linhas: number[][]
): number {
  // Section header
  const secRow = ws.getRow(startRow)
  secRow.height = 20
  ws.mergeCells(startRow, 1, startRow, headers.length)
  const secCell = ws.getCell(startRow, 1)
  secCell.value = titulo
  applySectionStyle(secCell)

  // Column headers
  const hdrRow = ws.getRow(startRow + 1)
  hdrRow.height = 30
  headers.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  // Data rows
  const totals = new Array(headers.length).fill(0)
  linhas.forEach((linha, ai) => {
    const row = ws.getRow(startRow + 2 + ai)
    row.height = 18
    linha.forEach((v, ci) => {
      const cell = row.getCell(ci + 1)
      if (ci === 0) {
        cell.value = v
        applyAltFill(cell, ai)
      } else {
        setMoney(cell, v, ai)
        totals[ci] += v
      }
    })
  })

  // TOTAL row
  const totalRow = ws.getRow(startRow + 2 + linhas.length)
  totalRow.height = 18
  totalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(totalRow.getCell(1))
  for (let ci = 1; ci < headers.length; ci++) {
    const cell = totalRow.getCell(ci + 1)
    cell.value = totals[ci]
    cell.numFmt = FMT_MONEY
    applyTotalStyle(cell)
  }

  // próxima linha livre + 1 espaçador
  return startRow + 3 + linhas.length + 1
}

/**
 * Aba "Apuração Geral": deriva tudo de `apurarAno` (saldo = débito − crédito por
 * tributo, com Math.max(0, saldo) no total a pagar). As colunas por operação das
 * seções DÉBITOS/CRÉDITOS são dirigidas por `OPERACOES`, então novas operações
 * aparecem automaticamente.
 */
function addApuracaoGeral(wb: ExcelJS.Workbook, estado: Estado) {
  const ws = wb.addWorksheet('Apuração Geral')

  const opsDebito  = OPERACOES.filter(o => o.tipo === 'debito')
  const opsCredito = OPERACOES.filter(o => o.tipo === 'credito')

  const debHeaders = [
    'Ano', ...opsDebito.map(o => o.label), 'Total Débitos',
    'PIS Déb.', 'COFINS Déb.', 'CBS Déb.', 'IBS Est. Déb.', 'IBS Mun. Déb.', 'Total Trib. Déb.',
  ]
  const credHeaders = [
    'Ano', ...opsCredito.map(o => o.label), 'Total Créditos',
    'PIS Créd.', 'COFINS Créd.', 'CBS Créd.', 'IBS Est. Créd.', 'IBS Mun. Créd.', 'Total Trib. Créd.',
  ]
  const resHeaders = [
    'Ano', 'PIS (saldo)', 'COFINS (saldo)', 'CBS (saldo)', 'IBS (saldo)',
    'Total a Pagar', 'Saldo Credor',
  ]

  const debRows = ANOS.map(ano => {
    const a = apurarAno(estado, ano)
    const vals = opsDebito.map(o => zero(estado, ano, o.key).valor)
    const totalVal = vals.reduce((s, v) => s + v, 0)
    const tribDeb = a.pis.debito + a.cofins.debito + a.cbs.debito + a.ibsE.debito + a.ibsM.debito
    return [ano, ...vals, totalVal, a.pis.debito, a.cofins.debito, a.cbs.debito, a.ibsE.debito, a.ibsM.debito, tribDeb]
  })
  const credRows = ANOS.map(ano => {
    const a = apurarAno(estado, ano)
    const vals = opsCredito.map(o => zero(estado, ano, o.key).valor)
    const totalVal = vals.reduce((s, v) => s + v, 0)
    const tribCred = a.pis.credito + a.cofins.credito + a.cbs.credito + a.ibsE.credito + a.ibsM.credito
    return [ano, ...vals, totalVal, a.pis.credito, a.cofins.credito, a.cbs.credito, a.ibsE.credito, a.ibsM.credito, tribCred]
  })
  const resRows = ANOS.map(ano => {
    const a = apurarAno(estado, ano)
    return [ano, a.pis.saldo, a.cofins.saldo, a.cbs.saldo, a.ibs.saldo, a.totalAPagar, a.saldoCredor]
  })

  const maxCols = Math.max(debHeaders.length, credHeaders.length, resHeaders.length)

  // Column widths
  ws.getColumn(1).width = 8
  for (let i = 2; i <= maxCols; i++) ws.getColumn(i).width = 18

  // Row 1 — main title
  ws.getRow(1).height = 26
  ws.mergeCells(1, 1, 1, maxCols)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = 'CALCULADORA REFORMA TRIBUTÁRIA — ARVAL BRASIL'
  applyTitleStyle(titleCell)

  // Row 2 — empty spacer
  ws.getRow(2).height = 8

  let next = 3
  next = addTabela(ws, next, 'DÉBITOS', debHeaders, debRows)
  next = addTabela(ws, next, 'CRÉDITOS', credHeaders, credRows)
  addTabela(ws, next, 'RESULTADO', resHeaders, resRows)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Função pura: monta o Workbook completo a partir do estado, sem efeitos
 * colaterais de browser (download, blob, etc.). Útil para testes node:test.
 */
function addLeiaMe(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(SHEET_LEIAME)
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 60

  ws.mergeCells('A1:B1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Exportação — Simulador Arval'
  titleCell.font = { bold: true, size: 14, color: CLR_WHITE }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_TITLE }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26

  ws.getCell('A2').value = 'Versão'
  ws.getCell('A2').font = { bold: true }
  ws.getCell('B2').value = TEMPLATE_VERSION

  ws.getCell('A3').value = 'Gerado em'
  ws.getCell('A3').font = { bold: true }
  ws.getCell('B3').value = new Date().toISOString().slice(0, 10)
}

export function buildWorkbook(estado: Estado): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Simulador Arval'
  wb.created = new Date()

  addLeiaMe(wb)
  addApuracaoGeral(wb, estado)

  addDetailSheet(wb, 'Rec. Locação', [
    { key: 'rec_locacao', label: OPERACOES.find(o => o.key === 'rec_locacao')!.label },
  ], estado)

  addDetailSheet(wb, 'Receita Financeira', [
    { key: 'receita_financeira', label: OPERACOES.find(o => o.key === 'receita_financeira')!.label },
  ], estado)

  addDetailSheet(wb, 'Ativo', [
    { key: 'venda_ativo', label: OPERACOES.find(o => o.key === 'venda_ativo')!.label },
    { key: 'compra_ativo', label: OPERACOES.find(o => o.key === 'compra_ativo')!.label },
  ], estado)

  addDetailSheet(wb, 'Serv. Tomados', [
    { key: 'cred_serv', label: OPERACOES.find(o => o.key === 'cred_serv')!.label },
  ], estado)

  addDetailSheet(wb, 'Deprec. Fiscal', [
    { key: 'cred_deprec', label: OPERACOES.find(o => o.key === 'cred_deprec')!.label },
  ], estado)

  addDetailSheet(wb, 'Juros s-Empréstimo', [
    { key: 'cred_juros', label: OPERACOES.find(o => o.key === 'cred_juros')!.label },
  ], estado)

  return wb
}

export async function exportarXlsx(estado: Estado): Promise<void> {
  const wb = buildWorkbook(estado)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Simulador_Arval_Reforma_Tributaria.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
