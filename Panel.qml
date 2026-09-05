import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Bikram.js" as Bikram
import "Astro.js" as Astro
import "Nepali.js" as Nepali
import "Observances.js" as Observances

// The month view: today, Bikram Sambat / Gregorian month view, and year progress.
Panel {
  id: root
  moduleName: "io.github.nativeanish.patro"
  ipcTarget: "io.github.nativeanish.patro"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property date today: new Date()
  property string calendarMode: "BS" // "BS" or "AD"

  readonly property var barIdentity: hostWidget || root

  readonly property string language: Nepali.normalizeLanguage(setting("language", "Nepali"))
  readonly property string numerals: Nepali.normalizeNumerals(setting("numerals", "Devanagari"))
  readonly property int weekStart: Nepali.normalizeWeekStart(setting("weekStart", "Sunday"))
  readonly property bool showGregorian: setting("showGregorian", true) === true
  readonly property bool showTithi: setting("showTithi", true) === true
  readonly property string configuredFont: String(setting("fontFamily", ""))

  readonly property var todayBikram: Bikram.today(today)
  readonly property var todayGregorian: ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate()
  })
  readonly property bool inRange: todayBikram !== null
  readonly property int todayWeekday: inRange
    ? Bikram.weekdayOf(todayBikram.year, todayBikram.month, todayBikram.day)
    : today.getDay()

  property int viewYear: inRange ? todayBikram.year : Bikram.firstYear()
  property int viewMonth: inRange ? todayBikram.month : 1
  property int selectedDay: inRange ? todayBikram.day : 1

  property int adViewYear: todayGregorian.year
  property int adViewMonth: todayGregorian.month
  property int adSelectedDay: todayGregorian.day

  readonly property var bsWeeks: Bikram.monthGrid(viewYear, viewMonth, weekStart)
  readonly property var adWeeks: Bikram.gregorianMonthGrid(adViewYear, adViewMonth, weekStart)
  readonly property var weeks: calendarMode === "BS" ? bsWeeks : adWeeks
  readonly property var weekdays: Nepali.weekdayOrder(weekStart)
  readonly property var marks: Observances.forMonth(weeks, function (cell) {
    return root.showTithi && cell.gregorian ? Astro.tithiForDate(
      cell.gregorian.year, cell.gregorian.month, cell.gregorian.day) : 0
  })

  readonly property var selected: ({ year: viewYear, month: viewMonth, day: selectedDay })
  readonly property var selectedGregorian: Bikram.toGregorian(viewYear, viewMonth, selectedDay)
  readonly property int selectedWeekday: Bikram.weekdayOf(viewYear, viewMonth, selectedDay)

  readonly property var activeBikram: calendarMode === "BS"
    ? selected
    : Bikram.fromGregorian(adViewYear, adViewMonth, adSelectedDay)
  readonly property var activeGregorian: calendarMode === "BS"
    ? selectedGregorian
    : ({ year: adViewYear, month: adViewMonth, day: adSelectedDay })
  readonly property int activeWeekday: calendarMode === "BS"
    ? selectedWeekday
    : Bikram.gregorianWeekdayOf(adViewYear, adViewMonth, adSelectedDay)
  readonly property int activeTithi: activeGregorian
    ? Astro.tithiForDate(activeGregorian.year, activeGregorian.month, activeGregorian.day) : 0
  readonly property var selectedObservances: marks[calendarMode === "BS" ? selectedDay : adSelectedDay] || []
  readonly property var selectedNamed: showTithi
    ? Observances.named(selectedObservances) : selectedObservances

  readonly property string monthHeading: calendarMode === "BS"
    ? Nepali.monthTitle(viewYear, viewMonth, { language: language, numerals: numerals })
    : Nepali.gregorianMonthTitle(adViewYear, adViewMonth, { language: language, numerals: numerals })
  readonly property string monthSpan: calendarMode === "BS"
    ? Nepali.gregorianSpan(
        Bikram.toGregorian(viewYear, viewMonth, 1),
        Bikram.toGregorian(viewYear, viewMonth, Bikram.monthLength(viewYear, viewMonth)))
    : Nepali.bikramSpan(
        Bikram.fromGregorian(adViewYear, adViewMonth, 1),
        Bikram.fromGregorian(adViewYear, adViewMonth, Bikram.gregorianMonthLength(adViewYear, adViewMonth)),
        { language: language, numerals: numerals })
  readonly property string confidence: calendarMode === "BS"
    ? Bikram.confidence(viewYear)
    : (activeBikram ? Bikram.confidence(activeBikram.year) : "attested")

  readonly property bool viewingToday: calendarMode === "BS"
    ? (inRange && viewYear === todayBikram.year && viewMonth === todayBikram.month)
    : (adViewYear === todayGregorian.year && adViewMonth === todayGregorian.month)
  readonly property bool canGoBack: calendarMode === "BS"
    ? (viewYear > Bikram.firstYear() || viewMonth > 1)
    : (adViewYear > 1944 || adViewMonth > 1)
  readonly property bool canGoForward: calendarMode === "BS"
    ? (viewYear < Bikram.lastYear() || viewMonth < 12)
    : (adViewYear < 2033 || adViewMonth < 12)

  readonly property var bsProgress: inRange
    ? Bikram.yearProgress(todayBikram.year, todayBikram.month, todayBikram.day)
    : ({ total: 365, passed: 0, remaining: 0, fraction: 0, percent: 0 })
  readonly property var adProgress: Bikram.gregorianYearProgress(
    todayGregorian.year, todayGregorian.month, todayGregorian.day)

  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property color mutedForeground: Util.alpha(contentForeground, 0.72)
  readonly property color faintForeground: Util.alpha(contentForeground, 0.50)
  readonly property string contentFont: configuredFont !== ""
    ? configuredFont : (bar ? bar.fontFamily : Style.font.family)

  readonly property int cellWidth: Style.space(54)
  readonly property int cellHeight: showGregorian ? Style.space(46) : Style.space(36)
  readonly property int cellSpacing: Style.space(2)
  readonly property int gridWidth: cellWidth * 7 + cellSpacing * 6

  function refresh() {
    today = new Date()
    goToToday()
  }

  function goToToday() {
    if (inRange) {
      viewYear = todayBikram.year
      viewMonth = todayBikram.month
      selectedDay = todayBikram.day
    }
    adViewYear = todayGregorian.year
    adViewMonth = todayGregorian.month
    adSelectedDay = todayGregorian.day
  }

  function moveMonth(delta) {
    if (calendarMode === "BS") {
      var next = Bikram.addMonths(viewYear, viewMonth, delta)
      if (next.year === viewYear && next.month === viewMonth) return
      viewYear = next.year
      viewMonth = next.month
      selectedDay = Bikram.clampDay(viewYear, viewMonth, selectedDay)
      var g = Bikram.toGregorian(viewYear, viewMonth, selectedDay)
      if (g) {
        adViewYear = g.year
        adViewMonth = g.month
        adSelectedDay = g.day
      }
    } else {
      var nextG = Bikram.addGregorianMonths(adViewYear, adViewMonth, delta)
      adViewYear = nextG.year
      adViewMonth = nextG.month
      var maxDay = Bikram.gregorianMonthLength(adViewYear, adViewMonth)
      adSelectedDay = Math.min(Math.max(adSelectedDay, 1), maxDay)
      var b = Bikram.fromGregorian(adViewYear, adViewMonth, adSelectedDay)
      if (b) {
        viewYear = b.year
        viewMonth = b.month
        selectedDay = b.day
      }
    }
  }

  function moveYear(delta) {
    moveMonth(delta * 12)
  }

  function moveDay(delta) {
    if (calendarMode === "BS") {
      var next = Bikram.addDays(viewYear, viewMonth, selectedDay, delta)
      if (next) showDate(next.year, next.month, next.day)
    } else {
      var nextG = Bikram.addGregorianDays(adViewYear, adViewMonth, adSelectedDay, delta)
      if (nextG) showGregorianDate(nextG.year, nextG.month, nextG.day)
    }
  }

  function showDate(year, month, day) {
    if (!Bikram.isValid(year, month, day)) return
    viewYear = year
    viewMonth = month
    selectedDay = day
    var g = Bikram.toGregorian(year, month, day)
    if (g) {
      adViewYear = g.year
      adViewMonth = g.month
      adSelectedDay = g.day
    }
  }

  function showGregorianDate(year, month, day) {
    if (month < 1 || month > 12 || day < 1 || day > Bikram.gregorianMonthLength(year, month)) return
    adViewYear = year
    adViewMonth = month
    adSelectedDay = day
    var b = Bikram.fromGregorian(year, month, day)
    if (b) {
      viewYear = b.year
      viewMonth = b.month
      selectedDay = b.day
    }
  }

  function copySelected() {
    if (activeBikram) {
      Quickshell.clipboardText = Nepali.formatDate(activeBikram, {
        language: language,
        numerals: numerals,
        format: "Full",
        showWeekday: true,
        weekday: activeWeekday
      }) + (activeGregorian
        ? " · " + activeGregorian.day + " "
          + Nepali.GREGORIAN_SHORT[activeGregorian.month - 1] + " "
          + activeGregorian.year
        : "")
    }
  }

  function open() {
    refresh()
    root.controller.show()
    // Reopening an already-open panel does not re-prime focus on its own.
    Qt.callLater(function () { if (root.opened) keyCatcher.forceActiveFocus() })
  }

  function close() { root.controller.hide() }
  function toggle() { root.opened ? close() : open() }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  SystemClock {
    id: clock
    precision: SystemClock.Minutes
    onDateChanged: {
      if (date.getFullYear() === root.today.getFullYear()
          && date.getMonth() === root.today.getMonth()
          && date.getDate() === root.today.getDate()) return
      var followToday = root.viewingToday
      root.today = date
      if (followToday) root.goToToday()
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(root.gridWidth + panel.padding * 2 + Style.space(18))
    contentHeight: panel.fittedContentHeight(contentColumn.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      blocked: false
      onMoveRequested: function(dx, dy) {
        if (dx !== 0) root.moveDay(dx)
        if (dy !== 0) root.moveDay(dy * 7)
      }
      onActivateRequested: root.copySelected()
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        if (text === "[" || text === "h") root.moveMonth(-1)
        else if (text === "]" || text === "l") root.moveMonth(1)
        else if (text === "{" || text === "k") root.moveYear(-1)
        else if (text === "}" || text === "j") root.moveYear(1)
        else if (text === "t" || text === "T") root.goToToday()
        else if (text === "c" || text === "C") root.copySelected()
        else if (text === "b" || text === "B") root.calendarMode = "BS"
        else if (text === "a" || text === "A") root.calendarMode = "AD"
      }

      Flickable {
        anchors.fill: parent
        contentWidth: contentColumn.width
        contentHeight: contentColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height || contentWidth > width

        Column {
          id: contentColumn
          width: Math.max(keyCatcher.width, root.gridWidth)
          spacing: Style.space(10)

          Column {
            width: parent.width
            spacing: Style.space(2)

            Text {
              width: parent.width
              text: root.inRange
                ? Nepali.formatDate(root.todayBikram, {
                    language: root.language,
                    numerals: root.numerals,
                    format: "Full"
                  })
                : qsTr("Outside the calendar's range")
              color: root.contentForeground
              font.family: root.contentFont
              font.pixelSize: Math.round(Style.font.displayLarge * 1.4)
              font.bold: true
              horizontalAlignment: Text.AlignHCenter
            }

            Text {
              width: parent.width
              visible: root.inRange
              text: root.inRange
                ? Nepali.weekdayName(root.todayWeekday, root.language)
                  + " · " + Qt.formatDate(root.today, "d MMMM yyyy")
                : ""
              color: root.mutedForeground
              font.family: root.contentFont
              font.pixelSize: Style.font.subtitle
              horizontalAlignment: Text.AlignHCenter
            }
          }

          PanelSeparator {
            foreground: root.contentForeground
            strength: 0.20
          }

          // BS / AD Switcher
          Row {
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: Style.space(6)

            Repeater {
              model: ["BS", "AD"]

              Rectangle {
                required property string modelData
                readonly property bool active: root.calendarMode === modelData
                width: Style.space(64)
                height: Style.space(26)
                radius: Style.cornerRadius
                color: active
                  ? Util.alpha(Color.accent, 0.24)
                  : (hover.hovered ? Util.alpha(root.contentForeground, 0.08) : "transparent")
                border.width: active ? Style.spacing.hairline : 0
                border.color: Color.accent

                Text {
                  anchors.centerIn: parent
                  text: modelData
                  color: active ? Color.accent : root.mutedForeground
                  font.family: root.contentFont
                  font.pixelSize: Style.font.bodySmall
                  font.bold: active
                }

                HoverHandler {
                  id: hover
                  cursorShape: Qt.PointingHandCursor
                }

                TapHandler {
                  onTapped: {
                    if (root.calendarMode !== modelData) {
                      root.calendarMode = modelData
                    }
                  }
                }
              }
            }
          }

          Item {
            width: parent.width
            height: Style.space(34)

            PanelActionButton {
              anchors.left: parent.left
              anchors.verticalCenter: parent.verticalCenter
              iconText: "󰅁"
              tooltipText: qsTr("Previous month")
              foreground: root.contentForeground
              fontFamily: Style.font.family
              size: Style.space(28)
              enabled: root.canGoBack
              onClicked: root.moveMonth(-1)
            }

            // Centred on the panel, so the Today button cannot shift it.
            Column {
              anchors.centerIn: parent
              spacing: 0

              Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: root.monthHeading
                color: root.contentForeground
                font.family: root.contentFont
                font.pixelSize: Style.font.heading
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
              }

              Text {
                anchors.horizontalCenter: parent.horizontalCenter
                text: root.monthSpan
                color: root.faintForeground
                font.family: root.contentFont
                font.pixelSize: Style.font.caption
                horizontalAlignment: Text.AlignHCenter
              }
            }

            Button {
              visible: !root.viewingToday && root.inRange
              anchors.right: parent.right
              anchors.rightMargin: Style.space(34)
              anchors.verticalCenter: parent.verticalCenter
              text: qsTr("Today")
              iconText: "󰃭"
              tooltipText: qsTr("Back to today")
              foreground: root.contentForeground
              fontFamily: root.contentFont
              fontSize: Style.font.bodySmall
              iconSize: Style.font.iconSmall
              bordered: true
              horizontalPadding: Style.space(7)
              verticalPadding: Style.space(3)
              onClicked: root.goToToday()
            }

            PanelActionButton {
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              iconText: "󰅂"
              tooltipText: qsTr("Next month")
              foreground: root.contentForeground
              fontFamily: Style.font.family
              size: Style.space(28)
              enabled: root.canGoForward
              onClicked: root.moveMonth(1)
            }
          }

          Grid {
            width: root.gridWidth
            anchors.horizontalCenter: parent.horizontalCenter
            columns: 7
            columnSpacing: root.cellSpacing
            rowSpacing: root.cellSpacing

            Repeater {
              model: root.weekdays

              Text {
                required property int modelData
                width: root.cellWidth
                height: Style.space(22)
                text: Nepali.weekdayShort(modelData, root.language)
                color: Nepali.isWeeklyHoliday(modelData) ? Color.urgent : root.mutedForeground
                font.family: root.contentFont
                font.pixelSize: Style.font.bodySmall
                font.bold: true
                fontSizeMode: Text.Fit
                minimumPixelSize: Style.font.caption
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
              }
            }

            Repeater {
              model: root.weeks.length * 7

              DayCell {
                required property int index
                readonly property var cellData: root.weeks[Math.floor(index / 7)][index % 7]

                width: root.cellWidth
                height: root.cellHeight
                mode: root.calendarMode
                cell: cellData
                observances: cellData ? (root.marks[cellData.day] || []) : []
                selected: cellData !== null && cellData.day === (root.calendarMode === "BS" ? root.selectedDay : root.adSelectedDay)
                today: cellData !== null && (root.calendarMode === "BS"
                  ? (root.inRange
                     && cellData.year === root.todayBikram.year
                     && cellData.month === root.todayBikram.month
                     && cellData.day === root.todayBikram.day)
                  : (cellData.year === root.todayGregorian.year
                     && cellData.month === root.todayGregorian.month
                     && cellData.day === root.todayGregorian.day))
                showGregorian: root.showGregorian
                numerals: root.numerals
                language: root.language
                fontFamily: root.contentFont
                foreground: root.contentForeground
                muted: root.faintForeground
                onClicked: {
                  if (root.calendarMode === "BS") {
                    root.selectedDay = cellData.day
                    if (cellData.gregorian) {
                      root.adViewYear = cellData.gregorian.year
                      root.adViewMonth = cellData.gregorian.month
                      root.adSelectedDay = cellData.gregorian.day
                    }
                  } else {
                    root.adSelectedDay = cellData.day
                    if (cellData.bikram) {
                      root.viewYear = cellData.bikram.year
                      root.viewMonth = cellData.bikram.month
                      root.selectedDay = cellData.bikram.day
                    }
                  }
                }
              }
            }
          }

          PanelSeparator {
            foreground: root.contentForeground
            strength: 0.20
          }

          Column {
            width: parent.width
            spacing: Style.space(2)

            Text {
              width: parent.width
              text: (root.activeBikram
                ? Nepali.formatDate(root.activeBikram, {
                    language: root.language,
                    numerals: root.numerals,
                    format: "Full",
                    showWeekday: true,
                    weekday: root.activeWeekday
                  })
                : "")
                + (root.activeGregorian
                  ? " · " + root.activeGregorian.day + " "
                    + Nepali.GREGORIAN_SHORT[root.activeGregorian.month - 1] + " "
                    + root.activeGregorian.year
                  : "")
              color: root.contentForeground
              font.family: root.contentFont
              font.pixelSize: Style.font.body
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
            }

            Text {
              width: parent.width
              visible: root.showTithi && root.activeTithi > 0
              text: Nepali.tithiLabel(root.activeTithi,
                Astro.pakshaOf(root.activeTithi), root.language)
              color: root.mutedForeground
              font.family: root.contentFont
              font.pixelSize: Style.font.bodySmall
              horizontalAlignment: Text.AlignHCenter
            }

            Text {
              width: parent.width
              visible: root.selectedNamed.length > 0
              text: Observances.summary(root.selectedNamed, root.language)
              color: Observances.isHoliday(root.selectedNamed)
                ? Color.urgent : root.contentForeground
              font.family: root.contentFont
              font.pixelSize: Style.font.bodySmall
              font.bold: true
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
            }
          }

          PanelSeparator {
            foreground: root.contentForeground
            strength: 0.20
          }

          Column {
            anchors.horizontalCenter: parent.horizontalCenter
            width: root.gridWidth
            spacing: Style.space(6)

            YearProgress {
              width: parent.width
              label: String(root.todayBikram ? root.todayBikram.year : 2083)
              totalDays: root.bsProgress.total
              passedDays: root.bsProgress.passed
              remainingDays: root.bsProgress.remaining
              valueText: Nepali.daysRemainingLabel(root.bsProgress.remaining, root.bsProgress.percent, "English", "Latin")
              tooltipText: (root.todayBikram ? root.todayBikram.year : "2083") + " BS: "
                + root.bsProgress.remaining + " " + qsTr("days left") + " (" + root.bsProgress.passed + "/" + root.bsProgress.total + ")"
              foreground: root.contentForeground
              accent: Color.accent
              muted: root.mutedForeground
              fontFamily: root.contentFont
            }

            YearProgress {
              width: parent.width
              label: String(root.todayGregorian.year)
              totalDays: root.adProgress.total
              passedDays: root.adProgress.passed
              remainingDays: root.adProgress.remaining
              valueText: Nepali.daysRemainingLabel(root.adProgress.remaining, root.adProgress.percent, "English", "Latin")
              tooltipText: root.todayGregorian.year + " AD: "
                + root.adProgress.remaining + " " + qsTr("days left") + " (" + root.adProgress.passed + "/" + root.adProgress.total + ")"
              foreground: root.contentForeground
              accent: Color.accent
              muted: root.mutedForeground
              fontFamily: root.contentFont
            }
          }

          Text {
            width: parent.width
            visible: root.confidence === "provisional"
            text: Nepali.provisionalNotice(root.calendarMode === "BS" ? root.viewYear : (root.activeBikram ? root.activeBikram.year : root.viewYear), {
              language: root.language, numerals: root.numerals
            })
            color: root.faintForeground
            font.family: root.contentFont
            font.pixelSize: Style.font.caption
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
          }
        }
      }
    }
  }
}
