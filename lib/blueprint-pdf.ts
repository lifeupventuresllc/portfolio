// ============================================================
// Life Up Fitness — Calorie Blueprint PDF generator (pdf-lib)
// "Cut to the answer" build: answer-first, coach voice, fewest numbers.
// Cover → How Much To Eat → Build Your Plate → Off Days → What's Next → The Math (optional).
// Letter (612x792), bottom-left origin.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { Blueprint } from './nutrition'

// ---- Palette ----
const hex = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}
const C = {
  bg: hex('#0a0a0f'), card: hex('#13131a'), card2: hex('#1c1c26'),
  gold: hex('#C9A84C'), goldDark: hex('#6B5010'), goldFill: hex('#16120a'),
  white: hex('#F0EEF5'), gray: hex('#888899'), grayLight: hex('#C8C8D8'),
  teal: hex('#2EC4B6'), green: hex('#3DBE6C'), purple: hex('#9B6FD4'),
  pink: hex('#E8559A'), orange: hex('#F0872A'),
  protein: hex('#3DBE6C'), carbs: hex('#4A9FE0'), fat: hex('#F0872A'), lime: hex('#8BC34A'),
}
const SECTION_COLORS = [C.teal, C.green, C.teal, C.purple, C.pink, C.orange]
const W = 612, H = 792

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

interface Fonts { reg: PDFFont; bold: PDFFont }

function textL(p: PDFPage, t: string, x: number, y: number, size: number, f: PDFFont, color: RGB) {
  p.drawText(t, { x, y, size, font: f, color })
}
function textC(p: PDFPage, t: string, cx: number, y: number, size: number, f: PDFFont, color: RGB) {
  const w = f.widthOfTextAtSize(t, size)
  p.drawText(t, { x: cx - w / 2, y, size, font: f, color })
}
function textR(p: PDFPage, t: string, rx: number, y: number, size: number, f: PDFFont, color: RGB) {
  const w = f.widthOfTextAtSize(t, size)
  p.drawText(t, { x: rx - w, y, size, font: f, color })
}
function card(p: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB, bw = 1.5) {
  p.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? bw : 0 })
}
function pill(p: PDFPage, t: string, x: number, y: number, size: number, f: PDFFont, color: RGB) {
  const tw = f.widthOfTextAtSize(t, size)
  card(p, x, y - 4, tw + 18, size + 10, C.bg, color, 1)
  textL(p, t, x + 9, y + 2, size, f, color)
}
function noteBox(p: PDFPage, x: number, y: number, w: number, h: number, color: RGB, lines: string[], f: PDFFont) {
  card(p, x, y, w, h, C.goldFill)
  p.drawRectangle({ x, y, width: 4, height: h, color })
  let ty = y + h - 16
  for (const ln of lines) { textL(p, ln, x + 14, ty, 8, f, C.grayLight); ty -= 12 }
}
// wrap `text` into lines that fit `maxW` at `size`, drawn left-aligned from (x, y) going down
function wrapL(p: PDFPage, text: string, x: number, y: number, size: number, f: PDFFont, color: RGB, maxW: number, lh: number): number {
  const words = text.split(' '); let line = ''; let ly = y
  words.forEach((wd) => {
    if (f.widthOfTextAtSize(line + wd, size) > maxW) { textL(p, line, x, ly, size, f, color); line = wd + ' '; ly -= lh }
    else line += wd + ' '
  })
  textL(p, line, x, ly, size, f, color)
  return ly
}

function pageBase(doc: PDFDocument, fonts: Fonts, sectionColor: RGB, clientName: string, sectionName: string, pageNum: number): PDFPage {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: sectionColor })     // top stripe
  textR(p, String(pageNum), W - 30, H - 90, 100, fonts.bold, sectionColor)          // watermark
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.card2 })
  textL(p, `Life Up Fitness   •   ${clientName}'s Blueprint   •   ${sectionName}`, 36, 10, 7, fonts.reg, C.gray)
  return p
}

const firstName = (bp: Blueprint) => (bp.inputs.name || '').split(' ')[0] || 'friend'

