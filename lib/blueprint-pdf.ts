// ============================================================
// Life Up Fitness — Calorie Blueprint PDF generator (pdf-lib)
// Matches the Master Blueprint spec's 7-page structure exactly:
// Cover → Foundation → Daily Targets → Weekly Math → Macro Blueprint →
// Flex Day → Long-Term Game Plan — plus one bonus practical page
// (Build Your Plate) inserted after Macro Blueprint, and the app's
// lead-magnet CTA kept on the cover + final page (both intentional
// additions beyond the generic spec, per Asa's explicit call).
// Letter (612x792), bottom-left origin.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB, PDFString, PDFName } from 'pdf-lib'
import type { Blueprint, Plan } from './nutrition'

// ---- Palette (locked — matches the Master Blueprint spec exactly) ----
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

function headline(p: PDFPage, f: Fonts, title: string, subtitle: string, titleSize = 30) {
  textL(p, title, 36, H - 116, titleSize, f.bold, C.white)
  if (subtitle) textL(p, subtitle, 36, H - 138, 9, f.reg, C.grayLight)
}

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
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: sectionColor })
  textR(p, String(pageNum), W - 30, H - 90, 100, fonts.bold, sectionColor)
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.card2 })
  textL(p, `Life Up Fitness   •   ${clientName}'s Blueprint   •   ${sectionName}`, 36, 10, 7, fonts.reg, C.gray)
  return p
}

const firstName = (bp: Blueprint) => (bp.inputs.name || '').split(' ')[0] || 'friend'

// A gold spotlight box — one big number, used in pairs on the Daily Targets page.
function spotlightBox(p: PDFPage, f: Fonts, x: number, top: number, w: number, h: number, label: string, value: string, unit: string) {
  card(p, x, top - h, w, h, C.goldFill, C.gold, 1.6)
  textC(p, label, x + w / 2, top - 18, 7, f.reg, C.gray)
  textC(p, value, x + w / 2, top - 46, 30, f.bold, C.gold)
  textC(p, unit, x + w / 2, top - 58, 7.5, f.reg, C.gray)
}

// The DAY TYPE / HOW OFTEN / BODY BURNS / YOU EAT / DEFICIT table used on the Daily Targets page.
function dataTable(p: PDFFont extends never ? never : PDFPage, f: Fonts, x: number, top: number, w: number, rows: { type: string; often: string; burns: number; eat: number; delta: number }[]) {
  const cols = [x, x + w * 0.22, x + w * 0.44, x + w * 0.66, x + w * 0.85]
  textL(p, 'DAY TYPE', cols[0], top, 7, f.bold, C.gray)
  textL(p, 'HOW OFTEN', cols[1], top, 7, f.bold, C.gray)
  textL(p, 'BODY BURNS', cols[2], top, 7, f.bold, C.gray)
  textL(p, 'YOU EAT', cols[3], top, 7, f.bold, C.gray)
  textL(p, 'DEFICIT', cols[4], top, 7, f.bold, C.gray)
  let y = top - 18
  rows.forEach((r) => {
    textL(p, r.type, cols[0], y, 9, f.reg, C.white)
    textL(p, r.often, cols[1], y, 9, f.reg, C.grayLight)
    textL(p, fmt(r.burns), cols[2], y, 9, f.reg, C.grayLight)
    textL(p, fmt(r.eat), cols[3], y, 9, f.bold, C.white)
    textL(p, (r.delta > 0 ? '+' : '') + fmt(r.delta), cols[4], y, 9, f.bold, r.delta < 0 ? C.pink : C.lime)
    y -= 17
  })
  return y
}

