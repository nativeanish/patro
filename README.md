# Patro

The Nepali calendar in the [Omarchy](https://omarchy.org/) bar. Today's Bikram
Sambat date, a month view in Devanagari, the tithi, and conversion both ways
between BS and AD.

![The Patro panel](preview.png)

Everything is computed on your machine. No network calls, no helper process, no
background service.

## Install

```bash
omarchy plugin add https://github.com/yogeshojha/patro.git --enable
```

Devanagari comes from `noto-fonts`, which Omarchy already installs. There is
nothing else to set up.

A keybind, in `~/.config/hypr/bindings.conf`:

```
bindd = SUPER SHIFT, C, Patro, exec, omarchy-shell yogeshojha.patro toggle
```

## Keys

| Key | |
|---|---|
| `←` `→` | move a day |
| `↑` `↓` | move a week |
| `[` `]` or `h` `l` | previous / next month |
| `{` `}` or `k` `j` | previous / next year |
| `t` | back to today |
| `g` or `/` | jump to the converter |
| `Enter` | copy the selected date |
| `Esc` | leave the converter, then close |

In the bar: left click opens the month view, right click walks the label
formats, middle click copies today's date.

## Converting a date

Press `g`, type a date, press Enter. Either field takes `2083-05-01`,
`2083/5/1`, or `२०८३-०५-०१` — the other field and the month view follow.

## Settings

`Setup > Plugins`.

| | |
|---|---|
| Language | Nepali (Devanagari) or English, default Nepali |
| Numerals | `२०८३` or `2083`, default Devanagari |
| Bar format | Full, Compact, Numeric, With Gregorian |
| Show weekday | weekday in front of the bar date, default on |
| Week starts on | Sunday or Monday, default Sunday |
| Show Gregorian dates | the AD day under each day, default on |
| Show tithi | the lunar day and its markers, default on |
| Font family | empty inherits the bar font |

Saturday is drawn as the weekly holiday, the way a printed patro sets it.

## What it covers

**BS 2000 to 2090**, which is 14 April 1943 to 12 April 2034. Outside that the
panel refuses to move rather than inventing a date.

Bikram Sambat month lengths are decided by the moment the sun crosses into each
zodiac sign, so they are published year by year rather than derived from a rule.
That means the table has three tiers, and the plugin does not blur them:

| Years | |
|---|---|
| 2000–2080 | confirmed day by day against a published patro |
| 2081–2083 | past that patro, but inside what the Panchanga Nirnayak Samiti has published |
| 2084–2090 | not yet determined by anyone; the panel says so when you visit one |

The Samiti approves each year a few months ahead, so 2084 should be settled
around Magh 2083. This plugin will be updated when it is.

One known deviation: for Falgun 2055 (February 1999) every library table
disagrees with the scraped patro by a day, and this plugin follows the
libraries. Both agree again at Chaitra.

## Tithi

The tithi is computed, not looked up: it is the 12° step of the moon's
elongation from the sun, read at sunrise in Kathmandu, following Meeus'
*Astronomical Algorithms*. Ekadashi, Purnima and Aunsi are marked in the month
view.

Against the years of a published patro whose data is clean, it agrees on
**99.4%** of days. The rest are days where the tithi turns within an hour of
sunrise, and two almanacs can honestly round those the other way. If your patro
disagrees on such a day, that is why.

Sunrise is always Kathmandu's, wherever the machine is, because that is how a
patro is reckoned.

## Festivals

Not yet. Fixed-date holidays are here — Nepali New Year, Loktantra Diwas,
Republic Day, Prithvi Jayanti, Maghe Sankranti, Prajatantra Diwas, Labour Day,
and a few observances — because those need no panchanga reasoning.

Dashain, Tihar, Teej and the rest do. Which day a festival lands on depends on
which part of the day its tithi has to be in force: Vijaya Dashami goes by the
tithi at *aparahna*, not at sunrise, and a rule that ignores that puts Dashain
Tika on the wrong day about a third of the time. Those are coming in a later
release, with each rule checked against a published patro before it ships.

The three that commemorate a dated event stop before it: Prajatantra Diwas from
2007, Loktantra Diwas from 2063, Republic Day from 2065. The rest are drawn for
every year in range, which is right for the religious ones and approximate for
Civil Service Day and Labour Day, whose first observance I could not pin down.

## Credits

The month-length table was not authored by hand. It was merged from seven
independently maintained implementations and checked, day by day, against a
scrape of a published patro. Thanks to all of them:

| Project | Licence |
|---|---|
| [the-value-crew/nepali-calendar-api](https://github.com/the-value-crew/nepali-calendar-api) — patro data, used here as ground truth | not stated |
| [opensource-nepal/node-nepali-datetime](https://github.com/opensource-nepal/node-nepali-datetime) | GPL-3.0 |
| [medic/bikram-sambat](https://github.com/medic/bikram-sambat) | Apache-2.0 |
| [amitgaru/nepali-datetime](https://github.com/amitgaru/nepali-datetime) | Apache-2.0 |
| [ashok095/bikram-sambat](https://github.com/ashok095/bikram-sambat) | not stated |
| [anishbhimgc/django-bikram-sambat](https://github.com/anishbhimgc/django-bikram-sambat) | MIT |
| [sharingapples/nepali-date](https://github.com/sharingapples/nepali-date) | not stated |

Only the month lengths were taken — the numbers themselves, which come from the
Panchanga the Nepal Panchanga Nirnayak Samiti publishes. No code was copied from
any of them. `tools/sources.json` records what each project supplies and
`tools/build-table.js` shows exactly how the merge resolves every disagreement.

The astronomy follows Jean Meeus, *Astronomical Algorithms*, 2nd edition,
chapters 25 and 47.

## Development

```bash
node --test tests/*.test.js          # 72 tests, no dependencies
node tools/build-table.js --check    # the table matches its sources
node tools/build-table.js            # regenerate it after editing sources.json
qmllint -I <import-root> *.qml
omarchy plugin validate .
```

`Bikram.js` is the calendar arithmetic, `Astro.js` the sun and moon, `Nepali.js`
the names and formatting, `Observances.js` the marked days, `CalendarData.js`
the generated table. `BarWidget.qml` is the bar item, `Panel.qml` the month
view, `DayCell.qml` one day, `ConverterView.qml` the two fields.

`tests/harness.js` loads the QML JavaScript modules under node by stripping
`.pragma library` and resolving `.import` by hand, so the same files the shell
runs are the ones under test.

Saving under `~/.config/omarchy/plugins/` is supposed to reload the plugin, but
a stale compile is cached often enough that it is not worth trusting. Run
`omarchy-restart-shell` after editing and you will save yourself an hour.

## Remove

```bash
omarchy plugin remove yogeshojha.patro
```

MIT
