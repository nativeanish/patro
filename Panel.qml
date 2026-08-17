import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Bikram.js" as Bikram
import "Astro.js" as Astro
import "Nepali.js" as Nepali
import "Observances.js" as Observances

// The month view: today, a Bikram Sambat month, and a converter.
Panel {
  id: root
  moduleName: "yogeshojha.patro"
  ipcTarget: "yogeshojha.patro"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property date today: new Date()

  readonly property var barIdentity: hostWidget || root

  readonly property string language: Nepali.normalizeLanguage(setting("language", "Nepali"))
  readonly property string numerals: Nepali.normalizeNumerals(setting("numerals", "Devanagari"))
  readonly property int weekStart: Nepali.normalizeWeekStart(setting("weekStart", "Sunday"))
  readonly property bool showGregorian: setting("showGregorian", true) === true
  readonly property bool showTithi: setting("showTithi", true) === true
  readonly property string configuredFont: String(setting("fontFamily", ""))

  readonly property var todayBikram: Bikram.today(today)
  readonly property bool inRange: todayBikram !== null
  readonly property int todayWeekday: inRange
    ? Bikram.weekdayOf(todayBikram.year, todayBikram.month, todayBikram.day) : -1

  property int viewYear: inRange ? todayBikram.year : Bikram.firstYear()
  property int viewMonth: inRange ? todayBikram.month : 1
  property int selectedDay: inRange ? todayBikram.day : 1

  readonly property var weeks: Bikram.monthGrid(viewYear, viewMonth, weekStart)
  readonly property var weekdays: Nepali.weekdayOrder(weekStart)
  readonly property var marks: Observances.forMonth(weeks, function (cell) {
    return root.showTithi ? Astro.tithiForDate(
      cell.gregorian.year, cell.gregorian.month, cell.gregorian.day) : 0
  })

  readonly property var selected: ({ year: viewYear, month: viewMonth, day: selectedDay })
  readonly property var selectedGregorian: Bikram.toGregorian(viewYear, viewMonth, selectedDay)
  readonly property int selectedWeekday: Bikram.weekdayOf(viewYear, viewMonth, selectedDay)
  readonly property int selectedTithi: selectedGregorian
    ? Astro.tithiForDate(selectedGregorian.year, selectedGregorian.month, selectedGregorian.day) : 0
  readonly property var selectedObservances: marks[selectedDay] || []
  readonly property var selectedNamed: showTithi
    ? Observances.named(selectedObservances) : selectedObservances

  readonly property string monthHeading: Nepali.monthTitle(viewYear, viewMonth, {
    language: language, numerals: numerals
  })
  readonly property string monthSpan: Nepali.gregorianSpan(
    Bikram.toGregorian(viewYear, viewMonth, 1),
    Bikram.toGregorian(viewYear, viewMonth, Bikram.monthLength(viewYear, viewMonth)))
  readonly property string confidence: Bikram.confidence(viewYear)

  readonly property bool viewingToday: inRange
    && viewYear === todayBikram.year && viewMonth === todayBikram.month
  readonly property bool canGoBack: viewYear > Bikram.firstYear() || viewMonth > 1
  readonly property bool canGoForward: viewYear < Bikram.lastYear() || viewMonth < 12

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
    if (!inRange) return
    viewYear = todayBikram.year
    viewMonth = todayBikram.month
    selectedDay = todayBikram.day
  }

  function moveMonth(delta) {
    var next = Bikram.addMonths(viewYear, viewMonth, delta)
    if (next.year === viewYear && next.month === viewMonth) return
    viewYear = next.year
    viewMonth = next.month
    selectedDay = Bikram.clampDay(viewYear, viewMonth, selectedDay)
  }

  function moveYear(delta) {
    moveMonth(delta * 12)
  }

  function moveDay(delta) {
    var next = Bikram.addDays(viewYear, viewMonth, selectedDay, delta)
    if (next) showDate(next.year, next.month, next.day)
  }

  function showDate(year, month, day) {
    if (!Bikram.isValid(year, month, day)) return
    viewYear = year
    viewMonth = month
    selectedDay = day
  }

  function copySelected() {
    Quickshell.clipboardText = Nepali.formatDate(selected, {
      language: language,
      numerals: numerals,
      format: "Full",
      showWeekday: true,
      weekday: selectedWeekday
    })
  }

  function open() {
    refresh()
    converter.reset()
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
      blocked: converter.editing
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
        else if (text === "g" || text === "G" || text === "/") converter.focusBikram()
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
                cell: cellData
                observances: cellData ? (root.marks[cellData.day] || []) : []
                selected: cellData !== null && cellData.day === root.selectedDay
                today: cellData !== null && root.inRange
                  && cellData.year === root.todayBikram.year
                  && cellData.month === root.todayBikram.month
                  && cellData.day === root.todayBikram.day
                showGregorian: root.showGregorian
                numerals: root.numerals
                language: root.language
                fontFamily: root.contentFont
                foreground: root.contentForeground
                muted: root.faintForeground
                onClicked: {
                  root.selectedDay = cellData.day
                  if (converter.editing) converter.release()
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
              text: Nepali.formatDate(root.selected, {
                  language: root.language,
                  numerals: root.numerals,
                  format: "Full",
                  showWeekday: true,
                  weekday: root.selectedWeekday
                })
                + (root.selectedGregorian
                  ? " · " + root.selectedGregorian.day + " "
                    + Nepali.GREGORIAN_SHORT[root.selectedGregorian.month - 1] + " "
                    + root.selectedGregorian.year
                  : "")
              color: root.contentForeground
              font.family: root.contentFont
              font.pixelSize: Style.font.body
              horizontalAlignment: Text.AlignHCenter
              wrapMode: Text.WordWrap
            }

            Text {
              width: parent.width
              visible: root.showTithi && root.selectedTithi > 0
              text: Nepali.tithiLabel(root.selectedTithi,
                Astro.pakshaOf(root.selectedTithi), root.language)
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

          ConverterView {
            id: converter
            anchors.horizontalCenter: parent.horizontalCenter
            width: root.gridWidth
            releaseTarget: keyCatcher
            bikram: root.selected
            language: root.language
            numerals: root.numerals
            fontFamily: root.contentFont
            foreground: root.contentForeground
            muted: root.faintForeground
            onPicked: function(year, month, day) { root.showDate(year, month, day) }
          }

          Text {
            width: parent.width
            visible: root.confidence === "provisional"
            text: Nepali.provisionalNotice(root.viewYear, {
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
