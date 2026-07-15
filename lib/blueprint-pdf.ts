// ============================================================
// Life Up Fitness — Calorie Blueprint PDF generator (pdf-lib)
// "Cut to the answer" build: answer-first, coach voice, fewest numbers.
// Cover → How Much → Workout vs Rest → Build Your Plate (hand + oz) →
// Where Your Calories Come From (by activity level) → Off Days → What's Next.
// Letter (612x792), bottom-left origin.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB, PDFString, PDFName } from 'pdf-lib'
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
  none: { name: 'Not Active', desc: 'mostly resting, very little daily movement' },
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
function headline(p: PDFPage, f: Fonts, title: string, subtitle: string, titleSize = 30) {
  textL(p, title, 36, H - 116, titleSize, f.bold, C.white)
  textL(p, subtitle, 36, H - 138, 9, f.reg, C.grayLight)
}

// Make a rectangle a clickable hyperlink (URI action) over already-drawn content.
function linkRect(doc: PDFDocument, p: PDFPage, x: number, y: number, w: number, h: number, url: string) {
  const annot = doc.context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + w, y + h], Border: [0, 0, 0],
    A: doc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(url) }),
  })
  const ref = doc.context.register(annot)
  const existing = p.node.Annots()
  if (existing) existing.push(ref)
  else p.node.set(PDFName.of('Annots'), doc.context.obj([ref]))
}

const CHALLENGE_URL = 'https://www.asaluke.io/challenge'

