// ============================================================
// Life-Up Fitness — Hand-authored client meal plan + grocery
// list PDF (pdf-lib). Companion to manual-workout-pdf.ts.
// Cover -> What to Cook -> Week at a Glance -> Refill Day ->
// Grocery List (by aisle, with estimated cost).
// ============================================================
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB, PDFImage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as fs from 'fs'
import * as path from 'path'
import type { WeekPlan } from './meal-plan'
import { portionIngredients } from './ingredients'
import { RECIPE_INSTRUCTIONS } from './recipe-instructions'
import { COOKBOOK_INGREDIENTS } from './cookbook-ingredients'

const standardServings = (name: string): number | undefined => COOKBOOK_INGREDIENTS.find((r) => r.name === name)?.servings

const hex = (h: string): RGB => { const n = parseInt(h.replace('#', ''), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const C = {
  bg: hex('#0a0a0f'), card: hex('#15151c'), gold: hex('#C9A84C'), goldBright: hex('#F5C518'),
  white: hex('#F0EEF5'), gray: hex('#8b8b99'), grayL: hex('#c8c8d8'), line: hex('#2a2a33'),
  green: hex('#2fe38a'), pink: hex('#ff2d6f'), blue: hex('#38bdf8'), purple: hex('#9b6fd4'), red: hex('#ff5b6a'),
}
const W = 612, H = 792
const BRAND_DIR = path.join(process.cwd(), 'public', 'images', 'brand')
const FONT_DIR = path.join(process.cwd(), 'fonts')
const MEAL_IMG_DIR = path.join(process.cwd(), 'public', 'images', 'meals')
const SNACK_IMG_DIR = path.join(process.cwd(), 'public', 'images', 'snacks')

const MEAL_IMAGES: Record<string, string> = {
  'Buffalo Chicken Bowls with Cauliflower Garlic Rice': 'buffalo-chicken-bowls.jpg',
  'Marry Me Chicken Pasta': 'marry-me-chicken-pasta.jpg',
  'Protein Overnight Oats': 'protein-overnight-oats.jpg',
  'Turkey Sausage Sweet Potato Hash': 'turkey-sausage-sweet-potato-hash.jpg',
  'Garlic Butter Chicken Meatballs with Cauliflower Rice': 'garlic-butter-chicken-meatballs.jpg',
  'Crispy Honey-Garlic Chicken with Rice': 'crispy-honey-garlic-chicken.jpg',
}
const SNACK_IMAGES: Record<string, string> = {
  'Quest Bar (Double Chocolate Chunk)': 'protein-bar.jpg',
  'Quest Protein Chips (BBQ)': 'protein-chips.jpg',
  'Special K Zero Strawberry Creme': 'protein-cereal.jpg',
  'simplyFUEL Protein Balls': 'protein-balls.jpg',
  'Protein Pints (Chocolate) — whole pint': 'protein-icecream.jpg',
  'Olipop Doctor Goodwin': 'soda-can.jpg',
  'Veggies Made Great Fudge Brownie Bites': 'brownie-bites.jpg',
  'Two Good Smoothie': 'two-good-smoothie.jpg',
  'Yasso Cookies n Cream Bars': 'yasso-bar.jpg',
}
const mealImgCache = new Map<string, PDFImage | null>()
async function loadImageFrom(doc: PDFDocument, dir: string, file?: string): Promise<PDFImage | null> {
  if (!file) return null
  const key = dir + '/' + file
  if (mealImgCache.has(key)) return mealImgCache.get(key)!
  try {
    const bytes = fs.readFileSync(path.join(dir, file))
    const img = await doc.embedJpg(bytes)
    mealImgCache.set(key, img)
    return img
  } catch { mealImgCache.set(key, null); return null }
}
async function loadMealImage(doc: PDFDocument, mealName: string): Promise<PDFImage | null> {
  return loadImageFrom(doc, MEAL_IMG_DIR, MEAL_IMAGES[mealName])
}
async function loadSnackImage(doc: PDFDocument, snackName: string): Promise<PDFImage | null> {
  return loadImageFrom(doc, SNACK_IMG_DIR, SNACK_IMAGES[snackName])
}
function drawImageCover(p: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  // Soft gold glow behind the photo so it lifts off the dark background.
  const pad = 8
  p.drawSvgPath(roundedRectPath(x - pad, y - pad, w + pad * 2, h + pad * 2, 20), { x: 0, y: 0, color: C.goldBright, opacity: 0.18 })
  p.drawSvgPath(roundedRectPath(x, y, w, h, 16), { x: 0, y: 0, color: C.bg, borderColor: C.goldBright, borderWidth: 2 })
  const scale = Math.min(w / img.width, h / img.height)
  const iw = img.width * scale, ih = img.height * scale
  p.drawImage(img, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih })
}

interface Fonts { reg: PDFFont; bold: PDFFont; italic: PDFFont; display: PDFFont; title: PDFFont }
// Standard PDF fonts can't encode unicode fraction glyphs (¼ ½ ¾ ⅓ ⅔ etc) or other
// non-WinAnsi chars our ingredient/amount strings sometimes contain — sanitize first.
const FRACTION_MAP: Record<string, string> = { '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' }
const asc = (s: string) => s
  .replace(/(\d)?([¼½¾⅓⅔⅛])/g, (_m, digit, frac) => (digit ? `${digit} ` : '') + (FRACTION_MAP[frac] || ''))
  .replace(/[^\x00-\xFF]/g, '')
function tL(p: PDFPage, t: string, x: number, y: number, s: number, f: PDFFont, c: RGB) { p.drawText(asc(t), { x, y, size: s, font: f, color: c }) }
function tC(p: PDFPage, t: string, cx: number, y: number, s: number, f: PDFFont, c: RGB) { const a = asc(t); p.drawText(a, { x: cx - f.widthOfTextAtSize(a, s) / 2, y, size: s, font: f, color: c }) }
function tR(p: PDFPage, t: string, rx: number, y: number, s: number, f: PDFFont, c: RGB) { const a = asc(t); p.drawText(a, { x: rx - f.widthOfTextAtSize(a, s), y, size: s, font: f, color: c }) }
// Rounded rectangle via SVG path (pdf-lib has no native corner-radius option).
// Coordinates match drawRectangle's convention: (x,y) is the bottom-left corner.
// NOTE: pdf-lib's drawSvgPath always applies an internal scale(1,-1) (it assumes
// SVG's y-down convention), so every y term here is pre-negated to cancel that
// flip out — without this, the path renders at -y, off the visible page entirely.
// This was a real, silent bug: EVERY box drawn via this helper (cover page stat
// cards, the "how this works" box, ingredient chip cards, and the serving-size
// glow boxes) was invisible in every generated PDF until this fix.
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
function box(p: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB, bw = 1.4) {
  p.drawSvgPath(roundedRectPath(x, y, w, h, 12), { x: 0, y: 0, color: fill, borderColor: border, borderWidth: border ? bw : 0 })
}
// A gold box that "pops" off the page — soft glow behind a bright-bordered dark box.
// Used for serving-size callouts so they read as unmissable, not just another label.
function glowGoldBox(p: PDFPage, x: number, y: number, w: number, h: number) {
  // Two stacked glow layers (wide+faint, then tight+stronger) reads as a visible halo
  // instead of a barely-there tint — a single soft layer wasn't showing up enough.
  const outerPad = 9, innerPad = 4
  p.drawSvgPath(roundedRectPath(x - outerPad, y - outerPad, w + outerPad * 2, h + outerPad * 2, 14), {
    x: 0, y: 0, color: C.goldBright, opacity: 0.22,
  })
  p.drawSvgPath(roundedRectPath(x - innerPad, y - innerPad, w + innerPad * 2, h + innerPad * 2, 12), {
    x: 0, y: 0, color: C.goldBright, opacity: 0.4,
  })
  box(p, x, y, w, h, hex('#16120a'), C.goldBright, 2)
}
function wrap(p: PDFPage, t: string, x: number, y: number, maxW: number, s: number, f: PDFFont, c: RGB, lh = 11): number {
  const words = asc(t).split(' '); let line = ''; let yy = y
  for (const w of words) { if (f.widthOfTextAtSize(line + w, s) > maxW) { tL(p, line.trim(), x, yy, s, f, c); line = w + ' '; yy -= lh } else line += w + ' ' }
  if (line.trim()) { tL(p, line.trim(), x, yy, s, f, c); yy -= lh }
  return yy
}

let brandSilhouette: PDFImage | null | undefined
async function loadBrandSilhouette(doc: PDFDocument): Promise<PDFImage | null> {
  if (brandSilhouette !== undefined) return brandSilhouette
  try {
    const bytes = fs.readFileSync(path.join(BRAND_DIR, 'silhouette_white.png'))
    brandSilhouette = await doc.embedPng(bytes)
  } catch { brandSilhouette = null }
  return brandSilhouette
}

function pageShell(doc: PDFDocument, f: Fonts, name: string, section: string): PDFPage {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: C.gold })
  tL(p, `LIFE-UP FITNESS   •   ${name}'s Meal Plan   •   ${section}`, 36, 10, 7, f.reg, C.gray)
  p.drawLine({ start: { x: 36, y: 20 }, end: { x: W - 36, y: 20 }, thickness: 0.5, color: C.line })
  return p
}

