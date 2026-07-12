// ============================================================
// Life-Up Fitness — Weekly nutrition plan PDF (pdf-lib)
// Mirrors Asa's 3-doc format: Week at a Glance -> What to Cook -> Add-Ons.
// Calories-as-money: base + workout/rest add-on layer.
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { WeeklyMealPlan } from './meal-plan'
import type { Recipe } from './recipes'

const hx = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const C = {
  bg: hx('#0a0a0f'), card: hx('#15151c'), gold: hx('#C9A84C'), white: hx('#F0EEF5'),
  gray: hx('#8b8b99'), grayL: hx('#c8c8d8'), line: hx('#2a2a33'),
  green: hx('#3DBE6C'), amber: hx('#F0872A'), pink: hx('#E8559A'), blue: hx('#4A9FE0'), red: hx('#ff5b6a'),
}
const W = 612, H = 792
const asc = (s: string) => s.replace(/[\uD800-\uDFFF←-⇿☀-➿⬀-⯿︀-️]/g, '').replace(/\s+/g, ' ').trim()
interface F { reg: PDFFont; bold: PDFFont }
const L = (p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB) => p.drawText(asc(t), { x, y, size: s, font: f, color: c })
const Cn = (p: PDFPage, t: string, cx: number, y: number, s: number, f: PDFFont, c: RGB) => { const a = asc(t); p.drawText(a, { x: cx - f.widthOfTextAtSize(a, s) / 2, y, size: s, font: f, color: c }) }
const R = (p: PDFPage, t: string, rx: number, y: number, s: number, f: PDFFont, c: RGB) => { const a = asc(t); p.drawText(a, { x: rx - f.widthOfTextAtSize(a, s), y, size: s, font: f, color: c }) }
const box = (p: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB, bw = 1.4) => p.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? bw : 0 })
function pill(p: PDFPage, f: PDFFont, t: string, x: number, y: number, s: number, c: RGB) { const w = f.widthOfTextAtSize(t, s) + 12; box(p, x, y - 3, w, s + 7, c); L(p, t, x + 6, y + 1, s, f, C.bg); return w }

const catColor = (c: string): RGB => c === 'breakfast' ? C.green : c === 'main' ? C.amber : c === 'snack' ? C.green : C.pink
const catLabel = (c: string) => c === 'main' ? 'MEAL' : c.toUpperCase()

function shell(doc: PDFDocument, f: F, name: string, section: string): PDFPage {
  const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: C.gold })
  L(p, `LIFE-UP FITNESS   ·   ${name}'s Week   ·   ${section}`, 36, H - 24, 8, f.bold, C.gold)
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.line })
  L(p, `Life-Up Fitness  ·  ${section}  ·  asaluke.io`, 36, 10, 7, f.reg, C.gray)
  return p
}

// macro chip row
function chips(p: PDFPage, f: F, x: number, y: number, cal: number, pr: number, cb: number, ft: number) {
  const data = [{ l: 'CAL', v: `${cal}`, c: C.red }, { l: 'PROTEIN', v: `${pr}g`, c: C.green }, { l: 'CARBS', v: `${cb}g`, c: C.amber }, { l: 'FAT', v: `${ft}g`, c: C.red }]
  const cw = 62
  data.forEach((d, i) => { const cx = x + i * (cw + 6); box(p, cx, y - 24, cw, 24, C.bg, d.c, 1); L(p, d.l, cx + 6, y - 9, 6, f.reg, C.gray); L(p, d.v, cx + 6, y - 20, 11, f.bold, C.white) })
}

