/**
 * In&Out Moving — pricing & membership: single source of truth.
 *
 * Grounded in the real MovingHelp rate: 2 movers, 2-hour minimum, $165/hr (Standard).
 * Every price point — the app screen, the calculator, and (next) Riley — reads from here.
 * To change a number, edit it in THIS file only.
 *
 * TWO MODELS, decided by distance:
 *   • Local (<= 75 mi):  hourly labor (by tier) + 20ft U-Haul truck + $1.50/mi
 *   • Long-distance (> 75 mi):  cubic feet x 7 lb/cft x $1.00/lb   (the "Wirks" weight formula)
 */

/* ============================================================
 * FOUNDATION CONSTANTS
 * ========================================================== */

export const BASE_HOURLY = 165; // Standard: 2-mover crew, MovingHelp rate
export const CREW_SIZE = 2;
export const MIN_HOURS = 2; // 2-hour minimum -> $330 local minimum before truck

/** 20ft U-Haul truck: pass the rental through, charge mileage. */
export const TRUCK = {
  label: '20ft U-Haul',
  /** Scott's 20ft U-Haul day rate, passed through to the customer. */
  baseRental: 100,
  perMile: 1.5,
};

/** Long-distance (> 75 mi) weight formula. */
export const LONG_DISTANCE = {
  thresholdMiles: 75,
  lbsPerCubicFoot: 7,
  perPound: 1.0,
};

/* ============================================================
 * SERVICE TIERS  (rates derived from BASE_HOURLY)
 * ========================================================== */

export interface Tier {
  key: 'Standard' | 'Deluxe' | 'Premium';
  tagline: string;
  /** Rate = round(BASE_HOURLY * mult). Stored explicitly too for easy display. */
  mult: number;
  hourly: number;
  blurb: string;
  popular: boolean;
  inheritsFrom?: 'Standard' | 'Deluxe';
  features: string[];
}

export const TIERS: Tier[] = [
  {
    key: 'Standard',
    tagline: 'Load & Go',
    mult: 1.0,
    hourly: 165,
    blurb: 'The essentials — our 2-mover crew does the heavy lifting.',
    popular: false,
    features: [
      'Loading & unloading (your truck, U-Haul, or U-Box)',
      'Careful furniture handling',
      '2-mover crew · 2-hour minimum',
    ],
  },
  {
    key: 'Deluxe',
    tagline: 'Move & Protect',
    mult: 1.3,
    hourly: 215,
    blurb: 'Our most popular — full protection so nothing gets a scratch.',
    popular: true,
    inheritsFrom: 'Standard',
    features: [
      'Furniture protection — pads, wrap & shrink',
      'Disassembly & reassembly (beds, tables)',
      'Floor & doorway protection',
      'Partial packing (add-on)',
      'Debris haul-away (add-on)',
    ],
  },
  {
    key: 'Premium',
    tagline: 'White-Glove',
    mult: 1.73,
    hourly: 285,
    blurb: 'Hands-off & handled — we pack, protect, track, and settle you in.',
    popular: false,
    inheritsFrom: 'Deluxe',
    features: [
      'Full packing & unpacking — materials included',
      'Fragile & specialty handling',
      'Dedicated Family Partner (your point person)',
      'Live tracking + photo updates during the move',
      'Priority / same-week scheduling',
      'Post-move debris haul-away included',
    ],
  },
];

/**
 * Estimated LOCAL LABOR by home size = typical on-site hours x each tier rate.
 * Labor only — truck + mileage are added on top. Use to quote a local flat number.
 * (Keeps the Standard/Deluxe/Premium keys the Pricing screen reads.)
 */
export interface FlatRow {
  size: string;
  hours: number;
  Standard: number;
  Deluxe: number;
  Premium: number;
}

export const TYPICAL_HOURS: Record<string, number> = {
  'Studio / 1BR': 3,
  '2BR': 5,
  '3BR': 7,
  '4BR': 9,
};

export const FLAT_PACKAGES: FlatRow[] = [
  { size: 'Studio / 1BR', hours: 3, Standard: 495, Deluxe: 645, Premium: 855 },
  { size: '2BR', hours: 5, Standard: 825, Deluxe: 1075, Premium: 1425 },
  { size: '3BR', hours: 7, Standard: 1155, Deluxe: 1505, Premium: 1995 },
  { size: '4BR', hours: 9, Standard: 1485, Deluxe: 1935, Premium: 2565 },
];