export interface ManualMealPlanInputs {
  clientName: string
  week: number
  workoutDayCal: number
  restDayCal: number
  proteinTarget: number
  plan: WeekPlan
  refillDayCal: number
  // Some clients (e.g. a genuine 6-active/1-rest week with no free "cheat" day)
  // have every day meal-planned, including the rest day — no separate refill
  // page in that case. Defaults true to match every client built so far.
  hasRefillDay?: boolean
}

async function coverPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const p = doc.addPage([W, H])
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg })
  const colors = [C.green, C.gold, C.blue, C.purple, C.pink]
  const seg = W / colors.length
  colors.forEach((c, i) => p.drawRectangle({ x: i * seg, y: H - 6, width: seg, height: 6, color: c }))

  tL(p, 'LIFE-UP FITNESS', 36, H - 50, 11, f.bold, C.gold)
  tL(p, 'MEAL PLAN + GROCERY LIST FOR', 36, H - 70, 11, f.reg, C.gray)
  tL(p, inp.clientName.toUpperCase(), 36, H - 110, 34, f.display, C.goldBright)

  const silhouette = await loadBrandSilhouette(doc)
  if (silhouette) {
    const sh = 84, sw = sh * (silhouette.width / silhouette.height)
    p.drawImage(silhouette, { x: W - 40 - sw, y: H - 34 - sh, width: sw, height: sh, opacity: 0.9 })
  }

  const stats = [
    { l: 'WORKOUT DAYS', v: `${inp.workoutDayCal.toLocaleString()} cal`, c: C.green },
    { l: 'REST DAYS', v: `${inp.restDayCal.toLocaleString()} cal`, c: C.blue },
    { l: 'PROTEIN TARGET', v: `${inp.proteinTarget}g / day`, c: C.pink },
  ]
  const cw = 172, gap = 14, sx = 36, cy = H - 165
  stats.forEach((s, i) => {
    const x = sx + i * (cw + gap)
    box(p, x, cy, cw, 46, C.card, s.c, 1.3)
    tL(p, s.l, x + 14, cy + 30, 8, f.reg, C.gray)
    tL(p, s.v, x + 14, cy + 12, 13, f.bold, s.c)
  })

  const introTop = cy - 24, introH = 84
  box(p, 36, introTop - introH, W - 72, introH, hex('#16120a'), C.gold, 1.4)
  tL(p, 'HOW THIS WORKS', 50, introTop - 24, 10, f.bold, C.gold)
  wrap(p, `Two cook days a week, same meals repeat. Eat your calorie number for whatever kind of day it is. Grocery list + cost estimate is in the back.`, 50, introTop - 46, W - 72 - 28, 10.5, f.reg, C.grayL, 15)

  tC(p, `© ${new Date().getFullYear()} Life-Up Fitness · Coach Asa · asaluke.io`, W / 2, 60, 7, f.reg, C.gray)
}

