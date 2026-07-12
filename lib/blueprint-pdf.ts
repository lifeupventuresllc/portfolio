// ============================================================
// Life Up Fitness — Calorie Blueprint PDF generator (pdf-lib)
// Renders the 7-page designed blueprint from a Blueprint object.
// Letter (612x792), bottom-left origin (matches the spec's y system).
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { Blueprint, Plan } from './nutrition'

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

function pageBase(doc: PDFDocument, fonts: Fonts, sectionColor: RGB, clientName: string, sectionName: string, pageNum: number): PDFPage {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: sectionColor })     // top stripe
  textR(p, String(pageNum), W - 30, H - 90, 100, fonts.bold, sectionColor)          // watermark
  // (opacity approximated by drawing over bg; kept subtle via size/placement)
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.card2 })
  textL(p, `Life Up Fitness   •   ${clientName}'s Blueprint   •   ${sectionName}`, 36, 10, 7, fonts.reg, C.gray)
  return p
}

// ---- PAGE 1: COVER ----
function coverPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  // rainbow stripe
  const seg = W / SECTION_COLORS.length
  SECTION_COLORS.forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))

  const name = bp.inputs.name || 'Your'
  p.drawLine({ start: { x: 206, y: H - 67 }, end: { x: 290, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawLine({ start: { x: 322, y: H - 67 }, end: { x: 406, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawCircle({ x: W / 2, y: H - 67, size: 3.5, color: C.gold }) // ornament

  // name pill (pink)
  const nameTxt = name.toUpperCase()
  const nw = f.bold.widthOfTextAtSize(nameTxt, 11)
  card(p, W / 2 - nw / 2 - 12, H - 118, nw + 24, 24, C.bg, C.pink, 1.2)
  textC(p, nameTxt, W / 2, H - 111, 11, f.bold, C.pink)

  textC(p, 'Your Calorie', W / 2, H - 168, 34, f.bold, C.white)
  textC(p, 'Blueprint', W / 2, H - 208, 34, f.bold, C.gold)

  // 4 stat cards
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

  // What's Inside
  textC(p, "WHAT'S INSIDE", W / 2, cy - 44, 11, f.bold, C.gold)
  const items = [
    'Your calorie layers explained (BMR, NEAT, burn)',
    'Exactly how much to eat on gym & rest days',
    'A steady plan and an aggressive plan',
    'Your full week at a glance',
    'Your personalized macro split',
    'Flex-day options + your long-term game plan',
  ]
  let iy = cy - 74
  items.forEach((it, i) => {
    const x = startX
    card(p, x, iy - 4, 20, 20, C.bg, SECTION_COLORS[i % SECTION_COLORS.length], 1)
    textC(p, String(i + 1), x + 10, iy + 1, 10, f.bold, SECTION_COLORS[i % SECTION_COLORS.length])
    textL(p, it, x + 30, iy + 1, 9.5, f.reg, C.grayLight)
    iy -= 30
  })

  // CTA box
  card(p, startX, 70, totalW, 46, C.goldFill, C.green, 1.5)
  textC(p, 'Knowing your numbers is step one.', W / 2, 96, 10, f.bold, C.white)
  textC(p, 'Check in with your coach every week to actually hit them.', W / 2, 80, 8.5, f.reg, C.grayLight)

  textC(p, `© ${new Date().getFullYear()} Life Up Fitness  •  Coach Asa  •  asaluke.io`, W / 2, 34, 7, f.reg, C.gray)
}

// ---- PAGE 2: FOUNDATION ----
function foundationPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Foundation', 2)
  pill(p, 'FOUNDATION', 36, H - 70, 9, f.bold, C.teal)
  textL(p, 'Your Calorie Layers', 36, H - 108, 24, f.bold, C.white)

  const layers = [
    { c: C.green, t: 'BMR', v: bp.bmr, d: 'What your body burns just existing — breathing, heart beating, organs running.' },
    { c: C.carbs, t: 'NEAT', v: bp.neat, d: 'What you burn moving through your day — walking, errands, cleaning.' },
    { c: C.pink, t: 'Exercise Burn', v: bp.exerciseBurn, d: 'What you burn during your workouts. Only counts on gym days.' },
  ]
  let y = H - 150
  layers.forEach((l) => {
    card(p, 36, y - 62, W - 72, 62, C.card, l.c, 1.6)
    p.drawCircle({ x: 60, y: y - 31, size: 13, color: l.c })
    textC(p, l.t[0], 60, y - 35, 12, f.bold, C.bg)
    textL(p, l.t, 84, y - 22, 13, f.bold, l.c)
    textL(p, l.d, 84, y - 44, 8.5, f.reg, C.grayLight)
    textR(p, `${fmt(l.v)}`, W - 52, y - 30, 22, f.bold, C.gold)
    textR(p, 'cal', W - 52, y - 46, 8, f.reg, C.gray)
    y -= 74
  })

  // summary cards
  const halfW = (W - 72 - 14) / 2
  card(p, 36, y - 74, halfW, 74, C.card, C.orange, 1.6)
  textL(p, "DAYS YOU DON'T WORK OUT", 50, y - 24, 8.5, f.bold, C.orange)
  textL(p, 'BMR + NEAT', 50, y - 40, 8, f.reg, C.gray)
  textL(p, `${fmt(bp.restMaintenance)} cal`, 50, y - 64, 20, f.bold, C.white)

  card(p, 36 + halfW + 14, y - 74, halfW, 74, C.card, C.green, 1.6)
  textL(p, 'DAYS YOU DO WORK OUT', 36 + halfW + 28, y - 24, 8.5, f.bold, C.green)
  textL(p, 'BMR + NEAT + Exercise', 36 + halfW + 28, y - 40, 8, f.reg, C.gray)
  textL(p, `${fmt(bp.workoutMaintenance)} cal`, 36 + halfW + 28, y - 64, 20, f.bold, C.white)

  noteBox(p, 36, y - 74 - 60, W - 72, 48, C.teal, [
    'NEAT = Non-Exercise Activity Thermogenesis. Everything you burn just by',
    'living — before you ever step in the gym. Small movements add up to real calories.',
  ], f.reg)
}

// ---- PAGE 3: DAILY TARGETS ----
function planCard(p: PDFPage, f: Fonts, x: number, y: number, w: number, h: number, plan: Plan, headerColor: RGB, goal: string) {
  card(p, x, y - h, w, h, C.card, headerColor, 1.6)
  p.drawRectangle({ x, y: y - 22, width: w, height: 22, color: headerColor })
  textL(p, plan.label.toUpperCase(), x + 12, y - 16, 9, f.bold, C.bg)

  // spotlight boxes
  const bw = (w - 30) / 2
  const boxY = y - 22 - 8 - 62
  const boxes = [
    { l: 'WORKOUT DAY', v: plan.workout.eat, bx: x + 10 },
    { l: 'REST DAY', v: plan.rest.eat, bx: x + 20 + bw },
  ]
  boxes.forEach((b) => {
    card(p, b.bx, boxY, bw, 62, C.goldFill, C.gold, 1.4)
    textC(p, b.l, b.bx + bw / 2, boxY + 46, 7.5, f.reg, C.gray)
    textC(p, fmt(b.v), b.bx + bw / 2, boxY + 20, 30, f.bold, C.gold)
    textC(p, 'cal/day', b.bx + bw / 2, boxY + 8, 7.5, f.reg, C.gray)
  })

  // mini table
  const diffHeader = goal === 'gain' ? 'SURPLUS' : goal === 'lose' ? 'DEFICIT' : 'DIFF'
  let ty = boxY - 18
  const cols = [x + 12, x + 100, x + 215, x + 320, x + 425]
  textL(p, 'DAY TYPE', cols[0], ty, 7, f.bold, C.gray)
  textL(p, 'HOW OFTEN', cols[1], ty, 7, f.bold, C.gray)
  textL(p, 'BODY BURNS', cols[2], ty, 7, f.bold, C.gray)
  textL(p, 'YOU EAT', cols[3], ty, 7, f.bold, C.gray)
  textL(p, diffHeader, cols[4], ty, 7, f.bold, C.gray)
  ty -= 16
  const rows = [
    { t: 'Workout', o: `${_workoutDays}x / week`, b: plan.workout.maintenance, e: plan.workout.eat, a: plan.workout.adjustment },
    { t: 'Rest', o: `${_restDays}x / week`, b: plan.rest.maintenance, e: plan.rest.eat, a: plan.rest.adjustment },
  ]
  rows.forEach((r) => {
    textL(p, r.t, cols[0], ty, 8.5, f.reg, C.white)
    textL(p, r.o, cols[1], ty, 8.5, f.reg, C.grayLight)
    textL(p, `${fmt(r.b)}`, cols[2], ty, 8.5, f.reg, C.grayLight)
    textL(p, `${fmt(r.e)}`, cols[3], ty, 8.5, f.bold, C.gold)
    textL(p, r.a === 0 ? 'at maint' : `${r.a > 0 ? '+' : ''}${fmt(r.a)}`, cols[4], ty, 8.5, f.reg, r.a < 0 ? C.pink : C.lime)
    ty -= 16
  })
  // weekly badge
  const badge = plan.weeklyDelta < 0 ? `${fmt(plan.weeklyDelta)} cal/week` : `+${fmt(plan.weeklyDelta)} cal/week`
  const chg = `${plan.estWeeklyChangeLbs > 0 ? '+' : ''}${plan.estWeeklyChangeLbs} lb/week`
  textL(p, `Weekly: ${badge}   |   est. ${chg}`, x + 12, y - h + 10, 8, f.bold, headerColor)
}
// module-level day counts, set per-generation in dailyTargetsPage
let _workoutDays = 4, _restDays = 3

function dailyTargetsPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  _workoutDays = bp.workoutDays; _restDays = bp.restDays
  const p = pageBase(doc, f, C.green, bp.inputs.name || 'Your', 'Daily Targets', 3)
  pill(p, 'DAILY TARGETS', 36, H - 70, 9, f.bold, C.green)
  textL(p, 'How Much To Eat Each Day', 36, H - 108, 22, f.bold, C.white)
  planCard(p, f, 36, H - 128, W - 72, 178, bp.current, C.green, bp.inputs.goal)
  planCard(p, f, 36, H - 128 - 190, W - 72, 178, bp.aggressive, C.pink, bp.inputs.goal)
}

// ---- PAGE 4: WEEKLY MATH ----
function weeklyMathPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Weekly Math', 4)
  pill(p, 'WEEKLY MATH', 36, H - 70, 9, f.bold, C.teal)
  textL(p, 'Your Full Week at a Glance', 36, H - 108, 22, f.bold, C.white)

  const stats = [
    { l: 'GYM DAYS', v: `${bp.workoutDays}` },
    { l: 'OFF DAYS', v: `${bp.restDays}` },
    { l: '7-DAY TOTAL EAT', v: fmt(bp.current.weeklyEat) },
  ]
  const cw = (W - 72 - 28) / 3
  stats.forEach((s, i) => {
    const x = 36 + i * (cw + 14)
    card(p, x, H - 210, cw, 70, C.card, C.teal, 1.6)
    p.drawRectangle({ x, y: H - 210 + 67, width: cw, height: 3, color: C.teal })
    textC(p, s.l, x + cw / 2, H - 168, 8, f.reg, C.gray)
    textC(p, s.v, x + cw / 2, H - 196, 20, f.bold, C.white)
  })

  const rows = [
    ['Weekly maintenance burn', `${fmt(bp.weeklyMaintenance)} cal`],
    ['Weekly eat — current plan', `${fmt(bp.current.weeklyEat)} cal`],
    [bp.current.weeklyDelta < 0 ? 'Weekly deficit (current)' : 'Weekly surplus (current)', `${bp.current.weeklyDelta > 0 ? '+' : ''}${fmt(bp.current.weeklyDelta)} cal`],
    ['Estimated weekly change', `${bp.current.estWeeklyChangeLbs > 0 ? '+' : ''}${bp.current.estWeeklyChangeLbs} lb`],
    ['Weekly eat — aggressive plan', `${fmt(bp.aggressive.weeklyEat)} cal`],
    [bp.aggressive.weeklyDelta < 0 ? 'Weekly deficit (aggressive)' : 'Weekly surplus (aggressive)', `${bp.aggressive.weeklyDelta > 0 ? '+' : ''}${fmt(bp.aggressive.weeklyDelta)} cal`],
    ['Estimated weekly change (aggressive)', `${bp.aggressive.estWeeklyChangeLbs > 0 ? '+' : ''}${bp.aggressive.estWeeklyChangeLbs} lb`],
  ]
  let ty = H - 250
  p.drawRectangle({ x: 36, y: ty - 4, width: W - 72, height: 20, color: C.teal })
  textL(p, 'THE MATH', 48, ty + 2, 8, f.bold, C.bg)
  ty -= 26
  rows.forEach((r, i) => {
    if (i % 2 === 1) card(p, 36, ty - 5, W - 72, 20, C.card)
    textL(p, r[0], 48, ty, 9, f.reg, C.grayLight)
    textR(p, r[1], W - 48, ty, 9, f.bold, C.gold)
    ty -= 22
  })
  noteBox(p, 36, ty - 40, W - 72, 40, C.teal, [
    bp.inputs.goal === 'gain' ? "You're building lean muscle every single week — consistency compounds."
      : "Every week in a deficit moves you closer — trust the process and check in.",
  ], f.reg)
}

// ---- PAGE 5: MACRO BLUEPRINT ----
function macroTable(p: PDFPage, f: Fonts, x: number, y: number, w: number, title: string, headerColor: RGB, m: { protein_g: number; carbs_g: number; fats_g: number; protein_pct: number; carbs_pct: number; fats_pct: number }) {
  card(p, x, y - 96, w, 96, C.card, headerColor, 1.5)
  p.drawRectangle({ x, y: y - 20, width: w, height: 20, color: headerColor })
  textL(p, title, x + 10, y - 15, 8.5, f.bold, C.bg)
  const rows = [
    { n: 'Protein', c: C.protein, g: m.protein_g, pct: m.protein_pct },
    { n: 'Carbs', c: C.carbs, g: m.carbs_g, pct: m.carbs_pct },
    { n: 'Fat', c: C.fat, g: m.fats_g, pct: m.fats_pct },
  ]
  let ty = y - 40
  rows.forEach((r) => {
    p.drawCircle({ x: x + 16, y: ty + 3, size: 4, color: r.c })
    textL(p, r.n, x + 26, ty, 9, f.reg, C.white)
    textL(p, `${r.pct}%`, x + w - 90, ty, 8.5, f.reg, C.gray)
    textR(p, `${r.g}g`, x + w - 12, ty, 9, f.bold, r.c)
    ty -= 22
  })
}
function macroPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Macro Blueprint', 5)
  pill(p, 'MACRO BLUEPRINT', 36, H - 70, 9, f.bold, C.purple)
  textL(p, `Your ${bp.splitLabel} Split`, 36, H - 108, 22, f.bold, C.white)
  textL(p, '(Protein / Carbs / Fat)', 36, H - 126, 9, f.reg, C.gray)

  // split bar (workout-day macros)
  const wm = bp.current.workout.macros
  const barY = H - 160, barW = W - 72
  const segs = [
    { pct: wm.protein_pct, c: C.protein }, { pct: wm.carbs_pct, c: C.carbs }, { pct: wm.fats_pct, c: C.fat },
  ]
  let sx = 36
  segs.forEach((s) => { const sw = (s.pct / 100) * barW; p.drawRectangle({ x: sx, y: barY, width: sw, height: 16, color: s.c }); sx += sw })

  // macro info cards
  const infos = [
    { t: 'Protein', c: C.protein, d: 'Builds and protects muscle. Hit this first, every day.' },
    { t: 'Carbs', c: C.carbs, d: 'Your fuel for training and recovery. Time around workouts.' },
    { t: 'Fat', c: C.fat, d: 'Hormones, absorption, and satiety. Keep it steady.' },
  ]
  const iw = (W - 72 - 28) / 3
  infos.forEach((info, i) => {
    const x = 36 + i * (iw + 14)
    card(p, x, H - 250, iw, 62, C.card, info.c, 1.5)
    textL(p, info.t, x + 12, H - 208, 10, f.bold, info.c)
    // wrap desc
    const words = info.d.split(' '); let line = ''; let ly = H - 224
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7.5) > iw - 24) { textL(p, line, x + 12, ly, 7.5, f.reg, C.grayLight); line = wd + ' '; ly -= 11 }
      else line += wd + ' '
    })
    textL(p, line, x + 12, ly, 7.5, f.reg, C.grayLight)
  })

  const halfW = (W - 72 - 14) / 2
  macroTable(p, f, 36, H - 270, halfW, 'GYM DAYS', C.green, bp.current.workout.macros)
  macroTable(p, f, 36 + halfW + 14, H - 270, halfW, 'OFF DAYS', C.pink, bp.current.rest.macros)

  noteBox(p, 36, H - 270 - 96 - 56, W - 72, 44, C.purple, [
    `Hit protein first: ${bp.protein_g}g/day (${bp.proteinRuleLabel}).`,
    'Track everything in MyFitnessPal. Protein is the non-negotiable.',
  ], f.reg)
}

