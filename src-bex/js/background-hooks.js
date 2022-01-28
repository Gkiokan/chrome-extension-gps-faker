// Hooks added here have a bridge allowing communication between the BEX Background Script and the BEX Content Script.
// Note: Events sent from this background script using `bridge.send` can be `listen`'d for by all client BEX bridges for this BEX

// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/background-hooks

export default function attachBackgroundHooks (bridge /* , allActiveConnections */) {
  bridge.on('storage.get', event => {
    const payload = event.data
    console.log("storage.get event", event)
    console.log("storage.get payload", payload)

    if (payload.key === null) {
      chrome.storage.local.get(null, r => {
          const result = []

          // Group the items up into an array to take advantage of the bridge's chunk splitting.
          for (const itemKey in r) {
            result.push(r[itemKey])
          }
          console.log("storage.get", result)
          bridge.send(event.eventResponseKey, result)
      })
    } else {
      chrome.storage.local.get([payload.key], r => {
          console.log("storage.get " +  payload.key, r[payload.key])
          // console.log("storage.get event", event.eventResponseKey)
          bridge.send(event.eventResponseKey, r[payload.key])

          if(event.data.responseTo){
              console.log("storage.get responseTo", event.data.responseTo)
              bridge.send(event.data.responseTo, r[payload.key])
          }
          else {
              console.log("storage.get to storage.get.response")
              bridge.send('storage.get.response', r[payload.key])
          }
      })
    }
  })

  bridge.on('storage.set', event => {
    console.log("storage.set", event)
    const payload = event.data
    chrome.storage.local.set({ [payload.key]: payload.data }, () => {
      bridge.send(event.eventResponseKey, payload.data)
    })
  })

  bridge.on('storage.remove', event => {
    const payload = event.data
    chrome.storage.local.remove(payload.key, () => {
      bridge.send(event.eventResponseKey, payload.data)
    })
  })

  bridge.on('test', d => {
    // alert('background hook', d)
    bridge.send('test', d)
    // console.log("test in background hook", d)
  })

  /*
  // EXAMPLES
  // Listen to a message from the client
  bridge.on('test', d => {
    console.log(d)
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onCreated.addListener(tab => {
    bridge.send('browserTabCreated', { tab })
  })

  // Send a message to the client based on something happening.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      bridge.send('browserTabUpdated', { tab, changeInfo })
    }
  })
   */
}