// ---- PAGE 1: COVER ----
function coverPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const seg = W / SECTION_COLORS.length
  SECTION_COLORS.forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))

  // ---- Top CTA (Asa's explicit call: offer at both top AND bottom of the cover) ----
  // Solid gold fill (not just an outline) so it reads as a real, highlighted button.
  const topBarW = 320, topBarX = W / 2 - topBarW / 2, topBarY = H - 42, topBarH = 30
  card(p, topBarX, topBarY, topBarW, topBarH, C.gold)
  textC(p, 'Free for 14 days — click here to start  »', W / 2, topBarY + 10, 10.5, f.bold, C.bg)
  linkRect(doc, p, topBarX, topBarY, topBarW, topBarH, CHALLENGE_URL)

  const name = bp.inputs.name || 'Your'
  p.drawLine({ start: { x: 206, y: H - 67 }, end: { x: 290, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawLine({ start: { x: 322, y: H - 67 }, end: { x: 406, y: H - 67 }, thickness: 1, color: C.gold })
  p.drawCircle({ x: W / 2, y: H - 67, size: 3.5, color: C.gold })

  const nameTxt = name
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
    'Workout days vs rest days — how much for each',
    'How to build every plate — hand + ounces, no counting',
    'Where your calories come from — by your activity level',
    'Easy off-day choices + what to expect next',
    'Your full week at a glance',
  ]
  let iy = cy - 74
  items.forEach((it, i) => {
    const x = startX
    card(p, x, iy - 4, 20, 20, C.bg, SECTION_COLORS[i % SECTION_COLORS.length], 1)
    textC(p, String(i + 1), x + 10, iy + 1, 10, f.bold, SECTION_COLORS[i % SECTION_COLORS.length])
    textL(p, it, x + 30, iy + 1, 9.5, f.reg, C.grayLight)
    iy -= 26
  })

  card(p, startX, 70, totalW, 46, C.goldFill, C.gold, 1.5)
  textC(p, 'Free for 14 days — the app does the rest', W / 2, 96, 11, f.bold, C.white)
  textC(p, 'Click here to start free  »', W / 2, 80, 9.5, f.bold, C.gold)
  linkRect(doc, p, startX, 70, totalW, 46, CHALLENGE_URL)

  textC(p, `© ${new Date().getFullYear()} Life Up Fitness`, W / 2, 34, 7, f.reg, C.gray)
  textL(p, `Life Up Fitness   •   ${name}'s Blueprint   •   Cover`, 36, 10, 7, f.reg, C.gray)
}

// ---- PAGE 2: FOUNDATION ----
function foundationPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Foundation', 2)
  pill(p, 'START HERE', 36, H - 70, 9, f.bold, C.teal)
  headline(p, f, 'Your Calorie Layers', `Three layers stack up to your daily number, ${firstName(bp)}.`)

  const layers: { letter: string; c: RGB; title: string; v: number; desc1: string; desc2: string }[] = [
    { letter: 'B', c: C.green, title: 'BMR', v: bp.bmr, desc1: 'What your body burns just existing.', desc2: 'Breathing, heart beating, organs running — you’d burn this lying in bed all day.' },
    { letter: 'N', c: C.carbs, title: 'NEAT', v: bp.neat, desc1: 'What you burn moving through your day.', desc2: 'Everything outside the gym — walking, errands, daily movement.' },
    { letter: 'E', c: C.pink, title: 'EXERCISE BURN', v: bp.exerciseBurn, desc1: 'What you burn during training.', desc2: 'This only counts on the days you actually train.' },
  ]
  const lh = 76
  let y = H - 162
  layers.forEach((l) => {
    card(p, 36, y - lh, W - 72, lh, C.card, l.c, 1.6)
    p.drawCircle({ x: 62, y: y - 38, size: 15, color: l.c })
    textC(p, l.letter, 62, y - 42, 11, f.bold, C.bg)
    textL(p, l.title, 86, y - 24, 12, f.bold, C.white)
    textR(p, `${fmt(l.v)} cal`, W - 52, y - 25, 14, f.bold, l.c)
    textL(p, l.desc1, 86, y - 40, 9, f.reg, C.grayLight)
    wrapL(p, l.desc2, 86, y - 54, 8, f.reg, C.gray, W - 72 - 86 - 16, 11)
    y -= lh + 12
  })

  y -= 6
  const halfW = (W - 72 - 14) / 2, sh = 66
  card(p, 36, y - sh, halfW, sh, C.card, C.orange, 1.6)
  textC(p, "DAYS YOU DON'T WORK OUT", 36 + halfW / 2, y - 22, 8, f.bold, C.gray)
  textC(p, `${fmt(bp.restMaintenance)} cal`, 36 + halfW / 2, y - 44, 20, f.bold, C.orange)
  textC(p, 'BMR + NEAT', 36 + halfW / 2, y - 58, 7.5, f.reg, C.grayLight)

  card(p, 36 + halfW + 14, y - sh, halfW, sh, C.card, C.green, 1.6)
  textC(p, 'DAYS YOU DO WORK OUT', 36 + halfW + 14 + halfW / 2, y - 22, 8, f.bold, C.gray)
  textC(p, `${fmt(bp.workoutMaintenance)} cal`, 36 + halfW + 14 + halfW / 2, y - 44, 20, f.bold, C.green)
  textC(p, 'BMR + NEAT + Exercise', 36 + halfW + 14 + halfW / 2, y - 58, 7.5, f.reg, C.grayLight)

  y -= sh + 16
  noteBox(p, 36, y - 40, W - 72, 40, C.teal, [
    'NEAT = Non-Exercise Activity Thermogenesis',
    'Everything you burn just living — before you ever step in the gym.',
  ], f.reg)
}

