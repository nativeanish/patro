"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { load, readJson } = require("./harness.js");

const Astro = load("Astro.js");
const patro = readJson("tests", "fixtures", "tithi.json");

function julianCenturies(jd) {
  return (jd - 2451545) / 36525;
}

// The patro names a tithi without its paksha.
function labelOf(tithi) {
  if (tithi === 15 || tithi === 30) return tithi;
  return Astro.tithiInPaksha(tithi);
}

function solveElongation(target, guessMs) {
  const offset = (ms) => {
    let delta = Astro.elongationAt(ms) - target;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  };
  let low = guessMs - 3 * 86400000;
  let high = guessMs + 3 * 86400000;
  for (let i = 0; i < 60; i += 1) {
    const mid = low + (high - low) / 2;
    if (offset(low) * offset(mid) <= 0) high = mid;
    else low = mid;
  }
  return low + (high - low) / 2;
}

test("solar longitude matches Meeus example 25.b", () => {
  const t = julianCenturies(2448908.5);
  assert.ok(Math.abs(t - -0.072183436) < 1e-9);
  assert.ok(Math.abs(Astro.solarLongitude(t) - 199.90987) < 1e-5,
    `got ${Astro.solarLongitude(t)}`);
});

test("lunar longitude matches Meeus example 47.a", () => {
  const t = julianCenturies(2448724.5);
  assert.ok(Math.abs(t - -0.077221081451) < 1e-12);
  assert.ok(Math.abs(Astro.lunarLongitude(t) - 133.162655) < 1e-5,
    `got ${Astro.lunarLongitude(t)}`);
});

test("new and full moons land on the published instants", () => {
  const lunations = [
    { name: "full moon Aug 2010", target: 180, expected: Date.UTC(2010, 7, 24, 17, 5) },
    { name: "new moon Sep 2010", target: 0, expected: Date.UTC(2010, 8, 8, 10, 30) },
    { name: "full moon Jan 2024", target: 180, expected: Date.UTC(2024, 0, 25, 17, 54) },
    { name: "new moon Apr 2024", target: 0, expected: Date.UTC(2024, 3, 8, 18, 21) },
  ];
  for (const { name, target, expected } of lunations) {
    const computed = solveElongation(target, expected);
    const drift = Math.abs(computed - expected) / 1000;
    assert.ok(drift < 90, `${name} is ${drift.toFixed(0)} s out`);
  }
});

test("Kathmandu sunrise falls in the right part of the morning", () => {
  const NPT = 5.75 * 3600000;
  const samples = [
    { date: [2026, 6, 21], earliest: "05:00", latest: "05:30" },
    { date: [2026, 12, 21], earliest: "06:30", latest: "07:00" },
    { date: [2026, 8, 17], earliest: "05:20", latest: "05:50" },
  ];
  for (const { date, earliest, latest } of samples) {
    const local = new Date(Astro.sunriseUtcMs(date[0], date[1], date[2]) + NPT);
    const clock = local.toISOString().slice(11, 16);
    assert.ok(clock >= earliest && clock <= latest,
      `${date.join("-")} sunrise computed as ${clock} NPT`);
  }
});

test("sunrise advances by roughly a day each day", () => {
  let previous = null;
  for (let day = 1; day <= 28; day += 1) {
    const sunrise = Astro.sunriseUtcMs(2026, 2, day);
    if (previous !== null) {
      const gap = (sunrise - previous) / 3600000;
      assert.ok(gap > 23.9 && gap < 24.1, `gap of ${gap} h before Feb ${day}`);
    }
    previous = sunrise;
  }
});

test("tithi runs 1 to 30 and never jumps illegally", () => {
  let previous = null;
  for (let day = 0; day < 400; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1) + day * 86400000);
    const tithi = Astro.tithiForDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    assert.ok(tithi >= 1 && tithi <= 30, `tithi ${tithi}`);
    if (previous !== null) {
      // A tithi repeats, advances, or is skipped. Nothing else.
      const step = (tithi - previous + 30) % 30;
      assert.ok(step <= 2, `tithi went ${previous} -> ${tithi}`);
    }
    previous = tithi;
  }
});

test("paksha and fortnight position derive from the tithi", () => {
  assert.equal(Astro.pakshaOf(1), "shukla");
  assert.equal(Astro.pakshaOf(15), "shukla");
  assert.equal(Astro.pakshaOf(16), "krishna");
  assert.equal(Astro.pakshaOf(30), "krishna");
  assert.equal(Astro.tithiInPaksha(1), 1);
  assert.equal(Astro.tithiInPaksha(15), 15);
  assert.equal(Astro.tithiInPaksha(16), 1);
  assert.equal(Astro.tithiInPaksha(30), 15);
  assert.ok(Astro.isEkadashi(11) && Astro.isEkadashi(26));
  assert.ok(!Astro.isEkadashi(12) && !Astro.isEkadashi(25));
  assert.ok(Astro.isPurnima(15) && Astro.isAunsi(30));
});

test("today's tithi is the one Hamro Patro published", () => {
  assert.equal(Astro.tithiForDate(2026, 8, 17), 5);
  assert.equal(Astro.pakshaOf(5), "shukla");
});

test("the published patro agrees on at least 98 per cent of days", () => {
  let matched = 0;
  const misses = [];
  for (const [year, month, day, expected] of patro.days) {
    const computed = labelOf(Astro.tithiForDate(year, month, day));
    if (computed === expected) matched += 1;
    else misses.push({ year, month, day, computed, expected });
  }
  const rate = matched / patro.days.length;
  assert.ok(patro.days.length > 1000, "fixture is too small to be worth much");
  assert.ok(rate >= 0.98,
    `agreement fell to ${(rate * 100).toFixed(2)}%; first miss ${JSON.stringify(misses[0])}`);
});

// The scrape prints chaturthi on 11 and 12 November 2022 and omits tritiya. A skip and a
// repeat cannot fall three days apart, so this cell is a scrape error.
const BAD_PATRO_CELL = { year: 2022, month: 11, day: 11 };

test("the patro contradicts itself in exactly one place", () => {
  const sequence = patro.days
    .filter((row) => row[0] === BAD_PATRO_CELL.year && row[1] === BAD_PATRO_CELL.month)
    .map((row) => row[3]);
  const around = sequence.slice(8, 12);
  assert.deepEqual(around, [1, 2, 4, 4], "the pinned scrape error has changed shape");
});

test("what disagreement remains sits next to a tithi boundary", () => {
  for (const [year, month, day, expected] of patro.days) {
    const tithi = Astro.tithiForDate(year, month, day);
    if (labelOf(tithi) === expected) continue;
    if (year === BAD_PATRO_CELL.year && month === BAD_PATRO_CELL.month && day === BAD_PATRO_CELL.day) continue;
    const margin = Astro.minutesToNextTithi(Astro.sunriseUtcMs(year, month, day));
    // Far from a boundary a disagreement would mean the ephemeris is wrong.
    assert.ok(margin < 180 || margin > 24 * 60 - 180,
      `${year}-${month}-${day} disagrees ${margin.toFixed(0)} min from a boundary`);
  }
});