async function recipeCardPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs, mealName: string, batchLabel: string, batchColor: RGB) {
  const p = pageShell(doc, f, inp.clientName, 'What to Cook')
  const recipeDay = inp.plan.days.flatMap((d) => d.meals).find((m) => m.name === mealName)

  const photoH = 190
  const img = await loadMealImage(doc, mealName)
  if (img) drawImageCover(p, img, 36, H - 60 - photoH, W - 72, photoH)

  let y = H - 60 - photoH - 14
  // Serving size, right under the photo where it's impossible to miss — double-boxed
  // (frame within a frame) so it visually stands apart from everything else on the page.
  // standardServings() is the cookbook's ORIGINAL book-yield (e.g. this recipe
  // as published makes 4 servings) — it's only used here as a "does this recipe
  // exist in the cookbook" check. The ingredient list below is always scaled to
  // exactly ONE serving via portionIngredients(mealName, 1), regardless of that
  // book-yield number. Printing the book-yield ("Standard recipe serves 4")
  // right next to a 1-serving ingredient list was a real bug — it read as if
  // the listed quantities made 4 servings, when they only make 1. Fixed to say
  // what's actually true of what's on the page.
  const servings = standardServings(mealName)
  const servingBits = [
    servings ? `Recipe makes: ${servings} ${servings === 1 ? 'serving' : 'servings'} total` : null,
    `You eat: 1 serving`,
  ].filter(Boolean)
  if (servingBits.length) {
    const text = servingBits.join('   ·   ')
    const size = 9.5
    const textW = f.bold.widthOfTextAtSize(asc(text), size)
    const boxW = textW + 44, boxH = 27
    const bx = (W - boxW) / 2
    glowGoldBox(p, bx, y - boxH, boxW, boxH)
    tC(p, text, W / 2, y - boxH / 2 - 3.5, size, f.bold, C.goldBright)
    y -= boxH + 16
  }
  y -= 10
  tC(p, batchLabel.toUpperCase(), W / 2, y, 8, f.bold, batchColor)
  y -= 26
  // Shrink long titles ("Buffalo Chicken Bowls with Cauliflower Garlic Rice") so they
  // never run off the page edges — Playfair Display is wide, plain centering isn't enough.
  const maxTitleW = W - 100
  let titleSize = 22
  while (titleSize > 12 && f.title.widthOfTextAtSize(asc(mealName), titleSize) > maxTitleW) titleSize -= 1
  tC(p, mealName, W / 2, y, titleSize, f.title, C.goldBright)
  y -= Math.max(26, titleSize + 4)

  // "At a glance" stat chips — scannable icon-style row instead of a run-on text line,
  // the convention across free digital cookbooks (Budget Bytes, Minimalist Baker, etc).
  if (recipeDay) {
    const stats: [string, string, RGB][] = [
      ['CAL', String(recipeDay.cal), C.gold],
      ['PROTEIN', `${recipeDay.protein}g`, C.pink],
      ['CARBS', `${recipeDay.carbs}g`, C.blue],
      ['FAT', `${recipeDay.fat}g`, C.purple],
    ]
    const chipW = 110, chipGap = 10
    const totalW = stats.length * chipW + (stats.length - 1) * chipGap
    let cx = (W - totalW) / 2
    for (const [label, val, c] of stats) {
      box(p, cx, y - 34, chipW, 34, C.card, c, 1.2)
      tC(p, val, cx + chipW / 2, y - 16, 13, f.bold, C.white)
      tC(p, label, cx + chipW / 2, y - 28, 6.5, f.reg, c)
      cx += chipW + chipGap
    }
    y -= 34
  }
  y -= 26

  const colGap = 20
  const ingredW = (W - 72 - colGap) * 0.38
  const instrX = 36 + ingredW + colGap
  const instrW = W - 72 - ingredW - colGap
  const colTop = y

  tL(p, 'INGREDIENTS', 36, colTop, 9.5, f.bold, C.gold)
  p.drawLine({ start: { x: 36, y: colTop - 6 }, end: { x: 36 + ingredW, y: colTop - 6 }, thickness: 0.75, color: C.line })
  let iy = colTop - 22
  // How many times to multiply the list below if she's batch-cooking once for
  // the week, based on HER actual schedule — not the cookbook's "recipe makes N
  // servings" number in the box above, which may differ (e.g. cookbook says 4,
  // but her batch only covers 3 days).
  const batchDays = inp.plan.days.filter((d) => d.meals.some((m) => m.name === mealName))
  if (batchDays.length > 1) {
    const note = `Batch-cooking once? Multiply every ingredient x${batchDays.length} - you eat this on ${batchDays.map((d) => d.dayName).join(', ')}.`
    iy = wrap(p, note, 36, iy, ingredW, 7, f.italic, C.gray, 10) - 4
  }
  for (const ing of portionIngredients(mealName, 1)) {
    p.drawCircle({ x: 39, y: iy + 3, size: 1.6, color: C.goldBright })
    iy = wrap(p, ing.amount, 48, iy, ingredW - 12, 8.5, f.reg, C.grayL, 12.5)
  }

  tL(p, 'INSTRUCTIONS', instrX, colTop, 9.5, f.bold, C.gold)
  p.drawLine({ start: { x: instrX, y: colTop - 6 }, end: { x: instrX + instrW, y: colTop - 6 }, thickness: 0.75, color: C.line })
  let ny = colTop - 22
  const steps = RECIPE_INSTRUCTIONS[mealName] || []
  steps.forEach((step, i) => {
    p.drawCircle({ x: instrX + 8, y: ny + 3, size: 8, color: C.gold })
    tC(p, String(i + 1), instrX + 8, ny - 0.5, 7.5, f.bold, C.bg)
    ny = wrap(p, step, instrX + 22, ny, instrW - 22, 8.5, f.reg, C.grayL, 12.5)
    ny -= 6
  })
}

