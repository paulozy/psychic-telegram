import ExcelJS from 'exceljs'
import { ALIQUOTAS_POR_ANO, ANOS, OPERACOES } from '@/lib/simulador'
import {
  COLS_EDITAVEIS,
  HEADERS,
  SHEETS_DETALHE,
  SHEET_LEIAME,
  TEMPLATE_VERSION,
} from './schema'

const CLR_TITLE   = { argb: 'FF1F3864' }
const CLR_HEADER  = { argb: 'FFD6E4F0' }
const CLR_LOCKED  = { argb: 'FFE7E7E7' }
const CLR_WHITE   = { argb: 'FFFFFFFF' }
const CLR_BLACK   = { argb: 'FF000000' }

const FMT_MONEY = '"R$ "#,##0.00'
const FMT_PCT   = '0.00"%"'

function applyTitle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 14, color: CLR_WHITE }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_TITLE }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function applyHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: CLR_BLACK }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_HEADER }
  cell.border = { bottom: { style: 'thin' } }
  cell.alignment = { horizontal: 'center', wrapText: true }
  cell.protection = { locked: true }
}

function applyTotalStyle(cell: ExcelJS.Cell) {
  cell.font = { bold: true }
  cell.border = { top: { style: 'double' } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_LOCKED }
  cell.protection = { locked: true }
}

function fillEditable(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_WHITE }
  cell.protection = { locked: false }
}

function fillLocked(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: CLR_LOCKED }
  cell.protection = { locked: true }
}

function isAliqCol(colIdx: number): boolean {
  return colIdx === 5 || colIdx === 8 || colIdx === 11 || colIdx === 14 || colIdx === 15
}

function addLeiaMe(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(SHEET_LEIAME)
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 60

  ws.mergeCells('A1:B1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Template de importação — Simulador Arval'
  applyTitle(titleCell)
  ws.getRow(1).height = 26

  ws.getCell('A2').value = 'Versão'
  ws.getCell('A2').font = { bold: true }
  ws.getCell('B2').value = TEMPLATE_VERSION

  ws.getCell('A3').value = 'Gerado em'
  ws.getCell('A3').font = { bold: true }
  ws.getCell('B3').value = new Date().toISOString().slice(0, 10)

  ws.getRow(4).height = 8

  ws.mergeCells('A5:B5')
  const instrTitle = ws.getCell('A5')
  instrTitle.value = 'Instruções'
  instrTitle.font = { bold: true, size: 12 }

  const instrucoes = [
    'Preencha apenas as células brancas (Valor da Operação e Alíquotas).',
    'Bases tributárias e valores calculados são recomputados automaticamente ao importar.',
    'As alíquotas vêm pré-preenchidas com os defaults da LC 214/2025; sobrescreva se necessário.',
    'A versão acima é validada na importação; não a altere.',
    'Sheets de operações: ' + SHEETS_DETALHE.map(s => s.nome).join(', ') + '.',
  ]
  instrucoes.forEach((txt, i) => {
    const r = ws.getRow(6 + i)
    r.getCell(1).value = `${i + 1}.`
    r.getCell(1).alignment = { vertical: 'top' }
    r.getCell(2).value = txt
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' }
  })

  const opsRowStart = 6 + instrucoes.length + 1
  ws.getCell(opsRowStart, 1).value = 'Operações'
  ws.getCell(opsRowStart, 1).font = { bold: true, size: 12 }
  OPERACOES.forEach((op, i) => {
    const r = ws.getRow(opsRowStart + 1 + i)
    r.getCell(1).value = op.label
    r.getCell(2).value = op.tipo === 'debito' ? 'Débito (gera tributo a pagar)' : 'Crédito (compensa débitos)'
  })
}

function addSheetDetalhe(wb: ExcelJS.Workbook, sheetNome: string, ops: string[]) {
  const ws = wb.addWorksheet(sheetNome)

  ws.getColumn(1).width = 8
  ws.getColumn(2).width = 20
  for (let i = 3; i <= 18; i++) ws.getColumn(i).width = 16

  ws.getRow(1).height = 22
  ws.mergeCells('A1:R1')
  const titleCell = ws.getCell('A1')
  titleCell.value = sheetNome.toUpperCase()
  applyTitle(titleCell)

  const hdrRow = ws.getRow(2)
  hdrRow.height = 30
  HEADERS.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1)
    cell.value = h
    applyHeader(cell)
  })

  let rowNum = 3
  for (const opKey of ops) {
    const op = OPERACOES.find(o => o.key === opKey)
    if (!op) continue

    for (const ano of ANOS) {
      const aliq = ALIQUOTAS_POR_ANO[ano][opKey]
      const row = ws.getRow(rowNum)
      row.height = 18

      // Col 1 — Ano (locked, mas com valor)
      const anoCell = row.getCell(1)
      anoCell.value = ano
      fillLocked(anoCell)

      // Col 2 — Operação label (locked)
      const opCell = row.getCell(2)
      opCell.value = op.label
      fillLocked(opCell)

      // Col 3 — Valor (editável, vazio = 0)
      const valorCell = row.getCell(3)
      valorCell.value = 0
      valorCell.numFmt = FMT_MONEY
      fillEditable(valorCell)

      // Cols 4..18 — bases/alíquotas/valores
      for (let c = 4; c <= 18; c++) {
        const cell = row.getCell(c)
        if (COLS_EDITAVEIS.includes(c)) {
          // Alíquotas: pré-preenchidas com defaults
          let preset = 0
          if (c === 5)  preset = aliq.aliqPis
          else if (c === 8)  preset = aliq.aliqCof
          else if (c === 11) preset = aliq.aliqCbs
          else if (c === 14) preset = aliq.aliqIbsE
          else if (c === 15) preset = aliq.aliqIbsM
          cell.value = preset
          cell.numFmt = FMT_PCT
          fillEditable(cell)
        } else {
          cell.value = 0
          cell.numFmt = isAliqCol(c) ? FMT_PCT : FMT_MONEY
          fillLocked(cell)
        }
      }
      rowNum++
    }
  }

  // TOTAL row (locked, valores 0)
  const totalRow = ws.getRow(rowNum)
  totalRow.height = 18
  totalRow.getCell(1).value = 'TOTAL'
  applyTotalStyle(totalRow.getCell(1))
  totalRow.getCell(2).value = ''
  applyTotalStyle(totalRow.getCell(2))
  for (let c = 3; c <= 18; c++) {
    const cell = totalRow.getCell(c)
    if (isAliqCol(c)) {
      cell.value = ''
    } else {
      cell.value = 0
      cell.numFmt = FMT_MONEY
    }
    applyTotalStyle(cell)
  }

  // Protege sheet com senha vazia (defesa razoável; usuário pode desproteger)
  ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
  })
}

export async function gerarTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Simulador Arval'
  wb.created = new Date()

  addLeiaMe(wb)
  for (const sd of SHEETS_DETALHE) {
    addSheetDetalhe(wb, sd.nome, sd.ops)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Simulador_Arval_Template.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
