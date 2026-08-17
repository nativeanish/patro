"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { load, plain } = require("./harness.js");

const Observances = load("Observances.js");
const Bikram = load("Bikram.js");
const Astro = load("Astro.js");

test("every entry carries both names and a known kind", () => {
  const kinds = new Set([Observances.HOLIDAY, Observances.OBSERVANCE, Observances.MOON]);
  const all = [
    ...Observances.FIXED_BIKRAM,
    ...Observances.FIXED_GREGORIAN,
    ...Observances.MOON_MARKERS,
  ];
  for (const entry of all) {
    assert.ok(kinds.has(entry.kind), `${entry.english} has kind ${entry.kind}`);
    assert.match(entry.nepali, /^[ऀ-ॿ\s]+$/, `${entry.english} is not Devanagari`);
    assert.ok(entry.english.length > 0);
  }
});

test("fixed Bikram dates sit on days every year actually has", () => {
  for (const entry of Observances.FIXED_BIKRAM) {
    assert.ok(entry.month >= 1 && entry.month <= 12);
    let shortest = 32;
    for (let year = Bikram.firstYear(); year <= Bikram.lastYear(); year += 1) {
      shortest = Math.min(shortest, Bikram.monthLength(year, entry.month));
    }
    assert.ok(entry.day <= shortest,
      `${entry.english} falls on day ${entry.day} but month ${entry.month} can be ${shortest} days`);
  }
});

test("Nepali New Year is Baisakh 1 and Maghe Sankranti is Magh 1", () => {
  const newYear = Observances.forDate({ year: 2083, month: 1, day: 1 }, { year: 2026, month: 4, day: 14 }, 0);
  assert.equal(newYear.length, 1);
  assert.equal(newYear[0].english, "Nepali New Year");
  assert.ok(Observances.isHoliday(newYear));

  const sankranti = Observances.forDate({ year: 2083, month: 10, day: 1 }, { year: 2027, month: 1, day: 15 }, 0);
  assert.equal(sankranti[0].english, "Maghe Sankranti");
});

test("Labour Day is pinned to the Gregorian first of May", () => {
  const bikram = plain(Bikram.fromGregorian(2026, 5, 1));
  const entries = Observances.forDate(bikram, { year: 2026, month: 5, day: 1 }, 0);
  assert.ok(entries.some((entry) => entry.english === "Labour Day"));

  const notLabourDay = Observances.forDate(bikram, { year: 2026, month: 5, day: 2 }, 0);
  assert.ok(!notLabourDay.some((entry) => entry.english === "Labour Day"));
});

test("moon markers follow the tithi, both fortnights included", () => {
  assert.equal(Observances.forDate(null, null, 15)[0].english, "Purnima");
  assert.equal(Observances.forDate(null, null, 30)[0].english, "Aunsi");
  assert.equal(Observances.forDate(null, null, 11)[0].english, "Ekadashi");
  assert.equal(Observances.forDate(null, null, 26)[0].english, "Ekadashi");
  assert.equal(Observances.forDate(null, null, 12).length, 0);
});

test("holidays sort ahead of observances and moon markers", () => {
  const entries = Observances.forDate(
    { year: 2083, month: 1, day: 1 }, { year: 2026, month: 4, day: 14 }, 15);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].kind, Observances.HOLIDAY);
  assert.equal(entries[1].kind, Observances.MOON);
});

test("a day with nothing on it reports nothing", () => {
  const entries = Observances.forDate({ year: 2083, month: 5, day: 3 }, { year: 2026, month: 8, day: 19 }, 7);
  assert.deepEqual(plain(entries), []);
  assert.ok(!Observances.isHoliday(entries));
  assert.equal(Observances.summary(entries, "Nepali"), "");
});

test("names come out in the language asked for", () => {
  const entries = Observances.forDate({ year: 2083, month: 2, day: 15 }, null, 0);
  assert.equal(Observances.summary(entries, "Nepali"), "गणतन्त्र दिवस");
  assert.equal(Observances.summary(entries, "English"), "Republic Day");
});

