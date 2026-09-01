// ============================================================
// Life-Up Fitness — Hand-authored client workout PDF (pdf-lib)
// For trainer-picked plans (not the algorithmic generator in
// workout.ts/workout-pdf.ts). Cover + one page per day, in the
// K Dollz blueprint style: schedule grid, self-talk box, plain
// exercise list (no supersets), ab circuit, cardio finisher,
// with real form-demo photos embedded per exercise.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as fs from 'fs'
import * as path from 'path'

const hex = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const C = {
  bg: hex('#0a0a0f'), card: hex('#15151c'), gold: hex('#C9A84C'), goldBright: hex('#F5C518'),
  white: hex('#F0EEF5'), gray: hex('#8b8b99'), grayL: hex('#c8c8d8'), line: hex('#2a2a33'),
  green: hex('#2fe38a'), pink: hex('#ff2d6f'), blue: hex('#38bdf8'), purple: hex('#9b6fd4'), red: hex('#ff5b6a'),
}
// 9:16 mobile-viewing aspect ratio (was 612×792 US Letter)
const W = 450, H = 800
const IMG_DIR = path.join(process.cwd(), 'public', 'images', 'exercises')
const BRAND_DIR = path.join(process.cwd(), 'public', 'images', 'brand')
const FONT_DIR = path.join(process.cwd(), 'fonts')

interface Fonts { reg: PDFFont; bold: PDFFont; italic: PDFFont; display: PDFFont }

function tL(p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB) { p.drawText(t, { x, y, size: s, font: f, color: c }) }
function tC(p: PDFPage, t: string, cx: number, y: number, s: number, f: PDFFont, c: RGB) { p.drawText(t, { x: cx - f.widthOfTextAtSize(t, s) / 2, y, size: s, font: f, color: c }) }
function tR(p: PDFPage, t: string, rx: number, y: number, s: number, f: PDFFont, c: RGB) { p.drawText(t, { x: rx - f.widthOfTextAtSize(t, s), y, size: s, font: f, color: c }) }
// Rounded rectangle via SVG path (pdf-lib's drawRectangle has no corner-radius option).
// NOTE: pdf-lib's drawSvgPath always applies an internal scale(1,-1) (SVG's y-down
// convention), so every y term here is pre-negated to cancel that flip — without this
// the path renders at -y, off the visible page. (Same fix already applied in
// manual-mealplan-pdf.ts / escape-plan-pdf.ts — ported the working version here.)
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2)
  const Y = -y, YH = -(y + h)
  return [
    `M ${x + rr} ${Y}`,
    `L ${x + w - rr} ${Y}`,
    `Q ${x + w} ${Y} ${x + w} ${Y - rr}`,
    `L ${x + w} ${YH + rr}`,
    `Q ${x + w} ${YH} ${x + w - rr} ${YH}`,
    `L ${x + rr} ${YH}`,
    `Q ${x} ${YH} ${x} ${YH + rr}`,
    `L ${x} ${Y - rr}`,
    `Q ${x} ${Y} ${x + rr} ${Y}`,
    'Z',
  ].join(' ')
}
// Small boxes (pills/tags) auto-clamp the radius to half their height, which
// gives them a fully-rounded "pill" look for free — that's the bubbly feel.
function box(p: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB, bw = 1.4) {
  p.drawSvgPath(roundedRectPath(x, y, w, h, 14), { x: 0, y: 0, color: fill, borderColor: border, borderWidth: border ? bw : 0 })
}
function pill(p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB) {
  const w = f.widthOfTextAtSize(t, s) + 16
  box(p, x, y - 5, w, s + 10, C.bg, c, 1)
  tL(p, t, x + 8, y + 1, s, f, c)
  return w
}
function wrap(p: PDFPage, t: string, x: number, y: number, maxW: number, s: number, f: PDFFont, c: RGB, lh = 11): number {
  const words = t.split(' '); let line = ''; let yy = y
  for (const w of words) { if (f.widthOfTextAtSize(line + w, s) > maxW) { tL(p, line.trim(), x, yy, s, f, c); line = w + ' '; yy -= lh } else line += w + ' ' }
  if (line.trim()) { tL(p, line.trim(), x, yy, s, f, c); yy -= lh }
  return yy
}
// Counts how many lines `wrap` will produce, so callers can size a box BEFORE drawing into it
// (fixed-height boxes were overflowing whenever real client text ran longer than the sample copy).
function measureWrapLines(t: string, maxW: number, s: number, f: PDFFont): number {
  const words = t.split(' '); let line = ''; let lines = 0
  for (const w of words) { if (f.widthOfTextAtSize(line + w, s) > maxW) { lines++; line = w + ' ' } else line += w + ' ' }
  if (line.trim()) lines++
  return Math.max(lines, 1)
}

