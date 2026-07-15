// ============================================================
// Life Up Fitness — Calorie Blueprint PDF generator (pdf-lib)
// "Cut to the answer" build: answer-first, coach voice, fewest numbers.
// Cover → How Much → Workout vs Rest → Build Your Plate (hand + oz) →
// Where Your Calories Come From (by activity level) → Off Days → What's Next.
// Letter (612x792), bottom-left origin.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { Blueprint, Plan, PlanDay, Activity } from './nutrition'

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

// Plain-English activity labels (drives the "Where Your Calories Come From" page)
const ACTIVITY: Record<Activity, { name: string; desc: string }> = {
  sedentary: { name: 'Sedentary', desc: 'desk job, not much daily movement' },
  light: { name: 'Lightly Active', desc: 'on your feet part of the day' },
  moderate: { name: 'Moderately Active', desc: 'active job or regular movement' },
  active: { name: 'Active', desc: 'on your feet most of the day' },
  very_active: { name: 'Very Active', desc: 'physical job, always moving' },
}

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

// Big, bold, tablet-style page headline. Returns the y where the subtitle should go.
function headline(p: PDFPage, f: Fonts, title: string, subtitle: string) {
  textL(p, title, 36, H - 116, 30, f.bold, C.white)
  textL(p, subtitle, 36, H - 138, 9, f.reg, C.grayLight)
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

// A single plan card: name header + Train/Rest eat numbers + a plain "how fast" pill.
function planCard(p: PDFPage, f: Fonts, x: number, top: number, w: number, h: number, name: string, tag: string, color: RGB, plan: Plan, dir: string) {
  card(p, x, top - h, w, h, C.card, color, 1.8)
  p.drawRectangle({ x, y: top - 24, width: w, height: 24, color })
  textL(p, name, x + 12, top - 17, 11, f.bold, C.bg)
  textR(p, tag, x + w - 12, top - 16, 7.5, f.reg, C.bg)
  textL(p, 'Train days', x + 16, top - 52, 9.5, f.reg, C.grayLight)
  textR(p, `${fmt(plan.workout.eat)} cal`, x + w - 16, top - 54, 15, f.bold, C.white)
  textL(p, 'Rest days', x + 16, top - 80, 9.5, f.reg, C.grayLight)
  textR(p, `${fmt(plan.rest.eat)} cal`, x + w - 16, top - 82, 15, f.bold, C.white)
  card(p, x + 12, top - h + 12, w - 24, 28, C.goldFill)
  textC(p, `About ${Math.abs(plan.estWeeklyChangeLbs).toFixed(1)} lb ${dir} a week`, x + w / 2, top - h + 22, 9.5, f.bold, C.gold)
}

// A big single-day card (workout OR rest): calories + macro grams.
function dayCard(p: PDFPage, f: Fonts, x: number, top: number, w: number, h: number, name: string, tag: string, color: RGB, day: PlanDay, sub: string) {
  card(p, x, top - h, w, h, C.card, color, 1.8)
  p.drawRectangle({ x, y: top - 26, width: w, height: 26, color })
  textL(p, name, x + 12, top - 18, 12, f.bold, C.bg)
  textR(p, tag, x + w - 12, top - 17, 8, f.reg, C.bg)
  textC(p, fmt(day.eat), x + w / 2, top - 68, 36, f.bold, C.white)
  textC(p, 'calories', x + w / 2, top - 84, 8.5, f.reg, C.gray)
  textC(p, sub, x + w / 2, top - 100, 8.5, f.bold, color)
  const my = top - 126
  const macs: [string, number, RGB][] = [['Protein', day.macros.protein_g, C.protein], ['Carbs', day.macros.carbs_g, C.carbs], ['Fat', day.macros.fats_g, C.fat]]
  const seg = (w - 24) / 3
  macs.forEach(([lab, val, c], i) => {
    const mx = x + 12 + i * seg
    textC(p, `${val}g`, mx + seg / 2, my, 12, f.bold, c)
    textC(p, lab, mx + seg / 2, my - 12, 7, f.reg, C.gray)
  })
}

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
    'How much to eat — a steady plan and a faster one',
    'Workout days vs rest days — how much for each',
    'How to build every plate — hand + ounces, no counting',
    'Where your calories come from — by your activity level',
    'Easy off-day choices + what to expect next',
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
  headline(p, f, 'How Much To Eat', `Two ways to run it, ${firstName(bp)}. Start with Steady — Faster is only if you want it.`)

  const dir = bp.inputs.goal === 'gain' ? 'up' : 'down'
  const halfW = (W - 72 - 14) / 2
  const top = H - 162, h = 132
  planCard(p, f, 36, top, halfW, h, 'STEADY', 'start here', C.green, bp.current, dir)
  planCard(p, f, 36 + halfW + 14, top, halfW, h, 'FASTER', 'optional', C.pink, bp.aggressive, dir)

  let y = top - h - 20
  textC(p, 'Rest days are a little lower — you burn less when you’re not training.', W / 2, y, 9, f.reg, C.grayLight)

  // What that looks like
  y -= 22
  const cardH = 74
  card(p, 36, y - cardH, W - 72, cardH, C.card, C.green, 1.6)
  textL(p, 'WHAT THAT LOOKS LIKE', 52, y - 22, 9.5, f.bold, C.green)
  textL(p, '3 meals and a snack, each built around a palm of protein —', 52, y - 41, 9, f.reg, C.grayLight)
  textL(p, 'the foods you already eat. Page 4 shows how to build each plate.', 52, y - 56, 9, f.reg, C.grayLight)

  // Coach CTA
  y -= cardH + 22
  card(p, 36, y - 48, W - 72, 48, C.goldFill, C.gold, 1.6)
  textC(p, 'Inside the 6-week challenge, I turn your Steady numbers into your exact meals —', W / 2, y - 22, 9, f.bold, C.white)
  textC(p, 'so you never count a calorie.   — Coach Asa', W / 2, y - 38, 9, f.bold, C.gold)
}

