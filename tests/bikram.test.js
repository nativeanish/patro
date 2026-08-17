"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { load, readJson, plain } = require("./harness.js");

const Bikram = load("Bikram.js");
const Data = load("CalendarData.js");
const patro = readJson("tests", "fixtures", "patro.json");

const TOTAL_DAYS = Data.MONTH_LENGTHS.reduce(
  (sum, months) => sum + months.reduce((a, b) => a + b, 0), 0);

function eachDay(visit) {
  for (let year = Data.FIRST_YEAR; year <= Data.LAST_YEAR; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= Bikram.monthLength(year, month); day += 1) visit(year, month, day);
    }
  }
}

test("the table is structurally sound", () => {
  assert.equal(Data.MONTH_LENGTHS.length, Data.LAST_YEAR - Data.FIRST_YEAR + 1);
  for (const [index, months] of Data.MONTH_LENGTHS.entries()) {
    const year = Data.FIRST_YEAR + index;
    assert.equal(months.length, 12, `${year} has ${months.length} months`);
    for (const days of months) {
      assert.ok(days >= 29 && days <= 32, `${year} has a month of ${days} days`);
    }
    const total = months.reduce((a, b) => a + b, 0);
    assert.ok(total === 365 || total === 366, `${year} totals ${total} days`);
  }
});

test("the anchor is 1 Baisakh 2000 BS = 14 April 1943", () => {
  assert.deepEqual(plain(Bikram.toGregorian(2000, 1, 1)), { year: 1943, month: 4, day: 14 });
  assert.deepEqual(plain(Bikram.fromGregorian(1943, 4, 14)), { year: 2000, month: 1, day: 1 });
});

test("every supported day round-trips through Gregorian", () => {
  let checked = 0;
  eachDay((year, month, day) => {
    const gregorian = Bikram.toGregorian(year, month, day);
    assert.ok(gregorian, `no Gregorian date for ${year}-${month}-${day}`);
    const back = Bikram.fromGregorian(gregorian.year, gregorian.month, gregorian.day);
    assert.deepEqual(plain(back), { year, month, day });
    checked += 1;
  });
  assert.equal(checked, TOTAL_DAYS);
  assert.equal(checked, 33237);
});

test("consecutive Bikram days are consecutive Gregorian days", () => {
  let previous = null;
  eachDay((year, month, day) => {
    const gregorian = Bikram.toGregorian(year, month, day);
    const days = Bikram.daysFromCivil(gregorian.year, gregorian.month, gregorian.day);
    if (previous !== null) assert.equal(days, previous + 1, `gap before ${year}-${month}-${day}`);
    previous = days;
  });
});

test("month boundaries and year rollovers land where the table says", () => {
  for (let year = Data.FIRST_YEAR; year <= Data.LAST_YEAR; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const length = Bikram.monthLength(year, month);
      const last = Bikram.toGregorian(year, month, length);
      const next = month === 12
        ? Bikram.toGregorian(year + 1, 1, 1)
        : Bikram.toGregorian(year, month + 1, 1);
      if (!next) continue;
      assert.equal(
        Bikram.daysFromCivil(next.year, next.month, next.day),
        Bikram.daysFromCivil(last.year, last.month, last.day) + 1,
        `${year}-${month} does not join the month after it`);
    }
  }
});

test("dates outside the table are refused rather than guessed", () => {
  assert.equal(Bikram.toGregorian(Data.FIRST_YEAR - 1, 1, 1), null);
  assert.equal(Bikram.toGregorian(Data.LAST_YEAR + 1, 1, 1), null);
  assert.equal(Bikram.toGregorian(2083, 13, 1), null);
  assert.equal(Bikram.toGregorian(2083, 0, 1), null);
  assert.equal(Bikram.toGregorian(2083, 1, 0), null);
  assert.equal(Bikram.toGregorian(2083, 1, Bikram.monthLength(2083, 1) + 1), null);
  assert.equal(Bikram.fromGregorian(1943, 4, 13), null);
});

// Falgun 2055: the scrape says Magh had 30 days, all six libraries say 29. Pinned here
// so a disagreement anywhere else fails.
const KNOWN_DISAGREEMENT = { year: 2055, month: 11, days: 2 };

