/**
 * One-off: renders the Client Meal Plan Builder Blueprint (markdown) into a
 * clean, readable reference PDF — for Asa's own use (not client-facing), so
 * plain black-on-white with simple headers/bullets/tables rather than the
 * branded gold/black client-deliverable style.
 * Usage: npx tsx scripts/render-blueprint-pdf.ts <input.md> <output.pdf> <title>
 */
import * as fs from 'fs'
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'

const [, , inputPath, outputPath, titleArg] = process.argv
if (!inputPath || !outputPath) {
  console.error('Usage: npx tsx scripts/render-blueprint-pdf.ts <input.md> <output.pdf> <title>')
  process.exit(1)
}

const W = 612, H = 792, MARGIN = 54
const black = rgb(0.08, 0.08, 0.1)
const gray = rgb(0.4, 0.4, 0.42)
const gold = rgb(0.62, 0.47, 0.13)
const codeBg = rgb(0.95, 0.95, 0.93)
const lineColor = rgb(0.85, 0.85, 0.85)

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'para'; text: string }
  | { type: 'code'; lines: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'hr' }

// WinAnsi (the encoding StandardFonts use) can't encode arrows, emoji, or most
// symbols outside Latin-1 — map the common ones this doc actually uses to
// plain ASCII, then drop anything else that slips through.
const CHAR_MAP: Record<string, string> = {
  '→': '->', '—': '-', '–': '-', '✓': 'OK', '⚠️': '[!]', '⚠': '[!]',
  '“': '"', '”': '"', '‘': "'", '’': "'", '×': 'x', '…': '...',
}
function asc(s: string): string {
  let out = s
  for (const [k, v] of Object.entries(CHAR_MAP)) out = out.split(k).join(v)
  return out.replace(/[^\x00-\xFF]/g, '')
}
function stripInlineMd(s: string): string {
  return asc(s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]*)`/g, '$1'))
}

function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++ // skip closing ```
      blocks.push({ type: 'code', lines: codeLines })
      continue
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split('|').map((c) => c.trim()).filter((_, idx, arr) => !(idx === 0 || idx === arr.length - 1))
        if (!/^-+$/.test(cells.join(''))) rows.push(cells.map(stripInlineMd))
        i++
      }
      blocks.push({ type: 'table', rows })
      continue
    }
    if (line.startsWith('# ')) { blocks.push({ type: 'h1', text: stripInlineMd(line.slice(2)) }); i++; continue }
    if (line.startsWith('## ')) { blocks.push({ type: 'h2', text: stripInlineMd(line.slice(3)) }); i++; continue }
    if (line.startsWith('### ')) { blocks.push({ type: 'h3', text: stripInlineMd(line.slice(4)) }); i++; continue }
    if (line.trim() === '---') { blocks.push({ type: 'hr' }); i++; continue }
    if (/^\s*-\s/.test(line)) {
      const indentMatch = line.match(/^(\s*)-\s/)
      const indent = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0
      blocks.push({ type: 'bullet', text: stripInlineMd(line.replace(/^\s*-\s/, '')), indent })
      i++
      continue
    }
    if (line.trim() === '') { i++; continue }
    blocks.push({ type: 'para', text: stripInlineMd(line) })
    i++
  }
  return blocks
}

async function main() {
  const md = fs.readFileSync(inputPath, 'utf-8')
  const blocks = parseMarkdown(md)

  const doc = await PDFDocument.create()
  const reg = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const mono = await doc.embedFont(StandardFonts.Courier)

  let page: PDFPage = doc.addPage([W, H])
  let y = H - MARGIN

  function newPage() {
    page = doc.addPage([W, H])
    y = H - MARGIN
  }
  function ensure(space: number) {
    if (y - space < MARGIN) newPage()
  }
  function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
    const words = text.split(' ')
    const out: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (font.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = w }
      else line = test
    }
    if (line) out.push(line)
    return out
  }
  function drawWrapped(text: string, x: number, maxW: number, size: number, font: PDFFont, color = black, lh = size * 1.4) {
    for (const ln of wrapText(text, font, size, maxW)) {
      ensure(lh)
      page.drawText(ln, { x, y, size, font, color })
      y -= lh
    }
  }

  // Cover
  page.drawText(asc(titleArg || 'Blueprint'), { x: MARGIN, y: y - 10, size: 24, font: bold, color: black })
  y -= 40
  page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 1.5, color: gold })
  y -= 30

  for (const block of blocks) {
    if (block.type === 'h1') {
      ensure(50)
      y -= 8
      drawWrapped(block.text, MARGIN, W - MARGIN * 2, 17, bold, black, 21)
      page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: W - MARGIN, y: y + 4 }, thickness: 1, color: lineColor })
      y -= 8
    } else if (block.type === 'h2') {
      ensure(36)
      y -= 10
      drawWrapped(block.text, MARGIN, W - MARGIN * 2, 13.5, bold, gold, 17)
      y -= 4
    } else if (block.type === 'h3') {
      ensure(28)
      y -= 6
      drawWrapped(block.text, MARGIN, W - MARGIN * 2, 11.5, bold, black, 15)
    } else if (block.type === 'para') {
      ensure(20)
      drawWrapped(block.text, MARGIN, W - MARGIN * 2, 9.5, reg, black, 13.5)
      y -= 4
    } else if (block.type === 'bullet') {
      const x = MARGIN + 14 + block.indent * 16
      ensure(16)
      page.drawCircle({ x: MARGIN + 5 + block.indent * 16, y: y + 3, size: 1.6, color: gold })
      drawWrapped(block.text, x, W - MARGIN - x, 9.5, reg, black, 13.5)
    } else if (block.type === 'hr') {
      ensure(16)
      y -= 6
      page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.5, color: lineColor })
      y -= 10
    } else if (block.type === 'code') {
      const lineH = 11.5
      const boxH = block.lines.length * lineH + 16
      ensure(boxH + 10)
      page.drawRectangle({ x: MARGIN, y: y - boxH, width: W - MARGIN * 2, height: boxH, color: codeBg })
      let cy = y - 12
      for (const cl of block.lines) {
        page.drawText(asc(cl).slice(0, 100), { x: MARGIN + 10, y: cy, size: 8, font: mono, color: black })
        cy -= lineH
      }
      y -= boxH + 12
    } else if (block.type === 'table') {
      const colW = (W - MARGIN * 2) / block.rows[0].length
      for (const [ri, row] of Array.from(block.rows.entries())) {
        const cellLines = row.map((c) => wrapText(c, ri === 0 ? bold : reg, 7.5, colW - 8))
        const rowH = Math.max(...cellLines.map((l) => l.length)) * 10 + 6
        ensure(rowH)
        if (ri === 0) page.drawRectangle({ x: MARGIN, y: y - rowH, width: W - MARGIN * 2, height: rowH, color: rgb(0.92, 0.92, 0.9) })
        row.forEach((_, ci) => {
          let cy = y - 10
          for (const ln of cellLines[ci]) {
            page.drawText(ln, { x: MARGIN + ci * colW + 4, y: cy, size: 7.5, font: ri === 0 ? bold : reg, color: black })
            cy -= 10
          }
        })
        y -= rowH
        page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.4, color: lineColor })
      }
      y -= 10
    }
  }

  const bytes = await doc.save()
  fs.writeFileSync(outputPath, bytes)
  console.log('Wrote', outputPath, `(${doc.getPageCount()} pages)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