// Filled pie wedge on a circle centered at (cx,cy) radius r, from angle a0 to a1 (degrees).
// Angles: 0°=right, sweeping so sin>0 is the lower half (page space). Used for the divided plate.
function wedge(p: PDFPage, cx: number, cy: number, r: number, a0: number, a1: number, color: RGB) {
  const N = 28
  let d = `M ${r} ${r}`
  for (let i = 0; i <= N; i++) {
    const t = ((a0 + (a1 - a0) * (i / N)) * Math.PI) / 180
    d += ` L ${(r + r * Math.cos(t)).toFixed(2)} ${(r + r * Math.sin(t)).toFixed(2)}`
  }
  d += ' Z'
  p.drawSvgPath(d, { x: cx - r, y: cy + r, color, borderWidth: 0 })
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

// A single plan card: name header + Workout/Rest eat numbers + a plain "how fast" pill.
// When noWorkout, collapses to one "Every day" number (no split).
function planCard(p: PDFPage, f: Fonts, x: number, top: number, w: number, h: number, name: string, tag: string, color: RGB, plan: Plan, dir: string, noWorkout = false) {
  card(p, x, top - h, w, h, C.card, color, 1.8)
  p.drawRectangle({ x, y: top - 24, width: w, height: 24, color })
  textL(p, name, x + 12, top - 17, 11, f.bold, C.bg)
  textR(p, tag, x + w - 12, top - 16, 7.5, f.reg, C.bg)
  if (noWorkout) {
    textC(p, 'EVERY DAY', x + w / 2, top - 52, 9, f.reg, C.grayLight)
    textC(p, `${fmt(plan.rest.eat)} cal`, x + w / 2, top - 82, 24, f.bold, C.white)
  } else {
    textL(p, 'Workout days', x + 16, top - 52, 9.5, f.reg, C.grayLight)
    textR(p, `${fmt(plan.workout.eat)} cal`, x + w - 16, top - 54, 15, f.bold, C.white)
    textL(p, 'Rest days', x + 16, top - 80, 9.5, f.reg, C.grayLight)
    textR(p, `${fmt(plan.rest.eat)} cal`, x + w - 16, top - 82, 15, f.bold, C.white)
  }
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

  const goalLabel = bp.inputs.goal === 'gain' ? 'Build' : bp.inputs.goal === 'maintain' ? 'Maintain' : 'Lose'
  const goalSub = bp.inputs.goal_weight_lbs ? `Goal ${fmt(bp.inputs.goal_weight_lbs)} lb` : undefined
  const stats: { l: string; v: string; c: RGB; sub?: string }[] = [
    { l: 'AGE', v: String(bp.inputs.age), c: C.teal },
    { l: 'WEIGHT', v: `${fmt(bp.inputs.weight_lbs)} lb`, c: C.green },
    { l: 'HEIGHT', v: `${Math.floor(bp.inputs.height_in / 12)}'${Math.round(bp.inputs.height_in % 12)}"`, c: C.purple },
    { l: 'GOAL', v: goalLabel, c: C.orange, sub: goalSub },
  ]
  const cw = 118, gap = 14, totalW = cw * 4 + gap * 3, startX = (W - totalW) / 2, cy = H - 320
  stats.forEach((s, i) => {
    const x = startX + i * (cw + gap)
    card(p, x, cy, cw, 74, C.card, s.c, 1.5)
    p.drawRectangle({ x, y: cy + 71, width: cw, height: 3, color: C.gold })
    textC(p, s.l, x + cw / 2, cy + 50, 8, f.reg, C.gray)
    if (s.sub) {
      textC(p, s.v, x + cw / 2, cy + 28, 16, f.bold, s.c)
      textC(p, s.sub, x + cw / 2, cy + 13, 8.5, f.bold, C.gold)
    } else {
      textC(p, s.v, x + cw / 2, cy + 24, 18, f.bold, s.c)
    }
  })

  textC(p, "WHAT'S INSIDE", W / 2, cy - 44, 11, f.bold, C.gold)
  const items = [
    'How much to eat — a steady plan and a faster one',
    bp.workoutDays === 0 ? 'Your daily number — the same simple target every day' : 'Workout days vs rest days — how much for each',
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
  const noWorkout = bp.workoutDays === 0
  pill(p, 'START HERE', 36, H - 70, 9, f.bold, C.green)
  headline(p, f, 'How Much To Eat', `Two ways to run it, ${firstName(bp)}. Start with Steady — Faster is only if you want it.`)

  // ---- Seamless top offer (subtle, clickable) ----
  card(p, 36, H - 167, W - 72, 22, C.goldFill, C.gold, 0.75)
  textL(p, 'Need personal training?', 48, H - 160, 8.5, f.reg, C.gold)
  textR(p, 'Join the 6-Week Challenge  »', W - 48, H - 160, 8.5, f.bold, C.gold)
  linkRect(doc, p, 36, H - 167, W - 72, 22, CHALLENGE_URL)

  const dir = bp.inputs.goal === 'gain' ? 'up' : 'down'
  const halfW = (W - 72 - 14) / 2
  const top = H - 196, h = 132
  planCard(p, f, 36, top, halfW, h, 'STEADY', 'start here', C.green, bp.current, dir, noWorkout)
  planCard(p, f, 36 + halfW + 14, top, halfW, h, 'FASTER', 'optional', C.pink, bp.aggressive, dir, noWorkout)

  let y = top - h - 20
  textC(p, noWorkout
    ? 'You’re not working out right now, so it’s the same simple number every day.'
    : 'Rest days are a little lower — you burn less when you’re not working out.', W / 2, y, 9, f.reg, C.grayLight)

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

// ---- PAGE 3: WORKOUT DAYS vs REST DAYS (or ONE daily number if no workouts) ----
function workoutRestPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  // No workout days -> one simple daily number, no split.
  if (bp.workoutDays === 0) {
    const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Your Daily Number', 3)
    pill(p, 'EAT BY THE DAY', 36, H - 70, 9, f.bold, C.teal)
    headline(p, f, 'Your Daily Number', `You’re not working out right now, ${firstName(bp)} — so every day is the same simple target.`)
    const w = 320, x = (W - w) / 2, top = H - 172, h = 150
    dayCard(p, f, x, top, w, h, 'EVERY DAY', '7 days / week', C.green, bp.current.rest, 'Same target daily')
    let y = top - h - 22
    const cardH = 62
    card(p, 36, y - cardH, W - 72, cardH, C.card, C.teal, 1.6)
    textL(p, 'WHY IT’S THE SAME EVERY DAY', 52, y - 20, 9.5, f.bold, C.teal)
    wrapL(p, 'Your body burns about the same amount every day when you’re not training, so your food stays the same too. Hit this number and the plate on the next page and you’re set.', 52, y - 38, 9, f.reg, C.grayLight, W - 72 - 32, 13)
    y -= cardH + 20
    const cardH2 = 54
    card(p, 36, y - cardH2, W - 72, cardH2, C.goldFill, C.gold, 1.6)
    textC(p, 'Start moving later? Add a little food on the days you work out.', W / 2, y - 22, 9.5, f.bold, C.white)
    textC(p, 'When you join the challenge I build your workouts in and adjust these numbers for you.', W / 2, y - 39, 8.5, f.reg, C.grayLight)
    return
  }

  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Workout vs Rest Days', 3)
  pill(p, 'EAT BY THE DAY', 36, H - 70, 9, f.bold, C.teal)
  headline(p, f, 'Workout Days vs Rest Days', `Eat a little more on your ${bp.workoutDays} workout days, a little less on your ${bp.restDays} rest days.`)

  const dir = bp.inputs.goal === 'gain' ? 'grows' : bp.inputs.goal === 'maintain' ? 'holds steady' : 'leans down'
  const halfW = (W - 72 - 14) / 2
  const top = H - 162, h = 150
  dayCard(p, f, 36, top, halfW, h, 'WORKOUT DAYS', `${bp.workoutDays}× / week`, C.green, bp.current.workout, 'Fuel your workout')
  dayCard(p, f, 36 + halfW + 14, top, halfW, h, 'REST DAYS', `${bp.restDays}× / week`, C.carbs, bp.current.rest, 'Recover + lean out')

  // Why the difference
  let y = top - h - 20
  const cardH = 62
  card(p, 36, y - cardH, W - 72, cardH, C.card, C.teal, 1.6)
  textL(p, 'WHY THE DIFFERENCE', 52, y - 20, 9.5, f.bold, C.teal)
  wrapL(p, `On workout days your body burns about ${fmt(bp.exerciseBurn)} extra calories, so you eat a bit more to fuel the work and recover. On rest days you pull back and your body ${dir}.`, 52, y - 38, 9, f.reg, C.grayLight, W - 72 - 32, 13)

  // What it looks like
  y -= cardH + 20
  const cardH2 = 54
  card(p, 36, y - cardH2, W - 72, cardH2, C.goldFill, C.gold, 1.6)
  textC(p, 'Same meals both days — just a little more food when you work out.', W / 2, y - 22, 9.5, f.bold, C.white)
  textC(p, 'Add a scoop of rice or an extra palm of protein on workout days. The next page shows how.', W / 2, y - 39, 8.5, f.reg, C.grayLight)
}

// ---- PAGE 4: BUILD YOUR PLATE (protein-first, hand + ounces, no counting) ----
function buildPlatePage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Build Your Plate', 4)
  pill(p, 'EVERY MEAL', 36, H - 70, 9, f.bold, C.purple)
  headline(p, f, 'How To Build Your Plate', '')
  textL(p, 'Don’t have a food scale? No problem — use your hand, or the ounces if you’ve got one.', 36, H - 138, 9, f.bold, C.gold)

  const boxTop = H - 162
  card(p, 36, boxTop - 56, W - 72, 56, C.goldFill, C.protein, 1.8)
  textL(p, 'YOUR ONE NUMBER: PROTEIN', 52, boxTop - 21, 9.5, f.bold, C.protein)
  textL(p, `Aim for about ${bp.protein_g}g a day — a palm (4–6 oz) of meat or a scoop of shake at each meal.`, 52, boxTop - 40, 9, f.reg, C.grayLight)

  // ---- The plate picture (left): a real divided plate with steel dividers ----
  const cx = 168, cy = H - 348, R = 84
  const steel = hex('#C2C6D2'), veg = hex('#123f39'), pro = hex('#16401f'), crb = hex('#123a55')
  // plate body + rim
  p.drawCircle({ x: cx, y: cy, size: R + 4, color: hex('#2a2a34') })              // outer steel rim
  p.drawCircle({ x: cx, y: cy, size: R + 4, borderColor: steel, borderWidth: 2 })
  p.drawCircle({ x: cx, y: cy, size: R, color: C.card2 })                          // inner well
  // filled compartments: veggies = left half, protein = top-right, carbs = bottom-right
  const rr = R - 5
  wedge(p, cx, cy, rr, 90, 270, veg)     // left half (page space: cos<0)
  wedge(p, cx, cy, rr, 270, 360, pro)    // top-right
  wedge(p, cx, cy, rr, 0, 90, crb)       // bottom-right
  p.drawCircle({ x: cx, y: cy, size: R, borderColor: steel, borderWidth: 1.5 })    // inner rim over fills
  // steel dividers: vertical (veggies | right) + horizontal (protein / carbs) with a center hub
  p.drawLine({ start: { x: cx, y: cy - rr }, end: { x: cx, y: cy + rr }, thickness: 3, color: steel })
  p.drawLine({ start: { x: cx, y: cy }, end: { x: cx + rr, y: cy }, thickness: 3, color: steel })
  p.drawCircle({ x: cx, y: cy, size: 4, color: steel })
  // region labels inside the plate — hand word + ounces underneath
  textC(p, 'VEGGIES', cx - 40, cy + 8, 8, f.bold, C.white)
  textC(p, 'half plate', cx - 40, cy - 3, 6.5, f.reg, C.grayLight)
  textC(p, '6–8 oz', cx - 40, cy - 14, 7, f.bold, C.gold)
  textC(p, 'PROTEIN', cx + 42, cy + 36, 7.5, f.bold, C.white)
  textC(p, 'palm', cx + 42, cy + 26, 6.5, f.reg, C.grayLight)
  textC(p, '4–6 oz', cx + 42, cy + 15, 7, f.bold, C.gold)
  textC(p, 'CARBS', cx + 42, cy - 20, 7.5, f.bold, C.white)
  textC(p, 'handful', cx + 42, cy - 30, 6.5, f.reg, C.grayLight)
  textC(p, '3–4 oz', cx + 42, cy - 41, 7, f.bold, C.gold)
  textC(p, 'plus a thumb of fat (about ½ oz) for cooking', cx, cy - R - 22, 8, f.reg, C.grayLight)

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
  const pyTop = H - 556, ph = 108
  card(p, 36, pyTop - ph, W - 72, ph, C.card, C.gold, 1.8)
  textL(p, 'YOUR DAY, IN PORTIONS', 52, pyTop - 24, 10, f.bold, C.gold)
  textL(p, bp.workoutDays === 0
    ? 'Your whole day in hand portions — spread across 3 meals + a snack. Same every day.'
    : 'A full workout day in hand portions — spread across 3 meals + a snack. Rest days: about 1 fewer handful of carbs.', 52, pyTop - 40, 8.5, f.reg, C.grayLight)
  const cols3: [number, string, string, string, RGB][] = [
    [palms, palms === 1 ? 'palm' : 'palms', '4–6 oz each', 'PROTEIN', C.protein],
    [handfuls, handfuls === 1 ? 'handful' : 'handfuls', '3–4 oz each', 'CARBS', C.carbs],
    [thumbs, thumbs === 1 ? 'thumb' : 'thumbs', '½ oz each', 'FAT', C.fat],
  ]
  const seg3 = (W - 72) / 3
  cols3.forEach(([n, unit, oz, mac, c], i) => {
    const cxp = 36 + seg3 * i + seg3 / 2
    textC(p, `${n} ${unit}`, cxp, pyTop - 66, 16, f.bold, c)
    textC(p, oz, cxp, pyTop - 82, 8.5, f.bold, C.gold)
    textC(p, mac, cxp, pyTop - 94, 7.5, f.reg, C.gray)
  })
}

// ---- PAGE 5: WHERE YOUR CALORIES COME FROM (by activity level) ----
function activityCaloriePage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.carbs, bp.inputs.name || 'Your', 'Where Your Calories Come From', 5)
  const act = ACTIVITY[bp.inputs.activity]
  const noWorkout = bp.workoutDays === 0
  pill(p, 'YOUR ACTIVITY', 36, H - 70, 9, f.bold, C.carbs)
  headline(p, f, 'Where Do Your Calories Come From?', 'Your daily number is built around how much you move — your activity level.', 27)

  // Activity level highlight
  const aTop = H - 156
  card(p, 36, aTop - 50, W - 72, 50, C.goldFill, C.carbs, 1.8)
  textL(p, 'YOUR ACTIVITY LEVEL', 52, aTop - 19, 9, f.bold, C.carbs)
  textL(p, `${act.name} — ${act.desc}.`, 52, aTop - 37, 10.5, f.bold, C.white)
  textR(p, `+${fmt(bp.neat)} cal/day`, W - 52, aTop - 30, 12, f.bold, C.gold)

  textL(p, noWorkout ? 'Your body burns calories two ways' : 'Your body burns calories three ways', 36, aTop - 74, 9.5, f.bold, C.carbs)
  const layers = [
    { c: C.green, t: 'Just staying alive', sub: '(BMR — your age, height + weight)', v: bp.bmr },
    { c: C.carbs, t: 'Moving around your day', sub: `(NEAT — set by "${act.name}")`, v: bp.neat },
    ...(noWorkout ? [] : [{ c: C.pink, t: 'Your workouts', sub: `(exercise burn — ${bp.workoutDays} workout days)`, v: bp.exerciseBurn }]),
  ]
  let y = aTop - 88
  layers.forEach((l) => {
    card(p, 36, y - 38, W - 72, 38, C.card, l.c, 1.2)
    p.drawCircle({ x: 56, y: y - 19, size: 5, color: l.c })
    textL(p, l.t, 72, y - 15, 10, f.bold, C.white)
    textL(p, l.sub, 72, y - 28, 8, f.bold, C.gold)
    textR(p, `${fmt(l.v)} cal`, W - 52, y - 23, 12, f.bold, C.gold)
    y -= 46
  })

  // Totals per day type
  y -= 4
  const halfW = (W - 72 - 14) / 2
  if (noWorkout) {
    card(p, 36, y - 40, W - 72, 40, C.card, C.green, 1.4)
    textL(p, 'Your daily burn', 50, y - 16, 8, f.reg, C.gray)
    textR(p, `${fmt(bp.restMaintenance)} cal`, W - 50, y - 30, 13, f.bold, C.white)
  } else {
    card(p, 36, y - 40, halfW, 40, C.card, C.orange, 1.4)
    textL(p, 'Rest day burn', 50, y - 16, 8, f.reg, C.gray)
    textR(p, `${fmt(bp.restMaintenance)} cal`, 36 + halfW - 14, y - 30, 13, f.bold, C.white)
    card(p, 36 + halfW + 14, y - 40, halfW, 40, C.card, C.green, 1.4)
    textL(p, 'Workout day burn', 36 + halfW + 28, y - 16, 8, f.reg, C.gray)
    textR(p, `${fmt(bp.workoutMaintenance)} cal`, W - 50, y - 30, 13, f.bold, C.white)
  }

  y -= 40 + 22
  noteBox(p, 36, y - 56, W - 72, 56, C.carbs, noWorkout ? [
    `Because you're not active, your body burns about ${fmt(bp.restMaintenance)} calories a day.`,
    'We set your food a little under that, so your body pulls the difference from stored',
    'fat — and your protein stays high so you keep your shape.',
  ] : [
    `Because you're ${act.name.toLowerCase()}, your body burns about ${fmt(bp.restMaintenance)} calories on a rest day`,
    `and ${fmt(bp.workoutMaintenance)} on a workout day. We set your food a little under that, so your body`,
    'pulls the difference from stored fat — and your protein stays high so you keep your shape.',
  ], f.reg)
}