// ---- PAGE 3: DAILY TARGETS ----
function dailyTargetsPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.green, bp.inputs.name || 'Your', 'Daily Targets', 3)
  const noWorkout = bp.workoutDays === 0
  pill(p, 'START HERE', 36, H - 70, 9, f.bold, C.green)
  headline(p, f, 'How Much To Eat', `Two ways to run it, ${firstName(bp)}. Start with Steady — Faster is optional.`)

  const plans: { label: string; tag: string; c: RGB; plan: Plan; deficit: number }[] = [
    { label: 'STEADY', tag: 'start here', c: C.green, plan: bp.current, deficit: bp.current.rest.adjustment },
    { label: 'FASTER', tag: 'optional', c: C.pink, plan: bp.aggressive, deficit: bp.aggressive.rest.adjustment },
  ]
  const cardH = 196
  let top = H - 162
  plans.forEach(({ label, tag, c, plan, deficit }) => {
    card(p, 36, top - cardH, W - 72, cardH, C.card, c, 1.8)
    textL(p, `${label}  —  ${tag}`, 52, top - 22, 12, f.bold, c)
    const dirWord = bp.inputs.goal === 'gain' ? 'surplus' : 'deficit'
    textR(p, `${deficit > 0 ? '+' : ''}${fmt(deficit)} cal/day ${dirWord}`, W - 52, top - 21, 8.5, f.reg, C.gray)

    const boxTop = top - 34, boxH = 70, boxW = (W - 72 - 32 - 12) / 2
    if (noWorkout) {
      spotlightBox(p, f, 52, boxTop, W - 72 - 32, boxH, 'EVERY DAY', fmt(plan.rest.eat), 'cal/day')
    } else {
      spotlightBox(p, f, 52, boxTop, boxW, boxH, 'WORKOUT DAY', fmt(plan.workout.eat), 'cal/day')
      spotlightBox(p, f, 52 + boxW + 12, boxTop, boxW, boxH, 'REST DAY', fmt(plan.rest.eat), 'cal/day')
    }

    const tblTop = boxTop - boxH - 22
    const rows = noWorkout
      ? [{ type: 'Every day', often: '7x/wk', burns: bp.restMaintenance, eat: plan.rest.eat, delta: deficit }]
      : [
        { type: 'Workout', often: `${bp.workoutDays}x/wk`, burns: bp.workoutMaintenance, eat: plan.workout.eat, delta: plan.workout.adjustment },
        { type: 'Rest', often: `${bp.restDays}x/wk`, burns: bp.restMaintenance, eat: plan.rest.eat, delta: plan.rest.adjustment },
      ]
    dataTable(p, f, 52, tblTop, W - 72 - 32, rows)

    const dir = bp.inputs.goal === 'gain' ? 'gain' : 'loss'
    textL(p, `Weekly ${dirWord}: ${fmt(Math.abs(plan.weeklyDelta))} cal  »  ~${Math.abs(plan.estWeeklyChangeLbs).toFixed(2)} lb/week ${dir}`, 52, top - cardH + 14, 9.5, f.bold, C.gold)

    top -= cardH + 14
  })

  const noteY = top - 6
  noteBox(p, 36, noteY - 40, W - 72, 40, C.gold, noWorkout ? [
    'You’re not working out right now, so it’s the same simple number every day.',
    '3 meals + a snack, built around a palm of protein. — Coach Asa',
  ] : [
    `You burn ${fmt(bp.exerciseBurn)} extra calories on workout days — that’s why you eat a little more.`,
    '3 meals + a snack, built around a palm of protein. — Coach Asa',
  ], f.reg)
}