const imgCache = new Map<string, PDFImage | null>()
async function loadImage(doc: PDFDocument, file?: string): Promise<PDFImage | null> {
  if (!file) return null
  if (imgCache.has(file)) return imgCache.get(file)!
  try {
    const bytes = fs.readFileSync(path.join(IMG_DIR, file))
    const img = await doc.embedJpg(bytes)
    imgCache.set(file, img)
    return img
  } catch {
    imgCache.set(file, null)
    return null
  }
}
let brandSilhouette: PDFImage | null | undefined
async function loadBrandSilhouette(doc: PDFDocument): Promise<PDFImage | null> {
  if (brandSilhouette !== undefined) return brandSilhouette
  try {
    const bytes = fs.readFileSync(path.join(BRAND_DIR, 'silhouette_white.png'))
    brandSilhouette = await doc.embedPng(bytes)
  } catch {
    brandSilhouette = null
  }
  return brandSilhouette
}
// Draw an image scaled to fit inside a box (contain behavior, centered), with a rounded gold frame.
function drawImageCover(p: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  p.drawSvgPath(roundedRectPath(x, y, w, h, 10), { x: 0, y: 0, color: C.bg, borderColor: C.gold, borderWidth: 1 })
  const scale = Math.min(w / img.width, h / img.height)
  const iw = img.width * scale, ih = img.height * scale
  p.drawImage(img, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih })
}

// ---- Data types ----
export interface ManualClientStats { weightLb: number; heightIn: number; age: number; gender: 'male' | 'female' }
export interface ManualExerciseSpec {
  name: string
  setsReps: string
  weight?: string
  instructions: string
  note?: string
  scaleDown?: string
  imageFile?: string
}
export interface ManualAbSpec { label: string; name: string; setsReps: string; instructions: string; imageFile?: string }
export interface ManualCardioSpec { minutes: string; detail: string; altOption?: string; imageFile?: string; altImageFile?: string }
export interface ManualLiftDay {
  kind: 'lift'
  dayNum: number
  dayOfWeek?: string
  title: string
  muscleTags: string[]
  warmup?: string
  cooldown?: string
  injuryReminder?: string
  exercises: ManualExerciseSpec[]
  ab?: ManualAbSpec[]
  cardio?: ManualCardioSpec
  cardioLabel?: string
  metEstimate?: number
  estMinutes?: number
}
export interface ManualCardioDay {
  kind: 'cardio'
  dayNum: number
  dayOfWeek: string
  title: string
  warmup?: string
  cooldown?: string
  cardio: ManualCardioSpec
}
export type ManualDay = ManualLiftDay | ManualCardioDay
export interface ManualScheduleItem { dayAbbr: string; dayLabel: string; sub: string; isRest?: boolean }
export interface ManualWorkoutProgram {
  clientName: string
  week: number
  level: string
  goal: string
  selfTalkQuote: string
  selfTalkBody: string
  schedule: ManualScheduleItem[]
  progressionNote: string
  injuryNote?: string
  targetAreas?: string[]
  days: ManualDay[]
  clientStats?: ManualClientStats
  closingNote?: { title: string; body: string }
}

// Personalized calorie estimate: METs scaled off the client's OWN Mifflin-St Jeor BMR
// (weight+height+age+gender) rather than the generic population-average "1 MET = 1
// kcal/kg/hr" assumption — so the number reflects her real stats, not just her weight.
function mifflinBMR(stats: ManualClientStats): number {
  const kg = stats.weightLb * 0.453592
  const cm = stats.heightIn * 2.54
  const base = 10 * kg + 6.25 * cm - 5 * stats.age
  return stats.gender === 'male' ? base + 5 : base - 161
}
function estimateDayCalories(stats: ManualClientStats, met: number, minutes: number): number {
  return Math.round(met * (mifflinBMR(stats) / 24) * (minutes / 60))
}
function dayCalories(prog: ManualWorkoutProgram, d: ManualLiftDay): number | null {
  if (!prog.clientStats) return null
  return estimateDayCalories(prog.clientStats, d.metEstimate ?? 4.0, d.estMinutes ?? 22)
}

function pageShell(doc: PDFDocument, f: Fonts, stripe: RGB, name: string, section: string): PDFPage {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: stripe })
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.line })
  tL(p, `LIFE-UP FITNESS   •   ${name}'s Program   •   ${section}`, 36, 10, 8.5, f.reg, C.gray)
  return p
}

