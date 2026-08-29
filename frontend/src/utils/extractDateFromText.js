// Pulls a travel start date out of a free-text prompt.
//
// Extracted from UserDashboard/AgentDashboard, which each carried their own
// copy of this ~170-line function. The two had already drifted (month-only
// input resolved to the 15th in one and the 1st in the other), so `options`
// keeps each caller's exact previous behaviour rather than silently changing
// one of them — see monthOnlyDay below.
//
// Returns "YYYY-MM-DD", or null when no date is found. Never throws: a null
// return means "no date mentioned", and callers treat that as undated.

const MONTHS = {
  january: 1, jan: 1, february: 2, feb: 2,
  march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9,
  october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
}

const MONTH_ALT = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec'

// Gregorian month names as actually written in Bengali and Hindi. Previously
// only five Devanagari months were listed and no Bengali ones at all, so a
// prompt written in Bengali ("মে মাসে যাব") produced no date — the request
// then reached the backend undated. Common alternate spellings are included
// because both scripts have more than one accepted transliteration.
const INDIC_MONTHS = {
  // Bengali
  'জানুয়ারি': 1, 'জানুয়ারী': 1,
  'ফেব্রুয়ারি': 2, 'ফেব্রুয়ারী': 2,
  'মার্চ': 3,
  'এপ্রিল': 4,
  'মে': 5,
  'জুন': 6,
  'জুলাই': 7,
  'আগস্ট': 8, 'আগষ্ট': 8, 'অগাস্ট': 8,
  'সেপ্টেম্বর': 9, 'সেপ্টেম্বার': 9,
  'অক্টোবর': 10, 'অক্টোবার': 10,
  'নভেম্বর': 11, 'নভেম্বার': 11,
  'ডিসেম্বর': 12, 'ডিসেম্বার': 12,
  // Hindi / Devanagari
  'जनवरी': 1,
  'फरवरी': 2, 'फ़रवरी': 2,
  'मार्च': 3,
  'अप्रैल': 4,
  'मई': 5,
  'जून': 6,
  'जुलाई': 7,
  'अगस्त': 8,
  'सितंबर': 9, 'सितम्बर': 9,
  'अक्टूबर': 10, 'अक्तूबर': 10,
  'नवंबर': 11, 'नवम्बर': 11,
  'दिसंबर': 12, 'दिसम्बर': 12,
}

// Bengali and Devanagari digits, so "১৫ মে" and "१५ मई" reach the same code
// paths as "15 May" instead of looking like text with no numbers in it.
const DIGIT_MAP = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

function normaliseDigits(s) {
  return s.replace(/[০-৯०-९]/g, ch => DIGIT_MAP[ch] || ch)
}

// Bengali (U+0980-U+09FF) and Devanagari (U+0900-U+097F) letters. Used to
// require that an Indic month name stands as its own word: Bengali "মে" (May)
// is only two characters and is a substring of ordinary words like "মেলা"
// (fair) and "মেয়ে" (girl), so a plain includes() would read a date out of
// text that mentions no date at all.
//
// Written as explicit character classes rather than lookbehind, which older
// Safari rejects at regex-construction time — that would throw inside this
// function and silently disable date detection for those users entirely.
const INDIC_LETTER = '\\u0980-\\u09FF\\u0900-\\u097F'

function findIndicMonth(text) {
  for (const [name, mon] of Object.entries(INDIC_MONTHS)) {
    // Bengali and Hindi attach case endings straight onto the noun —
    // "অক্টোবরে" is "in October", "অক্টোবর" plus a locative ে. Requiring a
    // boundary on BOTH sides would miss every such form, so only long,
    // distinctive names are matched with a trailing suffix allowed. Short
    // ones (Bengali "মে", Hindi "मई") keep the strict boundary, because
    // those two characters also occur inside ordinary words like "মেলা"
    // (fair) and "মেয়ে" (girl) where no date is meant at all.
    const re = name.length >= 4
      ? new RegExp(`(^|[^${INDIC_LETTER}])${name}`)
      : new RegExp(`(^|[^${INDIC_LETTER}])${name}([^${INDIC_LETTER}]|$)`)
    if (re.test(text)) return { name, mon }
  }
  return null
}