// ---- PAGE 3: WORKOUT DAYS vs REST DAYS ----
function workoutRestPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Workout vs Rest Days', 3)
  pill(p, 'EAT BY THE DAY', 36, H - 70, 9, f.bold, C.teal)
  headline(p, f, 'Workout Days vs Rest Days', `Eat a little more on the ${bp.workoutDays} days you train, a little less on the ${bp.restDays} you rest.`)

  const dir = bp.inputs.goal === 'gain' ? 'grows' : bp.inputs.goal === 'maintain' ? 'holds steady' : 'leans down'
  const halfW = (W - 72 - 14) / 2
  const top = H - 162, h = 150
  dayCard(p, f, 36, top, halfW, h, 'WORKOUT DAYS', `${bp.workoutDays}× / week`, C.green, bp.current.workout, 'Fuel your training')
  dayCard(p, f, 36 + halfW + 14, top, halfW, h, 'REST DAYS', `${bp.restDays}× / week`, C.carbs, bp.current.rest, 'Recover + lean out')

  // Why the difference
  let y = top - h - 20
  const cardH = 62
  card(p, 36, y - cardH, W - 72, cardH, C.card, C.teal, 1.6)
  textL(p, 'WHY THE DIFFERENCE', 52, y - 20, 9.5, f.bold, C.teal)
  wrapL(p, `On training days your body burns about ${fmt(bp.exerciseBurn)} extra calories, so you eat a bit more to fuel the work and recover. On rest days you pull back and your body ${dir}.`, 52, y - 38, 9, f.reg, C.grayLight, W - 72 - 32, 13)

  // What it looks like
  y -= cardH + 20
  const cardH2 = 54
  card(p, 36, y - cardH2, W - 72, cardH2, C.goldFill, C.gold, 1.6)
  textC(p, 'Same meals both days — just a little more food when you train.', W / 2, y - 22, 9.5, f.bold, C.white)
  textC(p, 'Add a scoop of rice or an extra palm of protein on workout days. The next page shows how.', W / 2, y - 39, 8.5, f.reg, C.grayLight)
}