// ---- PAGE 1: COVER ----
async function coverPage(doc: PDFDocument, f: Fonts, prog: ManualWorkoutProgram) {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const colors = [C.green, C.gold, C.blue, C.purple, C.pink]
  const seg = W / colors.length
  colors.forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))

  tL(p, 'LIFE-UP FITNESS', 36, H - 50, 13, f.bold, C.gold)
  tL(p, 'TRAINING PROGRAM FOR', 36, H - 72, 13, f.reg, C.gray)
  tL(p, prog.clientName.toUpperCase(), 36, H - 113, 36, f.display, C.goldBright)

  const silhouette = await loadBrandSilhouette(doc)
  if (silhouette) {
    const sh = 84, sw = sh * (silhouette.width / silhouette.height)
    p.drawImage(silhouette, { x: W - 40 - sw, y: H - 34 - sh, width: sw, height: sh, opacity: 0.9 })
  }

  const stats = [
    { l: 'WEEK', v: String(prog.week), c: C.green },
    { l: 'LEVEL', v: prog.level.toUpperCase(), c: C.blue },
    { l: 'GOAL', v: prog.goal.toUpperCase(), c: C.pink },
  ]
  // Stat values (esp. GOAL) vary a lot in length per client, so size/wrap them to fit
  // the card instead of a fixed font size that ran text off the page for longer goals.
  const statGap = 10, statCw = (W - 72 - 2 * statGap) / 3, sx = 36
  const statValMaxW = statCw - 20
  const statSize = 12.5
  const statLines = stats.map((s) => measureWrapLines(s.v, statValMaxW, statSize, f.bold))
  const statMaxLines = Math.max(...statLines)
  const statCh = 36 + statMaxLines * 16
  const cy = H - 123 - statCh
  stats.forEach((s, i) => {
    const x = sx + i * (statCw + statGap)
    box(p, x, cy, statCw, statCh, C.card, s.c, 1.3)
    tL(p, s.l, x + 11, cy + statCh - 19, 10, f.reg, C.gray)
    wrap(p, s.v, x + 11, cy + statCh - 39, statValMaxW, statSize, f.bold, s.c, 16)
  })

  // Self-talk / schedule / progression / injury blocks below the header used to be drawn at
  // fixed offsets assuming they'd always fit on one page — bigger fonts pushed the injury
  // box past the bottom margin, overlapping the copyright line. They now flow the same way
  // day-page sections do: measured up front, packed to fit, and spilled onto a continuation
  // page if the content genuinely doesn't fit on page 1.
  interface CBlock { h: number; draw: (pg: PDFPage, y: number) => number }
  const blocks: CBlock[] = []

  const stMaxW = W - 72 - 28
  const quoteLines = measureWrapLines(`"${prog.selfTalkQuote}"`, stMaxW, 16.5, f.italic)
  const bodyLines = measureWrapLines(prog.selfTalkBody, stMaxW, 13, f.reg)
  const stH = 38 + quoteLines * 21.5 + 12 + bodyLines * 16 + 12
  blocks.push({
    h: stH + 26,
    draw: (pg, y) => {
      box(pg, 36, y - stH, W - 72, stH, hex('#16120a'), C.gold, 1.4)
      tL(pg, "THIS WEEK'S MENTAL SELF-TALK", 50, y - 23, 10.5, f.bold, C.gold)
      const qy = wrap(pg, `"${prog.selfTalkQuote}"`, 50, y - 48, stMaxW, 16.5, f.italic, C.gold, 21.5)
      wrap(pg, prog.selfTalkBody, 50, qy - 12, stMaxW, 13, f.reg, C.grayL, 16)
      return y - stH - 26
    },
  })

  const n = prog.schedule.length
  const minColW = 86, sGap = 8
  const perRow = Math.max(1, Math.min(n, Math.floor((W - 72 + sGap) / (minColW + sGap))))
  const gw = (W - 72 - (perRow - 1) * sGap) / perRow
  const gh = 76, rowGap = 8
  const rows = Math.ceil(n / perRow)
  const scheduleGridH = rows * gh + (rows - 1) * rowGap
  const scheduleBlockH = 19 + scheduleGridH
  blocks.push({
    h: scheduleBlockH + 22,
    draw: (pg, y) => {
      tL(pg, 'WEEKLY SCHEDULE', 36, y, 13, f.bold, C.gold)
      const gTop = y - 19
      prog.schedule.forEach((s, i) => {
        const row = Math.floor(i / perRow), col = i % perRow
        const x = 36 + col * (gw + sGap)
        const gy = gTop - row * (gh + rowGap)
        box(pg, x, gy - gh, gw, gh, C.card, s.isRest ? C.line : C.green, 1.2)
        tC(pg, s.dayAbbr, x + gw / 2, gy - 19, 10, f.bold, s.isRest ? C.gray : C.green)
        tC(pg, s.dayLabel, x + gw / 2, gy - 37, 10.5, f.bold, C.white)
        wrap(pg, s.sub, x + 7, gy - 53, gw - 14, 9, f.reg, C.gray, 11)
      })
      return y - scheduleBlockH - 22
    },
  })

  const pnMaxW = W - 72 - 28
  const pnLines = measureWrapLines(prog.progressionNote, pnMaxW, 12, f.reg)
  const pnH = 30 + pnLines * 15 + 8
  blocks.push({
    h: pnH + 12,
    draw: (pg, y) => {
      box(pg, 36, y - pnH, W - 72, pnH, C.card, C.green, 1.2)
      tL(pg, 'THIS WEEK', 50, y - 19, 10.5, f.bold, C.green)
      wrap(pg, prog.progressionNote, 50, y - 35, pnMaxW, 12, f.reg, C.grayL, 15)
      return y - pnH - 12
    },
  })

  if (prog.injuryNote) {
    const inLines = measureWrapLines(prog.injuryNote, pnMaxW, 11.5, f.reg)
    const inH = 26 + inLines * 15 + 8
    blocks.push({
      h: inH,
      draw: (pg, y) => {
        box(pg, 36, y - inH, W - 72, inH, hex('#1a0e0e'), C.red, 1.2)
        tL(pg, 'INJURY REMINDERS', 50, y - 18, 10.5, f.bold, C.red)
        wrap(pg, prog.injuryNote!, 50, y - 34, pnMaxW, 11.5, f.reg, C.grayL, 15)
        return y - inH
      },
    })
  }

  const topMargin = 40, bottomMargin = 48, contHeaderH = 40
  const firstCapacity = cy - 24 - bottomMargin
  const contCapacity = H - topMargin - contHeaderH - bottomMargin

  const pages: CBlock[][] = []
  let current: CBlock[] = []
  let used = 0
  let capacityForCurrent = firstCapacity
  for (const block of blocks) {
    if (used > 0 && used + block.h > capacityForCurrent) {
      pages.push(current)
      current = []
      used = 0
      capacityForCurrent = contCapacity
    }
    current.push(block)
    used += block.h
  }
  if (current.length) pages.push(current)

  let lastPage = p
  for (let pi = 0; pi < pages.length; pi++) {
    const group = pages[pi]
    let pg: PDFPage
    let y: number
    let cap: number
    if (pi === 0) {
      pg = p
      y = cy - 24
      cap = firstCapacity
    } else {
      pg = pageShell(doc, f, C.gold, prog.clientName, 'Program Overview')
      y = H - topMargin - contHeaderH
      cap = contCapacity
    }
    lastPage = pg
    const groupSum = group.reduce((s, b) => s + b.h, 0)
    const leftover = Math.max(0, cap - groupSum)
    const extraGap = group.length > 1 ? leftover / (group.length - 1) : 0
    if (group.length === 1) y -= leftover / 2
    for (const block of group) {
      y = block.draw(pg, y)
      y -= extraGap
    }
  }
  tC(lastPage, `© ${new Date().getFullYear()} Life-Up Fitness · Coach · asaluke.io`, W / 2, 30, 8, f.reg, C.gray)
}