/* ============================================================
 * MEMBERSHIP — Family Partner Club
 * ========================================================== */

export interface ClubPlan {
  key: 'Household' | 'Partner';
  name: string;
  audience: string;
  monthly: number;
  yearly: number;
  /** Discount applied to any job total (local or long-distance). */
  discountPct: number;
  featured: boolean;
  perks: string[];
  /** Live Stripe recurring price IDs — used by the app's Club checkout. */
  stripe: { monthly: string; yearly: string };
}

export const CLUB_PLANS: ClubPlan[] = [
  {
    key: 'Household',
    name: 'Household',
    audience: 'For repeat movers & multi-service homeowners',
    monthly: 12,
    yearly: 99,
    discountPct: 10,
    featured: true,
    stripe: {
      monthly: 'price_1TxwY2PZp7CLH7ixHvemxaHd', // $12.00 / month
      yearly: 'price_1TxwYnPZp7CLH7ixsgecNvhE', // $99.00 / year
    },
    perks: [
      '10% off every service, every time',
      'Priority / same-week scheduling',
      'Free live tracking + photo updates',
      'A dedicated Family Partner who knows your history',
      'Waived trip / travel fees',
      'Rollover move credits (never expire while active)',
      'Referral rewards — give a friend $25 off, get $25',
    ],
  },
  {
    key: 'Partner',
    name: 'Partner (Pro)',
    audience: 'For realtors, landlords & property managers',
    monthly: 39,
    yearly: 299,
    discountPct: 15,
    featured: false,
    stripe: {
      monthly: 'price_1TxwZcPZp7CLH7ixhQAehDcf', // $39.00 / month
      yearly: 'price_1TxwaDPZp7CLH7ixTLVRsV2u', // $299.00 / year
    },
    perks: [
      '15% off + net-15 invoicing (bill monthly, not per job)',
      'Volume & priority scheduling across properties',
      'Co-branded closing gift — 2 hrs of labor in your name',
      'Dedicated Family Partner + monthly activity summary',
      'Referral kickback for every homeowner you send us',
    ],
  },
];

/* ============================================================
 * CUBE SHEET  (standard mover's cubic-feet-per-item table)
 * Used to estimate weight for long-distance moves.
 * ========================================================== */

export interface CubeItem {
  name: string;
  cft: number;
}
export interface CubeRoom {
  room: string;
  items: CubeItem[];
}