// ---- PAGE 4: BUILD YOUR PLATE (protein-first, hand + ounces, no counting) ----
function buildPlatePage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Build Your Plate', 4)
  pill(p, 'EVERY MEAL', 36, H - 70, 9, f.bold, C.purple)
  headline(p, f, 'How To Build Your Plate', 'Forget counting. Use your hand (or the ounces) and every plate is on track.')

  const boxTop = H - 162
  card(p, 36, boxTop - 56, W - 72, 56, C.goldFill, C.protein, 1.8)
  textL(p, 'YOUR ONE NUMBER: PROTEIN', 52, boxTop - 21, 9.5, f.bold, C.protein)
  textL(p, `Aim for about ${bp.protein_g}g a day — a palm (4–6 oz) of meat or a scoop of shake at each meal.`, 52, boxTop - 40, 9, f.reg, C.grayLight)

  // ---- The plate picture (left) ----
  const cx = 168, cy = H - 348, R = 82
  p.drawCircle({ x: cx, y: cy, size: R, color: C.card2, borderColor: C.gold, borderWidth: 2 })
  p.drawCircle({ x: cx, y: cy, size: R - 7, borderColor: C.gray, borderWidth: 1 })
  const rr = R - 8
  // divider lines: vertical splits veggies (left) from protein/carbs (right); horizontal splits the right half
  p.drawLine({ start: { x: cx, y: cy - rr }, end: { x: cx, y: cy + rr }, thickness: 1.5, color: C.bg })
  p.drawLine({ start: { x: cx, y: cy }, end: { x: cx + rr, y: cy }, thickness: 1.5, color: C.bg })
  // region labels inside the plate — hand word + ounces underneath
  textC(p, 'VEGGIES', cx - 38, cy + 6, 8, f.bold, C.teal)
  textC(p, 'half plate', cx - 38, cy - 5, 6.5, f.reg, C.gray)
  textC(p, '6–8 oz', cx - 38, cy - 15, 6.5, f.bold, C.gold)
  textC(p, 'PROTEIN', cx + 40, cy + 34, 7.5, f.bold, C.protein)
  textC(p, 'palm', cx + 40, cy + 24, 6.5, f.reg, C.gray)
  textC(p, '4–6 oz', cx + 40, cy + 14, 6.5, f.bold, C.gold)
  textC(p, 'CARBS', cx + 40, cy - 20, 7.5, f.bold, C.carbs)
  textC(p, 'handful', cx + 40, cy - 30, 6.5, f.reg, C.gray)
  textC(p, '3–4 oz', cx + 40, cy - 40, 6.5, f.bold, C.gold)
  textC(p, 'plus a thumb of fat (about ½ oz) for cooking', cx, cy - R - 20, 8, f.reg, C.grayLight)

  // ---- The 4 parts (right) — hand example + ounces underneath ----
  const parts = [
    { c: C.protein, t: 'Protein — a palm', oz: '4–6 oz', d: 'Chicken, eggs, fish' },
    { c: C.carbs, t: 'Carbs — a handful', oz: '3–4 oz', d: 'Rice, oats, potatoes' },
    { c: C.teal, t: 'Veggies — half the plate', oz: '6–8 oz', d: 'Any you like' },
    { c: C.fat, t: 'Fats — a thumb', oz: '½ oz (1 tbsp)', d: 'Oils, nuts, avocado' },
  ]
  let ry = boxTop - 80
  parts.forEach((r) => {
    p.drawCircle({ x: 306, y: ry - 4, size: 6, color: r.c })
    textL(p, r.t, 322, ry - 8, 11.5, f.bold, r.c)
    textL(p, r.oz, 322, ry - 22, 9, f.bold, C.gold)
    textL(p, r.d, 322 + f.bold.widthOfTextAtSize(r.oz + '   ', 9), ry - 22, 8.5, f.reg, C.gray)
    ry -= 48
  })

  noteBox(p, 36, H - 520, W - 72, 40, C.purple, [
    'Half your plate veggies, a palm of protein, a handful of carbs, a thumb of fat.',
    'Use your hand or the ounces — do this every meal and your numbers take care of themselves.',
  ], f.reg)

  // ---- Personalized: THIS person's macros translated into hand portions ----
  const wm = bp.current.workout.macros
  const palms = Math.max(1, Math.round(wm.protein_g / 30))
  const handfuls = Math.max(1, Math.round(wm.carbs_g / 30))
  const thumbs = Math.max(1, Math.round(wm.fats_g / 12))
  const pyTop = H - 560, ph = 92
  card(p, 36, pyTop - ph, W - 72, ph, C.card, C.gold, 1.8)
  textL(p, 'YOUR DAY, IN PORTIONS', 52, pyTop - 24, 10, f.bold, C.gold)
  textL(p, 'A full training day in hand portions — spread across 3 meals + a snack. Rest days: about 1 fewer handful of carbs.', 52, pyTop - 40, 8.5, f.reg, C.grayLight)
  const cols3: [number, string, string, RGB][] = [
    [palms, palms === 1 ? 'palm' : 'palms', 'PROTEIN', C.protein],
    [handfuls, handfuls === 1 ? 'handful' : 'handfuls', 'CARBS', C.carbs],
    [thumbs, thumbs === 1 ? 'thumb' : 'thumbs', 'FAT', C.fat],
  ]
  const seg3 = (W - 72) / 3
  cols3.forEach(([n, unit, mac, c], i) => {
    const cxp = 36 + seg3 * i + seg3 / 2
    textC(p, `${n} ${unit}`, cxp, pyTop - 68, 16, f.bold, c)
    textC(p, mac, cxp, pyTop - 82, 7.5, f.reg, C.gray)
  })
}