test("a month is marked in one pass", () => {
  const grid = Bikram.monthGrid(2083, 1, 0);
  const marks = plain(Observances.forMonth(grid, (cell) =>
    Astro.tithiForDate(cell.gregorian.year, cell.gregorian.month, cell.gregorian.day)));

  assert.ok(marks["1"], "Baisakh 1 should be marked");
  assert.equal(marks["1"][0].english, "Nepali New Year");
  assert.ok(marks["11"], "Baisakh 11 should be marked");
  assert.equal(marks["11"][0].english, "Loktantra Diwas");

  // Every marked day is a real day of that month.
  const length = Bikram.monthLength(2083, 1);
  for (const day of Object.keys(marks)) {
    assert.ok(Number(day) >= 1 && Number(day) <= length);
  }
});

function markedDays(year, month, name) {
  const grid = Bikram.monthGrid(year, month, 0);
  const marks = Observances.forMonth(grid, (cell) =>
    Astro.tithiForDate(cell.gregorian.year, cell.gregorian.month, cell.gregorian.day));
  return Object.entries(marks)
    .filter(([, entries]) => entries.some((entry) => entry.english === name))
    .map(([day]) => Number(day))
    .sort((a, b) => a - b);
}

// Consecutive marks are one tithi seen at two sunrises; separated marks are two lunations.
function runsOf(days) {
  const runs = [];
  for (const day of days) {
    const last = runs[runs.length - 1];
    if (last && day === last[last.length - 1] + 1) last.push(day);
    else runs.push([day]);
  }
  return runs;
}

test("a moon marker repeats across at most two sunrises", () => {
  for (const name of ["Purnima", "Aunsi"]) {
    for (let year = 2080; year <= 2085; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const runs = runsOf(markedDays(year, month, name));
        assert.ok(runs.length <= 2, `BS ${year}-${month} has ${runs.length} of ${name}`);
        for (const run of runs) {
          assert.ok(run.length <= 2,
            `BS ${year}-${month} has ${name} on ${run.length} days running`);
        }
        if (runs.length === 2) {
          const gap = runs[1][0] - runs[0][runs[0].length - 1];
          assert.ok(gap >= 28, `two ${name} only ${gap} days apart in BS ${year}-${month}`);
        }
      }
    }
  }
});

test("a Bikram year holds a full cycle of moons", () => {
  for (const name of ["Purnima", "Aunsi"]) {
    for (let year = 2080; year <= 2085; year += 1) {
      let events = 0;
      for (let month = 1; month <= 12; month += 1) {
        events += runsOf(markedDays(year, month, name)).length;
      }
      // Twelve a year, thirteen when one straddles an edge, eleven when one is skipped.
      assert.ok(events >= 11 && events <= 13, `${events} of ${name} in BS ${year}`);
    }
  }
});

// Falgun 2083 has no Purnima: the full moon falls at 05:09 on 21 February 2027, between
// two sunrises, so tithi 15 is never in force at dawn.
test("a tithi skipped between two sunrises leaves no marked day", () => {
  assert.deepEqual(markedDays(2083, 11, "Purnima"), []);
  assert.equal(Astro.tithiForDate(2027, 2, 20), 14);
  assert.equal(Astro.tithiForDate(2027, 2, 21), 16);
});

test("moon markers drop out of a summary that already states the tithi", () => {
  const aunsi = Observances.forDate({ year: 2081, month: 9, day: 15 }, { year: 2024, month: 12, day: 30 }, 30);
  assert.equal(aunsi.length, 1);
  assert.deepEqual(plain(Observances.named(aunsi)), []);

  const both = Observances.forDate({ year: 2081, month: 9, day: 27 }, { year: 2025, month: 1, day: 11 }, 11);
  assert.equal(both.length, 2);
  const kept = Observances.named(both);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].english, "Prithvi Jayanti");
  assert.ok(Observances.isHoliday(kept));
});

