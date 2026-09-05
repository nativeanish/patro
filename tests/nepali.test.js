"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { load, plain } = require("./harness.js");

const Nepali = load("Nepali.js");
const Bikram = load("Bikram.js");

test("every name table holds a full set", () => {
  for (const script of ["nepali", "english"]) {
    assert.equal(Nepali.MONTHS[script].length, 12);
    assert.equal(Nepali.WEEKDAYS[script].length, 7);
    assert.equal(Nepali.WEEKDAYS_SHORT[script].length, 7);
    assert.equal(Nepali.TITHIS[script].length, 14);
    for (const name of [...Nepali.MONTHS[script], ...Nepali.WEEKDAYS[script],
      ...Nepali.WEEKDAYS_SHORT[script], ...Nepali.TITHIS[script]]) {
      assert.ok(name.length > 0);
    }
  }
});

test("Nepali names are written in Devanagari and English names are not", () => {
  const devanagari = /^[ऀ-ॿ\s]+$/;
  for (const name of [...Nepali.MONTHS.nepali, ...Nepali.WEEKDAYS.nepali, ...Nepali.TITHIS.nepali]) {
    assert.match(name, devanagari, `${name} is not Devanagari`);
  }
  for (const name of [...Nepali.MONTHS.english, ...Nepali.WEEKDAYS.english]) {
    assert.match(name, /^[A-Za-z]+$/, `${name} is not Latin`);
  }
});

test("digits convert to Devanagari and back out again", () => {
  assert.equal(Nepali.numerals(2083, "Devanagari"), "२०८३");
  assert.equal(Nepali.numerals(0, "Devanagari"), "०");
  assert.equal(Nepali.numerals(2083, "Latin"), "2083");
  assert.equal(Nepali.numerals("2083-05-01", "Devanagari"), "२०८३-०५-०१");
  assert.equal(Nepali.numerals("Aug", "Devanagari"), "Aug");
});

test("single digits are padded before they are converted", () => {
  assert.equal(Nepali.padded(5, "Devanagari"), "०५");
  assert.equal(Nepali.padded(12, "Devanagari"), "१२");
  assert.equal(Nepali.padded(5, "Latin"), "05");
});

test("settings fall back rather than propagate a bad value", () => {
  assert.equal(Nepali.normalizeLanguage("English"), "English");
  assert.equal(Nepali.normalizeLanguage("Klingon"), "Nepali");
  assert.equal(Nepali.normalizeLanguage(undefined), "Nepali");
  assert.equal(Nepali.normalizeNumerals("Latin"), "Latin");
  assert.equal(Nepali.normalizeNumerals(null), "Devanagari");
  assert.equal(Nepali.normalizeFormat("Numeric"), "Numeric");
  assert.equal(Nepali.normalizeFormat("Sideways"), "Full");
  assert.equal(Nepali.normalizeWeekStart("Monday"), 1);
  assert.equal(Nepali.normalizeWeekStart("Sunday"), 0);
  assert.equal(Nepali.normalizeWeekStart("Whenever"), 0);
});

test("today reads the way Hamro Patro prints it", () => {
  const parts = plain(Bikram.fromGregorian(2026, 8, 17));
  assert.deepEqual(parts, { year: 2083, month: 5, day: 1 });

  const weekday = Bikram.weekdayOf(2083, 5, 1);
  assert.equal(Nepali.weekdayName(weekday, "Nepali"), "सोमबार");
  assert.equal(Nepali.monthName(5, "Nepali"), "भदौ");
  assert.equal(
    Nepali.formatDate(parts, { showWeekday: true, weekday }),
    "सोमबार, १ भदौ २०८३");
  assert.equal(
    Nepali.formatDate(parts, { language: "English", numerals: "Latin", showWeekday: true, weekday }),
    "Monday, 1 Bhadra 2083");
});

test("each bar format renders its own shape", () => {
  const parts = { year: 2083, month: 5, day: 1 };
  const gregorian = { year: 2026, month: 8, day: 17 };
  assert.equal(Nepali.formatDate(parts, { format: "Full" }), "१ भदौ २०८३");
  assert.equal(Nepali.formatDate(parts, { format: "Compact" }), "१ भदौ");
  assert.equal(Nepali.formatDate(parts, { format: "Numeric" }), "२०८३-०५-०१");
  assert.equal(
    Nepali.formatDate(parts, { format: "With Gregorian", gregorian }),
    "१ भदौ २०८३ · 17 Aug");
  assert.equal(
    Nepali.formatDate({ year: 2083, month: 5, day: 20 }, {
      format: "Time and Date",
      showWeekday: true,
      weekday: 6,
      gregorian: { year: 2026, month: 9, day: 5 },
      time: "15:02"
    }),
    "15:02 | शनिबार | २० भदौ | 5 September");
});

test("a vertical bar drops to short lines that fit its width", () => {
  const parts = { year: 2083, month: 5, day: 1 };
  assert.equal(
    Nepali.formatDate(parts, { showWeekday: true, weekday: 1, vertical: true }),
    "सोम\n२०८३\n०५\n०१");
  assert.equal(
    Nepali.formatDate(parts, { vertical: true }),
    "२०८३\n०५\n०१");
  assert.equal(
    Nepali.formatDate(parts, { vertical: true, format: "Compact" }),
    "०५\n०१");
});

