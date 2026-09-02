// ============================================================
// Life-Up Fitness — Workout program PDF (pdf-lib)
// Branded to match the Ava/Calorie-Blueprint design system.
// Cover + one page per training day (gym supersets / home circuit).
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { WorkoutProgram, GymDay, HomeDay } from './workout'

const hex = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const C = {
  bg: hex('#0a0a0f'), card: hex('#15151c'), gold: hex('#C9A84C'),
  white: hex('#F0EEF5'), gray: hex('#8b8b99'), grayL: hex('#c8c8d8'), line: hex('#2a2a33'),
  green: hex('#2fe38a'), pink: hex('#ff2d6f'), blue: hex('#38bdf8'), purple: hex('#9b6fd4'), gold2: hex('#f5c518'),
}
const DAY_COLORS = [C.green, C.pink, C.blue]
const W = 612, H = 792
// strip emoji / non-WinAnsi glyphs (keep ASCII + Latin-1 + en/em dash + bullet + middot)
const asc = (s: string) => s.replace(/[\uD800-\uDFFF←-⇿☀-➿⬀-⯿︀-️]/g, '').replace(/\s+/g, ' ').trim()
interface Fonts { reg: PDFFont; bold: PDFFont }

function tL(p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB) { p.drawText(asc(t), { x, y, size: s, font: f, color: c }) }
function tC(p: PDFPage, t: string, cx: number, y: number, s: number, f: PDFFont, c: RGB) { const a = asc(t); p.drawText(a, { x: cx - f.widthOfTextAtSize(a, s) / 2, y, size: s, font: f, color: c }) }
function tR(p: PDFPage, t: string, rx: number, y: number, s: number, f: PDFFont, c: RGB) { const a = asc(t); p.drawText(a, { x: rx - f.widthOfTextAtSize(a, s), y, size: s, font: f, color: c }) }
function cardBox(p: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB, bw = 1.5) { p.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? bw : 0 }) }
function pill(p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB, fillColor?: RGB) {
  const w = f.widthOfTextAtSize(t, s) + 14
  cardBox(p, x, y - 3, w, s + 8, fillColor || C.bg, fillColor ? undefined : c, 1)
  tL(p, t, x + 7, y + 2, s, f, fillColor ? C.bg : c)
  return w
}
// simple word-wrap
function wrap(p: PDFPage, t: string, x: number, y: number, maxW: number, s: number, f: PDFFont, c: RGB, lh = 11): number {
  const words = t.split(' '); let line = ''; let yy = y
  for (const w of words) { if (f.widthOfTextAtSize(line + w, s) > maxW) { tL(p, line.trim(), x, yy, s, f, c); line = w + ' '; yy -= lh } else line += w + ' ' }
  if (line.trim()) { tL(p, line.trim(), x, yy, s, f, c); yy -= lh }
  return yy
}

function pageShell(doc: PDFDocument, f: Fonts, stripe: RGB, name: string, section: string): PDFPage {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: stripe })
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.line })
  tL(p, `LIFE-UP FITNESS   •   ${name}'s Program   •   ${section}`, 36, 10, 7, f.reg, C.gray)
  return p
}

