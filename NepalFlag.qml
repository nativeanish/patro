import QtQuick
import qs.Commons

Item {
  id: root

  property real size: Math.max(16, Math.round(Style.bar.iconCanvas * 1.15))
  property bool playing: visible

  implicitWidth: size
  implicitHeight: size
  width: implicitWidth
  height: implicitHeight

  AnimatedImage {
    id: anim
    anchors.fill: parent
    source: Qt.resolvedUrl("assets/nepal_flag_waving.webp")
    playing: root.playing
    fillMode: Image.PreserveAspectFit
    smooth: true
    mipmap: true
    cache: true

    onStatusChanged: {
      if (status === Image.Error && source.toString().endsWith(".webp")) {
        source = Qt.resolvedUrl("assets/nepal_flag_waving.gif")
      }
    }
  }
}