// ---- PAGE 6: OFF DAYS ----
function offDaysPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.pink, bp.inputs.name || 'Your', 'Off Days', 6)
  pill(p, 'OFF DAYS', 36, H - 70, 9, f.bold, C.pink)
  headline(p, f, 'Your Off Days', 'It happens. Pick one, keep moving, no guilt.')

  const maint = fmt(bp.restMaintenance)
  // Carb-refuel target: eat around maintenance but load most of it into carbs. Rounded to a clean 5.
  const refuelCarbs = Math.round(((bp.restMaintenance - bp.protein_g * 4) * 0.7 / 4) / 5) * 5

  const opts: { c: RGB; t: string; d: string; big?: string; small?: string }[] = [
    { c: C.green, t: 'Keep It Easy', d: 'Eat a normal day with your usual foods — right around your maintenance. Don’t stress the number.', big: maint, small: 'cal — maintenance' },
    { c: C.gold, t: 'Eat Freely', d: 'Eat whatever foods you enjoy — keep it at or below your maintenance, and stop when you’re satisfied, not stuffed.', big: maint, small: 'cal or less' },
    { c: C.purple, t: 'Carb Refuel — once a month', d: 'A day of extra carbs to refill your energy and keep your body from stalling. Load up on rice, oats, potatoes + fruit.', big: `${refuelCarbs}g`, small: 'carbs to refuel' },
  ]
  let y = H - 168
  const ch = 70
  opts.forEach((o, i) => {
    card(p, 36, y - ch, W - 72, ch, C.card, o.c, 1.6)
    p.drawCircle({ x: 62, y: y - 35, size: 13, color: o.c })
    textC(p, String(i + 1), 62, y - 39, 12, f.bold, C.bg)
    textL(p, o.t, 86, y - 27, 13, f.bold, o.c)
    const descMaxW = o.big ? W - 72 - 90 - 122 : W - 72 - 90 - 10
    wrapL(p, o.d, 86, y - 45, 9.5, f.reg, C.grayLight, descMaxW, 13)
    if (o.big) {
      const bw = 110, bh = ch - 18, bx = W - 36 - bw - 8, by = y - ch + 9
      card(p, bx, by, bw, bh, C.goldFill, C.gold, 1.6)
      textC(p, o.big, bx + bw / 2, by + bh - 28, 20, f.bold, C.gold)
      textC(p, o.small || '', bx + bw / 2, by + 9, 7, f.reg, C.grayLight)
    }
    y -= ch + 12
  })

  // ---- Monthly schedule: the rhythm that lasts (built for long-term results) ----
  textL(p, 'YOUR MONTH AT A GLANCE', 36, y - 6, 9.5, f.bold, C.pink)
  textL(p, 'The rhythm that lasts — mostly steady, with a free day and a monthly reset so you never burn out.', 36, y - 20, 8.5, f.reg, C.grayLight)
  const wkTop = y - 30, wkH = 66
  const weeks = [
    { t: 'Week 1', s: 'Keep It Easy', sub: 'off-days at maintenance', c: C.green },
    { t: 'Week 2', s: 'Keep It Easy', sub: 'off-days at maintenance', c: C.green },
    { t: 'Week 3', s: 'Eat Freely', sub: 'one relaxed day', c: C.gold },
    { t: 'Week 4', s: 'Carb Refuel', sub: 'reset, then repeat', c: C.purple },
  ]
  const wkW = (W - 72 - 3 * 10) / 4
  weeks.forEach((wk, i) => {
    const x = 36 + i * (wkW + 10)
    card(p, x, wkTop - wkH, wkW, wkH, C.card, wk.c, 1.4)
    p.drawRectangle({ x, y: wkTop - 3, width: wkW, height: 3, color: wk.c })
    textC(p, wk.t, x + wkW / 2, wkTop - 18, 8.5, f.bold, C.gray)
    textC(p, wk.s, x + wkW / 2, wkTop - 40, 12, f.bold, wk.c)
    textC(p, wk.sub, x + wkW / 2, wkTop - 54, 7, f.reg, C.grayLight)
  })

  noteBox(p, 36, wkTop - wkH - 14 - 34, W - 72, 34, C.pink, [
    'Why this works long-term: staying near maintenance on off-days keeps your results coming,',
    'the free day keeps you sane, and the monthly refuel resets you. Then start the rhythm over.',
  ], f.reg)
}