// ---- PAGE 5: WHERE YOUR CALORIES COME FROM (by activity level) ----
function activityCaloriePage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.carbs, bp.inputs.name || 'Your', 'Where Your Calories Come From', 5)
  const act = ACTIVITY[bp.inputs.activity]
  pill(p, 'YOUR ACTIVITY', 36, H - 70, 9, f.bold, C.carbs)
  headline(p, f, 'Where Your Calories Come From', 'Your daily number is built around how much you move — your activity level.')

  // Activity level highlight
  const aTop = H - 156
  card(p, 36, aTop - 50, W - 72, 50, C.goldFill, C.carbs, 1.8)
  textL(p, 'YOUR ACTIVITY LEVEL', 52, aTop - 19, 9, f.bold, C.carbs)
  textL(p, `${act.name} — ${act.desc}.`, 52, aTop - 37, 10.5, f.bold, C.white)
  textR(p, `+${fmt(bp.neat)} cal/day`, W - 52, aTop - 30, 12, f.bold, C.gold)

  textL(p, 'Your body burns calories three ways', 36, aTop - 74, 9.5, f.bold, C.carbs)
  const layers = [
    { c: C.green, t: 'Just staying alive', sub: '(BMR — your age, height + weight)', v: bp.bmr },
    { c: C.carbs, t: 'Moving around your day', sub: `(NEAT — set by "${act.name}")`, v: bp.neat },
    { c: C.pink, t: 'Your workouts', sub: `(exercise burn — ${bp.workoutDays} training days)`, v: bp.exerciseBurn },
  ]
  let y = aTop - 88
  layers.forEach((l) => {
    card(p, 36, y - 38, W - 72, 38, C.card, l.c, 1.2)
    p.drawCircle({ x: 56, y: y - 19, size: 5, color: l.c })
    textL(p, l.t, 72, y - 15, 10, f.bold, C.white)
    textL(p, l.sub, 72, y - 28, 8, f.reg, C.gray)
    textR(p, `${fmt(l.v)} cal`, W - 52, y - 23, 12, f.bold, C.gold)
    y -= 46
  })

  // Totals per day type
  y -= 4
  const halfW = (W - 72 - 14) / 2
  card(p, 36, y - 40, halfW, 40, C.card, C.orange, 1.4)
  textL(p, 'Rest day burn', 50, y - 16, 8, f.reg, C.gray)
  textR(p, `${fmt(bp.restMaintenance)} cal`, 36 + halfW - 14, y - 30, 13, f.bold, C.white)
  card(p, 36 + halfW + 14, y - 40, halfW, 40, C.card, C.green, 1.4)
  textL(p, 'Training day burn', 36 + halfW + 28, y - 16, 8, f.reg, C.gray)
  textR(p, `${fmt(bp.workoutMaintenance)} cal`, W - 50, y - 30, 13, f.bold, C.white)

  y -= 40 + 22
  noteBox(p, 36, y - 56, W - 72, 56, C.carbs, [
    `Because you're ${act.name.toLowerCase()}, your body burns about ${fmt(bp.restMaintenance)} calories on a rest day`,
    `and ${fmt(bp.workoutMaintenance)} on a training day. We set your food a little under that, so your body`,
    'pulls the difference from stored fat — and your protein stays high so you keep your shape.',
  ], f.reg)
}