async function cookDaysPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const p = pageShell(doc, f, inp.clientName, 'Cook Days')
  tL(p, 'YOUR COOK DAYS', 36, H - 60, 20, f.bold, C.white)
  tL(p, 'Two sessions. Everything mapped out before you touch the stove.', 36, H - 78, 9, f.reg, C.gray)

  const slotLabels = ['BREAKFAST', 'LUNCH', 'DINNER']
  const batchColors = [C.green, C.pink]
  const daysPerBatch = Math.round(inp.plan.days.length / inp.plan.batches.length)
  let y = H - 106
  for (let bi = 0; bi < inp.plan.batches.length; bi++) {
    const b = inp.plan.batches[bi]
    const col = batchColors[bi % 2]
    // This batch's snack — pulled from the day this batch covers, so it's tied to
    // THIS cook day specifically, not shown as a separate unassigned "pick one" list.
    const snack = inp.plan.days[bi * daysPerBatch]?.meals.find((m) => m.slot === 'SN')
    const firstDay = inp.plan.days[bi * daysPerBatch]
    const rowCount = b.meals.length + (snack ? 1 : 0)
    const rowH = 30
    const h = 30 + rowCount * rowH + (snack ? 8 : 0)
    box(p, 36, y - h, W - 72, h, C.card, col, 1.6)
    p.drawRectangle({ x: 36, y: y - 26, width: W - 72, height: 26, color: col })
    tL(p, `${b.label.toUpperCase()} — covers ${b.covers}`, 46, y - 18, 10, f.bold, C.bg)
    let my = y - 44
    b.meals.forEach((mealName, i) => {
      const label = slotLabels[i] || 'MEAL'
      const lw = f.bold.widthOfTextAtSize(label, 7.5) + 16
      box(p, 46, my - 6, lw, 16, C.bg, col, 0.8)
      tC(p, label, 46 + lw / 2, my - 1, 7.5, f.bold, col)
      tL(p, mealName, 46 + lw + 10, my - 1, 9.5, f.reg, C.grayL)
      // Serving size for this dish — pulled from the actual scaled portion for the day
      // this batch starts on (portions can still vary day-to-day within a batch; see
      // the Week at a Glance for the exact number on days that differ, e.g. a workout
      // day landing inside an otherwise-rest-day batch).
      const dayMeal = firstDay?.meals.find((m) => m.name === mealName)
      const mainIng = dayMeal?.ingredients.find((ing) => ing.aisle === 'Proteins')
      if (dayMeal && mainIng) {
        tL(p, `Make: ${mainIng.amount}  ·  ${dayMeal.portion} portion`, 46 + lw + 10, my - 11, 7, f.italic, C.gray)
      }
      my -= rowH
    })
    if (snack) {
      my -= 6
      const lw = f.bold.widthOfTextAtSize('SNACK', 7.5) + 16
      box(p, 46, my - 6, lw, 16, C.bg, C.gold, 0.8)
      tC(p, 'SNACK', 46 + lw / 2, my - 1, 7.5, f.bold, C.gold)
      const img = await loadSnackImage(doc, snack.name)
      const thumb = 22
      if (img) drawImageCover(p, img, 46 + lw + 10, my - 7, thumb, thumb)
      const tx = img ? 46 + lw + 10 + thumb + 8 : 46 + lw + 10
      tL(p, `${snack.name}  ·  ${snack.cal} cal  ·  from your Craving Swap Guide`, tx, my - 1, 9.5, f.reg, C.grayL)
    }
    y -= h + 14
  }
}