// ---- Exercise card (image left, details right) ----
// Layout is computed once and shared between the height-check and the draw call, so a
// card's actual box is always exactly the size the page-break math planned for — name AND
// weight/reps are wrap-capable now (both can run long, and un-wrapped single lines were
// what ran text off the page/box before).
function exerciseLayout(img: PDFImage | null, e: ManualExerciseSpec, f: Fonts) {
  const imgBox = 90
  const tx = img ? 46 + imgBox + 16 : 46
  const maxW = W - 36 - tx - 14
  const meta = e.weight ? `${e.setsReps}  ·  ${e.weight}` : e.setsReps
  const nameLines = measureWrapLines(e.name, maxW, 17, f.bold)
  const metaLines = measureWrapLines(meta, maxW, 13.5, f.bold)
  const instrLines = measureWrapLines(e.instructions, maxW, 13, f.reg)
  const nameLH = 20, metaLH = 16.5, instrLH = 16, noteLH = 15, scaleLH = 14
  const noteLines = e.note ? measureWrapLines(e.note, maxW, 12, f.italic) : 0
  const scaleLines = e.scaleDown ? measureWrapLines(e.scaleDown, maxW, 11, f.reg) : 0
  const topPad = 24, noteH = noteLines ? 6 + noteLines * noteLH : 0
  const scaleH = scaleLines ? 6 + 14 + scaleLines * scaleLH : 0
  const bottomPad = 18
  const contentH = topPad + nameLines * nameLH + metaLines * metaLH + instrLines * instrLH + noteH + scaleH + bottomPad
  const h = Math.max(img ? imgBox + 18 : 84, contentH)
  return { h, tx, maxW, meta, topPad, nameLH, metaLH, instrLH, noteLH, scaleLH, imgBox }
}
function exerciseCardHeight(img: PDFImage | null, e: ManualExerciseSpec, f: Fonts): number {
  return exerciseLayout(img, e, f).h
}
async function exerciseCard(doc: PDFDocument, p: PDFPage, f: Fonts, y: number, e: ManualExerciseSpec, col: RGB): Promise<number> {
  const img = await loadImage(doc, e.imageFile)
  const L = exerciseLayout(img, e, f)
  box(p, 36, y - L.h, W - 72, L.h, C.card, col, 1.3)
  if (img) drawImageCover(p, img, 46, y - L.h + 9, L.imgBox, L.imgBox)
  let cy = y - L.topPad
  cy = wrap(p, e.name, L.tx, cy, L.maxW, 17, f.bold, C.white, L.nameLH)
  cy = wrap(p, L.meta, L.tx, cy, L.maxW, 13.5, f.bold, C.gold, L.metaLH)
  cy = wrap(p, e.instructions, L.tx, cy, L.maxW, 13, f.reg, C.grayL, L.instrLH)
  if (e.note) cy = wrap(p, e.note, L.tx, cy - 2, L.maxW, 12, f.italic, col, L.noteLH)
  if (e.scaleDown) {
    tL(p, 'SCALE DOWN', L.tx, cy - 6, 9.5, f.bold, C.gold)
    wrap(p, e.scaleDown, L.tx, cy - 20, L.maxW, 11, f.reg, C.gray, L.scaleLH)
  }
  return y - L.h - 12
}

