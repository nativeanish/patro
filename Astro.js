.pragma library

// Tithi is the 12-degree step of the moon's elongation from the sun, read at sunrise.
// Longitudes follow Meeus, Astronomical Algorithms 2nd ed., chapters 25 and 47.
// Sunrise is always Kathmandu's, wherever the machine is, because a patro is reckoned there.

var KATHMANDU = { latitude: 27.7172, longitude: 85.324 }

var RAD = Math.PI / 180
var DAY_MS = 86400000
var TITHI_ARC = 12

// Meeus table 47.A: multiples of D, M, M', F and the longitude coefficient.
var MOON_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330], [2, -1, 2, 0, 327], [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299], [2, 0, 3, 0, 294], [2, 0, -1, -2, 0]
]

function norm360(degrees) {
  var wrapped = degrees % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

function julianDay(utcMs) {
  return utcMs / DAY_MS + 2440587.5
}

function centuries(jd) {
  return (jd - 2451545) / 36525
}

function solarLongitude(t) {
  var l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
  var m = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t) * RAD
  var centre = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
    + 0.000289 * Math.sin(3 * m)
  return norm360(l0 + centre)
}

function lunarLongitude(t) {
  var lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t
    + (t * t * t) / 538841 - (t * t * t * t) / 65194000
  var d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t
    + (t * t * t) / 545868 - (t * t * t * t) / 113065000
  var m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + (t * t * t) / 24490000
  var mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t
    + (t * t * t) / 69699 - (t * t * t * t) / 14712000
  var f = 93.272095 + 483202.0175233 * t - 0.0036539 * t * t
    - (t * t * t) / 3526000 + (t * t * t * t) / 863310000
  // Damping for terms in the sun's mean anomaly.
  var e = 1 - 0.002516 * t - 0.0000074 * t * t

  var sum = 0
  for (var i = 0; i < MOON_TERMS.length; i++) {
    var term = MOON_TERMS[i]
    var argument = (term[0] * d + term[1] * m + term[2] * mp + term[3] * f) * RAD
    var damping = term[1] === 0 ? 1 : (Math.abs(term[1]) === 1 ? e : e * e)
    sum += term[4] * damping * Math.sin(argument)
  }
  sum += 3958 * Math.sin(norm360(119.75 + 131.849 * t) * RAD)
    + 1962 * Math.sin((lp - f) * RAD)
    + 318 * Math.sin(norm360(53.09 + 479264.29 * t) * RAD)

  return norm360(lp + sum / 1000000)
}

// TT minus UT. Espenak and Meeus polynomials, ordered by year.
function deltaTSeconds(year) {
  var t
  if (year < 1941) return -20 + 32 * Math.pow((year - 1820) / 100, 2)
  if (year < 1961) {
    t = year - 1950
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547
  }
  if (year < 1986) {
    t = year - 1975
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718
  }
  if (year < 2005) {
    t = year - 2000
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t
      + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t
  }
  if (year < 2050) {
    t = year - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  }
  if (year < 2150) return -20 + 32 * Math.pow((year - 1820) / 100, 2) - 0.5628 * (2150 - year)
  return -20 + 32 * Math.pow((year - 1820) / 100, 2)
}

function terrestrialCenturies(utcMs) {
  var year = new Date(utcMs).getUTCFullYear()
  return centuries(julianDay(utcMs + deltaTSeconds(year) * 1000))
}

function obliquity(t) {
  return (23.439291 - 0.0130042 * t) * RAD
}

function solarDeclination(t) {
  return Math.asin(Math.sin(obliquity(t)) * Math.sin(solarLongitude(t) * RAD))
}

function equationOfTimeMinutes(t) {
  var l0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t)
  var y = Math.pow(Math.tan(obliquity(t) / 2), 2)
  var m = norm360(357.52911 + 35999.05029 * t) * RAD
  var eccentricity = 0.016708634 - 0.000042037 * t
  var value = y * Math.sin(2 * l0 * RAD)
    - 2 * eccentricity * Math.sin(m)
    + 4 * eccentricity * y * Math.sin(m) * Math.cos(2 * l0 * RAD)
    - 0.5 * y * y * Math.sin(4 * l0 * RAD)
    - 1.25 * eccentricity * eccentricity * Math.sin(2 * m)
  return (value / RAD) * 4
}

// Sunrise for a Gregorian day, UTC milliseconds. Iterated: declination depends on it.
function sunriseUtcMs(year, month, day, place) {
  var where = place || KATHMANDU
  var midnight = Date.UTC(year, month - 1, day)
  var guess = midnight + (12 - where.longitude / 15) * 3600000

  for (var pass = 0; pass < 3; pass++) {
    var t = centuries(julianDay(guess))
    var declination = solarDeclination(t)
    var latitude = where.latitude * RAD
    // -0.833 degrees covers refraction and the solar semidiameter.
    var cosHourAngle = (Math.sin(-0.833 * RAD) - Math.sin(latitude) * Math.sin(declination))
      / (Math.cos(latitude) * Math.cos(declination))
    if (cosHourAngle < -1 || cosHourAngle > 1) return null
    var hourAngle = Math.acos(cosHourAngle) / RAD
    var noon = 720 - 4 * where.longitude - equationOfTimeMinutes(t)
    guess = midnight + (noon - 4 * hourAngle) * 60000
  }
  return guess
}

function elongationAt(utcMs) {
  var t = terrestrialCenturies(utcMs)
  return norm360(lunarLongitude(t) - solarLongitude(t))
}

function tithiAt(utcMs) {
  return Math.floor(elongationAt(utcMs) / TITHI_ARC) + 1
}

// The tithi in force at Kathmandu sunrise, 1 to 30.
function tithiForDate(year, month, day) {
  var sunrise = sunriseUtcMs(year, month, day, KATHMANDU)
  return sunrise === null ? 0 : tithiAt(sunrise)
}

function pakshaOf(tithi) {
  return tithi <= 15 ? "shukla" : "krishna"
}

// Position in the fortnight, 1 to 15.
function tithiInPaksha(tithi) {
  return tithi <= 15 ? tithi : tithi - 15
}

function isEkadashi(tithi) {
  return tithi === 11 || tithi === 26
}

function isPurnima(tithi) {
  return tithi === 15
}

function isAunsi(tithi) {
  return tithi === 30
}

// Minutes to the next tithi boundary. A tithi never runs past 26 hours.
function minutesToNextTithi(utcMs) {
  var target = tithiAt(utcMs)
  var low = utcMs
  var high = utcMs + 2 * DAY_MS
  for (var i = 0; i < 44; i++) {
    var mid = low + (high - low) / 2
    if (tithiAt(mid) === target) low = mid
    else high = mid
  }
  return (high - utcMs) / 60000
}