async function whatToCookPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const batchColors = [C.green, C.pink]
  for (let bi = 0; bi < inp.plan.batches.length; bi++) {
    const b = inp.plan.batches[bi]
    const col = batchColors[bi % 2]
    for (const mealName of b.meals) {
      await recipeCardPage(doc, f, inp, mealName, `${b.label} — covers ${b.covers}`, col)
    }
  }
}

// Snacks/add-ons get the same big-picture treatment as meals — easy to skip past when
// they're buried as a small line item, and that's exactly the problem being fixed here.
// Verified 2026-08-01 against each product's real nutrition facts panel — same data
// as the Craving Swap Guide's own serving-size boxes, kept in sync with that source.
const SNACK_SERVING_SIZE: Record<string, string> = {
  'Quest Bar (Double Chocolate Chunk)': '1 bar (60g)',
  'Quest Protein Chips (BBQ)': '1 bag (32g)',
  'simplyFUEL Protein Balls': '2 balls (45g)',
  'Olipop Doctor Goodwin': '1 can (12 fl oz)',
  'Protein Pints (Chocolate) — whole pint': '1 pint (~3 servings)',
  'Veggies Made Great Fudge Brownie Bites': '1 bite (1.5 oz)',
  'Two Good Smoothie': '1 bottle (7 fl oz)',
  'Yasso Cookies n Cream Bars': '1 bar (65g)',
}