test("the published patro agrees, day for day", () => {
  const disagreements = [];
  for (const [year, month, day, adYear, adMonth, adDay] of patro.days) {
    const gregorian = plain(Bikram.toGregorian(year, month, day));
    const expected = { year: adYear, month: adMonth, day: adDay };
    try {
      assert.deepEqual(gregorian, expected, `BS ${year}-${month}-${day}`);
    } catch (error) {
      disagreements.push({ year, month, day, gregorian, expected });
    }
  }

  for (const item of disagreements) {
    assert.equal(item.year, KNOWN_DISAGREEMENT.year, `unexpected disagreement in BS ${item.year}`);
    assert.equal(item.month, KNOWN_DISAGREEMENT.month, `unexpected disagreement in BS ${item.year}-${item.month}`);
    const drift = Bikram.daysFromCivil(item.expected.year, item.expected.month, item.expected.day)
      - Bikram.daysFromCivil(item.gregorian.year, item.gregorian.month, item.gregorian.day);
    assert.equal(drift, 1, "the table should trail the scrape by exactly one day here");
  }
  assert.equal(disagreements.length, KNOWN_DISAGREEMENT.days);
  assert.ok(patro.days.length > 2000, "fixture is too small to be worth much");
});

test("Chaitra 2055 puts the table and the patro back in step", () => {
  assert.deepEqual(plain(Bikram.toGregorian(2055, 12, 1)), { year: 1999, month: 3, day: 15 });
  assert.deepEqual(plain(Bikram.toGregorian(2056, 1, 1)), { year: 1999, month: 4, day: 14 });
});

test("weekdays follow the real Gregorian calendar", () => {
  eachDay((year, month, day) => {
    const gregorian = Bikram.toGregorian(year, month, day);
    const expected = new Date(Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day)).getUTCDay();
    assert.equal(Bikram.weekdayOf(year, month, day), expected, `BS ${year}-${month}-${day}`);
  });
});

test("confidence is reported per year", () => {
  assert.equal(Bikram.confidence(2000), "attested");
  assert.equal(Bikram.confidence(Data.ATTESTED_THROUGH), "attested");
  assert.equal(Bikram.confidence(Data.ATTESTED_THROUGH + 1), "published");
  assert.equal(Bikram.confidence(Data.PUBLISHED_THROUGH), "published");
  assert.equal(Bikram.confidence(Data.PUBLISHED_THROUGH + 1), "provisional");
  assert.equal(Bikram.confidence(Data.LAST_YEAR + 1), "unsupported");
});

test("month navigation stops at the edges of the table", () => {
  assert.deepEqual(plain(Bikram.addMonths(2083, 5, 1)), { year: 2083, month: 6 });
  assert.deepEqual(plain(Bikram.addMonths(2083, 12, 1)), { year: 2084, month: 1 });
  assert.deepEqual(plain(Bikram.addMonths(2083, 1, -1)), { year: 2082, month: 12 });
  assert.deepEqual(plain(Bikram.addMonths(2083, 1, 12)), { year: 2084, month: 1 });
  assert.deepEqual(plain(Bikram.addMonths(Data.FIRST_YEAR, 1, -1)), { year: Data.FIRST_YEAR, month: 1 });
  assert.deepEqual(plain(Bikram.addMonths(Data.LAST_YEAR, 12, 1)), { year: Data.LAST_YEAR, month: 12 });
  assert.deepEqual(plain(Bikram.addMonths(Data.FIRST_YEAR, 1, -600)), { year: Data.FIRST_YEAR, month: 1 });
});

test("a month grid holds whole weeks with the days in the right columns", () => {
  for (let year = Data.FIRST_YEAR; year <= Data.LAST_YEAR; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      for (const weekStart of [0, 1]) {
        const weeks = Bikram.monthGrid(year, month, weekStart);
        const cells = weeks.flat();
        assert.equal(cells.length % 7, 0);
        const days = cells.filter(Boolean);
        assert.equal(days.length, Bikram.monthLength(year, month));
        assert.equal(days[0].day, 1);
        for (const [index, cell] of cells.entries()) {
          if (!cell) continue;
          assert.equal(cell.weekday, (weekStart + (index % 7)) % 7,
            `BS ${year}-${month}-${cell.day} sits in the wrong column`);
        }
      }
    }
  }
});

test("grid padding only ever sits before the first day and after the last", () => {
  const weeks = Bikram.monthGrid(2083, 5, 0);
  const cells = weeks.flat();
  const first = cells.findIndex(Boolean);
  const last = cells.length - 1 - [...cells].reverse().findIndex(Boolean);
  for (let i = first; i <= last; i += 1) assert.ok(cells[i], `hole at ${i}`);
});