function cover(doc: PDFDocument, f: Fonts, prog: WorkoutProgram) {
  const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const seg = W / 5;[C.green, C.gold, C.blue, C.purple, C.pink].forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))
  tC(p, 'LIFE-UP FITNESS', W / 2, H - 92, 11, f.bold, C.gray)
  tC(p, prog.name, W / 2, H - 150, 40, f.bold, C.green)
  tC(p, 'TRAINING PROGRAM', W / 2, H - 182, 20, f.bold, C.white)
  tC(p, `WEEK ${prog.weekNumber} · ${prog.levelLabel.toUpperCase()} · ${prog.goal === 'gain' ? 'BUILD + SHAPE' : prog.goal === 'maintain' ? 'TONE + MAINTAIN' : 'FAT LOSS + SHAPE'}`, W / 2, H - 204, 11, f.reg, C.gray)
  p.drawRectangle({ x: 70, y: H - 224, width: W - 140, height: 2, color: C.green })

  const isGym = prog.track === 'gym'
  const stats = isGym
    ? [{ l: 'DAYS / WEEK', v: String(prog.daysPerWeek), c: C.green }, { l: 'SUPERSETS / DAY', v: '3', c: C.pink }, { l: 'LEVEL', v: prog.levelLabel, c: C.blue }, { l: 'REPS', v: prog.level === 1 ? '10–12' : prog.level === 2 ? '15/12/10' : '20/15/12', c: C.purple }]
    : [{ l: 'DAYS / WEEK', v: '3', c: C.green }, { l: 'PER DAY', v: prog.home!.minutes, c: C.pink }, { l: 'LEVEL', v: prog.levelLabel, c: C.blue }, { l: 'STYLE', v: 'Home', c: C.purple }]
  const cw = 118, gap = 14, sx = (W - (cw * 4 + gap * 3)) / 2, cy = H - 320
  stats.forEach((s, i) => { const x = sx + i * (cw + gap); cardBox(p, x, cy, cw, 74, C.card, s.c, 1.5); p.drawRectangle({ x, y: cy + 71, width: cw, height: 3, color: C.gold }); tC(p, s.l, x + cw / 2, cy + 50, 8, f.reg, C.gray); tC(p, s.v, x + cw / 2, cy + 24, s.v.length > 6 ? 13 : 18, f.bold, s.c) })

  // day overview
  const days = isGym ? prog.gymDays!.map(d => ({ t: d.title, sub: d.muscles.join(' · ') })) : prog.home!.days.map(d => ({ t: asc(d.title.replace(/^Day \d+: /, '')), sub: `${d.exercises.length} moves` }))
  const dw = (W - (cw && 0) - 72 - 2 * gap) / 3, dy = cy - 150
  days.slice(0, 3).forEach((d, i) => { const x = 36 + i * (dw + gap); cardBox(p, x, dy, dw, 96, C.card, DAY_COLORS[i], 1.5); tC(p, `DAY ${i + 1}`, x + dw / 2, dy + 74, 9, f.bold, DAY_COLORS[i]); const yy = wrap(p, d.t, x + 10, dy + 56, dw - 20, 10, f.bold, C.white, 12); wrap(p, d.sub, x + 10, yy - 2, dw - 20, 7.5, f.reg, C.gray, 10) })

  // modifications (injuries) + target focus
  const notes: string[] = []
  if (prog.targetNote) notes.push('FOCUS: ' + prog.targetNote)
  ;(prog.injuryNotes || []).forEach(n => notes.push(n))
  if (prog.track === 'home' && prog.home?.estCaloriesTotal) notes.push(`ESTIMATED WEEKLY BURN: ~${prog.home.estCaloriesTotal} cal`)
  if (notes.length) {
    // nh previously had zero bottom padding — the last note's baseline landed exactly
    // on the box's bottom border regardless of note count, so it visually overlapped
    // the border line. +8 gives real clearance below the last line.
    const nh = 24 + notes.length * 12
    cardBox(p, 36, 132, W - 72, nh, C.card, C.gold, 1.2)
    tL(p, 'MODIFICATIONS & FOCUS', 48, 132 + nh - 14, 8, f.bold, C.gold)
    let ny = 132 + nh - 28
    notes.forEach(n => { tL(p, '- ' + n, 48, ny, 7.5, f.reg, C.grayL); ny -= 12 })
  }
  cardBox(p, 36, 70, W - 72, 44, hex('#16120a'), C.green, 1.5)
  tC(p, isGym ? 'Free weights first. Progress the load, then reps.' : 'Go at your own pace. Set your timer. Show up.', W / 2, 94, 10, f.bold, C.white)
  tC(p, 'Check in with Coach every week.', W / 2, 79, 8.5, f.reg, C.grayL)
  tC(p, `© ${new Date().getFullYear()} Life-Up Fitness · Coach · asaluke.io`, W / 2, 34, 7, f.reg, C.gray)
}