test("a day that commemorates an event does not predate it", () => {
  const dated = Observances.FIXED_BIKRAM.filter((entry) => entry.from);
  assert.ok(dated.length >= 3, "the commemorative days should carry a from year");

  for (const entry of dated) {
    const before = Observances.forDate(
      { year: entry.from - 1, month: entry.month, day: entry.day }, null, 0);
    assert.ok(!before.some((found) => found.english === entry.english),
      `${entry.english} appears in ${entry.from - 1}`);

    const after = Observances.forDate(
      { year: entry.from, month: entry.month, day: entry.day }, null, 0);
    assert.ok(after.some((found) => found.english === entry.english),
      `${entry.english} is missing from ${entry.from}`);
  }
});

test("days older than the calendar itself carry no from year", () => {
  const always = ["Nepali New Year", "Maghe Sankranti", "Vishwakarma Puja", "Khir Khane Din"];
  for (const name of always) {
    const entry = Observances.FIXED_BIKRAM.find((item) => item.english === name);
    assert.ok(entry, `${name} is missing`);
    assert.equal(entry.from, undefined, `${name} should not be bounded`);
  }
  const firstYear = Bikram.firstYear();
  const newYear = Observances.forDate({ year: firstYear, month: 1, day: 1 }, null, 0);
  assert.equal(newYear[0].english, "Nepali New Year");
});

test("no two fixed entries claim the same day", () => {
  for (const list of [Observances.FIXED_BIKRAM, Observances.FIXED_GREGORIAN]) {
    const seen = new Set();
    for (const entry of list) {
      const key = `${entry.month}-${entry.day}`;
      assert.ok(!seen.has(key), `two entries on ${key}`);
      seen.add(key);
    }
  }
});

test("the fixed lists are ordered by date", () => {
  for (const list of [Observances.FIXED_BIKRAM, Observances.FIXED_GREGORIAN]) {
    for (let i = 1; i < list.length; i += 1) {
      const before = list[i - 1].month * 100 + list[i - 1].day;
      assert.ok(list[i].month * 100 + list[i].day > before,
        `${list[i].english} is out of order`);
    }
  }
});

// The government list quotes these in Bikram Sambat, so they double as a check that
// the calendar table lands the Gregorian anchors on the right Bikram day.
test("Gregorian-anchored holidays fall where the official list says", () => {
  const expected = [
    ["Labour Day", 2083, 1, 18],
    ["Christmas", 2083, 9, 10],
    ["International Women's Day", 2083, 11, 24],
  ];
  for (const [name, year, month, day] of expected) {
    const entries = Observances.forDate(
      { year, month, day }, plain(Bikram.toGregorian(year, month, day)), 0);
    assert.ok(entries.some((entry) => entry.english === name),
      `${name} is not on BS ${year}-${month}-${day}`);
  }
});

test("Constitution Day starts with the constitution", () => {
  // Promulgated 20 September 2015, which is 3 Ashwin 2072.
  assert.deepEqual(plain(Bikram.fromGregorian(2015, 9, 20)), { year: 2072, month: 6, day: 3 });
  const before = Observances.forDate({ year: 2071, month: 6, day: 3 }, null, 0);
  const after = Observances.forDate({ year: 2072, month: 6, day: 3 }, null, 0);
  assert.ok(!before.some((entry) => entry.english === "Constitution Day"));
  assert.ok(after.some((entry) => entry.english === "Constitution Day"));
});

test("a year carries the expected spread of fixed days", () => {
  let holidays = 0;
  let observances = 0;
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= Bikram.monthLength(2083, month); day += 1) {
      for (const entry of Observances.forDate(
        { year: 2083, month, day }, plain(Bikram.toGregorian(2083, month, day)), 0)) {
        if (entry.kind === Observances.HOLIDAY) holidays += 1;
        else observances += 1;
      }
    }
  }
  assert.equal(holidays, Observances.FIXED_BIKRAM.filter((e) => e.kind === Observances.HOLIDAY).length
    + Observances.FIXED_GREGORIAN.filter((e) => e.kind === Observances.HOLIDAY).length);
  assert.equal(observances, Observances.FIXED_BIKRAM.filter((e) => e.kind === Observances.OBSERVANCE).length
    + Observances.FIXED_GREGORIAN.filter((e) => e.kind === Observances.OBSERVANCE).length);
});
