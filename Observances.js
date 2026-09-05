.pragma library
.import "Astro.js" as Astro

// Days fixed to a Bikram date, a Gregorian date, or a tithi, each checked against the
// festival column of a published patro for BS 2066-2079.
// Dashain, Tihar and Teej need vyapini rules and are not here yet.

var HOLIDAY = "holiday"
var OBSERVANCE = "observance"
var MOON = "moon"

// from: the Bikram year of the event, for the days that commemorate one.
var FIXED_BIKRAM = [
  { month: 1, day: 1, kind: HOLIDAY, nepali: "नयाँ वर्ष", english: "Nepali New Year" },
  { month: 1, day: 11, from: 2063, kind: HOLIDAY, nepali: "लोकतन्त्र दिवस", english: "Loktantra Diwas" },
  { month: 2, day: 15, from: 2065, kind: HOLIDAY, nepali: "गणतन्त्र दिवस", english: "Republic Day" },
  { month: 3, day: 29, kind: OBSERVANCE, nepali: "भानु जयन्ती", english: "Bhanu Jayanti" },
  { month: 4, day: 1, kind: OBSERVANCE, nepali: "साउने सङ्क्रान्ति", english: "Shrawan Sankranti" },
  { month: 4, day: 15, kind: OBSERVANCE, nepali: "खिर खाने दिन", english: "Khir Khane Din" },
  { month: 5, day: 22, kind: OBSERVANCE, nepali: "निजामती सेवा दिवस", english: "Civil Service Day" },
  { month: 6, day: 1, kind: OBSERVANCE, nepali: "विश्वकर्मा पूजा", english: "Vishwakarma Puja" },
  { month: 6, day: 3, from: 2072, kind: HOLIDAY, nepali: "संविधान दिवस", english: "Constitution Day" },
  { month: 9, day: 27, kind: HOLIDAY, nepali: "पृथ्वी जयन्ती", english: "Prithvi Jayanti" },
  { month: 10, day: 1, kind: HOLIDAY, nepali: "माघे सङ्क्रान्ति", english: "Maghe Sankranti" },
  { month: 10, day: 16, kind: HOLIDAY, nepali: "सहिद दिवस", english: "Martyrs' Day" },
  { month: 11, day: 7, from: 2007, kind: HOLIDAY, nepali: "प्रजातन्त्र दिवस", english: "Prajatantra Diwas" }
]

var FIXED_GREGORIAN = [
  { month: 1, day: 1, kind: OBSERVANCE, nepali: "अङ्ग्रेजी नयाँ वर्ष", english: "New Year's Day" },
  { month: 3, day: 8, kind: HOLIDAY, nepali: "अन्तर्राष्ट्रिय नारी दिवस", english: "International Women's Day" },
  { month: 5, day: 1, kind: HOLIDAY, nepali: "अन्तर्राष्ट्रिय श्रमिक दिवस", english: "Labour Day" },
  { month: 5, day: 8, kind: OBSERVANCE, nepali: "विश्व रेडक्रस दिवस", english: "World Red Cross Day" },
  { month: 12, day: 1, kind: OBSERVANCE, nepali: "विश्व एड्स दिवस", english: "World AIDS Day" },
  { month: 12, day: 10, kind: OBSERVANCE, nepali: "मानव अधिकार दिवस", english: "Human Rights Day" },
  { month: 12, day: 25, kind: HOLIDAY, nepali: "क्रिसमस", english: "Christmas" }
]

var MOON_MARKERS = [
  { tithi: 15, kind: MOON, nepali: "पूर्णिमा", english: "Purnima" },
  { tithi: 30, kind: MOON, nepali: "औंसी", english: "Aunsi" },
  { tithi: 11, kind: MOON, nepali: "एकादशी", english: "Ekadashi" },
  { tithi: 26, kind: MOON, nepali: "एकादशी", english: "Ekadashi" }
]

function nameOf(entry, language) {
  return language === "English" ? entry.english : entry.nepali
}

// One day, holidays first.
function forDate(bikram, gregorian, tithi) {
  var found = []
  var i

  for (i = 0; i < FIXED_BIKRAM.length; i++) {
    var bs = FIXED_BIKRAM[i]
    if (!bikram || bs.month !== bikram.month || bs.day !== bikram.day) continue
    if (bs.from && bikram.year < bs.from) continue
    found.push(bs)
  }
  for (i = 0; i < FIXED_GREGORIAN.length; i++) {
    var ad = FIXED_GREGORIAN[i]
    if (gregorian && ad.month === gregorian.month && ad.day === gregorian.day) found.push(ad)
  }
  for (i = 0; i < MOON_MARKERS.length; i++) {
    if (MOON_MARKERS[i].tithi === tithi) found.push(MOON_MARKERS[i])
  }

  found.sort(function (a, b) {
    return rank(a.kind) - rank(b.kind)
  })
  return found
}

function rank(kind) {
  if (kind === HOLIDAY) return 0
  if (kind === OBSERVANCE) return 1
  return 2
}

function isHoliday(entries) {
  for (var i = 0; i < entries.length; i++) if (entries[i].kind === HOLIDAY) return true
  return false
}

// Without the moon markers, for callers that already print the tithi.
function named(entries) {
  var kept = []
  for (var i = 0; i < entries.length; i++) if (entries[i].kind !== MOON) kept.push(entries[i])
  return kept
}

function summary(entries, language) {
  var names = []
  for (var i = 0; i < entries.length; i++) names.push(nameOf(entries[i], language))
  return names.join(" · ")
}

// A whole month in one pass.
function forMonth(grid, tithiFor) {
  var marks = {}
  for (var w = 0; w < grid.length; w++) {
    for (var c = 0; c < grid[w].length; c++) {
      var cell = grid[w][c]
      if (!cell) continue
      var tithi = tithiFor ? tithiFor(cell) : 0
      var entries = forDate(cell.bikram || cell, cell.gregorian, tithi)
      if (entries.length > 0) marks[cell.day] = entries
    }
  }
  return marks
}