// ---- PAGE 1: WEEK AT A GLANCE (calorie budget dashboard) ----
function glance(doc: PDFDocument, f: F, plan: WeeklyMealPlan) {
  const p = doc.addPage([W, H]); p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const seg = W / 5;[C.green, C.gold, C.blue, hx('#9b6fd4'), C.pink].forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))
  Cn(p, 'LIFE-UP FITNESS', W / 2, H - 78, 10, f.bold, C.gray)
  Cn(p, `${plan.name}`, W / 2, H - 128, 34, f.bold, C.gold)
  Cn(p, 'YOUR WEEK AT A GLANCE', W / 2, H - 156, 16, f.bold, C.white)
  Cn(p, 'Six days. Every meal. Every calorie.', W / 2, H - 176, 11, f.reg, C.gray)

  // budget cards (calories as money)
  const cards = [
    { l: 'WORKOUT-DAY BUDGET', v: `$${plan.workout.target.toLocaleString()}`, c: C.green },
    { l: 'REST-DAY BUDGET', v: `$${plan.rest.target.toLocaleString()}`, c: C.blue },
    { l: 'BASE MEALS / DAY', v: `$${plan.avgBase.toLocaleString()}`, c: C.amber },
  ]
  const cw = 160, gap = 14, sx = (W - (cw * 3 + gap * 2)) / 2, cy = H - 270
  cards.forEach((cc, i) => { const x = sx + i * (cw + gap); box(p, x, cy, cw, 74, C.card, cc.c, 1.5); Cn(p, cc.l, x + cw / 2, cy + 50, 7.5, f.reg, C.gray); Cn(p, cc.v, x + cw / 2, cy + 22, 22, f.bold, cc.c) })

  L(p, 'HOW YOUR BUDGET WORKS', 36, cy - 34, 10, f.bold, C.gold)
  const lines = [
    `Your 6 base meals cost about $${plan.avgBase.toLocaleString()} a day (portioned to fit you).`,
    `On a WORKOUT day you have $${plan.workout.add.toLocaleString()} more to spend — pick an add-on.`,
    plan.rest.add > 90 ? `On a REST day you have $${plan.rest.add.toLocaleString()} more — one light add-on.` : `On a REST day your base meals carry you — keep it simple.`,
    `Sunday is your FREE DAY. No cooking, no tracking. Monday you reset.`,
  ]
  let ly = cy - 54; lines.forEach((t) => { L(p, `-  ${t}`, 44, ly, 9, f.reg, C.grayL); ly -= 16 })

  // session base panels
  const pw = (W - 72 - 14) / 2, py = ly - 20
  ;[{ s: plan.sessions[0], col: C.green }, { s: plan.sessions[1], col: C.amber }].forEach((o, i) => {
    const x = 36 + i * (pw + 14); box(p, x, py - 96, pw, 96, C.card, o.col, 1.4)
    L(p, o.s.days.toUpperCase(), x + 12, py - 18, 8.5, f.bold, o.col)
    L(p, `Cooked ${o.s.label.replace('Cook ', '')} · ${o.s.protein}`, x + 12, py - 32, 7.5, f.reg, C.gray)
    L(p, o.s.breakfast.name, x + 12, py - 50, 8, f.reg, C.grayL)
    L(p, o.s.lunch.name, x + 12, py - 64, 8, f.reg, C.grayL)
    L(p, o.s.dinner.name, x + 12, py - 78, 8, f.reg, C.grayL)
    R(p, `Base $${o.s.baseCal}/day`, x + pw - 12, py - 88, 9, f.bold, o.col)
  })

  box(p, 36, py - 96 - 44, W - 72, 32, hx('#16120a'), C.gold, 1.2)
  Cn(p, 'SUNDAY = FREE DAY  ·  No cooking. No tracking. Enjoy — Monday you reset and go again.', W / 2, py - 96 - 25, 9, f.bold, C.white)
  Cn(p, `(c) ${new Date().getFullYear()} Life-Up Fitness · Coach Asa`, W / 2, 34, 7, f.reg, C.gray)
}