export function extractDateFromText(text, options = {}) {
  // Day used when only a month is known. UserDashboard uses 15 so that naming
  // the current month late in that month doesn't trip makeDate's
  // advance-to-next-year rule; AgentDashboard has always used 1.
  const monthOnlyDay = options.monthOnlyDay ?? 15

  try {
    if (!text || text.length < 5) return null
    const raw = text.toLowerCase()
    const t = normaliseDigits(raw)
    const now = new Date()
    const year = now.getFullYear()

    // BLOCK: if text contains a past year (e.g. 2023, 2024) — don't extract date
    const pastYearMatch = t.match(/\b(20[0-2][0-9])\b/)
    if (pastYearMatch) {
      const yr = parseInt(pastYearMatch[1])
      if (yr < year) return null // past year mentioned — ignore
    }

    // Normalise ordinal suffixes: "20th"→"20", "1st"→"1", "3rd"→"3"
    const norm = t.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1')

    // Helper — build date string and auto-advance to next year if past
    // NO Date object conversion — avoids IST timezone offset bug completely
    const pad = n => String(n).padStart(2, '0')
    const makeDate = (y, m, d) => {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const dateStr = `${y}-${pad(m)}-${pad(d)}`
      if (dateStr < todayStr) return `${y + 1}-${pad(m)}-${pad(d)}`
      return dateStr
    }

    // PRIORITY 0: Numeric date formats — dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
    const numericFull = norm.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/)
    if (numericFull) {
      const day = parseInt(numericFull[1])
      const mon = parseInt(numericFull[2])
      const yr = parseInt(numericFull[3])
      if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31 && yr >= year) {
        return `${yr}-${pad(mon)}-${pad(day)}`
      }
    }

    // dd/mm or dd-mm (no year) e.g. "15/08", "trip on 26/01"
    const numericShort = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
    if (numericShort) {
      const day = parseInt(numericShort[1])
      const mon = parseInt(numericShort[2])
      if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
        return makeDate(year, mon, day)
      }
    }

    // "next month" / "this month"
    if (t.includes('next month')) {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    if (t.includes('this month')) {
      return now.toISOString().split('T')[0]
    }

    // Season keywords
    const seasonMap = {
      'this winter': '12', 'next winter': '12', 'winter trip': '12', 'winter vacation': '12',
      'this summer': '05', 'next summer': '05', 'summer trip': '05', 'summer vacation': '05',
      'this monsoon': '07', 'next monsoon': '07', 'monsoon trip': '07',
      'this spring': '03', 'spring trip': '03',
    }
    for (const [kw, mon] of Object.entries(seasonMap)) {
      if (t.includes(kw)) return makeDate(year, parseInt(mon), 1)
    }

    // PRIORITY 1: "Month Day Year" — "Jan 10 2026", "January 10 2026"
    const mdyMatch = norm.match(new RegExp(`(${MONTH_ALT})\\s+(\\d{1,2})\\s+(\\d{4})`, 'i'))
    if (mdyMatch) {
      const mon = MONTHS[mdyMatch[1].toLowerCase()]
      const day = parseInt(mdyMatch[2])
      const yr = parseInt(mdyMatch[3])
      if (mon && day >= 1 && day <= 31 && yr >= year) return makeDate(yr, mon, day)
    }

    // PRIORITY 2: "Day Month Year" — "10 Jan 2026"
    const dmyMatch = norm.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_ALT})\\s+(\\d{4})`, 'i'))
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1])
      const mon = MONTHS[dmyMatch[2].toLowerCase()]
      const yr = parseInt(dmyMatch[3])
      if (mon && day >= 1 && day <= 31 && yr >= year) return makeDate(yr, mon, day)
    }

    // PRIORITY 3: "Month Day" — "March 3", "January 20", "starting August 26"
    const mdMatch = norm.match(new RegExp(`(${MONTH_ALT})\\s+(\\d{1,2})\\b`, 'i'))
    if (mdMatch) {
      const mon = MONTHS[mdMatch[1].toLowerCase()]
      const day = parseInt(mdMatch[2])
      if (mon && day >= 1 && day <= 31) return makeDate(year, mon, day)
    }

    // PRIORITY 4: "Day Month" — "20 January", "10 September se"
    const dmMatch = norm.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_ALT})`, 'i'))
    if (dmMatch) {
      const day = parseInt(dmMatch[1])
      const mon = MONTHS[dmMatch[2].toLowerCase()]
      if (mon && day >= 1 && day <= 31) return makeDate(year, mon, day)
    }

    // PRIORITY 5: Festival keywords → exact date
    const festivalMap = {
      'republic day': `${year}-01-26`,
      'holi': `${year}-03-03`, 'होली': `${year}-03-03`,
      'baisakhi': `${year}-04-13`, 'vaisakhi': `${year}-04-13`,
      'independence day': `${year}-08-15`,
      'onam': `${year}-08-26`,
      'janmashtami': `${year}-08-23`,
      'ganesh chaturthi': `${year}-09-10`, 'ganesh': `${year}-09-10`, 'ganapati': `${year}-09-10`,
      'navratri': `${year}-10-09`, 'नवरात्रि': `${year}-10-09`, 'garba': `${year}-10-09`,
      'dussehra': `${year}-10-19`, 'dasara': `${year}-10-19`,
      'diwali': `${year}-11-07`, 'दिवाली': `${year}-11-07`, 'deepawali': `${year}-11-07`,
      'pushkar': `${year}-11-01`,
      'christmas': `${year}-12-24`, 'xmas': `${year}-12-24`,
      'new year': `${year}-12-31`, 'new years': `${year}-12-31`,
      'sunburn': `${year}-12-27`,
      'buddha purnima': `${year}-05-12`,
    }
    // Matched on word boundaries, not as substrings. A plain includes() meant
    // "holi" fired inside "holiday" — so "a relaxing beach holiday in Goa",
    // about as ordinary as a travel prompt gets, was silently dated to Holi
    // (3 March), and that date then drove the festival banner, the season
    // check and the start_date saved on the trip. Devanagari keywords keep
    // includes(): \b is meaningless against those characters, and they are
    // long enough not to collide with anything.
    for (const [kw, date] of Object.entries(festivalMap)) {
      const isAscii = /^[\x20-\x7F]+$/.test(kw)
      if (isAscii) {
        if (new RegExp(`\\b${kw}\\b`, 'i').test(t)) return date
      } else if (t.includes(kw)) {
        return date
      }
    }

    // PRIORITY 6: English month only — "October mein", "in December"
    const moMatch = norm.match(new RegExp(`\\b(${MONTH_ALT})\\b`, 'i'))
    if (moMatch) {
      const mon = MONTHS[moMatch[1].toLowerCase()]
      if (mon) return makeDate(year, mon, monthOnlyDay)
    }

    // PRIORITY 7: Bengali / Hindi month names, with or without a day beside
    // them ("১৫ মে", "মে ১৫", "মে মাসে", "मई में").
    const indic = findIndicMonth(norm)
    if (indic) {
      const esc = indic.name
      const dayBefore = norm.match(new RegExp(`(\\d{1,2})\\s*(?:তারিখ|तारीख)?\\s*${esc}`))
      const dayAfter = norm.match(new RegExp(`${esc}\\s*(?:মাসের|महीने)?\\s*(\\d{1,2})\\b`))
      const rawDay = (dayBefore && parseInt(dayBefore[1])) || (dayAfter && parseInt(dayAfter[1])) || null
      const day = rawDay && rawDay >= 1 && rawDay <= 31 ? rawDay : monthOnlyDay
      return makeDate(year, indic.mon, day)
    }

    return null
  } catch (e) {
    return null
  }
}

export default extractDateFromText