// ---- PAGE 4: WEEKLY MATH ----
function weeklyMathPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.teal, bp.inputs.name || 'Your', 'Weekly Math', 4)
  pill(p, 'THE MATH', 36, H - 70, 9, f.bold, C.teal)
  headline(p, f, 'Your Full Week at a Glance', '')

  const stats = [
    { l: 'GYM DAYS', v: String(bp.workoutDays), u: 'days/week' },
    { l: 'OFF DAYS', v: String(bp.restDays), u: 'day/week' },
    { l: '7-DAY MAINTENANCE', v: fmt(bp.weeklyMaintenance), u: 'cal/week' },
  ]
  const cw = (W - 72 - 24) / 3, cTop = H - 150, cH = 74
  stats.forEach((s, i) => {
    const x = 36 + i * (cw + 12)
    card(p, x, cTop - cH, cw, cH, C.card, C.teal, 1.5)
    textC(p, s.l, x + cw / 2, cTop - 22, 7.5, f.bold, C.gray)
    textC(p, s.v, x + cw / 2, cTop - 46, 20, f.bold, C.teal)
    textC(p, s.u, x + cw / 2, cTop - 60, 7.5, f.reg, C.grayLight)
  })

  const dirWord = bp.inputs.goal === 'gain' ? 'surplus' : 'deficit'
  const dirLbl = bp.inputs.goal === 'gain' ? 'gain' : 'loss'
  const rows: [string, string][] = [
    ['Weekly maintenance burn', `${fmt(bp.weeklyMaintenance)} cal`],
    ['Weekly eat — Steady plan', `${fmt(bp.current.weeklyEat)} cal`],
    [`Steady weekly ${dirWord}`, `${bp.current.weeklyDelta > 0 ? '+' : ''}${fmt(bp.current.weeklyDelta)} cal`],
    [`Estimated weekly ${dirLbl} (Steady)`, `~${Math.abs(bp.current.estWeeklyChangeLbs).toFixed(2)} lb`],
    ['Weekly eat — Faster plan', `${fmt(bp.aggressive.weeklyEat)} cal`],
    [`Faster weekly ${dirWord}`, `${bp.aggressive.weeklyDelta > 0 ? '+' : ''}${fmt(bp.aggressive.weeklyDelta)} cal`],
    [`Estimated weekly ${dirLbl} (Faster)`, `~${Math.abs(bp.aggressive.estWeeklyChangeLbs).toFixed(2)} lb`],
  ]
  const tblTop = cTop - cH - 24, rowH = 22, tblH = 34 + rows.length * rowH
  card(p, 36, tblTop - tblH, W - 72, tblH, C.card, C.teal, 1.5)
  textL(p, 'WEEKLY BREAKDOWN', 52, tblTop - 22, 9.5, f.bold, C.teal)
  let ry = tblTop - 44
  rows.forEach(([lab, val], i) => {
    textL(p, lab, 52, ry, 9, f.reg, C.grayLight)
    textR(p, val, W - 52, ry, 9.5, f.bold, C.white)
    if (i < rows.length - 1) p.drawLine({ start: { x: 52, y: ry - 8 }, end: { x: W - 52, y: ry - 8 }, thickness: 0.5, color: C.card2 })
    ry -= rowH
  })

  const noteY = tblTop - tblH - 16
  noteBox(p, 36, noteY - 36, W - 72, 36, C.gold, [
    bp.inputs.goal === 'gain'
      ? 'You’re building lean muscle every single week.'
      : 'You’re building sustainable habits every single week — pick the pace that fits your life.',
  ], f.bold)
}