// ---- PAGE 6: FLEX DAY ----
function flexPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.pink, bp.inputs.name || 'Your', 'Flex Day', 6)
  pill(p, 'FLEX DAY', 36, H - 70, 9, f.bold, C.pink)
  textL(p, 'Pick Your Off-Day Style', 36, H - 108, 22, f.bold, C.white)

  const opts = [
    { c: C.green, t: 'Keep It Clean', s: 'Eat at maintenance', d: `Stay around ${fmt(bp.restMaintenance)} cal with your normal foods. Simple and steady.` },
    { c: C.gold, t: 'Eat Freely', s: 'Up to maintenance, no tracking', d: 'Enjoy the foods you love without logging — just stop at satisfied, not stuffed.' },
    { c: C.purple, t: 'High-Carb Reset', s: 'Once a month', d: 'A clean, carb-loaded day that resets leptin, restores energy, and boosts metabolism.' },
  ]
  let y = H - 150
  opts.forEach((o) => {
    card(p, 36, y - 82, W - 72, 82, C.card, o.c, 1.6)
    p.drawCircle({ x: 62, y: y - 41, size: 13, color: o.c })
    textC(p, o.t[0], 62, y - 45, 12, f.bold, C.bg)
    textL(p, o.t, 86, y - 26, 12, f.bold, o.c)
    textL(p, o.s, 86, y - 42, 8.5, f.reg, C.gray)
    // wrap desc
    const words = o.d.split(' '); let line = ''; let ly = y - 58
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 8.5) > W - 72 - 90) { textL(p, line, 86, ly, 8.5, f.reg, C.grayLight); line = wd + ' '; ly -= 12 }
      else line += wd + ' '
    })
    textL(p, line, 86, ly, 8.5, f.reg, C.grayLight)
    y -= 94
  })
  noteBox(p, 36, y - 44, W - 72, 44, C.pink, [
    'Recommended monthly rotation: Eat Freely on weeks 1–3,',
    'then one High-Carb Reset on week 4. Repeat every month.',
  ], f.reg)
}