function gymDayPage(doc: PDFDocument, f: Fonts, prog: WorkoutProgram, d: GymDay, idx: number) {
  const col = DAY_COLORS[idx % 3]
  const p = pageShell(doc, f, col, prog.name, d.title)
  // header
  cardBox(p, 36, H - 118, W - 72, 84, C.card, col, 1.6)
  tL(p, `DAY ${d.dayNum}`, 50, H - 58, 9, f.bold, col)
  tL(p, d.title.toUpperCase(), 50, H - 80, 18, f.bold, C.white)
  let px = 50; d.muscles.forEach(m => { px += pill(p, m, px, H - 104, 7.5, f.bold, col, col) + 6 })
  tR(p, `WEEK ${prog.weekNumber}`, W - 50, H - 58, 9, f.bold, col)
  // warm-up
  tL(p, `Warm-up (5 min) — ${d.warmup.join(' · ')}`, 36, H - 134, 8, f.reg, C.gray)
  // supersets
  let y = H - 150
  d.supersets.forEach((s, i) => {
    const h = 96; cardBox(p, 36, y - h, W - 72, h, C.card, col, 1.4)
    pill(p, `SS ${i + 1}`, 48, y - 20, 9, f.bold, col, col)
    tL(p, `${s.push.name} + ${s.pull.name}`.toUpperCase(), 96, y - 18, 9.5, f.bold, C.white)
    tR(p, 'Rest 60 sec / round', W - 48, y - 18, 7.5, f.reg, C.gray)
    // two exercise rows
    const rows = [{ e: s.push, tag: s.push.movement === 'push' ? 'PUSH' : 'PULL', tc: C.green }, { e: s.pull, tag: s.pull.movement === 'push' ? 'PUSH' : 'PULL', tc: C.pink }]
    let ry = y - 38
    rows.forEach(r => {
      pill(p, `${r.e.muscle.toUpperCase()} · ${r.tag}`, 48, ry, 6.5, f.bold, r.tc, r.tc)
      tL(p, r.e.name, 150, ry + 1, 9, f.bold, C.white)
      tR(p, s.reps, W - 48, ry + 1, 9, f.bold, C.gold)
      wrap(p, r.e.cue, 150, ry - 10, W - 210, 7, f.reg, C.gray, 9)
      ry -= 28
    })
    y -= h + 8
  })
  // ab circuit — goal-driven, not every session
  if (d.ab) {
    const ah = 50; cardBox(p, 36, y - ah, W - 72, ah, C.card, C.gold2, 1.4)
    tL(p, 'AB CIRCUIT', 48, y - 16, 9, f.bold, C.gold2); tR(p, `${d.ab.scheme} · no rest between · 60s after both`, W - 48, y - 16, 7.5, f.reg, C.gray)
    pill(p, 'UPPER', 48, y - 34, 6.5, f.bold, C.pink, C.pink); tL(p, d.ab.upper.name, 100, y - 33, 8.5, f.reg, C.white)
    pill(p, 'LOWER', 300, y - 34, 6.5, f.bold, C.blue, C.blue); tL(p, d.ab.lower.name, 352, y - 33, 8.5, f.reg, C.white)
    y -= ah + 8
  }
  // calves accessory — only real calf picks get this label, never assumed
  // by array position (a core-only day's ab bonus picks used to land here
  // mislabeled as "calves" purely because they filled the same slots)
  const calfItems = d.accessory.filter((a) => a.kind === 'calves')
  if (calfItems[0] && calfItems[1]) {
    const ch = 34; cardBox(p, 36, y - ch, W - 72, ch, C.card, C.purple, 1.2)
    tL(p, 'CALVES + TIBIALIS', 48, y - 14, 8, f.bold, C.purple)
    tL(p, `${calfItems[0].name} ${calfItems[0].reps}  ·  ${calfItems[1].name} ${calfItems[1].reps}`, 48, y - 27, 8, f.reg, C.grayL)
    y -= ch + 8
  }
  // non-calf accessory (bonus leftover set, core-only extra abs) — shown
  // generically instead of silently dropped or mislabeled
  const otherItems = d.accessory.filter((a) => a.kind !== 'calves')
  if (otherItems.length) {
    const oh = 34; cardBox(p, 36, y - oh, W - 72, oh, C.card, C.gray, 1.2)
    tL(p, 'BONUS WORK', 48, y - 14, 8, f.bold, C.gray)
    tL(p, otherItems.map((a) => `${a.name} ${a.reps}`).join('  ·  '), 48, y - 27, 8, f.reg, C.grayL)
    y -= oh + 8
  }
  // cardio finisher — goal-driven, not every session
  if (d.cardio) {
    const carh = d.cardio.mode === 'compound' ? 54 : 40
    cardBox(p, 36, y - carh, W - 72, carh, C.card, C.blue, 1.4)
    tL(p, `CARDIO FINISHER — ${d.cardio.title}`, 48, y - 15, 9, f.bold, C.blue)
    if (d.cardio.mode === 'compound' && d.cardio.moves) {
      tL(p, d.cardio.moves.map((m) => `${m.name} (${m.reps})`).join('  ·  '), 48, y - 30, 8, f.reg, C.grayL)
      tL(p, 'Built in for your compound training style', 48, y - 43, 7.5, f.reg, C.gray)
    } else {
      tL(p, `${d.cardio.mins}  ·  ${d.cardio.speed}  ·  incline ${d.cardio.incline}`, 48, y - 30, 8.5, f.reg, C.grayL)
    }
  }
}