// ---- PAGE 1: COVER ----
function coverPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const seg = W / SECTION_COLORS.length
  SECTION_COLORS.forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))

  const name = bp.inputs.name || 'Your'
  p.drawLine({ start: { x: 206, y: H - 67 }, end: { x: 290, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawLine({ start: { x: 322, y: H - 67 }, end: { x: 406, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawCircle({ x: W / 2, y: H - 67, size: 3.5, color: C.gold })

  const nameTxt = name.toUpperCase()
  const nw = f.bold.widthOfTextAtSize(nameTxt, 11)
  card(p, W / 2 - nw / 2 - 12, H - 118, nw + 24, 24, C.bg, C.pink, 1.2)
  textC(p, nameTxt, W / 2, H - 111, 11, f.bold, C.pink)

  textC(p, 'Your Calorie', W / 2, H - 168, 34, f.bold, C.white)
  textC(p, 'Blueprint', W / 2, H - 208, 34, f.bold, C.gold)

  const stats = [
    { l: 'AGE', v: String(bp.inputs.age), c: C.teal },
    { l: 'WEIGHT', v: `${fmt(bp.inputs.weight_lbs)} lb`, c: C.green },
    { l: 'HEIGHT', v: `${Math.floor(bp.inputs.height_in / 12)}'${Math.round(bp.inputs.height_in % 12)}"`, c: C.purple },
    { l: 'GOAL', v: bp.inputs.goal === 'gain' ? 'Build' : bp.inputs.goal === 'maintain' ? 'Maintain' : 'Lose', c: C.orange },
  ]
  const cw = 118, gap = 14, totalW = cw * 4 + gap * 3, startX = (W - totalW) / 2, cy = H - 320
  stats.forEach((s, i) => {
    const x = startX + i * (cw + gap)
    card(p, x, cy, cw, 74, C.card, s.c, 1.5)
    p.drawRectangle({ x, y: cy + 71, width: cw, height: 3, color: C.gold })
    textC(p, s.l, x + cw / 2, cy + 50, 8, f.reg, C.gray)
    textC(p, s.v, x + cw / 2, cy + 24, 18, f.bold, s.c)
  })

  textC(p, "WHAT'S INSIDE", W / 2, cy - 44, 11, f.bold, C.gold)
  const items = [
    'Exactly how much to eat — your two numbers',
    'How to build every plate (protein first, no counting)',
    'Easy off-day choices, no stress',
    'What to expect + your next step',
    'The math behind it all — only if you’re curious',
  ]
  let iy = cy - 74
  items.forEach((it, i) => {
    const x = startX
    card(p, x, iy - 4, 20, 20, C.bg, SECTION_COLORS[i % SECTION_COLORS.length], 1)
    textC(p, String(i + 1), x + 10, iy + 1, 10, f.bold, SECTION_COLORS[i % SECTION_COLORS.length])
    textL(p, it, x + 30, iy + 1, 9.5, f.reg, C.grayLight)
    iy -= 30
  })

  card(p, startX, 70, totalW, 46, C.goldFill, C.green, 1.5)
  textC(p, 'This is step one — knowing your numbers.', W / 2, 96, 10, f.bold, C.white)
  textC(p, 'Inside the challenge, I turn them into your meals and check in weekly. — Coach Asa', W / 2, 80, 8.5, f.reg, C.grayLight)

  textC(p, `© ${new Date().getFullYear()} Life Up Fitness  •  Coach Asa  •  asaluke.io`, W / 2, 34, 7, f.reg, C.gray)
}

// ---- PAGE 2: HOW MUCH TO EAT (the answer, lead with it) ----
function howMuchPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.green, bp.inputs.name || 'Your', 'How Much To Eat', 2)
  pill(p, 'START HERE', 36, H - 70, 9, f.bold, C.green)
  textL(p, 'How Much To Eat', 36, H - 108, 24, f.bold, C.white)
  textL(p, `This is the whole thing, ${firstName(bp)}. Eat this much and your body handles the rest.`, 36, H - 126, 9, f.reg, C.grayLight)

  const cur = bp.current
  const halfW = (W - 72 - 14) / 2
  const boxTop = H - 150, boxH = 120
  const boxes = [
    { l: 'ON DAYS YOU TRAIN', v: cur.workout.eat, c: C.green },
    { l: 'ON DAYS YOU REST', v: cur.rest.eat, c: C.gold },
  ]
  boxes.forEach((b, i) => {
    const x = 36 + i * (halfW + 14)
    card(p, x, boxTop - boxH, halfW, boxH, C.goldFill, b.c, 1.8)
    textC(p, b.l, x + halfW / 2, boxTop - 28, 9, f.bold, b.c)
    textC(p, fmt(b.v), x + halfW / 2, boxTop - 88, 46, f.bold, C.white)
    textC(p, 'calories a day', x + halfW / 2, boxTop - 104, 8, f.reg, C.gray)
  })

  let y = boxTop - boxH - 20
  textC(p, 'Rest days are a little lower — you burn less when you’re not training. That’s the only difference.', W / 2, y, 9, f.reg, C.grayLight)

  // What that looks like
  y -= 22
  const cardH = 92
  card(p, 36, y - cardH, W - 72, cardH, C.card, C.green, 1.6)
  textL(p, 'WHAT THAT LOOKS LIKE', 52, y - 24, 9.5, f.bold, C.green)
  const lines = [
    '3 meals and a snack, each built around a palm of protein —',
    'the foods you already eat, nothing weird or hard to pronounce.',
    'The next page shows exactly how to build each plate.',
  ]
  let ly = y - 44
  lines.forEach((l) => { textL(p, l, 52, ly, 9, f.reg, C.grayLight); ly -= 15 })

  // Want it faster (aggressive) — one small line
  y = y - cardH - 24
  const agg = bp.aggressive
  textC(p, `Want it a little faster? Some eat ${fmt(agg.workout.eat)} / ${fmt(agg.rest.eat)} instead — only if you feel good doing it.`, W / 2, y, 8.5, f.reg, C.gray)

  // Coach CTA
  y -= 30
  card(p, 36, y - 48, W - 72, 48, C.goldFill, C.gold, 1.6)
  textC(p, 'Inside the 6-week challenge, I turn this number into your exact meals for the week —', W / 2, y - 22, 9, f.bold, C.white)
  textC(p, 'so you never count a calorie.   — Coach Asa', W / 2, y - 38, 9, f.bold, C.gold)
}

// ---- PAGE 3: BUILD YOUR PLATE (protein-first, hand portions, no counting) ----
function buildPlatePage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Build Your Plate', 3)
  pill(p, 'EVERY MEAL', 36, H - 70, 9, f.bold, C.purple)
  textL(p, 'How To Build Your Plate', 36, H - 108, 24, f.bold, C.white)
  textL(p, 'Forget counting. Build every plate like this and you’re on track.', 36, H - 126, 9, f.reg, C.grayLight)

  const boxTop = H - 150
  card(p, 36, boxTop - 60, W - 72, 60, C.goldFill, C.protein, 1.8)
  textL(p, 'YOUR ONE NUMBER: PROTEIN', 52, boxTop - 22, 9.5, f.bold, C.protein)
  textL(p, `Aim for about ${bp.protein_g}g a day — a palm of meat or a scoop of shake at each meal.`, 52, boxTop - 42, 9, f.reg, C.grayLight)

  const rows = [
    { c: C.protein, t: 'Protein — a palm', d: 'Chicken, eggs, shakes, lean beef, fish' },
    { c: C.carbs, t: 'Carbs — a cupped handful', d: 'Rice, oats, potatoes, fruit' },
    { c: C.green, t: 'Veggies — fill half the plate', d: 'Any you like — the more color, the better' },
    { c: C.fat, t: 'Fats — a thumb', d: 'Oils, nuts, avocado, cheese' },
  ]
  let y = boxTop - 60 - 22
  rows.forEach((r) => {
    card(p, 36, y - 56, W - 72, 56, C.card, r.c, 1.5)
    p.drawCircle({ x: 60, y: y - 28, size: 11, color: r.c })
    textL(p, r.t, 84, y - 24, 12, f.bold, r.c)
    textL(p, r.d, 84, y - 42, 9, f.reg, C.grayLight)
    y -= 66
  })

  noteBox(p, 36, y - 40, W - 72, 40, C.purple, [
    'Do this every meal and the numbers take care of themselves.',
    'Want to double-check? A free app like MyFitnessPal makes it easy.',
  ], f.reg)
}

// ---- PAGE 4: OFF DAYS ----
function offDaysPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.pink, bp.inputs.name || 'Your', 'Off Days', 4)
  pill(p, 'OFF DAYS', 36, H - 70, 9, f.bold, C.pink)
  textL(p, "Days You Don't Feel Like Tracking", 36, H - 108, 22, f.bold, C.white)
  textL(p, 'It happens. Pick one, keep moving, no guilt.', 36, H - 126, 9, f.reg, C.grayLight)

  const opts = [
    { c: C.green, t: 'Keep It Easy', d: 'Eat like a normal day with your usual foods. Don’t stress the number.' },
    { c: C.gold, t: 'Eat Freely', d: 'Enjoy the foods you love. Just stop when you’re satisfied, not stuffed.' },
    { c: C.purple, t: 'Carb Refuel — once a month', d: 'One day with extra carbs to refill your energy and keep your body from stalling.' },
  ]
  let y = H - 160
  opts.forEach((o, i) => {
    card(p, 36, y - 72, W - 72, 72, C.card, o.c, 1.6)
    p.drawCircle({ x: 62, y: y - 36, size: 13, color: o.c })
    textC(p, String(i + 1), 62, y - 40, 12, f.bold, C.bg)
    textL(p, o.t, 86, y - 30, 13, f.bold, o.c)
    wrapL(p, o.d, 86, y - 50, 9.5, f.reg, C.grayLight, W - 72 - 90, 13)
    y -= 84
  })
  noteBox(p, 36, y - 40, W - 72, 40, C.pink, [
    'An easy rhythm: eat freely on your off-days for three weeks,',
    'then one carb-refuel day in week four. Repeat every month.',
  ], f.reg)
}