// ---- PAGE 7: GAME PLAN ----
function gamePlanPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.orange, bp.inputs.name || 'Your', 'Game Plan', 7)
  pill(p, 'GAME PLAN', 36, H - 70, 9, f.bold, C.orange)
  textL(p, 'Long-Term Game Plan', 36, H - 108, 22, f.bold, C.white)

  const steps = [
    { c: C.green, t: 'Weeks 1–3', d: 'Eat Freely on your flex day' },
    { c: C.purple, t: 'Week 4', d: 'High-Carb Reset' },
    { c: C.orange, t: 'Repeat', d: 'Every single month' },
  ]
  const sw = (W - 72 - 28) / 3
  steps.forEach((s, i) => {
    const x = 36 + i * (sw + 14)
    p.drawCircle({ x: x + sw / 2, y: H - 160, size: 12, color: s.c })
    textC(p, String(i + 1), x + sw / 2, H - 164, 11, f.bold, C.bg)
    if (i < 2) p.drawLine({ start: { x: x + sw / 2 + 14, y: H - 160 }, end: { x: x + sw + 14 + sw / 2 - 14, y: H - 160 }, thickness: 1, color: C.goldDark })
    textC(p, s.t, x + sw / 2, H - 192, 10, f.bold, s.c)
    textC(p, s.d, x + sw / 2, H - 206, 8, f.reg, C.grayLight)
  })

  // milestones
  const mw = (W - 72 - 42) / 4
  bp.timeline.forEach((m, i) => {
    const x = 36 + i * (mw + 14)
    const c = SECTION_COLORS[i % SECTION_COLORS.length]
    card(p, x, H - 330, mw, 88, C.card, c, 1.5)
    p.drawRectangle({ x, y: H - 330 + 85, width: mw, height: 3, color: c })
    textC(p, m.label, x + mw / 2, H - 268, 9, f.bold, c)
    textC(p, m.lbs, x + mw / 2, H - 290, 11, f.bold, C.white)
    // wrap desc
    const words = m.desc.split(' '); let line = ''; let ly = H - 306
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7) > mw - 14) { textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight); line = wd + ' '; ly -= 10 }
      else line += wd + ' '
    })
    textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight)
  })

  card(p, 36, H - 420, W - 72, 60, C.goldFill, C.orange, 1.5)
  textC(p, "This is your roadmap — but the magic is in showing up.", W / 2, H - 386, 10, f.bold, C.white)
  textC(p, 'Check in with Coach Asa every week. Consistency beats perfection, every time.', W / 2, H - 402, 8.5, f.reg, C.grayLight)
}

export async function generateBlueprintPDF(bp: Blueprint): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  }
  coverPage(doc, fonts, bp)
  foundationPage(doc, fonts, bp)
  dailyTargetsPage(doc, fonts, bp)
  weeklyMathPage(doc, fonts, bp)
  macroPage(doc, fonts, bp)
  flexPage(doc, fonts, bp)
  gamePlanPage(doc, fonts, bp)
  return doc.save()
}