// ---- PAGE 7: WHAT'S NEXT (what to expect + challenge CTA) ----
function nextStepPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.orange, bp.inputs.name || 'Your', "What's Next", 7)
  pill(p, "WHAT'S NEXT", 36, H - 70, 9, f.bold, C.orange)
  headline(p, f, 'What To Expect', 'Stay consistent and here’s how it tends to go.')

  // ---- Top offer bar (seamless, clickable) ----
  card(p, 36, H - 190, W - 72, 36, C.goldFill, C.gold, 1.6)
  textL(p, 'Need personal training?', 52, H - 174, 10.5, f.bold, C.white)
  textR(p, 'Join the 6-Week Challenge  »', W - 52, H - 174, 10.5, f.bold, C.gold)
  linkRect(doc, p, 36, H - 190, W - 72, 36, CHALLENGE_URL)

  const mw = (W - 72 - 42) / 4
  const tlY = H - 296 // timeline card bottom
  bp.timeline.forEach((m, i) => {
    const x = 36 + i * (mw + 14)
    const c = SECTION_COLORS[i % SECTION_COLORS.length]
    card(p, x, tlY, mw, 84, C.card, c, 1.5)
    p.drawRectangle({ x, y: tlY + 81, width: mw, height: 3, color: c })
    textC(p, m.label, x + mw / 2, tlY + 60, 9, f.bold, c)
    textC(p, m.lbs, x + mw / 2, tlY + 38, 11, f.bold, C.white)
    const words = m.desc.split(' '); let line = ''; let ly = tlY + 22
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7) > mw - 14) { textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight); line = wd + ' '; ly -= 10 }
      else line += wd + ' '
    })
    textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight)
  })

  // ---- Big bottom offer (bolder + clickable) — the six-week program ----
  const cy = H - 470 // card bottom
  card(p, 36, cy, W - 72, 132, C.goldFill, C.orange, 2)
  textC(p, 'Need personal training?', W / 2, cy + 106, 16, f.bold, C.gold)
  textC(p, 'Your numbers are step one — inside the 6-Week Challenge I build them into', W / 2, cy + 84, 9.5, f.reg, C.grayLight)
  textC(p, 'done-for-you meals + workouts, and I check in with you every single week.', W / 2, cy + 68, 9.5, f.reg, C.grayLight)
  const bW = 260, bX = W / 2 - bW / 2, bY = cy + 16, bH = 36
  card(p, bX, bY, bW, bH, C.gold)
  textC(p, 'Join the 6-Week Challenge  »', W / 2, bY + 12, 11.5, f.bold, C.bg)
  linkRect(doc, p, bX, bY, bW, bH, CHALLENGE_URL)
  linkRect(doc, p, 36, cy, W - 72, 132, CHALLENGE_URL)
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