// Name + sets/reps ("Glute Bridge Marches — 2×10-12") was drawn as one un-wrapped line and
// ran off the column's right edge for longer exercise names — wrap it like everything else.
function abCircuitHeight(imgs: (PDFImage | null)[], ab: ManualAbSpec[], f: Fonts): number {
  const thumb = 52
  const colW = (W - 96 - 24) / 2
  let need = 34 + thumb + 10
  ab.forEach((a, i) => {
    const tw = colW - (imgs[i] ? thumb + 10 : 0) - 6
    const nameLines = measureWrapLines(`${a.name}  —  ${a.setsReps}`, tw, 12, f.bold)
    const instrLines = measureWrapLines(a.instructions, tw, 11, f.reg)
    // 26 = box-top to contentTop(34) minus label row(12)+gap(14) collapsed in; then name lines, then instruction lines, then bottom padding
    need = Math.max(need, 74 + nameLines * 15 + instrLines * 14)
  })
  return need
}
async function abCircuitRow(doc: PDFDocument, p: PDFPage, f: Fonts, y: number, ab: ManualAbSpec[]): Promise<number> {
  const imgs = await Promise.all(ab.map((a) => loadImage(doc, a.imageFile)))
  const h = abCircuitHeight(imgs, ab, f)
  box(p, 36, y - h, W - 72, h, C.card, C.gold, 1.2)
  tL(p, 'AB CIRCUIT', 48, y - 18, 10.5, f.bold, C.gold)
  const contentTop = y - 34
  const thumb = 52
  const colW = (W - 96 - 24) / 2
  for (let i = 0; i < ab.length; i++) {
    const a = ab[i]
    const x = 48 + i * (colW + 24)
    const img = imgs[i]
    if (img) drawImageCover(p, img, x, contentTop - thumb, thumb, thumb)
    const tx = img ? x + thumb + 10 : x
    const tw = colW - (img ? thumb + 10 : 0) - 6
    tL(p, a.label.toUpperCase(), tx, contentTop - 12, 9, f.bold, C.pink)
    const cy = wrap(p, `${a.name}  —  ${a.setsReps}`, tx, contentTop - 26, tw, 12, f.bold, C.white, 15)
    wrap(p, a.instructions, tx, cy, tw, 11, f.reg, C.gray, 14)
  }
  return y - h - 12
}

function cardioCardHeight(img: PDFImage | null, cardio: ManualCardioSpec, f: Fonts): number {
  const thumb = 62
  const tx = img ? 46 + thumb + 14 : 48
  const maxW = W - 48 - tx
  const lines = measureWrapLines(cardio.detail, maxW, 13, f.bold)
  // 44 = box-top to first detail line, then each extra wrapped line + bottom padding
  return Math.max(img ? thumb + 18 : 0, 44 + (lines - 1) * 16 + 14)
}
async function cardioCard(doc: PDFDocument, p: PDFPage, f: Fonts, y: number, cardio: ManualCardioSpec, title = 'CARDIO FINISHER'): Promise<number> {
  const img = await loadImage(doc, cardio.imageFile)
  const h = cardioCardHeight(img, cardio, f)
  box(p, 36, y - h, W - 72, h, hex('#0a1a24'), C.blue, 2)
  const thumb = 62
  if (img) drawImageCover(p, img, 46, y - h + 9, thumb, thumb)
  const tx = img ? 46 + thumb + 14 : 48
  const maxW = W - 48 - tx
  tL(p, `${title} — DON'T SKIP`, tx, y - 25, 12, f.bold, C.blue)
  tR(p, cardio.minutes, W - 48, y - 25, 17, f.bold, C.white)
  wrap(p, cardio.detail, tx, y - 45, maxW, 13, f.bold, C.grayL, 16)
  return y - h - 12
}

function cooldownHeight(cooldown: string, f: Fonts): number {
  return 22 + measureWrapLines(cooldown, W - 72 - 24, 11, f.reg) * 14 + 10
}
function cooldownCard(p: PDFPage, f: Fonts, y: number, cooldown: string): number {
  const h = cooldownHeight(cooldown, f)
  box(p, 36, y - h, W - 72, h, C.card, C.purple, 1.2)
  tL(p, 'COOL-DOWN', 48, y - 18, 10.5, f.bold, C.purple)
  wrap(p, cooldown, 48, y - 34, W - 72 - 24, 11, f.reg, C.grayL, 14)
  return y - h - 12
}

const CAL_NOTE = 'Estimate based on your stats — actual burn varies by pace and effort.'
function caloriesCardHeight(f: Fonts): number {
  const lines = measureWrapLines(CAL_NOTE, W - 72 - 24, 9.5, f.reg)
  return 44 + (lines - 1) * 13 + 10
}
function caloriesCard(p: PDFPage, f: Fonts, y: number, calories: number): number {
  const h = caloriesCardHeight(f)
  box(p, 36, y - h, W - 72, h, hex('#0c1a10'), C.green, 2)
  tL(p, "TODAY'S ESTIMATED BURN", 48, y - 25, 12, f.bold, C.green)
  tR(p, `~${calories} cal`, W - 48, y - 27, 19, f.bold, C.goldBright)
  wrap(p, CAL_NOTE, 48, y - 45, W - 72 - 24, 9.5, f.reg, C.gray, 13)
  return y - h - 12
}

