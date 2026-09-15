// Offline merchant classifier tuned for Egyptian bank / Apple Pay descriptors.
//
// Descriptors are messy: "FAWRY*MOBIL GAS STATION 360", "AHMED MARKET",
// "SPINNEYS EG CAIRO", "TALABAT*ZOOBA". So we match PATTERNS, not exact names:
//  - payment-aggregator prefixes (Fawry, Paymob, POS…) are stripped first;
//  - `stems` match anywhere inside a word ("mart" hits marketplace, minimart);
//  - `words` must be whole words (short tokens like "gas" or "oil");
//  - English and Arabic lists; earlier categories win on a tie.
// Anything unmatched stays unfiled and shows as "Other".

export const CAT = {
  fuel: 'cat_fuel',
  subscriptions: 'cat_subscriptions',
  groceries: 'cat_groceries',
  food: 'cat_food',
  transport: 'cat_transport',
  health: 'cat_health',
  bills: 'cat_bills',
  rent: 'cat_rent',
  education: 'cat_education',
  entertainment: 'cat_entertainment',
  shopping: 'cat_shopping',
  other: 'cat_expense_other',
} as const;

interface Rule {
  id: string;
  /** Substring matches (case-insensitive, after normalisation). */
  stems: string[];
  /** Whole-word matches. */
  words?: string[];
}

const RULES: Rule[] = [
  {
    id: CAT.fuel,
    stems: ['petro', 'benz', 'fuel', 'gasstation', 'gas station', 'gas st', 'filling st', 'wataniya', 'watania', 'chillout', 'chill out', 'totalenerg', 'total energ', 'emarat', 'taqa', 'gastec', 'cargas', 'enppi', 'exxon', 'mobil', 'محطة', 'بنزين', 'وقود', 'بترول', 'طاقة'],
    words: ['shell', 'total', 'coop', 'co op', 'gas', 'oil', 'station', 'octane'],
  },
  {
    id: CAT.subscriptions,
    stems: ['netflix', 'spotify', 'anghami', 'icloud', 'apple com', 'apple bill', 'applemusic', 'apple music', 'youtube', 'shahid', 'watch it', 'watchit', 'osn', 'disney', 'prime video', 'primevideo', 'hbo', 'chatgpt', 'openai', 'anthropic', 'claude ai', 'adobe', 'microsoft', 'office 365', 'google one', 'google storage', 'dropbox', 'notion', 'canva', 'playstation plus', 'ps plus', 'game pass', 'subscri', 'renewal', 'membership', 'اشتراك', 'تجديد'],
  },
  {
    id: CAT.groceries,
    stems: ['carrefour', 'spinney', 'kazyon', 'gourmet', 'metro market', 'metromarket', 'hyper', 'seoudi', 'oscar', 'ragab', 'kheir zaman', 'kheirzaman', 'fathalla', 'lulu', 'panda', 'bim ', 'zahran', 'el far', 'elfar', 'abu ouf', 'abou ouf', 'rabbit', 'breadfast', 'instashop', 'talabat mart', 'grocer', 'supermarket', 'super market', 'minimarket', 'mini market', 'market', 'mart', 'mrkt', 'mkt', 'souq', 'souk', 'circle k', 'بقال', 'سوبر', 'ماركت', 'سوق', 'تموين', 'كارفور', 'سبينس', 'كازيون', 'خير زمان', 'فتح الله', 'أولاد رجب', 'اولاد رجب'],
    words: ['bakkal', 'baqala', 'grocery'],
  },
  {
    id: CAT.food,
    stems: ['talabat', 'elmenus', 'zooba', 'cilantro', 'koshar', 'kushar', 'buffalo', 'starbucks', 'costa', 'mcdonald', 'mcd ', 'kfc', 'hardee', 'pizza', 'papa john', 'domino', 'cook door', 'cookdoor', 'momen', "mo'men", 'abou shakra', 'abu shakra', 'sobhy', 'kazouza', 'bazooka', 'crave', 'dunkin', 'cinnabon', 'tseppas', 'felfela', 'abou tarek', 'abu tarek', 'kebda', 'kebab', 'kofta', 'hawawshi', 'shawer', 'shawar', 'shwarma', 'feteer', 'fatir', 'mandi', 'burger', 'chicken', 'grill', 'restaur', 'resto', 'rest ', 'cafe', 'caffe', 'coffee', 'koffee', 'kahwa', 'bakery', 'patisser', 'sweet', 'dessert', 'juice', 'ice cream', 'icecream', 'diner', 'kitchen', 'eatery', 'bistro', 'lounge', 'food', 'dine', 'lunch', 'breakfast', 'مطعم', 'كافيه', 'كافية', 'قهوة', 'كشري', 'طلبات', 'شاورما', 'كباب', 'كفتة', 'حواوشي', 'فطير', 'حلويات', 'مخبز', 'عصير', 'بيتزا', 'برجر', 'فراخ'],
  },
  {
    id: CAT.transport,
    stems: ['uber', 'careem', 'indrive', 'in drive', 'swvl', 'didi', 'taxi', 'parking', 'garage', 'toll', 'egyptair', 'egypt air', 'flynas', 'airline', 'airways', 'railway', 'train', 'microbus', 'minibus', 'مواصلات', 'تاكسي', 'أوبر', 'اوبر', 'كريم', 'مترو', 'قطار', 'جراج', 'طريق'],
    words: ['metro', 'bolt', 'bus', 'cab', 'ride', 'lyft'],
  },
  {
    id: CAT.health,
    stems: ['pharm', 'phrm', 'seif', 'ezaby', 'el dawaa', 'eldawaa', 'dawaa', '19011', 'hospital', 'hospit', 'clinic', 'medic', 'dental', 'dentist', 'doctor', 'dr ', 'radiolog', 'scan', 'lab ', 'labs', 'alfa lab', 'al borg', 'elborg', 'optic', 'eyewear', 'gym', 'fitness', 'gold s', 'golds', 'oxygen', 'allouba', 'yoga', 'pilates', 'صيدلية', 'صيدليه', 'مستشفى', 'عيادة', 'دكتور', 'معمل', 'جيم', 'نظارات', 'أسنان'],
  },
  {
    id: CAT.bills,
    stems: ['vodafone', 'voda ', 'orange', 'etisalat', 'e& ', 'telecom', 'we telecom', 'tedata', 'te data', 'electric', 'kahraba', 'water', 'town gas', 'natural gas', 'petrotrade', 'internet', 'wifi', 'dsl', 'landline', 'recharge', 'top up', 'topup', 'insurance', 'fawry', 'aman ', 'masary', 'sadad', 'bee ', 'الكهرباء', 'كهرباء', 'مياه', 'غاز', 'فودافون', 'اورنج', 'أورنج', 'اتصالات', 'فوري', 'أمان', 'انترنت', 'إنترنت', 'تأمين', 'شحن'],
  },
  { id: CAT.rent, stems: ['rent', 'landlord', 'lease', 'maintenance fee', 'hoa', 'إيجار', 'ايجار', 'صيانة'] },
  {
    id: CAT.education,
    stems: ['school', 'universit', 'college', 'academy', 'course', 'udemy', 'coursera', 'tuition', 'nursery', 'kindergarten', 'diwan', 'bookstore', 'book store', 'alef', 'library', 'stationer', 'مدرسة', 'جامعة', 'كورس', 'كتاب', 'مكتبة', 'حضانة', 'أكاديمية', 'اكاديمية'],
    words: ['book', 'books', 'uni'],
  },
  {
    id: CAT.entertainment,
    stems: ['cinema', 'vox', 'galaxy cinema', 'imax', 'theatre', 'theater', 'concert', 'ticket', 'tickets', 'steam', 'playstation', 'xbox', 'nintendo', 'bowling', 'escape room', 'kidzania', 'dream park', 'amusement', 'arcade', 'club', 'سينما', 'تذكرة', 'تذاكر', 'ملاهي', 'نادي'],
    words: ['game', 'games', 'park'],
  },
  {
    id: CAT.shopping,
    stems: ['amazon', 'noon', 'jumia', 'zara', 'h&m', 'h and m', 'lc waikiki', 'lcwaikiki', 'defacto', 'ikea', 'b tech', 'btech', 'raya', 'apple store', 'shein', 'temu', 'aliexpress', 'mall', 'city stars', 'citystars', 'festival city', 'boutique', 'fashion', 'wear', 'adidas', 'nike', 'puma', 'tradeline', 'dream 2000', 'carina', 'concrete', 'mobaco', 'town team', 'ravin', 'american eagle', 'bershka', 'pull&bear', 'mango', 'stradivarius', 'mohm', 'home centre', 'homecentre', 'kian', 'مول', 'أمازون', 'امازون', 'نون', 'ملابس', 'أزياء', 'ازياء', 'محل'],
    words: ['store', 'stores', 'shop', 'shopping', 'outlet'],
  },
];