// ---- PAGE 2: WHAT TO COOK ----
function cardRow(p: PDFPage, f: F, x: number, y: number, w: number, r: Recipe, factor: number) {
  const cal = Math.round(r.cal * factor), pr = Math.round(r.protein * factor), cb = Math.round(r.carbs * factor), ft = Math.round(r.fat * factor)
  box(p, x, y - 44, w, 44, C.bg, catColor(r.category), 1)
  pill(p, f.bold, catLabel(r.category), x + 10, y - 16, 6.5, catColor(r.category))
  L(p, r.name, x + 10, y - 32, 9.5, f.bold, C.white)
  chips(p, f, x + w - 4 * 68 - 8, y - 10, cal, pr, cb, ft)
}
function whatToCook(doc: PDFDocument, f: F, plan: WeeklyMealPlan) {
  const p = shell(doc, f, plan.name, 'What to Cook')
  L(p, 'WHAT TO COOK THIS WEEK', 36, H - 60, 20, f.bold, C.white)
  L(p, 'Two cook sessions feed you all 6 days. Recipes are in The Menu cookbook.', 36, H - 78, 9, f.reg, C.gray)
  let y = H - 110
  plan.sessions.forEach((s) => {
    box(p, 36, y - 22, W - 72, 22, catColor('main'), undefined, 0); L(p, `${s.label.toUpperCase()} — feeds ${s.days}  ·  ${s.protein}`, 46, y - 16, 9, f.bold, C.bg)
    y -= 32
    ;[s.breakfast, s.lunch, s.dinner].forEach((r) => { cardRow(p, f, 36, y, W - 72, r, plan.portionFactor); y -= 52 })
    y -= 8
  })
  if (plan.portionFactor < 1) L(p, `Note: eat about ${Math.round(plan.portionFactor * 100)}% of each recipe's serving so your meals fit your daily budget.`, 36, y - 4, 8.5, f.reg, C.gold)
}

// ---- PAGE 3: ADD-ONS ----
function addOnCard(p: PDFPage, f: F, x: number, y: number, w: number, r: Recipe) {
  box(p, x, y - 40, w, 40, C.card, catColor(r.category), 1.2)
  pill(p, f.bold, catLabel(r.category), x + 10, y - 15, 6.5, catColor(r.category))
  L(p, r.name, x + 10, y - 31, 9, f.bold, C.white)
  R(p, `+$${r.cal}`, x + w - 12, y - 26, 16, f.bold, C.gold)
}
function addOns(doc: PDFDocument, f: F, plan: WeeklyMealPlan) {
  const p = shell(doc, f, plan.name, 'Your Add-Ons')
  L(p, 'YOUR ADD-ONS', 36, H - 60, 20, f.bold, C.white)
  L(p, 'Spend your leftover budget here to hit your target for the day.', 36, H - 78, 9, f.reg, C.gray)
  let y = H - 110
  box(p, 36, y - 22, W - 72, 22, C.green, undefined, 0); L(p, `WORKOUT DAY — spend about $${plan.workout.add}`, 46, y - 16, 9, f.bold, C.bg); y -= 34
  const wPool = plan.workout.addOns.length ? plan.workout.addOns : []
  ;(wPool.length ? wPool : [{ name: 'Base meals cover it — no add-on needed', category: 'snack', cal: 0, protein: 0, carbs: 0, fat: 0 } as Recipe]).forEach((r) => { addOnCard(p, f, 36, y, W - 72, r); y -= 48 })
  y -= 10
  box(p, 36, y - 22, W - 72, 22, C.blue, undefined, 0); L(p, `REST DAY — ${plan.rest.add > 90 ? `spend about $${plan.rest.add}` : 'keep it simple, your base carries the day'}`, 46, y - 16, 9, f.bold, C.bg); y -= 34
  const rPool = plan.rest.addOns.length ? plan.rest.addOns : [{ name: 'No add-on — your base meals carry the day', category: 'snack', cal: 0, protein: 0, carbs: 0, fat: 0 } as Recipe]
  rPool.forEach((r) => { addOnCard(p, f, 36, y, W - 72, r); y -= 48 })
  L(p, 'Mix & match two lighter add-ons if you want to hit your number exactly.', 36, y - 2, 8.5, f.reg, C.gold)
}

export async function generateMealPlanPDF(plan: WeeklyMealPlan): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const f: F = { reg: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) }
  glance(doc, f, plan)
  whatToCook(doc, f, plan)
  addOns(doc, f, plan)
  return doc.save()
}