const orange = hex('#F0872A')
function warmupHeight(warmup: string, f: Fonts): number {
  return 22 + measureWrapLines(warmup, W - 72 - 24, 11, f.bold) * 14 + 10
}
function warmupCard(p: PDFPage, f: Fonts, y: number, warmup: string): number {
  const h = warmupHeight(warmup, f)
  box(p, 36, y - h, W - 72, h, hex('#1f1206'), orange, 1.6)
  tL(p, 'WARM-UP FIRST', 48, y - 18, 10.5, f.bold, orange)
  wrap(p, warmup, 48, y - 34, W - 72 - 24, 11, f.bold, C.grayL, 14)
  return y - h - 12
}
function injuryReminderHeight(text: string, f: Fonts): number {
  return 20 + measureWrapLines(`INJURY REMINDER — ${text}`, W - 72 - 10, 11, f.italic) * 14
}
function injuryReminderCard(p: PDFPage, f: Fonts, y: number, text: string): number {
  const h = injuryReminderHeight(text, f)
  box(p, 36, y - h, W - 72, h, hex('#1a0e0e'), C.red, 1.1)
  wrap(p, `INJURY REMINDER — ${text}`, 46, y - 19, W - 72 - 10, 11, f.italic, C.red, 14)
  return y - h - 10
}

const DAY_COLORS = [C.green, C.pink, C.purple, C.blue]

function dayHeader(p: PDFPage, f: Fonts, prog: ManualWorkoutProgram, d: ManualLiftDay | ManualCardioDay, col: RGB, suffix = '') {
  const hasTags = 'muscleTags' in d && d.muscleTags.length > 0
  const boxH = hasTags ? 98 : 70
  box(p, 36, H - 40 - boxH, W - 72, boxH, C.card, col, 1.5)
  tL(p, `WEEK ${prog.week} · DAY ${d.dayNum}${suffix}`, 50, H - 62, 11, f.bold, col)
  tL(p, d.dayOfWeek ? `${d.title.toUpperCase()} · ${d.dayOfWeek}` : d.title.toUpperCase(), 50, H - 86, 17, f.bold, C.white)
  if (hasTags) {
    let px = 50
    for (const t of (d as ManualLiftDay).muscleTags) {
      const w = f.bold.widthOfTextAtSize(t, 9) + 16
      if (px + w > W - 36) break // header box is fixed-height; extra tags simply stop rather than overflow it
      pill(p, t, px, H - 110, 9, f.bold, col)
      px += w + 6
    }
  }
}

// Generic "flowing" block renderer shared by the lift-day page: every section (injury
// banner, warm-up, each exercise, ab circuit, cardio, cool-down) reports its real height
// up front, then blocks are divided across as few pages as possible with an even split —
// a plain greedy fill left a nearly-blank trailing page whenever a day's last section or
// two didn't reach the bottom margin.
interface Block { h: number; draw: (p: PDFPage, y: number) => number | Promise<number> }

async function liftDayPage(doc: PDFDocument, f: Fonts, prog: ManualWorkoutProgram, d: ManualLiftDay, idx: number) {
  const col = DAY_COLORS[idx % DAY_COLORS.length]
  const headerH = d.muscleTags.length ? 98 : 70
  const topMargin = 40, bottomMargin = 44
  const gap = 12
  const capacity = H - topMargin - headerH - 16 - bottomMargin

  const blocks: Block[] = []
  if (d.injuryReminder) {
    const h = injuryReminderHeight(d.injuryReminder, f)
    blocks.push({ h: h + 10, draw: (p, y) => injuryReminderCard(p, f, y, d.injuryReminder!) })
  }
  if (d.warmup) {
    const h = warmupHeight(d.warmup, f)
    blocks.push({ h: h + gap, draw: (p, y) => warmupCard(p, f, y, d.warmup!) })
  }
  for (const e of d.exercises) {
    const img = await loadImage(doc, e.imageFile)
    const h = exerciseCardHeight(img, e, f)
    blocks.push({ h: h + gap, draw: (p, y) => exerciseCard(doc, p, f, y, e, col) })
  }
  if (d.ab && d.ab.length) {
    const ab = d.ab
    const abImgs = await Promise.all(ab.map((a) => loadImage(doc, a.imageFile)))
    blocks.push({ h: abCircuitHeight(abImgs, ab, f) + gap, draw: (p, y) => abCircuitRow(doc, p, f, y, ab) })
  }
  if (d.cardio) {
    const cardio = d.cardio
    const cardioImg = await loadImage(doc, cardio.imageFile)
    blocks.push({ h: cardioCardHeight(cardioImg, cardio, f) + gap, draw: (p, y) => cardioCard(doc, p, f, y, cardio, d.cardioLabel ?? 'POST-CARDIO') })
  }
  if (d.cooldown) {
    const h = cooldownHeight(d.cooldown, f)
    blocks.push({ h: h + gap, draw: (p, y) => cooldownCard(p, f, y, d.cooldown!) })
  }
  const cal = dayCalories(prog, d)
  if (cal !== null) {
    const h = caloriesCardHeight(f)
    blocks.push({ h: h + gap, draw: (p, y) => caloriesCard(p, f, y, cal) })
  }

  // Greedy-fill-to-capacity: pack each page as full as it will go before breaking.
  // (A "target average per page" version could overfill the first pages right up to
  // capacity and then strand only the last block or two alone on a nearly-blank final
  // page — greedy-to-capacity never leaves a page under-filled except for the true remainder.)
  const pages: Block[][] = []
  let current: Block[] = []
  let used = 0
  for (const block of blocks) {
    if (used > 0 && used + block.h > capacity) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(block)
    used += block.h
  }
  if (current.length) pages.push(current)

  for (let pi = 0; pi < pages.length; pi++) {
    const group = pages[pi]
    const p = pageShell(doc, f, col, prog.clientName, `Day ${d.dayNum}`)
    dayHeader(p, f, prog, d, col, pi > 0 ? ` (cont'd ${pi + 1})` : '')
    // Whatever capacity a page's blocks don't use is spread out as extra breathing room
    // between them (instead of collapsing into one dead zone at the bottom), so every
    // page actually fills the screen edge to edge. A single leftover block on its own
    // page gets centered instead, for the same reason.
    const groupSum = group.reduce((s, b) => s + b.h, 0)
    const leftover = Math.max(0, capacity - groupSum)
    const extraGap = group.length > 1 ? leftover / (group.length - 1) : 0
    let y = H - topMargin - headerH - 16 - (group.length === 1 ? leftover / 2 : 0)
    for (const block of group) {
      y = await block.draw(p, y)
      y -= extraGap
    }
  }
}

