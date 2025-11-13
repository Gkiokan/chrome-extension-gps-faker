

let fake = {
    coords: {
        accuracy: 11.000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        latitude: 11.111111,
        longitude: 22.22222,
        magic: "g was here",
    },
    timestamp: 99999999
}

var mapFake = function(selected){
    fake.coords.latitude = selected.lat
    fake.coords.longitude = selected.lng
    fake.timestamp = (new Date).getTime()
    return fake
}

function doMagic(fake){
    console.log("[hook] doMagic", fake)
    setTimeout(() => {
        console.log("[hook] sending post message to inject", fake)
        window.postMessage({ type: 'gps.set', fake }, '*')
    }, 50);    
}

function initCall(){
    let key = '_gps_selected'
    chrome.storage.local.get([key], r => {
      console.log("[hook] storage.get initial", r[key])
      if(r[key]){
          let newFake = mapFake(r[key])
  
          if(newFake.coords.latitude){
            console.log("[hook] Found saved storage location, running injction")
            doMagic(newFake)
          }
      }
    })
}

initCall()


import { createBridge } from '#q-app/bex/content'
const bridge = createBridge({ debug: false })

bridge.connectToBackground()
    .then(() => {
        console.log('[hook] Connected to background')
    })
    .catch(err => {
        console.error('[hook] Failed to connect to background:', err)
    })

  
bridge.on('test', async ({ payload }) => {
    console.log("[hook] event received", payload, mapFake(payload.selected))
    doMagic( mapFake(payload.selected) )
    return { success: true }
})

// bridge.on('setLocation', ({ payload }) => {
//     console.log('[hook] setLocation event received', payload)
//     doMagic(mapFake(payload))
// })

// Listen for content script registration
bridge.on('contentScriptReady', ({ from }) => {
    console.log('[hook] Content script ready:', from)
})

console.log("[hook] inject-hook loaded")