// ---- PAGE 5: WHAT'S NEXT (what to expect + challenge CTA) ----
function nextStepPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.orange, bp.inputs.name || 'Your', "What's Next", 5)
  pill(p, "WHAT'S NEXT", 36, H - 70, 9, f.bold, C.orange)
  textL(p, 'What To Expect', 36, H - 108, 22, f.bold, C.white)
  textL(p, 'Stay consistent and here’s how it tends to go.', 36, H - 126, 9, f.reg, C.grayLight)

  const mw = (W - 72 - 42) / 4
  bp.timeline.forEach((m, i) => {
    const x = 36 + i * (mw + 14)
    const c = SECTION_COLORS[i % SECTION_COLORS.length]
    card(p, x, H - 250, mw, 88, C.card, c, 1.5)
    p.drawRectangle({ x, y: H - 250 + 85, width: mw, height: 3, color: c })
    textC(p, m.label, x + mw / 2, H - 188, 9, f.bold, c)
    textC(p, m.lbs, x + mw / 2, H - 210, 11, f.bold, C.white)
    const words = m.desc.split(' '); let line = ''; let ly = H - 226
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7) > mw - 14) { textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight); line = wd + ' '; ly -= 10 }
      else line += wd + ' '
    })
    textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight)
  })

  // Big CTA
  card(p, 36, H - 420, W - 72, 120, C.goldFill, C.orange, 1.8)
  textC(p, 'Your numbers are step one.', W / 2, H - 332, 15, f.bold, C.white)
  textC(p, 'Inside the 6-Week Challenge I build them into done-for-you meals + workouts,', W / 2, H - 356, 9.5, f.reg, C.grayLight)
  textC(p, 'and I check in with you every single week so you actually follow through.', W / 2, H - 372, 9.5, f.reg, C.grayLight)
  card(p, W / 2 - 105, H - 410, 210, 30, C.gold)
  textC(p, 'Start today  •  asaluke.io', W / 2, H - 401, 11, f.bold, C.bg)
}

