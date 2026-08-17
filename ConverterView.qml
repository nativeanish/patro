import QtQuick
import qs.Commons
import qs.Ui
import "Bikram.js" as Bikram
import "Nepali.js" as Nepali

// The same day in both calendars. Editing either field moves the other and the month view.
Column {
  id: root

  property var bikram: null
  property string language: "Nepali"
  property string numerals: "Devanagari"
  property string fontFamily: Style.font.family
  property color foreground: Color.foreground
  property color accent: Color.accent
  property color muted: Util.alpha(foreground, 0.60)
  property string message: ""

  // Where focus returns when a field is done with it.
  property Item releaseTarget: null
  readonly property bool editing: bikramField.activeFocus || gregorianField.activeFocus

  signal picked(int year, int month, int day)

  function focusBikram() {
    bikramField.forceActiveFocus()
    bikramField.selectAll()
  }

  function release() {
    reset()
    handOff()
  }

  // Enter means "go to this date", so the keys belong to the calendar again.
  function handOff() {
    if (releaseTarget) releaseTarget.forceActiveFocus()
  }

  // Starts over, including whatever half-typed text a field is holding.
  function reset() {
    root.message = ""
    writeFields(true)
  }

  function syncFields() {
    writeFields(false)
  }

  // A field being edited is left alone unless the caller is overriding it.
  function writeFields(force) {
    if (!bikram) return
    if (force || !bikramField.activeFocus) bikramField.text = formatBikram(bikram)
    if (force || !gregorianField.activeFocus) {
      var gregorian = Bikram.toGregorian(bikram.year, bikram.month, bikram.day)
      if (gregorian) gregorianField.text = formatGregorian(gregorian)
    }
  }

  function formatBikram(parts) {
    return Nepali.numerals(parts.year, numerals) + "-"
      + Nepali.padded(parts.month, numerals) + "-"
      + Nepali.padded(parts.day, numerals)
  }

  function formatGregorian(parts) {
    return parts.year + "-"
      + (parts.month < 10 ? "0" : "") + parts.month + "-"
      + (parts.day < 10 ? "0" : "") + parts.day
  }

  function commitBikram() {
    apply(Bikram.readBikramDate(bikramField.text))
  }

  function commitGregorian() {
    apply(Bikram.readGregorianDate(gregorianField.text))
  }

  function apply(result) {
    if (result.date) {
      root.message = ""
      root.picked(result.date.year, result.date.month, result.date.day)
      return
    }
    root.message = result.reason === "outOfRange" ? outOfRange()
      : result.reason === "noSuchDay" ? noSuchDay(result.parts)
      : Nepali.message(result.reason, language)
    syncFields()
  }

  function outOfRange() {
    var lastYear = Bikram.lastYear()
    var first = Bikram.toGregorian(Bikram.firstYear(), 1, 1)
    var last = Bikram.toGregorian(lastYear, 12, Bikram.monthLength(lastYear, 12))
    return Nepali.message("outOfRange", language)
      .replace("%1", Nepali.numerals(Bikram.firstYear(), numerals))
      .replace("%2", Nepali.numerals(lastYear, numerals))
      .replace("%3", formatGregorian(first))
      .replace("%4", formatGregorian(last))
  }

  function noSuchDay(parts) {
    return Nepali.message("noSuchDay", language)
      .replace("%1", Nepali.monthName(parts.month, language))
      .replace("%2", Nepali.numerals(parts.year, numerals))
      .replace("%3", Nepali.numerals(Bikram.monthLength(parts.year, parts.month), numerals))
  }

  spacing: Style.space(6)
  onBikramChanged: reset()
  onLanguageChanged: reset()
  onNumeralsChanged: reset()
  Component.onCompleted: syncFields()

  Row {
    spacing: Style.space(8)

    Column {
      spacing: Style.space(3)

      Text {
        text: qsTr("Bikram Sambat")
        color: root.muted
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
      }

      TextField {
        id: bikramField
        width: Style.space(128)
        foreground: root.foreground
        accent: root.accent
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        onAccepted: {
          root.commitBikram()
          if (root.message === "") root.handOff()
        }
        onActiveFocusChanged: if (!activeFocus) root.syncFields()
        Keys.onEscapePressed: root.release()
      }
    }

    Text {
      anchors.verticalCenter: parent.verticalCenter
      text: "⇄"
      color: root.muted
      font.family: Style.font.family
      font.pixelSize: Style.font.title
    }

    Column {
      spacing: Style.space(3)

      Text {
        text: qsTr("Gregorian")
        color: root.muted
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
      }

      TextField {
        id: gregorianField
        width: Style.space(128)
        foreground: root.foreground
        accent: root.accent
        font.family: root.fontFamily
        font.pixelSize: Style.font.body
        onAccepted: {
          root.commitGregorian()
          if (root.message === "") root.handOff()
        }
        onActiveFocusChanged: if (!activeFocus) root.syncFields()
        Keys.onEscapePressed: root.release()
      }
    }
  }

  Text {
    visible: root.message !== ""
    width: parent.width
    text: root.message
    color: Color.urgent
    font.family: root.fontFamily
    font.pixelSize: Style.font.caption
    wrapMode: Text.WordWrap
  }
}
