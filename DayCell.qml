import QtQuick
import qs.Commons
import "Nepali.js" as Nepali
import "Observances.js" as Observances

// One day: the Bikram day, the Gregorian day under it, a dot for anything falling on it.
Rectangle {
  id: root

  property string mode: "BS"
  property var cell: null
  property var observances: []
  property bool selected: false
  property bool today: false
  property bool showGregorian: true
  property string numerals: "Devanagari"
  property string language: "Nepali"
  property string fontFamily: Style.font.family
  property color foreground: Color.foreground
  property color accent: Color.accent
  property color muted: Util.alpha(foreground, 0.60)
  property color holiday: Color.urgent

  readonly property bool isBS: mode === "BS"
  readonly property bool filled: cell !== null && cell !== undefined
  readonly property bool weeklyHoliday: filled && Nepali.isWeeklyHoliday(cell.weekday)
  readonly property bool marked: observances.length > 0
  readonly property bool restDay: weeklyHoliday || Observances.isHoliday(observances)

  signal clicked()

  radius: Style.cornerRadius
  color: selected
    ? Util.alpha(accent, 0.16)
    : hover.hovered
      ? Util.alpha(foreground, 0.08)
      : today
        ? Util.alpha(foreground, 0.07)
        : "transparent"
  border.width: selected || today ? Style.spacing.hairline : 0
  border.color: selected ? accent : muted

  Rectangle {
    visible: root.marked
    anchors.top: parent.top
    anchors.right: parent.right
    anchors.margins: Style.space(5)
    width: Style.space(5)
    height: width
    radius: width / 2
    color: Observances.isHoliday(root.observances) ? root.holiday : root.muted
  }

  Column {
    anchors.centerIn: parent
    spacing: Style.space(1)

    Text {
      width: root.width
      text: root.filled
        ? (root.isBS ? Nepali.numerals(root.cell.day, root.numerals) : String(root.cell.day))
        : ""
      color: root.restDay ? root.holiday : root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.title
      font.bold: root.selected || root.today
      horizontalAlignment: Text.AlignHCenter
    }

    Text {
      visible: root.showGregorian && root.filled
      width: root.width
      text: !root.filled ? "" : (root.isBS
        ? (root.cell.gregorian ? String(root.cell.gregorian.day) : "")
        : (root.cell.bikram ? Nepali.numerals(root.cell.bikram.day, root.numerals) : ""))
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      horizontalAlignment: Text.AlignHCenter
    }
  }

  HoverHandler {
    id: hover
    enabled: root.filled
    cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
  }

  TapHandler {
    enabled: root.filled
    onTapped: root.clicked()
  }
}