async function snackCardPage(doc: PDFDocument, f: Fonts, clientName: string, name: string, cal: number, protein: number, carbs: number, fat: number, days: string[]) {
  const p = pageShell(doc, f, clientName, 'Snacks & Add-Ons')
  const photoH = 220
  const img = await loadSnackImage(doc, name)
  if (img) drawImageCover(p, img, 36, H - 60 - photoH, W - 72, photoH)

  let y = H - 60 - photoH - 14
  // Serving size, double-boxed with a glow — same treatment as the recipe pages and
  // the live Craving Swap Guide, so it's consistent everywhere it appears.
  const servingSize = SNACK_SERVING_SIZE[name]
  if (servingSize) {
    const text = `Serving: ${servingSize}`
    const size = 9.5
    const textW = f.bold.widthOfTextAtSize(asc(text), size)
    const boxW = textW + 44, boxH = 27
    const bx = (W - boxW) / 2
    glowGoldBox(p, bx, y - boxH, boxW, boxH)
    tC(p, text, W / 2, y - boxH / 2 - 3.5, size, f.bold, C.goldBright)
    y -= boxH + 16
  }
  y -= 16

  tC(p, 'FROM YOUR CRAVING SWAP GUIDE', W / 2, y, 8, f.bold, C.gold)
  y -= 26
  const maxTitleW = W - 100
  let titleSize = 24
  while (titleSize > 14 && f.title.widthOfTextAtSize(asc(name), titleSize) > maxTitleW) titleSize -= 1
  tC(p, name, W / 2, y, titleSize, f.title, C.goldBright)
  y -= Math.max(26, titleSize + 6)

  const stats: [string, string, RGB][] = [
    ['CAL', String(cal), C.gold], ['PROTEIN', `${protein}g`, C.pink], ['CARBS', `${carbs}g`, C.blue], ['FAT', `${fat}g`, C.purple],
  ]
  const chipW = 110, chipGap = 10
  let cx = (W - (stats.length * chipW + (stats.length - 1) * chipGap)) / 2
  for (const [label, val, c] of stats) {
    box(p, cx, y - 34, chipW, 34, C.card, c, 1.2)
    tC(p, val, cx + chipW / 2, y - 16, 13, f.bold, C.white)
    tC(p, label, cx + chipW / 2, y - 28, 6.5, f.reg, c)
    cx += chipW + chipGap
  }
  y -= 50

  box(p, 36, y - 46, W - 72, 46, hex('#16120a'), C.gold, 1.6)
  tL(p, "DON'T SKIP THIS", 50, y - 20, 10, f.bold, C.gold)
  tL(p, `Eat this on: ${days.join(', ')}. No prep — grab it and go.`, 50, y - 36, 9.5, f.bold, C.white)
}

async function snackCardsSection(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const seen = new Map<string, { cal: number; protein: number; carbs: number; fat: number; days: string[] }>()
  for (const d of inp.plan.days) {
    for (const m of d.meals) {
      if (m.slot !== 'SN' && m.slot !== 'DS') continue
      if (!seen.has(m.name)) seen.set(m.name, { cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat, days: [] })
      seen.get(m.name)!.days.push(d.dayName)
    }
  }
  for (const [name, info] of Array.from(seen)) {
    await snackCardPage(doc, f, inp.clientName, name, info.cal, info.protein, info.carbs, info.fat, info.days)
  }
}