// ---- PAGE 5: MACRO BLUEPRINT ----
function macroBlueprintPage(doc: PDFDocument, f: Fonts, bp: Blueprint) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Macro Blueprint', 5)
  pill(p, 'MACROS', 36, H - 70, 9, f.bold, C.purple)
  const wm = bp.current.workout.macros
  headline(p, f, `Your ${wm.protein_pct}/${wm.carbs_pct}/${wm.fats_pct} Split`, '')

  const barTop = H - 150, barH = 20
  const totalPct = wm.protein_pct + wm.carbs_pct + wm.fats_pct || 1
  let bx = 36
  const segs: [number, RGB][] = [[wm.protein_pct, C.protein], [wm.carbs_pct, C.carbs], [wm.fats_pct, C.fat]]
  segs.forEach(([pct, c]) => {
    const segW = ((W - 72) * pct) / totalPct
    card(p, bx, barTop - barH, segW, barH, c)
    bx += segW
  })

  const infos = [
    { t: 'PROTEIN', c: C.protein, d: 'Builds and protects muscle. Hit this first, every day.' },
    { t: 'CARBS', c: C.carbs, d: 'Fuel for training — more on workout days.' },
    { t: 'FAT', c: C.fat, d: 'Hormones, absorption, keeps you satisfied.' },
  ]
  const icw = (W - 72 - 24) / 3, icTop = barTop - barH - 20, ich = 64
  infos.forEach((info, i) => {
    const x = 36 + i * (icw + 12)
    card(p, x, icTop - ich, icw, ich, C.card, info.c, 1.4)
    textL(p, info.t, x + 12, icTop - 20, 9.5, f.bold, info.c)
    wrapL(p, info.d, x + 12, icTop - 34, 8, f.reg, C.grayLight, icw - 24, 11)
  })

  const targetsTop = icTop - ich - 20
  const halfW = (W - 72 - 14) / 2, tblH = 150
  const dayTargets: { label: string; c: RGB; day: typeof bp.current.workout }[] = [
    { label: 'GYM DAYS', c: C.green, day: bp.current.workout },
    { label: 'OFF DAYS', c: C.pink, day: bp.current.rest },
  ]
  dayTargets.forEach(({ label, c, day }, i) => {
    const x = 36 + i * (halfW + 14)
    card(p, x, targetsTop - tblH, halfW, tblH, C.card, c, 1.5)
    p.drawRectangle({ x, y: targetsTop - 26, width: halfW, height: 26, color: c })
    textL(p, label, x + 12, targetsTop - 18, 10, f.bold, C.bg)
    textR(p, `${fmt(day.eat)} cal`, x + halfW - 12, targetsTop - 17, 8.5, f.reg, C.bg)
    const macs: [string, number, number, RGB][] = [
      ['Protein', day.macros.protein_g, day.macros.protein_g * 4, C.protein],
      ['Carbs', day.macros.carbs_g, day.macros.carbs_g * 4, C.carbs],
      ['Fat', day.macros.fats_g, day.macros.fats_g * 9, C.fat],
    ]
    let my = targetsTop - 50
    macs.forEach(([lab, g, cal, mc]) => {
      p.drawCircle({ x: x + 20, y: my - 4, size: 4, color: mc })
      textL(p, lab, x + 32, my - 8, 9.5, f.reg, C.white)
      textR(p, `${g}g`, x + halfW - 56, my - 8, 9.5, f.bold, C.gold)
      textR(p, `${fmt(cal)} cal`, x + halfW - 12, my - 8, 8, f.reg, C.gray)
      my -= 26
    })
  })

  noteBox(p, 36, targetsTop - tblH - 16 - 36, W - 72, 36, C.gold, [
    'Hit your protein first. Track it in MyFitnessPal — carbs and fat fill in the rest.',
  ], f.bold)
}