// ---- PAGE 6: THE MATH (optional — the burn layers + weekly deficit, demoted) ----
function mathPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'The Math', 6)
  pill(p, 'OPTIONAL', 36, H - 70, 9, f.bold, C.teal)
  textL(p, "The Math (Only If You're Curious)", 36, H - 108, 22, f.bold, C.white)
  textL(p, 'You don’t need this page. Here’s how your numbers were figured out.', 36, H - 126, 9, f.reg, C.grayLight)

  textL(p, 'Your body burns calories three ways:', 36, H - 154, 9.5, f.bold, C.teal)
  const layers = [
    { c: C.green, t: 'Just staying alive', v: bp.bmr },
    { c: C.carbs, t: 'Moving around your day', v: bp.neat },
    { c: C.pink, t: 'Your workouts', v: bp.exerciseBurn },
  ]
  let y = H - 170
  layers.forEach((l) => {
    card(p, 36, y - 30, W - 72, 30, C.card, l.c, 1.2)
    p.drawCircle({ x: 54, y: y - 15, size: 5, color: l.c })
    textL(p, l.t, 70, y - 19, 9.5, f.reg, C.white)
    textR(p, `${fmt(l.v)} cal`, W - 52, y - 19, 9.5, f.bold, C.gold)
    y -= 38
  })

  y -= 4
  const halfW = (W - 72 - 14) / 2
  card(p, 36, y - 40, halfW, 40, C.card, C.orange, 1.4)
  textL(p, 'On a rest day you burn', 50, y - 16, 8.5, f.reg, C.gray)
  textR(p, `${fmt(bp.restMaintenance)} cal`, 36 + halfW - 14, y - 30, 13, f.bold, C.white)
  card(p, 36 + halfW + 14, y - 40, halfW, 40, C.card, C.green, 1.4)
  textL(p, 'On a training day you burn', 36 + halfW + 28, y - 16, 8.5, f.reg, C.gray)
  textR(p, `${fmt(bp.workoutMaintenance)} cal`, W - 50, y - 30, 13, f.bold, C.white)

  y -= 60
  p.drawRectangle({ x: 36, y: y - 4, width: W - 72, height: 20, color: C.teal })
  textL(p, 'OVER A WHOLE WEEK', 48, y + 2, 8, f.bold, C.bg)
  y -= 26
  const rows: [string, string][] = [
    ['You burn about', `${fmt(bp.weeklyMaintenance)} cal`],
    ['You eat about', `${fmt(bp.current.weeklyEat)} cal`],
    [bp.current.weeklyDelta < 0 ? 'The gap (that comes off you)' : 'The extra (that builds on you)', `${bp.current.weeklyDelta > 0 ? '+' : ''}${fmt(bp.current.weeklyDelta)} cal`],
    ['Which is about', `${bp.current.estWeeklyChangeLbs > 0 ? '+' : ''}${bp.current.estWeeklyChangeLbs} lb / week`],
  ]
  rows.forEach((r, i) => {
    if (i % 2 === 1) card(p, 36, y - 5, W - 72, 20, C.card)
    textL(p, r[0], 48, y, 9, f.reg, C.grayLight)
    textR(p, r[1], W - 48, y, 9, f.bold, C.gold)
    y -= 22
  })
  noteBox(p, 36, y - 40, W - 72, 40, C.teal, [
    'A small gap each week, steady loss, protein kept high so you keep your shape.',
    'That’s the whole science — the plan pages are all you actually need.',
  ], f.reg)
}

export async function generateBlueprintPDF(bp: Blueprint): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  coverPage(doc, fonts, bp)
  howMuchPage(doc, fonts, bp)
  buildPlatePage(doc, fonts, bp)
  offDaysPage(doc, fonts, bp)
  nextStepPage(doc, fonts, bp)
  mathPage(doc, fonts, bp)
  return doc.save()
}
