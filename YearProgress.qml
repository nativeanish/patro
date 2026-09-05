import QtQuick
import qs.Commons
import qs.Ui

// Progress bar row showing year progress and days remaining in BS or AD.
Item {
  id: root

  property string label: ""
  property int totalDays: 365
  property int passedDays: 0
  property int remainingDays: 0
  property real progress: totalDays > 0 ? Math.min(1.0, Math.max(0.0, passedDays / totalDays)) : 0
  property string valueText: ""
  property string tooltipText: ""
  property color foreground: Color.foreground
  property color accent: Color.accent
  property color muted: Util.alpha(foreground, 0.60)
  property string fontFamily: Style.font.family

  implicitWidth: parent ? parent.width : Style.space(380)
  implicitHeight: Style.space(22)

  Row {
    anchors.fill: parent
    spacing: Style.space(10)

    Text {
      id: labelText
      width: Style.space(42)
      anchors.verticalCenter: parent.verticalCenter
      text: root.label
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.bodySmall
      font.bold: true
      horizontalAlignment: Text.AlignLeft
    }

    Item {
      id: trackContainer
      width: parent.width - labelText.width - valueTextItem.width - (parent.spacing * 2)
      height: parent.height
      anchors.verticalCenter: parent.verticalCenter

      Rectangle {
        id: track
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.verticalCenter: parent.verticalCenter
        height: Style.space(7)
        radius: height / 2
        color: Util.alpha(root.foreground, 0.16)

        Rectangle {
          id: fill
          anchors.left: parent.left
          anchors.top: parent.top
          anchors.bottom: parent.bottom
          width: Math.max(height, Math.round(parent.width * root.progress))
          radius: parent.radius
          color: root.accent

          Behavior on width {
            NumberAnimation { duration: Style.animation.fast; easing.type: Easing.OutCubic }
          }
        }
      }
    }

    Text {
      id: valueTextItem
      anchors.verticalCenter: parent.verticalCenter
      text: root.valueText
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      horizontalAlignment: Text.AlignRight
    }
  }

  HoverHandler {
    id: hover
  }

  PanelToolTip {
    text: root.tooltipText
    visible: hover.hovered && root.tooltipText !== ""
  }
}