// ---- BONUS PAGE: BUILD YOUR PLATE (protein-first, hand + ounces, no counting) ----
function buildPlatePage(doc: PDFDocument, f: Fonts, bp: Blueprint, pageNum: number) {
  const p = pageBase(doc, f, C.purple, bp.inputs.name || 'Your', 'Build Your Plate', pageNum)
  pill(p, 'EVERY MEAL', 36, H - 70, 9, f.bold, C.purple)
  headline(p, f, 'How To Build Your Plate', '')
  textL(p, 'Don’t have a food scale? No problem — use your hand, or the ounces if you’ve got one.', 36, H - 138, 9, f.bold, C.gold)

  const boxTop = H - 162
  card(p, 36, boxTop - 56, W - 72, 56, C.goldFill, C.protein, 1.8)
  textL(p, 'YOUR ONE NUMBER: PROTEIN', 52, boxTop - 21, 9.5, f.bold, C.protein)
  textL(p, `Aim for about ${bp.protein_g}g a day — a palm (4–6 oz) of meat or a scoop of shake at each meal.`, 52, boxTop - 40, 9, f.reg, C.grayLight)

  const cx = 168, cy = H - 348, R = 84
  const steel = hex('#C2C6D2'), veg = hex('#123f39'), pro = hex('#16401f'), crb = hex('#123a55')
  p.drawCircle({ x: cx, y: cy, size: R + 4, color: hex('#2a2a34') })
  p.drawCircle({ x: cx, y: cy, size: R + 4, borderColor: steel, borderWidth: 2 })
  p.drawCircle({ x: cx, y: cy, size: R, color: C.card2 })
  const rr = R - 5
  wedge(p, cx, cy, rr, 90, 270, veg)
  wedge(p, cx, cy, rr, 270, 360, pro)
  wedge(p, cx, cy, rr, 0, 90, crb)
  p.drawCircle({ x: cx, y: cy, size: R, borderColor: steel, borderWidth: 1.5 })
  p.drawLine({ start: { x: cx, y: cy - rr }, end: { x: cx, y: cy + rr }, thickness: 3, color: steel })
  p.drawLine({ start: { x: cx, y: cy }, end: { x: cx + rr, y: cy }, thickness: 3, color: steel })
  p.drawCircle({ x: cx, y: cy, size: 4, color: steel })
  textC(p, 'VEGGIES', cx - 40, cy + 8, 8, f.bold, C.white)
  textC(p, 'half plate', cx - 40, cy - 3, 6.5, f.reg, C.grayLight)
  textC(p, '6–8 oz', cx - 40, cy - 14, 7, f.bold, C.gold)
  textC(p, 'PROTEIN', cx + 42, cy + 36, 7.5, f.bold, C.white)
  textC(p, 'palm', cx + 42, cy + 26, 6.5, f.reg, C.grayLight)
  textC(p, '4–6 oz', cx + 42, cy + 15, 7, f.bold, C.gold)
  textC(p, 'CARBS', cx + 42, cy - 20, 7.5, f.bold, C.white)
  textC(p, 'handful', cx + 42, cy - 30, 6.5, f.reg, C.grayLight)
  textC(p, '3–4 oz', cx + 42, cy - 41, 7, f.bold, C.gold)
  const fx = cx - R - 22
  p.drawRectangle({ x: fx - 1.6, y: cy - 40, width: 3.2, height: 44, color: steel })
  p.drawRectangle({ x: fx - 6, y: cy + 2, width: 12, height: 3.5, color: steel })
  ;[-6, -2, 2, 6].forEach((dx) => p.drawLine({ start: { x: fx + dx, y: cy + 6 }, end: { x: fx + dx, y: cy + 30 }, thickness: 2, color: steel }))
  const kx = cx + R + 22
  p.drawRectangle({ x: kx - 1.6, y: cy - 40, width: 3.2, height: 40, color: steel })
  p.drawRectangle({ x: kx - 2.6, y: cy, width: 5.2, height: 26, color: steel })
  p.drawSvgPath('M 0 0 L 5.2 0 L 2.6 -9 Z', { x: kx - 2.6, y: cy + 26, color: steel })
  textC(p, 'plus a thumb of fat (about ½ oz) for cooking', cx, cy - R - 22, 8, f.reg, C.grayLight)

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

  const wmac = bp.current.workout.macros
  const palms = Math.max(1, Math.round(wmac.protein_g / 30))
  const handfuls = Math.max(1, Math.round(wmac.carbs_g / 30))
  const thumbs = Math.max(1, Math.round(wmac.fats_g / 12))
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

// ---- PAGE: FLEX DAY ----
function flexDayPage(doc: PDFDocument, f: Fonts, bp: Blueprint, pageNum: number) {
  const p = pageBase(doc, f, C.pink, bp.inputs.name || 'Your', 'Flex Day', pageNum)
  pill(p, 'OFF-DAY OPTIONS', 36, H - 70, 9, f.bold, C.pink)
  headline(p, f, 'Pick Your Off-Day Style', '')

  const maint = fmt(bp.restMaintenance)
  const refuelCarbs = Math.round(((bp.restMaintenance - bp.protein_g * 4) * 0.7 / 4) / 5) * 5
  const opts: { letter: string; c: RGB; t: string; badge: string; d: string }[] = [
    { letter: 'K', c: C.green, t: 'Keep It Clean', badge: 'Track it', d: `Eat at maintenance (${maint} cal). Full control.` },
    { letter: 'E', c: C.gold, t: 'Eat Freely', badge: 'No tracking', d: `Eat up to maintenance (${maint} cal), no counting.` },
    { letter: 'H', c: C.purple, t: 'High-Carb Reset', badge: 'Once a month', d: `Clean, carb-loaded day (~${refuelCarbs}g carbs). Resets energy and metabolism.` },
  ]
  const ocw = (W - 72 - 24) / 3, ocTop = H - 162, och = 172
  opts.forEach((o, i) => {
    const x = 36 + i * (ocw + 12)
    card(p, x, ocTop - och, ocw, och, C.card, o.c, 1.6)
    p.drawCircle({ x: x + ocw / 2, y: ocTop - 40, size: 20, color: o.c })
    textC(p, o.letter, x + ocw / 2, ocTop - 45, 15, f.bold, C.bg)
    textC(p, o.t, x + ocw / 2, ocTop - 74, 11.5, f.bold, C.white)
    const bw = f.bold.widthOfTextAtSize(o.badge, 7.5) + 16
    card(p, x + ocw / 2 - bw / 2, ocTop - 92, bw, 14, C.bg, o.c, 1)
    textC(p, o.badge, x + ocw / 2, ocTop - 88, 7.5, f.bold, o.c)
    wrapL(p, o.d, x + 12, ocTop - 112, 8, f.reg, C.grayLight, ocw - 24, 11)
  })

  const noteY = ocTop - och - 16
  noteBox(p, 36, noteY - 40, W - 72, 40, C.pink, [
    'Recommended: Eat Freely most weeks, High-Carb Reset once a month.',
    'Rotate it in on your usual rest day.',
  ], f.reg)
}

// ---- PAGE: LONG-TERM GAME PLAN ----
function longTermPage(doc: PDFDocument, f: Fonts, bp: Blueprint, pageNum: number) {
  const p = pageBase(doc, f, C.orange, bp.inputs.name || 'Your', 'Long-Term Plan', pageNum)
  pill(p, 'THE PLAN', 36, H - 70, 9, f.bold, C.orange)
  headline(p, f, 'Long-Term Game Plan', '')

  const steps = ['Weeks 1–3: Eat Freely on your rest day', 'Week 4: High-Carb Reset', 'Repeat every month']
  let sy = H - 168
  steps.forEach((s, i) => {
    p.drawCircle({ x: 50, y: sy - 6, size: 10, color: C.orange })
    textC(p, String(i + 1), 50, sy - 10, 9, f.bold, C.bg)
    textL(p, s, 72, sy - 10, 10.5, f.reg, C.white)
    if (i < steps.length - 1) p.drawLine({ start: { x: 50, y: sy - 16 }, end: { x: 50, y: sy - 40 }, thickness: 1.5, color: C.orange })
    sy -= 40
  })

  const mw = (W - 72 - 42) / 4
  const tlY = sy - 20
  bp.timeline.forEach((m, i) => {
    const x = 36 + i * (mw + 14)
    const c = SECTION_COLORS[i % SECTION_COLORS.length]
    card(p, x, tlY - 84, mw, 84, C.card, c, 1.5)
    p.drawRectangle({ x, y: tlY - 3, width: mw, height: 3, color: c })
    textC(p, m.label, x + mw / 2, tlY - 24, 9, f.bold, c)
    textC(p, m.lbs, x + mw / 2, tlY - 46, 11, f.bold, C.white)
    const words = m.desc.split(' '); let line = ''; let ly = tlY - 62
    words.forEach((wd) => {
      if (f.reg.widthOfTextAtSize(line + wd, 7) > mw - 14) { textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight); line = wd + ' '; ly -= 10 }
      else line += wd + ' '
    })
    textC(p, line, x + mw / 2, ly, 7, f.reg, C.grayLight)
  })

  const noteTop = tlY - 84 - 16
  const goalNote = bp.inputs.goal_weight_lbs
    ? `${fmt(Math.abs(bp.inputs.weight_lbs - bp.inputs.goal_weight_lbs))} lb to go, ${firstName(bp)} — trust the numbers and check in weekly.`
    : `Trust the numbers and check in weekly, ${firstName(bp)}.`
  noteBox(p, 36, noteTop - 40, W - 72, 40, C.orange, [
    goalNote,
    'Message Coach Asa if your weight plateaus for 2+ weeks.',
  ], f.reg)

  // ---- Kept per Asa's explicit call: the app's lead-magnet CTA, not part of the generic spec ----
  const offerTop = noteTop - 40 - 20
  card(p, 36, offerTop - 36, W - 72, 36, C.goldFill, C.gold, 1.6)
  textL(p, 'Free for 14 days — the app does the rest', 52, offerTop - 22, 10.5, f.bold, C.white)
  textR(p, 'Click here to start free  »', W - 52, offerTop - 22, 10.5, f.bold, C.gold)
  linkRect(doc, p, 36, offerTop - 36, W - 72, 36, CHALLENGE_URL)

  const cy = offerTop - 36 - 20 - 132
  if (cy > 26) {
    card(p, 36, cy, W - 72, 132, C.goldFill, C.orange, 2)
    textC(p, 'Your numbers are step one.', W / 2, cy + 106, 16, f.bold, C.gold)
    textC(p, 'The Life-Up Fitness app turns them into done-for-you meals + custom workouts,', W / 2, cy + 84, 9.5, f.reg, C.grayLight)
    textC(p, 'with daily check-ins — free for your first 14 days, then $10/mo.', W / 2, cy + 68, 9.5, f.reg, C.grayLight)
    const bW = 260, bX = W / 2 - bW / 2, bY = cy + 16, bH = 36
    card(p, bX, bY, bW, bH, C.gold)
    textC(p, 'Start Free for 14 Days  »', W / 2, bY + 12, 11, f.bold, C.bg)
    linkRect(doc, p, bX, bY, bW, bH, CHALLENGE_URL)
    linkRect(doc, p, 36, cy, W - 72, 132, CHALLENGE_URL)
  }
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
  macroBlueprintPage(doc, fonts, bp)
  buildPlatePage(doc, fonts, bp, 6)
  flexDayPage(doc, fonts, bp, 7)
  longTermPage(doc, fonts, bp, 8)
  return doc.save()
}