test("a day step crosses months and stops at the table's ends", () => {
  assert.deepEqual(plain(Bikram.addDays(2083, 5, 1, 1)), { year: 2083, month: 5, day: 2 });
  assert.deepEqual(plain(Bikram.addDays(2083, 5, 1, -1)), { year: 2083, month: 4, day: 31 });
  assert.deepEqual(plain(Bikram.addDays(2083, 12, Bikram.monthLength(2083, 12), 1)),
    { year: 2084, month: 1, day: 1 });
  assert.deepEqual(plain(Bikram.addDays(2083, 5, 1, 7)), { year: 2083, month: 5, day: 8 });
  assert.equal(Bikram.addDays(Data.FIRST_YEAR, 1, 1, -1), null);
  const lastMonth = Bikram.monthLength(Data.LAST_YEAR, 12);
  assert.equal(Bikram.addDays(Data.LAST_YEAR, 12, lastMonth, 1), null);
  assert.equal(Bikram.addDays(2083, 13, 1, 1), null);
});

test("a grid is empty for a month that does not exist", () => {
  assert.deepEqual(plain(Bikram.monthGrid(2083, 13, 0)), []);
  assert.deepEqual(plain(Bikram.monthGrid(2083, 0, 0)), []);
  assert.deepEqual(plain(Bikram.monthGrid(Data.LAST_YEAR + 1, 1, 0)), []);
});

test("a Gregorian date that never happened does not round-trip", () => {
  const rolled = Bikram.fromGregorian(2026, 2, 30);
  assert.ok(rolled, "the civil algorithm rolls it over");
  const back = plain(Bikram.toGregorian(rolled.year, rolled.month, rolled.day));
  assert.deepEqual(back, { year: 2026, month: 3, day: 2 });
});

test("typed Bikram dates are read or refused with a reason", () => {
  assert.deepEqual(plain(Bikram.readBikramDate("2083-05-01").date), { year: 2083, month: 5, day: 1 });
  assert.deepEqual(plain(Bikram.readBikramDate("2083/5/1").date), { year: 2083, month: 5, day: 1 });
  assert.deepEqual(plain(Bikram.readBikramDate(" 2083 . 5 . 1 ").date), { year: 2083, month: 5, day: 1 });
  assert.deepEqual(plain(Bikram.readBikramDate("२०८३-०५-०१").date), { year: 2083, month: 5, day: 1 });

  assert.equal(Bikram.readBikramDate("").reason, "writeBikram");
  assert.equal(Bikram.readBikramDate("nonsense").reason, "writeBikram");
  assert.equal(Bikram.readBikramDate("2083-05").reason, "writeBikram");
  assert.equal(Bikram.readBikramDate("2083-13-01").reason, "notADate");
  assert.equal(Bikram.readBikramDate("2083-00-01").reason, "notADate");
  assert.equal(Bikram.readBikramDate("2150-01-01").reason, "outOfRange");
  assert.equal(Bikram.readBikramDate("1900-01-01").reason, "outOfRange");
  assert.equal(Bikram.readBikramDate("2083-02-32").reason, "noSuchDay");
  assert.deepEqual(plain(Bikram.readBikramDate("2083-02-32").parts), { year: 2083, month: 2, day: 32 });
});

test("typed Gregorian dates are read or refused with a reason", () => {
  assert.deepEqual(plain(Bikram.readGregorianDate("2026-08-17").date), { year: 2083, month: 5, day: 1 });
  assert.deepEqual(plain(Bikram.readGregorianDate("२०२६-०८-१७").date), { year: 2083, month: 5, day: 1 });

  assert.equal(Bikram.readGregorianDate("rubbish").reason, "writeGregorian");
  assert.equal(Bikram.readGregorianDate("2026-13-01").reason, "notADate");
  assert.equal(Bikram.readGregorianDate("2026-08-32").reason, "notADate");
  // Dates the civil algorithm would silently roll forward.
  assert.equal(Bikram.readGregorianDate("2026-02-30").reason, "notADate");
  assert.equal(Bikram.readGregorianDate("2026-04-31").reason, "notADate");
  assert.equal(Bikram.readGregorianDate("2025-02-29").reason, "notADate");
  assert.deepEqual(plain(Bikram.readGregorianDate("2024-02-29").date), { year: 2080, month: 11, day: 17 });

  assert.equal(Bikram.readGregorianDate("1900-01-01").reason, "outOfRange");
  assert.equal(Bikram.readGregorianDate("2100-01-01").reason, "outOfRange");
});

test("a read date round-trips back to what was typed", () => {
  for (let year = Data.FIRST_YEAR; year <= Data.LAST_YEAR; year += 7) {
    for (let month = 1; month <= 12; month += 5) {
      const day = Bikram.monthLength(year, month);
      const typed = `${year}-${month}-${day}`;
      assert.deepEqual(plain(Bikram.readBikramDate(typed).date), { year, month, day }, typed);

      const g = Bikram.toGregorian(year, month, day);
      const back = plain(Bikram.readGregorianDate(`${g.year}-${g.month}-${g.day}`).date);
      assert.deepEqual(back, { year, month, day });
    }
  }
});
