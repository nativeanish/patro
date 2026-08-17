import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Bikram.js" as Bikram
import "Astro.js" as Astro
import "Nepali.js" as Nepali
import "Observances.js" as Observances

// The bar label, and the host for the month view.
BarWidget {
  id: root
  moduleName: "yogeshojha.patro"

  property date displayDate: clock.date

  readonly property string language: Nepali.normalizeLanguage(setting("language", "Nepali"))
  readonly property string numerals: Nepali.normalizeNumerals(setting("numerals", "Devanagari"))
  readonly property string barFormat: Nepali.normalizeFormat(setting("format", "Full"))
  readonly property bool showWeekday: setting("showWeekday", true) === true
  readonly property bool showTithi: setting("showTithi", true) === true
  readonly property string configuredFont: String(setting("fontFamily", ""))

  readonly property var todayBikram: Bikram.today(displayDate)
  readonly property var todayGregorian: ({
    year: displayDate.getFullYear(),
    month: displayDate.getMonth() + 1,
    day: displayDate.getDate()
  })
  readonly property int todayWeekday: todayBikram
    ? Bikram.weekdayOf(todayBikram.year, todayBikram.month, todayBikram.day) : -1
  readonly property int todayTithi: Astro.tithiForDate(
    todayGregorian.year, todayGregorian.month, todayGregorian.day)
  readonly property var todayObservances: Observances.forDate(
    todayBikram, todayGregorian, showTithi ? todayTithi : 0)

  readonly property bool inRange: todayBikram !== null

  readonly property string displayText: inRange
    ? Nepali.formatDate(todayBikram, {
        language: language,
        numerals: numerals,
        format: barFormat,
        showWeekday: showWeekday,
        weekday: todayWeekday,
        gregorian: todayGregorian,
        vertical: vertical
      })
    : "—"
  readonly property var verticalLines: displayText.split("\n")
  readonly property var formatRing: Nepali.FORMATS

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item
    ? panelLoader.item.popoutSwitchClosing === true : false
  readonly property real openPanelIndicatorWidth: button.labelWidth
  readonly property real openPanelIndicatorHeight: Math.max(
    Style.space(10), Math.round(Style.bar.iconSlot * 0.55))

  function refresh() {
    displayDate = new Date()
    if (panelLoader.item && panelLoader.item.refresh) panelLoader.item.refresh()
  }

  function open() { if (panelLoader.item) panelLoader.item.open() }
  function close() { if (panelLoader.item) panelLoader.item.close() }
  function togglePanel() { if (panelLoader.item) panelLoader.item.toggle() }
  function closeForPopoutSwitch() { if (panelLoader.item) panelLoader.item.closeForPopoutSwitch() }

  function persistSetting(key, value) {
    var entry = { id: root.moduleName }
    for (var existing in root.settings) if (existing !== "id") entry[existing] = root.settings[existing]
    entry[key] = value
    root.settings = entry
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entry)
  }

  function cycleFormat() {
    var current = formatRing.indexOf(barFormat)
    persistSetting("format", formatRing[(current + 1) % formatRing.length])
  }

  function copyToday() {
    if (!inRange) return
    Quickshell.clipboardText = Nepali.formatDate(todayBikram, {
      language: language,
      numerals: numerals,
      format: "Full",
      showWeekday: true,
      weekday: todayWeekday
    })
  }

  function tooltip() {
    if (!inRange) return qsTr("Outside the calendar's range")
    var lines = [Nepali.formatDate(todayBikram, {
      language: language,
      numerals: numerals,
      format: "Full",
      showWeekday: true,
      weekday: todayWeekday
    })]
    lines.push(Qt.formatDate(root.displayDate, "d MMMM yyyy"))
    if (showTithi) lines.push(Nepali.tithiLabel(todayTithi, Astro.pakshaOf(todayTithi), language))
    var occasions = Observances.summary(
      showTithi ? Observances.named(todayObservances) : todayObservances, language)
    if (occasions !== "") lines.push(occasions)
    return lines.join("\n")
  }

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  SystemClock {
    id: clock
    precision: SystemClock.Minutes
    onDateChanged: {
      if (date.getFullYear() === root.displayDate.getFullYear()
          && date.getMonth() === root.displayDate.getMonth()
          && date.getDate() === root.displayDate.getDate()) return
      root.displayDate = date
    }
  }

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  IpcHandler {
    target: "yogeshojha.patro"

    function refresh(): void { root.broadcast("refresh") }
    function open(): void { root.open() }
    function close(): void { root.close() }
    function show(): void { root.open() }
    function hide(): void { root.close() }
    function toggle(): void { root.togglePanel() }
    function cycleFormat(): void { root.cycleFormat() }
    function copy(): void { root.copyToday() }
    function today(): string { return root.displayText }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.vertical ? "" : root.displayText
    labelVisible: !root.vertical
    hasVisualContent: root.vertical ? root.verticalLines.length > 0 : text !== ""
    fixedHeight: root.vertical ? root.verticalLines.length * Style.bar.iconSlot : -1
    horizontalMargin: 8.75
    verticalPadding: 8.75
    fontFamily: root.configuredFont !== ""
      ? root.configuredFont : (root.bar ? root.bar.fontFamily : Style.font.family)
    tooltipText: root.tooltip()

    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) root.cycleFormat()
      else if (buttonCode === Qt.MiddleButton) root.copyToday()
      else root.togglePanel()
    }

    Column {
      visible: root.vertical
      anchors.fill: parent

      Repeater {
        model: root.verticalLines

        OpticalGlyph {
          required property string modelData
          width: button.width
          height: Style.bar.iconSlot
          text: modelData
          fontFamily: button.fontFamily
          fontSize: modelData.length > 5 ? button.fontSize * 0.82 : button.fontSize
          color: button.foreground
        }
      }
    }
  }
}