test("no vertical line is wide enough to overflow the bar", () => {
  for (const format of Nepali.FORMATS) {
    for (const language of Nepali.LANGUAGES) {
      for (let month = 1; month <= 12; month += 1) {
        const label = Nepali.formatDate({ year: 2083, month, day: 29 }, {
          format, language, vertical: true, showWeekday: true, weekday: 3,
          gregorian: { year: 2026, month: 8, day: 17 },
        });
        for (const line of label.split("\n")) {
          assert.ok(line.length <= 4, `vertical line ${JSON.stringify(line)} is too wide`);
        }
      }
    }
  }
});

test("a missing or invalid weekday leaves the label alone", () => {
  const parts = { year: 2083, month: 5, day: 1 };
  assert.equal(Nepali.formatDate(parts, { showWeekday: true, weekday: -1 }), "१ भदौ २०८३");
  assert.equal(Nepali.formatDate(parts, { showWeekday: true }), "१ भदौ २०८३");
  assert.equal(Nepali.formatDate(null, {}), "");
});

test("tithi labels carry a paksha except at the full and new moon", () => {
  assert.equal(Nepali.tithiLabel(5, "shukla", "Nepali"), "शुक्ल पञ्चमी");
  assert.equal(Nepali.tithiLabel(26, "krishna", "Nepali"), "कृष्ण एकादशी");
  assert.equal(Nepali.tithiLabel(15, "shukla", "Nepali"), "पूर्णिमा");
  assert.equal(Nepali.tithiLabel(30, "krishna", "Nepali"), "औंसी");
  assert.equal(Nepali.tithiLabel(5, "shukla", "English"), "Shukla Panchami");
});

test("both halves of the fortnight name the same tithi", () => {
  for (let position = 1; position <= 14; position += 1) {
    assert.equal(Nepali.tithiName(position, "Nepali"), Nepali.tithiName(position + 15, "Nepali"));
  }
});

test("a month header names the month and the Gregorian months it crosses", () => {
  assert.equal(Nepali.monthTitle(2083, 5, {}), "भदौ २०८३");
  assert.equal(Nepali.monthTitle(2083, 5, { language: "English", numerals: "Latin" }), "Bhadra 2083");

  const first = plain(Bikram.toGregorian(2083, 5, 1));
  const last = plain(Bikram.toGregorian(2083, 5, Bikram.monthLength(2083, 5)));
  assert.equal(Nepali.gregorianSpan(first, last), "Aug/Sep 2026");
  assert.equal(
    Nepali.gregorianSpan({ year: 2026, month: 12, day: 16 }, { year: 2027, month: 1, day: 14 }),
    "Dec/Jan 2026/2027");
});

test("the weekday header starts on the configured day", () => {
  assert.deepEqual(plain(Nepali.weekdayOrder(0)), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(Nepali.weekdayOrder(1)), [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(Nepali.weekdayShort(Nepali.weekdayOrder(0)[0], "Nepali"), "आइत");
  assert.equal(Nepali.weekdayShort(6, "Nepali"), "शनि");
});

test("Saturday is the weekly holiday", () => {
  assert.ok(Nepali.isWeeklyHoliday(6));
  for (let weekday = 0; weekday <= 5; weekday += 1) {
    assert.ok(!Nepali.isWeeklyHoliday(weekday));
  }
});

test("the provisional notice speaks the reader's language", () => {
  assert.equal(
    Nepali.provisionalNotice(2085, { language: "Nepali", numerals: "Devanagari" }),
    "पञ्चाङ्ग निर्णायक समितिले २०८५ सालको पात्रो अझै निर्धारण गरेको छैन।");
  assert.equal(
    Nepali.provisionalNotice(2085, { language: "English", numerals: "Latin" }),
    "2085 BS is not yet fixed by the Panchanga Nirnayak Samiti.");
  // No stray placeholder survives in either script.
  for (const language of ["Nepali", "English"]) {
    assert.ok(!Nepali.provisionalNotice(2085, { language }).includes("%1"));
  }
});

test("every message exists in both scripts with its placeholders intact", () => {
  for (const [name, entry] of Object.entries(Nepali.MESSAGES)) {
    assert.ok(entry.nepali && entry.english, `${name} is missing a translation`);
    const placeholders = (text) => (text.match(/%\d/g) || []).sort().join("");
    assert.equal(placeholders(entry.nepali), placeholders(entry.english),
      `${name} uses different placeholders in each script`);
    assert.match(entry.nepali, /[ऀ-ॿ]/, `${name} has no Devanagari`);
  }
  assert.equal(Nepali.message("notADate", "Nepali"), "यो मिति होइन।");
  assert.equal(Nepali.message("notADate", "English"), "That is not a date.");
  assert.equal(Nepali.message("nosuchthing", "Nepali"), "");
});

test("Gregorian month titles and Bikram spans format correctly", () => {
  assert.equal(Nepali.gregorianMonthTitle(2026, 9, {}), "September 2026");

  const first = { year: 2083, month: 5, day: 1 };
  const last = { year: 2083, month: 6, day: 1 };
  assert.equal(Nepali.bikramSpan(first, last, {}), "भदौ/असोज २०८३");
  assert.equal(Nepali.bikramSpan(first, last, { language: "English", numerals: "Latin" }), "Bhadra/Ashwin 2083");
});

test("days remaining label formats correctly for both languages", () => {
  assert.equal(Nepali.daysRemainingLabel(220, 40, "Nepali", "Devanagari"), "२२० दिन बाँकी (४०%)");
  assert.equal(Nepali.daysRemainingLabel(220, 40, "English", "Latin"), "220 days left (40%)");
});