// ---- PAGE 6: OFF DAYS ----
function offDaysPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.pink, bp.inputs.name || 'Your', 'Off Days', 6)
  pill(p, 'OFF DAYS', 36, H - 70, 9, f.bold, C.pink)
  headline(p, f, 'Your Off Days', 'It happens. Pick one, keep moving, no guilt.')

  const opts = [
    { c: C.green, t: 'Keep It Easy', d: 'Eat like a normal day with your usual foods. Don’t stress the number.' },
    { c: C.gold, t: 'Eat Freely', d: 'Enjoy the foods you love. Just stop when you’re satisfied, not stuffed.' },
    { c: C.purple, t: 'Carb Refuel — once a month', d: 'One day with extra carbs to refill your energy and keep your body from stalling.' },
  ]
  let y = H - 168
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

// ---- PAGE 7: WHAT'S NEXT (what to expect + challenge CTA) ----
function nextStepPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.orange, bp.inputs.name || 'Your', "What's Next", 7)
  pill(p, "WHAT'S NEXT", 36, H - 70, 9, f.bold, C.orange)
  headline(p, f, 'What To Expect', 'Stay consistent and here’s how it tends to go.')

  const mw = (W - 72 - 42) / 4
  bp.timeline.forEach((m, i) => {
    const x = 36 + i * (mw + 14)
    const c = SECTION_COLORS[i % SECTION_COLORS.length]
    card(p, x, H - 258, mw, 88, C.card, c, 1.5)
    p.drawRectangle({ x, y: H - 258 + 85, width: mw, height: 3, color: c })
    textC(p, m.label, x + mw / 2, H - 196, 9, f.bold, c)
    textC(p, m.lbs, x + mw / 2, H - 218, 11, f.bold, C.white)
    const words = m.desc.split(' '); let line = ''; let ly = H - 234
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7) > mw - 14) { textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight); line = wd + ' '; ly -= 10 }
      else line += wd + ' '
    })
    textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight)
  })

  // Big CTA
  card(p, 36, H - 428, W - 72, 120, C.goldFill, C.orange, 1.8)
  textC(p, 'Your numbers are step one.', W / 2, H - 340, 15, f.bold, C.white)
  textC(p, 'Inside the 6-Week Challenge I build them into done-for-you meals + workouts,', W / 2, H - 364, 9.5, f.reg, C.grayLight)
  textC(p, 'and I check in with you every single week so you actually follow through.', W / 2, H - 380, 9.5, f.reg, C.grayLight)
  card(p, W / 2 - 105, H - 418, 210, 30, C.gold)
  textC(p, 'Start today  •  asaluke.io', W / 2, H - 409, 11, f.bold, C.bg)
}

export async function generateBlueprintPDF(bp: Blueprint): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  coverPage(doc, fonts, bp)
  howMuchPage(doc, fonts, bp)
  workoutRestPage(doc, fonts, bp)
  buildPlatePage(doc, fonts, bp)
  activityCaloriePage(doc, fonts, bp)
  offDaysPage(doc, fonts, bp)
  nextStepPage(doc, fonts, bp)
  return doc.save()
}