async function cardioDayPage(doc: PDFDocument, f: Fonts, prog: ManualWorkoutProgram, d: ManualCardioDay, idx: number) {
  const col = DAY_COLORS[idx % DAY_COLORS.length]
  const p = pageShell(doc, f, col, prog.clientName, `Day ${d.dayNum}`)
  dayHeader(p, f, prog, d, col)

  let y = H - 40 - 70 - 16
  if (d.warmup) y = warmupCard(p, f, y, d.warmup)

  // Two photos side by side: gym treadmill option (left) vs outside walk option (right)
  const picH = 160, picGap = 12, picW = (W - 72 - picGap) / 2
  const img = await loadImage(doc, d.cardio.imageFile)
  const altImg = await loadImage(doc, d.cardio.altImageFile)
  if (img) drawImageCover(p, img, 36, y - picH, picW, picH)
  if (altImg) drawImageCover(p, altImg, 36 + picW + picGap, y - picH, picW, picH)
  tC(p, 'GYM OPTION', 36 + picW / 2, y - picH - 15, 9.5, f.bold, C.gray)
  tC(p, 'OUTSIDE OPTION', 36 + picW + picGap + picW / 2, y - picH - 15, 9.5, f.bold, C.gold)
  y -= picH + 29

  // Main treadmill spec (dynamic height — detail line wraps instead of running off the box)
  const detailMaxW = W - 72 - 24
  const detailLines = measureWrapLines(d.cardio.detail, detailMaxW, 12, f.reg)
  const h1 = 32 + detailLines * 15 + 12
  box(p, 36, y - h1, W - 72, h1, C.card, C.blue, 1.4)
  tL(p, 'ACTIVE CARDIO DAY', 50, y - 23, 12, f.bold, C.blue)
  tR(p, d.cardio.minutes, W - 50, y - 23, 15.5, f.bold, C.white)
  wrap(p, d.cardio.detail, 50, y - 44, detailMaxW, 12, f.reg, C.grayL, 15)
  y -= h1 + 12

  // Highlighted outside-walk alternative — its own bold box, not buried as a footnote
  if (d.cardio.altOption) {
    const altMaxW = W - 72 - 28
    const altLines = measureWrapLines(d.cardio.altOption, altMaxW, 11.5, f.bold)
    const h2 = 32 + altLines * 15 + 12
    box(p, 36, y - h2, W - 72, h2, hex('#16120a'), C.gold, 1.6)
    tL(p, 'OR — WALK OUTSIDE', 50, y - 23, 12.5, f.bold, C.gold)
    wrap(p, d.cardio.altOption, 50, y - 44, altMaxW, 11.5, f.bold, C.white, 15)
    y -= h2 + 14
  }

  if (d.cooldown) cooldownCard(p, f, y, d.cooldown)
}