// Grouped by meal-prep day range (Mon-Wed, Thu-Sat), not repeated per individual day —
// Mon/Tue/Wed eat the exact same breakfast/lunch/dinner/snack, so showing that 3x over
// just to re-list the same items was noise. Snack + add-ons are shown inline with the
// rest of that day range's food, not buried in a separate section at the bottom.
async function weekGlancePage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const p = pageShell(doc, f, inp.clientName, 'Week at a Glance')
  tL(p, 'WEEK AT A GLANCE', 36, H - 60, 20, f.bold, C.white)
  tL(p, 'What you eat, by meal-prep day range.', 36, H - 78, 9, f.reg, C.gray)

  const daysPerBatch = Math.round(inp.plan.days.length / inp.plan.batches.length)
  const batchColors = [C.green, C.pink]
  const ROWS = [
    { label: 'BREAKFAST', c: C.gold, slot: 'BF' },
    { label: 'LUNCH', c: C.blue, slot: 'LN' },
    { label: 'SNACK', c: C.purple, slot: 'SN' },
    { label: 'DINNER', c: C.pink, slot: 'DN' },
  ] as const

  let y = H - 100
  for (let bi = 0; bi < inp.plan.batches.length; bi++) {
    const b = inp.plan.batches[bi]
    const col = batchColors[bi % 2]
    const daysInBatch = inp.plan.days.slice(bi * daysPerBatch, (bi + 1) * daysPerBatch)
    const firstDay = daysInBatch[0]

    // Sub-groups within this batch that eat a different total (e.g. Sat lands in the
    // Thu-Sat batch but is a workout day, so it needs an extra add-on Thu/Fri don't).
    type Group = { dayNames: string[]; totalCal: number; totalProtein: number; addons: typeof firstDay.meals }
    const groups: Group[] = []
    for (const d of daysInBatch) {
      const addons = d.meals.filter((m) => m.slot === 'DS')
      const key = addons.map((a) => a.name).join('+') + '#' + d.totalCal
      let g = groups.find((g) => g.addons.map((a) => a.name).join('+') + '#' + g.totalCal === key)
      if (!g) { g = { dayNames: [], totalCal: d.totalCal, totalProtein: d.totalProtein, addons }; groups.push(g) }
      g.dayNames.push(d.dayName)
    }

    const rowH = 32
    const groupH = 44
    const h = 34 + ROWS.length * rowH + 10 + groups.length * groupH
    box(p, 36, y - h, W - 72, h, C.card, col, 1.6)
    p.drawRectangle({ x: 36, y: y - 28, width: W - 72, height: 28, color: col })
    tL(p, `${b.label.toUpperCase()} — COVERS ${b.covers.toUpperCase()}`, 46, y - 19, 10, f.bold, C.bg)

    let my = y - 46
    for (const r of ROWS) {
      const m = firstDay.meals.find((mm) => mm.slot === r.slot)
      if (!m) continue
      const lw = f.bold.widthOfTextAtSize(r.label, 7) + 14
      box(p, 46, my - 8, lw, 16, C.bg, r.c, 1)
      tC(p, r.label, 46 + lw / 2, my - 3, 7, f.bold, r.c)
      tL(p, m.name, 46 + lw + 10, my - 3, 8.5, f.reg, C.grayL)
      tR(p, `${m.cal} cal`, W - 50, my - 3, 8.5, f.bold, C.white)
      const mainIng = m.ingredients.find((i) => i.aisle === 'Proteins')
      if (mainIng) tL(p, `Make: ${mainIng.amount}`, 46 + lw + 10, my - 16, 6.5, f.italic, C.gray)
      my -= rowH
    }

    my -= 6
    for (const g of groups) {
      box(p, 46, my - groupH, W - 92, groupH, hex('#16120a'), C.gold, 1.2)
      tL(p, g.dayNames.join(', ').toUpperCase(), 56, my - 16, 8.5, f.bold, C.gold)
      tR(p, `${g.totalCal} cal   ·   ${g.totalProtein}g protein`, W - 56, my - 16, 8, f.bold, C.white)
      const addonText = g.addons.length ? `Add-on: ${g.addons.map((a) => a.name).join(' + ')}` : 'No add-on needed'
      tL(p, addonText, 56, my - 32, 7.5, f.reg, C.grayL)
      my -= groupH + 8
    }
    y -= h + 14
  }
}

function refillDayPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const p = pageShell(doc, f, inp.clientName, 'Refill Day')
  p.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: C.pink })
  tL(p, 'SUNDAY', 36, H - 60, 20, f.bold, C.white)
  tL(p, 'Your Refill Day', 36, H - 84, 26, f.display, C.goldBright)

  const boxTop = H - 116, boxH = 170
  box(p, 36, boxTop - boxH, W - 72, boxH, hex('#1a0e14'), C.pink, 2)
  tL(p, 'EAT WHATEVER YOU WANT', 50, boxTop - 30, 14, f.bold, C.pink)
  wrap(p, `No meal plan today — eat what sounds good. The only rule: stay at or under your rest-day number.`, 50, boxTop - 52, W - 72 - 28, 11, f.bold, C.white, 15)
  tC(p, `${inp.refillDayCal.toLocaleString()}`, W / 2, boxTop - 108, 44, f.display, C.goldBright)
  tC(p, 'CALORIES — TRACK IT, WHATEVER YOU EAT', W / 2, boxTop - 130, 9, f.bold, C.grayL)
  tC(p, "This isn't a cheat day — it's built into your plan on purpose.", W / 2, boxTop - 150, 8.5, f.reg, C.gray)

  const noteTop = boxTop - boxH - 24
  box(p, 36, noteTop - 60, W - 72, 60, C.card, C.gold, 1.2)
  tL(p, 'WHY THIS WORKS', 50, noteTop - 20, 8.5, f.bold, C.gold)
  wrap(p, `Staying near your number even on a free-choice day keeps your weekly average on track, so Monday you pick right back up with zero guilt and zero "starting over."`, 50, noteTop - 36, W - 72 - 28, 8.5, f.reg, C.grayL, 11.5)
}

const AISLE_COLORS: Record<string, RGB> = {
  'Proteins': C.pink, 'Produce': C.green, 'Dairy': C.blue,
  'Grains/Carbs': C.gold, 'Sauces & Condiments': C.purple, 'Pantry': C.gray,
}

function groceryPage(doc: PDFDocument, f: Fonts, inp: ManualMealPlanInputs) {
  const p = pageShell(doc, f, inp.clientName, 'Grocery List')
  tL(p, 'GROCERY LIST', 36, H - 60, 20, f.bold, C.white)
  tL(p, 'Everything you need for this week, organized by aisle.', 36, H - 78, 9, f.reg, C.gray)

  // Ballpark range, not a false-precision single number — prices vary by store/location
  // and week. Re-benchmarked 2026-07 against current Kroger/Ralphs listings.
  const costLow = Math.round(inp.plan.groceryCost * 0.85)
  const costHigh = Math.round(inp.plan.groceryCost * 1.2)
  box(p, 36, H - 130, W - 72, 42, hex('#16120a'), C.gold, 1.4)
  tL(p, 'ESTIMATED TOTAL COST*', 50, H - 104, 9.5, f.bold, C.gold)
  tR(p, `$${costLow}-$${costHigh}`, W - 50, H - 104, 16, f.bold, C.white)
  tL(p, '*Ballpark estimate based on typical Kroger/Ralphs pricing — varies by store, location, and sales.', 50, H - 120, 6.5, f.italic, C.gray)

  const y = H - 154
  const colW = (W - 72 - 16) / 2
  let col = 0
  const colY = [y, y]
  for (const section of inp.plan.grocery) {
    const rowH = 14
    const sectionH = 20 + section.items.length * rowH
    // start new column if this section won't fit
    if (colY[col] - sectionH < 40) col = col === 0 ? 1 : 0
    const x = 36 + col * (colW + 16)
    const c = AISLE_COLORS[section.aisle] || C.gray
    box(p, x, colY[col] - sectionH, colW, sectionH, C.card, c, 1.2)
    tL(p, section.aisle.toUpperCase(), x + 10, colY[col] - 16, 8.5, f.bold, c)
    let iy = colY[col] - 30
    for (const item of section.items) {
      tL(p, item.item, x + 10, iy, 7.5, f.reg, C.grayL)
      tR(p, item.amount, x + colW - 10, iy, 7.5, f.bold, C.white)
      iy -= rowH
    }
    colY[col] -= sectionH + 10
  }
}

export async function generateManualMealPlanPDF(inp: ManualMealPlanInputs): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const displayBytes = fs.readFileSync(path.join(FONT_DIR, 'Poppins-Black.ttf'))
  // Reverted from Lato/Playfair to standard fonts (2026-07-31): both custom-embedded
  // fonts intermittently inserted a stray space into specific letter pairs ("Buff alo",
  // "Sti r", "unti l") — a pdf-lib/fontkit text-shaping bug with these particular font
  // files, not a typo in the source data. Helvetica + Poppins have never shown this
  // issue anywhere in this project, so correctness wins over the cookbook-font look.
  const f: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    display: await doc.embedFont(displayBytes),
    title: await doc.embedFont(displayBytes),
  }
  await coverPage(doc, f, inp)
  await cookDaysPage(doc, f, inp)
  await whatToCookPage(doc, f, inp)
  await snackCardsSection(doc, f, inp)
  await weekGlancePage(doc, f, inp)
  if (inp.hasRefillDay !== false) refillDayPage(doc, f, inp)
  groceryPage(doc, f, inp)
  return doc.save()
}
