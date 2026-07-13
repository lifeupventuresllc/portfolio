// Estimated grocery price ranges for the foods we recommend most. These are
// ESTIMATES (rough 2026 US averages) — real prices vary by store, region, and
// season, so we always label them as estimates and pair them with live
// "stores near you" map links rather than pretending to be a live price feed.
// A regional cost-of-living multiplier nudges the estimate toward the user's area.

export type PriceItem = {
  name: string
  unit: string
  low: number // $ low end
  high: number // $ high end
  aisle: string
}

export const GROCERY_ESTIMATES: PriceItem[] = [
  // Proteins — the biggest budget lever
  { name: 'Chicken breast', unit: 'per lb', low: 2.99, high: 5.49, aisle: 'Proteins' },
  { name: 'Ground turkey (93%)', unit: 'per lb', low: 3.99, high: 6.49, aisle: 'Proteins' },
  { name: 'Ground beef (90%)', unit: 'per lb', low: 4.49, high: 7.49, aisle: 'Proteins' },
  { name: 'Eggs', unit: 'per dozen', low: 2.49, high: 5.99, aisle: 'Proteins' },
  { name: 'Canned tuna', unit: 'per can', low: 0.99, high: 2.29, aisle: 'Proteins' },
  { name: 'Greek yogurt', unit: '32 oz', low: 4.49, high: 6.99, aisle: 'Dairy' },
  { name: 'Shrimp (frozen)', unit: 'per lb', low: 6.99, high: 11.99, aisle: 'Proteins' },
  // Carbs / grains
  { name: 'White rice', unit: '5 lb bag', low: 4.49, high: 8.99, aisle: 'Grains' },
  { name: 'Oats', unit: '42 oz', low: 3.49, high: 5.99, aisle: 'Grains' },
  { name: 'Whole-wheat bread', unit: 'per loaf', low: 1.99, high: 4.49, aisle: 'Grains' },
  { name: 'Potatoes', unit: '5 lb bag', low: 3.49, high: 6.49, aisle: 'Produce' },
  // Produce
  { name: 'Broccoli', unit: 'per lb', low: 1.49, high: 2.99, aisle: 'Produce' },
  { name: 'Spinach', unit: '16 oz', low: 2.49, high: 4.49, aisle: 'Produce' },
  { name: 'Bananas', unit: 'per lb', low: 0.49, high: 0.89, aisle: 'Produce' },
  { name: 'Frozen mixed veg', unit: '12 oz', low: 1.29, high: 2.79, aisle: 'Produce' },
  // Pantry
  { name: 'Peanut butter', unit: '16 oz', low: 2.49, high: 4.99, aisle: 'Pantry' },
  { name: 'Olive oil', unit: '16 oz', low: 6.99, high: 12.99, aisle: 'Pantry' },
  { name: 'Black beans', unit: 'per can', low: 0.89, high: 1.79, aisle: 'Pantry' },
]

// Rough regional cost multipliers (grocery COL vs. US average ≈ 1.0). Coarse on
// purpose — enough to make a NYC estimate read higher than a Midwest one.
const REGION_MULT: Record<string, number> = {
  Northeast: 1.15, West: 1.18, South: 0.95, Midwest: 0.92, National: 1.0,
}

// Very rough state → region map for the states people most commonly enter.
const STATE_REGION: Record<string, keyof typeof REGION_MULT> = {
  CA: 'West', WA: 'West', OR: 'West', NV: 'West', AZ: 'West', CO: 'West', UT: 'West', HI: 'West', AK: 'West',
  NY: 'Northeast', NJ: 'Northeast', MA: 'Northeast', CT: 'Northeast', PA: 'Northeast', MD: 'Northeast', DC: 'Northeast', RI: 'Northeast', NH: 'Northeast', ME: 'Northeast', VT: 'Northeast',
  TX: 'South', FL: 'South', GA: 'South', NC: 'South', SC: 'South', TN: 'South', AL: 'South', MS: 'South', LA: 'South', AR: 'South', OK: 'South', KY: 'South', VA: 'South', WV: 'South',
  IL: 'Midwest', OH: 'Midwest', MI: 'Midwest', IN: 'Midwest', WI: 'Midwest', MN: 'Midwest', IA: 'Midwest', MO: 'Midwest', KS: 'Midwest', NE: 'Midwest', ND: 'Midwest', SD: 'Midwest',
}

export function regionForState(state?: string): keyof typeof REGION_MULT {
  if (!state) return 'National'
  return STATE_REGION[state.trim().toUpperCase()] || 'National'
}

export function multiplierForRegion(region: keyof typeof REGION_MULT): number {
  return REGION_MULT[region] ?? 1.0
}

export function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}