function targetAreasPage(doc: PDFDocument, f: Fonts, prog: ManualWorkoutProgram) {
  // This is a short, fixed-content closing page (a few pills + one note), so instead of
  // pinning it to the top and leaving the rest of the screen black, its total height is
  // estimated up front and the whole block is vertically centered on the page.
  const areas = prog.targetAreas ?? []
  const introText = 'This program is built to prioritize these areas across the week:'
  const introMaxW = W - 72
  const introLines = measureWrapLines(introText, introMaxW, 12, f.reg)
  const rowH = 44
  const pillWidths = areas.map((a) => f.bold.widthOfTextAtSize(a.toUpperCase(), 13) + 32)
  let simPx = 36, pillRows = areas.length ? 1 : 0
  pillWidths.forEach((w) => { if (simPx + w > W - 36) { pillRows++; simPx = 36 } simPx += w + 10 })
  const pillsH = pillRows * rowH
  const inMaxW = W - 72 - 28
  const inLines = prog.injuryNote ? measureWrapLines(prog.injuryNote, inMaxW, 11.5, f.reg) : 0
  const inH = prog.injuryNote ? 26 + inLines * 15 + 10 : 0

  const titleBlockH = 36
  const introBlockH = introLines * 14.5 + 14
  const pillsBlockH = pillsH + (prog.injuryNote ? 24 : 0)
  const totalH = titleBlockH + introBlockH + pillsBlockH + inH
  const topMargin = 40, bottomMargin = 40
  const centerOffset = Math.max(0, (H - topMargin - bottomMargin - totalH) / 2)

  const p = pageShell(doc, f, C.gold, prog.clientName, 'Focus Areas')
  let y = H - topMargin - centerOffset
  tL(p, 'HER TARGET AREAS', 36, y - 24, 24, f.display, C.goldBright)
  y -= titleBlockH
  y = wrap(p, introText, 36, y, introMaxW, 12, f.reg, C.gray, 14.5)
  y -= 14

  let px = 36, py = y
  for (const area of areas) {
    const w = f.bold.widthOfTextAtSize(area.toUpperCase(), 13) + 32
    if (px + w > W - 36) { px = 36; py -= rowH }
    box(p, px, py - 28, w, 33, hex('#16120a'), C.gold, 1.3)
    tL(p, area.toUpperCase(), px + 16, py - 18, 13, f.bold, C.goldBright)
    px += w + 10
  }

  if (prog.injuryNote) {
    const iy = py - rowH - 24
    box(p, 36, iy - inH, W - 72, inH, hex('#1a0e0e'), C.red, 1.2)
    tL(p, 'INJURY REMINDERS', 50, iy - 21, 11.5, f.bold, C.red)
    wrap(p, prog.injuryNote, 50, iy - 38, inMaxW, 11.5, f.reg, C.grayL, 15)
  }
}

// Closing page: per-day + weekly-total calorie estimate (only when clientStats is
// supplied) plus an optional positive-encouragement note — always the last page, so the
// program ends on "here's what you did" + a lift, not just the injury/focus-area footer.
function weekSummaryPage(doc: PDFDocument, f: Fonts, prog: ManualWorkoutProgram) {
  const liftDays = prog.days.filter((d): d is ManualLiftDay => d.kind === 'lift')
  const rows = liftDays
    .map((d) => ({ label: d.dayOfWeek ? `${d.dayOfWeek} · ${d.title}` : `Day ${d.dayNum} · ${d.title}`, cal: dayCalories(prog, d) }))
    .filter((r): r is { label: string; cal: number } => r.cal !== null)
  const total = rows.reduce((s, r) => s + r.cal, 0)

  const p = pageShell(doc, f, C.green, prog.clientName, 'Week Summary')
  let y = H - 40 - 24
  tL(p, 'YOUR WEEK, ADDED UP', 36, y, 22, f.display, C.goldBright)
  y -= 44

  if (rows.length) {
    const rowH = 28
    const boxH = 30 + rows.length * rowH + 8
    box(p, 36, y - boxH, W - 72, boxH, C.card, C.green, 1.4)
    let ry = y - 28
    for (const r of rows) {
      tL(p, r.label, 50, ry, 11.5, f.reg, C.grayL)
      tR(p, `~${r.cal} cal`, W - 50, ry, 12.5, f.bold, C.white)
      ry -= rowH
    }
    y -= boxH + 16

    const totalH = 58
    box(p, 36, y - totalH, W - 72, totalH, hex('#0c1a10'), C.goldBright, 2)
    tL(p, 'ESTIMATED TOTAL — ALL SESSIONS', 50, y - 24, 11.5, f.bold, C.green)
    tR(p, `~${total} cal`, W - 50, y - 44, 24, f.bold, C.goldBright)
    y -= totalH + 20
  }

  if (prog.closingNote) {
    const noteMaxW = W - 72 - 28
    const bodyLines = measureWrapLines(prog.closingNote.body, noteMaxW, 13, f.reg)
    const noteH = 42 + bodyLines * 16 + 14
    box(p, 36, y - noteH, W - 72, noteH, hex('#16120a'), C.gold, 1.6)
    tL(p, prog.closingNote.title, 48, y - 26, 15, f.bold, C.goldBright)
    wrap(p, prog.closingNote.body, 48, y - 46, noteMaxW, 13, f.reg, C.white, 16)
  }
}

export async function generateManualWorkoutPDF(prog: ManualWorkoutProgram): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const displayBytes = fs.readFileSync(path.join(FONT_DIR, 'Poppins-Black.ttf'))
  const f: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    display: await doc.embedFont(displayBytes),
  }
  await coverPage(doc, f, prog)
  for (let i = 0; i < prog.days.length; i++) {
    const d = prog.days[i]
    if (d.kind === 'lift') await liftDayPage(doc, f, prog, d, i)
    else await cardioDayPage(doc, f, prog, d, i)
  }
  if (prog.targetAreas?.length) targetAreasPage(doc, f, prog)
  if (prog.clientStats || prog.closingNote) weekSummaryPage(doc, f, prog)
  return doc.save()
}