function homeDayPage(doc: PDFDocument, f: Fonts, prog: WorkoutProgram, d: HomeDay, idx: number) {
  const col = DAY_COLORS[idx % 3]
  const p = pageShell(doc, f, col, prog.name, d.title)
  cardBox(p, 36, H - 96, W - 72, 62, C.card, col, 1.6)
  tL(p, `DAY ${d.dayNum}`, 50, H - 54, 9, f.bold, col)
  tL(p, asc(d.title.replace(/^Day \d+: /, '').toUpperCase()), 50, H - 78, 16, f.bold, C.white)
  tR(p, `${prog.home!.minutes} · GO AT YOUR OWN PACE`, W - 50, H - 54, 8, f.reg, C.gray)
  tL(p, `Warm-up (3 min) — ${prog.home!.warmup.join(' · ')}`, 36, H - 112, 8, f.reg, C.gray)
  let y = H - 140
  d.exercises.forEach((e, i) => {
    cardBox(p, 36, y - 34, W - 72, 34, C.card, i === d.exercises.length - 1 ? C.gold : C.line, i === d.exercises.length - 1 ? 1.4 : 1)
    tC(p, String(i + 1), 58, y - 22, 12, f.bold, col)
    tL(p, e.name, 90, y - 21, 11, f.bold, C.white)
    tR(p, e.duration, W - 50, y - 21, 11, f.bold, C.gold)
    y -= 42
  })
  tL(p, `Round complete — rest 30-45 sec, then start back at the top. Repeat until your ${prog.home!.minutes} are up.`, 36, y - 4, 7.5, f.reg, C.gray)
  y -= 24
  cardBox(p, 36, y - 34, W - 72, 34, C.card, C.pink, 1.2)
  tL(p, 'Cool-down (3 min) — ' + prog.home!.cooldown.join(' · '), 48, y - 21, 8, f.reg, C.grayL)
  y -= 44
  cardBox(p, 36, y - 36, W - 72, 36, hex('#16120a'), C.green, 1.4)
  tL(p, 'OUTSIDE WALKING', 48, y - 15, 8.5, f.bold, C.green)
  tL(p, prog.home!.walking, 48, y - 29, 8, f.reg, C.grayL)
  if (d.estCalories !== undefined) {
    y -= 46
    cardBox(p, 36, y - 36, W - 72, 36, hex('#0c1a10'), C.green, 1.4)
    tL(p, "TODAY'S ESTIMATED BURN", 48, y - 15, 8.5, f.bold, C.green)
    tL(p, 'Estimate based on your stats — actual burn varies by pace and effort.', 48, y - 29, 7, f.reg, C.gray)
    tR(p, `~${d.estCalories} cal`, W - 50, y - 22, 14, f.bold, C.gold2)
  }
}

export async function generateWorkoutPDF(prog: WorkoutProgram): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const f: Fonts = { reg: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) }
  cover(doc, f, prog)
  if (prog.track === 'gym') prog.gymDays!.forEach((d, i) => gymDayPage(doc, f, prog, d, i))
  else prog.home!.days.forEach((d, i) => homeDayPage(doc, f, prog, d, i))
  return doc.save()
}
