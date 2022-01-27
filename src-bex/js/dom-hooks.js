// Hooks added here have a bridge allowing communication between the Web Page and the BEX Content Script.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/dom-hooks

import detectQ from './detect-q'

export default function attachDomHooks (bridge) {
  /*
  bridge.send('message.to.quasar', {
    worked: true
  })
  */

  detectQ(bridge)
}