/** Payment rails and card noise that appear before the real merchant. */
const NOISE = ['fawry', 'paymob', 'geidea', 'sadad', 'pos', 'visa', 'mastercard', 'master card', 'mc', 'purchase', 'pymt', 'payment', 'card', 'txn', 'trx', 'debit', 'credit', 'eg', 'egypt', 'cairo', 'giza', 'alex', 'alexandria'];

export function normalizeMerchant(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/[*_\-.,/\\|#:;()\[\]"']+/g, ' ');
  s = s.replace(/\d+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function stripNoise(s: string): string {
  let out = ` ${s} `;
  for (const n of NOISE) out = out.replace(new RegExp(` ${n} `, 'g'), ' ');
  return out.replace(/\s+/g, ' ').trim();
}

function hasWord(hay: string, w: string): boolean {
  return ` ${hay} `.includes(` ${w} `);
}

/** Category id for a merchant string, or null when nothing matches. */
export function classifyMerchant(merchant: string | null | undefined): string | null {
  if (!merchant) return null;
  const full = normalizeMerchant(merchant);
  if (!full) return null;
  const cleaned = stripNoise(full);
  const hay = cleaned || full;
  for (const r of RULES) {
    for (const stem of r.stems) if (hay.includes(stem)) return r.id;
    for (const w of r.words ?? []) if (hasWord(hay, w)) return r.id;
  }
  // Nothing in the cleaned string: a bare "Fawry" or "Aman" payment is a bill.
  if (/\b(fawry|aman|masary|sadad)\b/.test(full)) return CAT.bills;
  return null;
}
