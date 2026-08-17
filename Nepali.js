.pragma library

// Names, numerals and label formatting.

var DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

// Colloquial names, as a wall patro prints them.
var MONTHS = {
  nepali: ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
           "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"],
  english: ["Baisakh", "Jestha", "Ashar", "Shrawan", "Bhadra", "Ashwin",
            "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"]
}

var WEEKDAYS = {
  nepali: ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"],
  english: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
}

var WEEKDAYS_SHORT = {
  nepali: ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"],
  english: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
}

var TITHIS = {
  nepali: ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी",
           "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"],
  english: ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
            "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
            "Trayodashi", "Chaturdashi"]
}

var FULL_MOON = { nepali: "पूर्णिमा", english: "Purnima" }
var NEW_MOON = { nepali: "औंसी", english: "Aunsi" }

var PAKSHA = {
  shukla: { nepali: "शुक्ल", english: "Shukla" },
  krishna: { nepali: "कृष्ण", english: "Krishna" }
}

var GREGORIAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

var LANGUAGES = ["Nepali", "English"]
var NUMERALS = ["Devanagari", "Latin"]
var FORMATS = ["Full", "Compact", "Numeric", "With Gregorian"]
var WEEK_STARTS = ["Sunday", "Monday"]

function pick(value, allowed, fallback) {
  for (var i = 0; i < allowed.length; i++) if (allowed[i] === value) return value
  return fallback
}

function normalizeLanguage(value) { return pick(value, LANGUAGES, "Nepali") }
function normalizeNumerals(value) { return pick(value, NUMERALS, "Devanagari") }
function normalizeFormat(value) { return pick(value, FORMATS, "Full") }

function normalizeWeekStart(value) {
  return pick(value, WEEK_STARTS, "Sunday") === "Monday" ? 1 : 0
}

function key(language) {
  return normalizeLanguage(language) === "English" ? "english" : "nepali"
}

function numerals(value, style) {
  var text = String(value)
  if (normalizeNumerals(style) !== "Devanagari") return text
  var out = ""
  for (var i = 0; i < text.length; i++) {
    var digit = text.charCodeAt(i) - 48
    out += digit >= 0 && digit <= 9 ? DEVANAGARI_DIGITS[digit] : text.charAt(i)
  }
  return out
}

function padded(value, style) {
  return numerals(value < 10 ? "0" + value : String(value), style)
}

function monthName(month, language) {
  return MONTHS[key(language)][month - 1] || ""
}

function weekdayName(weekday, language) {
  return WEEKDAYS[key(language)][weekday] || ""
}

function weekdayShort(weekday, language) {
  return WEEKDAYS_SHORT[key(language)][weekday] || ""
}

function tithiName(tithi, language) {
  var script = key(language)
  if (tithi === 15) return FULL_MOON[script]
  if (tithi === 30) return NEW_MOON[script]
  var position = tithi <= 15 ? tithi : tithi - 15
  return TITHIS[script][position - 1] || ""
}

function pakshaName(paksha, language) {
  var entry = PAKSHA[paksha]
  return entry ? entry[key(language)] : ""
}

// Purnima and Aunsi take no paksha.
function tithiLabel(tithi, paksha, language) {
  var name = tithiName(tithi, language)
  if (tithi === 15 || tithi === 30) return name
  return pakshaName(paksha, language) + " " + name
}

function gregorianShort(parts, style) {
  return numerals(parts.day, style) + " " + GREGORIAN_SHORT[parts.month - 1]
}

// options: language, numerals, format, showWeekday, weekday, gregorian, vertical
function formatDate(parts, options) {
  if (!parts) return ""
  var settings = options || {}
  var style = settings.numerals
  var language = settings.language
  var format = normalizeFormat(settings.format)

  if (settings.vertical === true) return verticalLines(parts, settings, style, language, format)

  if (format === "Numeric") {
    var numeric = numerals(parts.year, style) + "-" + padded(parts.month, style)
      + "-" + padded(parts.day, style)
    return withWeekday(numeric, settings, language)
  }

  var stem = numerals(parts.day, style) + " " + monthName(parts.month, language)
  if (format === "Compact") return withWeekday(stem, settings, language)

  var full = stem + " " + numerals(parts.year, style)
  if (format === "With Gregorian" && settings.gregorian) {
    full += " · " + gregorianShort(settings.gregorian, "Latin")
  }
  return withWeekday(full, settings, language)
}

// A vertical bar is about one glyph wide, so month names go and digits stay.
function verticalLines(parts, settings, style, language, format) {
  var lines = []
  if (settings.showWeekday === true && settings.weekday >= 0) {
    lines.push(weekdayShort(settings.weekday, language))
  }
  if (format !== "Compact") lines.push(numerals(parts.year, style))
  lines.push(padded(parts.month, style))
  lines.push(padded(parts.day, style))
  return lines.join("\n")
}

function withWeekday(text, settings, language) {
  if (settings.showWeekday !== true || settings.weekday === undefined || settings.weekday < 0) return text
  var name = weekdayName(settings.weekday, language)
  return name === "" ? text : name + ", " + text
}

// Templates keep their %n placeholders for the caller to fill.
var MESSAGES = {
  provisional: {
    nepali: "पञ्चाङ्ग निर्णायक समितिले %1 सालको पात्रो अझै निर्धारण गरेको छैन।",
    english: "%1 BS is not yet fixed by the Panchanga Nirnayak Samiti."
  },
  writeBikram: {
    nepali: "बिक्रम सम्बत् मिति वर्ष-महिना-गते गरी लेख्नुहोस्।",
    english: "Write a Bikram Sambat date as year-month-day."
  },
  writeGregorian: {
    nepali: "ग्रेगोरियन मिति वर्ष-महिना-गते गरी लेख्नुहोस्।",
    english: "Write a Gregorian date as year-month-day."
  },
  notADate: {
    nepali: "यो मिति होइन।",
    english: "That is not a date."
  },
  outOfRange: {
    nepali: "%1 देखि %2 सम्मको पात्रो मात्र छ, अर्थात् %3 देखि %4 सम्म।",
    english: "Only %1 BS to %2 BS is covered, which is %3 to %4."
  },
  noSuchDay: {
    nepali: "%1 %2 मा %3 गते मात्र हुन्छन्।",
    english: "%1 %2 has %3 days."
  }
}

function message(name, language) {
  var entry = MESSAGES[name]
  return entry ? entry[key(language)] : ""
}

function provisionalNotice(year, options) {
  var settings = options || {}
  return message("provisional", settings.language)
    .replace("%1", numerals(year, settings.numerals))
}

// "भदौ २०८३"
function monthTitle(year, month, options) {
  var settings = options || {}
  return monthName(month, settings.language) + " " + numerals(year, settings.numerals)
}

// "Aug/Sep 2026", the Gregorian months a Bikram month runs across.
function gregorianSpan(first, last) {
  if (!first || !last) return ""
  var head = GREGORIAN_SHORT[first.month - 1]
  var tail = GREGORIAN_SHORT[last.month - 1]
  var months = head === tail ? head : head + "/" + tail
  return first.year === last.year
    ? months + " " + first.year
    : months + " " + first.year + "/" + last.year
}

function weekdayOrder(weekStart) {
  var order = []
  for (var i = 0; i < 7; i++) order.push((weekStart + i) % 7)
  return order
}

// Saturday, in Nepal.
function isWeeklyHoliday(weekday) {
  return weekday === 6
}