export const CUBE_SHEET: CubeRoom[] = [
  {
    room: 'Living Room',
    items: [
      { name: 'Sofa (3-seat)', cft: 50 },
      { name: 'Loveseat', cft: 35 },
      { name: 'Sectional (per section)', cft: 30 },
      { name: 'Recliner', cft: 25 },
      { name: 'Armchair', cft: 15 },
      { name: 'Ottoman', cft: 8 },
      { name: 'Coffee table', cft: 8 },
      { name: 'End / side table', cft: 5 },
      { name: 'TV stand / console', cft: 15 },
      { name: 'Flat-screen TV', cft: 10 },
      { name: 'Bookshelf', cft: 20 },
      { name: 'Floor lamp', cft: 3 },
      { name: 'Area rug (rolled)', cft: 5 },
      { name: 'Upright piano', cft: 70 },
    ],
  },
  {
    room: 'Dining Room',
    items: [
      { name: 'Dining table', cft: 30 },
      { name: 'Dining chair', cft: 5 },
      { name: 'China cabinet / hutch', cft: 40 },
      { name: 'Buffet / sideboard', cft: 30 },
      { name: 'Bar cart', cft: 8 },
    ],
  },
  {
    room: 'Kitchen',
    items: [
      { name: 'Refrigerator', cft: 55 },
      { name: 'Chest freezer', cft: 30 },
      { name: 'Range / stove', cft: 25 },
      { name: 'Portable dishwasher', cft: 20 },
      { name: 'Microwave', cft: 3 },
      { name: 'Kitchen table', cft: 15 },
      { name: 'Kitchen chair', cft: 4 },
      { name: 'Small-appliances (box)', cft: 3 },
    ],
  },
  {
    room: 'Bedroom',
    items: [
      { name: 'King bed set', cft: 70 },
      { name: 'Queen bed set', cft: 60 },
      { name: 'Full / double bed set', cft: 50 },
      { name: 'Twin bed set', cft: 40 },
      { name: 'Crib', cft: 15 },
      { name: 'Dresser (double)', cft: 40 },
      { name: 'Chest of drawers', cft: 25 },
      { name: 'Nightstand', cft: 5 },
      { name: 'Wardrobe / armoire', cft: 40 },
      { name: 'Vanity', cft: 20 },
      { name: 'Mirror', cft: 5 },
    ],
  },
  {
    room: 'Office',
    items: [
      { name: 'Desk', cft: 25 },
      { name: 'Office chair', cft: 8 },
      { name: 'Bookcase', cft: 20 },
      { name: 'Filing cabinet (2-drawer)', cft: 10 },
      { name: 'Computer / monitor (box)', cft: 3 },
    ],
  },
  {
    room: 'Laundry / Appliances',
    items: [
      { name: 'Washer', cft: 25 },
      { name: 'Dryer', cft: 25 },
      { name: 'Water heater', cft: 20 },
    ],
  },
  {
    room: 'Garage / Outdoor',
    items: [
      { name: 'Bicycle', cft: 6 },
      { name: 'BBQ grill', cft: 20 },
      { name: 'Push mower', cft: 10 },
      { name: 'Patio table', cft: 20 },
      { name: 'Patio chair', cft: 6 },
      { name: 'Tool chest', cft: 20 },
      { name: 'Ladder', cft: 8 },
      { name: 'Cooler', cft: 5 },
      { name: 'Surfboard', cft: 10 },
      { name: 'Kayak', cft: 15 },
    ],
  },
  {
    room: 'Boxes',
    items: [
      { name: 'Small box (1.5 cft)', cft: 1.5 },
      { name: 'Medium box (3.0 cft)', cft: 3 },
      { name: 'Large box (4.5 cft)', cft: 4.5 },
      { name: 'Extra-large box (6 cft)', cft: 6 },
      { name: 'Dish barrel / dishpack', cft: 5.2 },
      { name: 'Wardrobe box', cft: 10 },
      { name: 'Mirror / picture box', cft: 3 },
    ],
  },
];

/* ============================================================
 * HELPERS
 * ========================================================== */

/** Round to the nearest dollar. */
const usd = (n: number) => Math.round(n);

/** Local move estimate. Returns labor, truck, mileage, and total. */
export function estimateLocal(opts: {
  hours: number;
  miles: number;
  tierKey?: Tier['key'];
  truckBaseRental?: number;
}) {
  const tier = TIERS.find((t) => t.key === (opts.tierKey ?? 'Standard')) ?? TIERS[0];
  const billableHours = Math.max(opts.hours, MIN_HOURS);
  const labor = billableHours * tier.hourly;
  const truckBase = opts.truckBaseRental ?? TRUCK.baseRental;
  const mileage = opts.miles * TRUCK.perMile;
  const truck = truckBase + mileage;
  return {
    tier: tier.key,
    billableHours,
    labor: usd(labor),
    truckBase: usd(truckBase),
    mileage: usd(mileage),
    truck: usd(truck),
    total: usd(labor + truck),
  };
}

/** Long-distance estimate from total cubic feet. */
export function estimateLongDistance(totalCubicFeet: number, perPound = LONG_DISTANCE.perPound) {
  const weight = totalCubicFeet * LONG_DISTANCE.lbsPerCubicFoot;
  return {
    cubicFeet: totalCubicFeet,
    weight: usd(weight),
    perPound,
    total: usd(weight * perPound),
  };
}

/** Apply a Club discount (e.g. 10 or 15) to any total. */
export function applyClubDiscount(total: number, discountPct: number) {
  return usd(total * (1 - discountPct / 100));
}

/** Company contact used by the "join / choose" CTAs (click-to-text). */
export const CONTACT_PHONE = '833-466-6881';
export const CONTACT_PHONE_TEL = '8334666881';
