import ExcelJS from 'exceljs'
import type { Estado } from '@/types/simulador'
import { ANOS, OPERACOES, regraVendaAtivo } from './simulador.ts'
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

function addApuracaoGeral(wb: ExcelJS.Workbook, estado: Estado) {
  const ws = wb.addWorksheet('Apuração Geral')

  // Column widths
  ws.getColumn(1).width = 8
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 20
  ws.getColumn(4).width = 20
  ws.getColumn(5).width = 20
  for (let i = 6; i <= 12; i++) ws.getColumn(i).width = 18

  // Row 1 — main title (cols A–H)
  ws.getRow(1).height = 26
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'CALCULADORA REFORMA TRIBUTÁRIA — ARVAL BRASIL'
  applyTitleStyle(titleCell)

  // Row 2 — empty
  ws.getRow(2).height = 8

  // ── DÉBITOS (row 3 onward) ────────────────────────────────────────────────

  // Row 3 — section header
  ws.getRow(3).height = 20
  ws.mergeCells('A3:I3')
  const debCell = ws.getCell('A3')
  debCell.value = 'DÉBITOS'
  applySectionStyle(debCell)

  // Row 4 — column headers for DÉBITOS
  const debHdrs = [
    'Ano', 'Rec. Locação', 'Receita Financeira', 'Venda Ativo',
    'Total Débitos', 'CBS Déb.', 'IBS Est. Déb.', 'IBS Mun. Déb.', 'Total Trib. Déb.',
  ]
  const debHdrRow = ws.getRow(4)
  debHdrRow.height = 30
  debHdrs.forEach((h, i) => {
    const cell = debHdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  // Rows 5–12 — débito data
  const debTotals = new Array(9).fill(0)
  for (let ai = 0; ai < ANOS.length; ai++) {
    const ano = ANOS[ai]
    const rl = zero(estado, ano, 'rec_locacao')
    const rf = zero(estado, ano, 'receita_financeira')
    const va = zero(estado, ano, 'venda_ativo')
    const totalDeb = rl.valor + rf.valor + va.valor
    const cbsDeb   = rl.valCbs + rf.valCbs + va.valCbs
    const ibsEDeb  = rl.valIbsE + rf.valIbsE + va.valIbsE
    const ibsMDeb  = rl.valIbsM + rf.valIbsM + va.valIbsM
    const tribDeb  = cbsDeb + ibsEDeb + ibsMDeb +
      rl.valPis + rl.valCof + rf.valPis + rf.valCof + va.valPis + va.valCof

    const vals = [ano, rl.valor, rf.valor, va.valor, totalDeb, cbsDeb, ibsEDeb, ibsMDeb, tribDeb]
    const row = ws.getRow(5 + ai)
    row.height = 18
    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1)
      if (ci === 0) {
        cell.value = v
        applyAltFill(cell, ai)
      } else {
        setMoney(cell, v as number, ai)
      }
    })
    for (let ci = 1; ci < 9; ci++) debTotals[ci] += vals[ci] as number
  }

  // Row 13 — TOTAL
  const debTotalRow = ws.getRow(13)
  debTotalRow.height = 18
  debTotalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(debTotalRow.getCell(1))
  for (let ci = 1; ci < 9; ci++) {
    const cell = debTotalRow.getCell(ci + 1)
    cell.value = debTotals[ci]
    cell.numFmt = FMT_MONEY
    applyTotalStyle(cell)
  }

  // ── CRÉDITOS (row 15 onward) ──────────────────────────────────────────────

  // Row 14 — empty spacer
  ws.getRow(14).height = 8

  // Row 15 — section header
  ws.getRow(15).height = 20
  ws.mergeCells('A15:J15')
  const credCell = ws.getCell('A15')
  credCell.value = 'CRÉDITOS'
  applySectionStyle(credCell)

  // Row 16 — column headers for CRÉDITOS
  const credHdrs = [
    'Ano', 'Serv. Tomados', 'Compra Ativo', 'Deprec. Fiscal', 'Juros s/Emp.',
    'Total Créditos', 'CBS Créd.', 'IBS Est. Créd.', 'IBS Mun. Créd.', 'Total Trib. Créd.',
  ]
  const credHdrRow = ws.getRow(16)
  credHdrRow.height = 30
  credHdrs.forEach((h, i) => {
    const cell = credHdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  // Rows 17–24 — crédito data
  const credTotals = new Array(10).fill(0)
  for (let ai = 0; ai < ANOS.length; ai++) {
    const ano = ANOS[ai]
    const cs = zero(estado, ano, 'cred_serv')
    const ca = zero(estado, ano, 'compra_ativo')
    const cd = zero(estado, ano, 'cred_deprec')
    const cj = zero(estado, ano, 'cred_juros')
    const totalCred = cs.valor + ca.valor + cd.valor + cj.valor
    const cbsCred   = cs.valCbs + ca.valCbs + cd.valCbs + cj.valCbs
    const ibsECred  = cs.valIbsE + ca.valIbsE + cd.valIbsE + cj.valIbsE
    const ibsMCred  = cs.valIbsM + ca.valIbsM + cd.valIbsM + cj.valIbsM
    const tribCred  = cbsCred + ibsECred + ibsMCred +
      cs.valPis + cs.valCof + ca.valPis + ca.valCof +
      cd.valPis + cd.valCof + cj.valPis + cj.valCof

    const vals = [ano, cs.valor, ca.valor, cd.valor, cj.valor, totalCred, cbsCred, ibsECred, ibsMCred, tribCred]
    const row = ws.getRow(17 + ai)
    row.height = 18
    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1)
      if (ci === 0) {
        cell.value = v
        applyAltFill(cell, ai)
      } else {
        setMoney(cell, v as number, ai)
      }
    })
    for (let ci = 1; ci < 10; ci++) credTotals[ci] += vals[ci] as number
  }

  // Row 25 — TOTAL
  const credTotalRow = ws.getRow(25)
  credTotalRow.height = 18
  credTotalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(credTotalRow.getCell(1))
  for (let ci = 1; ci < 10; ci++) {
    const cell = credTotalRow.getCell(ci + 1)
    cell.value = credTotals[ci]
    cell.numFmt = FMT_MONEY
    applyTotalStyle(cell)
  }

  // ── RESULTADO (row 27 onward) ─────────────────────────────────────────────

  // Row 26 — empty spacer
  ws.getRow(26).height = 8

  // Row 27 — section header
  ws.getRow(27).height = 20
  ws.mergeCells('A27:E27')
  const resCell = ws.getCell('A27')
  resCell.value = 'RESULTADO'
  applySectionStyle(resCell)

  // Row 28 — column headers for RESULTADO
  const resHdrs = ['Ano', 'CBS Líquido', 'IBS Est. Líquido', 'IBS Mun. Líquido', 'Total Trib. Líquido']
  const resHdrRow = ws.getRow(28)
  resHdrRow.height = 30
  resHdrs.forEach((h, i) => {
    const cell = resHdrRow.getCell(i + 1)
    cell.value = h
    applyHeaderStyle(cell)
  })

  // Rows 29–36 — resultado data
  const resTotals = new Array(5).fill(0)
  for (let ai = 0; ai < ANOS.length; ai++) {
    const ano = ANOS[ai]

    // Débitos
    const rl = zero(estado, ano, 'rec_locacao')
    const rf = zero(estado, ano, 'receita_financeira')
    const va = zero(estado, ano, 'venda_ativo')
    const cbsDeb  = rl.valCbs + rf.valCbs + va.valCbs +
      rl.valPis + rl.valCof + rf.valPis + rf.valCof + va.valPis + va.valCof
    const ibsEDeb = rl.valIbsE + rf.valIbsE + va.valIbsE
    const ibsMDeb = rl.valIbsM + rf.valIbsM + va.valIbsM

    // Créditos
    const cs = zero(estado, ano, 'cred_serv')
    const ca = zero(estado, ano, 'compra_ativo')
    const cd = zero(estado, ano, 'cred_deprec')
    const cj = zero(estado, ano, 'cred_juros')
    const cbsCred  = cs.valCbs + ca.valCbs + cd.valCbs + cj.valCbs +
      cs.valPis + cs.valCof + ca.valPis + ca.valCof +
      cd.valPis + cd.valCof + cj.valPis + cj.valCof
    const ibsECred = cs.valIbsE + ca.valIbsE + cd.valIbsE + cj.valIbsE
    const ibsMCred = cs.valIbsM + ca.valIbsM + cd.valIbsM + cj.valIbsM

    const cbsLiq  = cbsDeb  - cbsCred
    const ibsELiq = ibsEDeb - ibsECred
    const ibsMLiq = ibsMDeb - ibsMCred
    const totalLiq = cbsLiq + ibsELiq + ibsMLiq

    const vals = [ano, cbsLiq, ibsELiq, ibsMLiq, totalLiq]
    const row = ws.getRow(29 + ai)
    row.height = 18
    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1)
      if (ci === 0) {
        cell.value = v
        applyAltFill(cell, ai)
      } else {
        setMoney(cell, v as number, ai)
      }
    })
    for (let ci = 1; ci < 5; ci++) resTotals[ci] += vals[ci] as number
  }

  // Row 37 — TOTAL
  const resTotalRow = ws.getRow(37)
  resTotalRow.height = 18
  resTotalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(resTotalRow.getCell(1))
  for (let ci = 1; ci < 5; ci++) {
    const cell = resTotalRow.getCell(ci + 1)
    cell.value = resTotals[ci]
    cell.numFmt = FMT_MONEY
    applyTotalStyle(cell)
  }
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
