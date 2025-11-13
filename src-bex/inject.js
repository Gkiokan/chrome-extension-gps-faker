// import { createBridge } from '#q-app/bex/content'

// Create bridge and connect to background
// const bridge = createBridge({ debug: true })

// bridge.connectToBackground().then(() => {
//   console.log('[GPS Faker] Bridge connected to background')
// }).catch(err => {
//   console.error('[GPS Faker] Bridge connection failed', err)
// })

// When background sends location data
// bridge.on('gps.set', ({ payload }) => {
//   console.log('[GPS Faker] Received gps.set', payload)
//   overrideGeolocation(payload)
// })


// Expose helper globally (for debugging)
window.__GPS_FAKER__ = {
  setFakePosition(fake) {
    console.log('[GPS Faker] Setting fake GPS location', fake)
    overrideGeolocation(fake)
  },
  inject,
}

// Utility function
function overrideGeolocation(fake) {
  if (!fake || !fake.coords.latitude || !fake.coords.longitude) {
    console.warn('[GPS Faker] Invalid fake location:', fake)
    return
  }

  console.log('[GPS Faker] Overriding navigator.geolocation...')

  navigator.geolocation.getCurrentPosition = function (success, error) {
    success({
      coords: {
        latitude: parseFloat(fake.coords.latitude),
        longitude: parseFloat(fake.coords.longitude),
        accuracy: 10
      },
      timestamp: Date.now()
    })
  }

  navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition
  console.log('[GPS Faker] Geolocation overridden to', fake.coords.latitude, fake.coords.longitude)
}

// og function
function inject(e) {
    if (navigator) {
        if (navigator.geolocation) {
        if (navigator.geolocation.__proto__) {
            const getCurrentPosition = navigator.geolocation.__proto__.getCurrentPosition;
            Object.defineProperty(navigator.geolocation.__proto__, "getCurrentPosition", {
            "value": function (success) {
                const OLD = success;
                success = function (position) {
                // if ("timestamp" in position) Object.defineProperty(position, 'timestamp', {"value": e.timestamp !== null ? Number(e.timestamp) : null});
                if ("coords" in position) {
                    Object.defineProperty(position.coords, 'speed', {"value": e.coords.speed !== null ? Number(e.coords.speed) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'heading', {"value": e.coords.heading !== null ? Number(e.coords.heading) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'latitude', {"value": e.coords.latitude !== null ? Number(e.coords.latitude) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'accuracy', {"value": e.coords.accuracy !== null ? Number(e.coords.accuracy) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'altitude', {"value": e.coords.altitude !== null ? Number(e.coords.altitude) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'longitude', {"value": e.coords.longitude !== null ? Number(e.coords.longitude) : null, configurable: true, writable: true });
                    Object.defineProperty(position.coords, 'altitudeAccuracy', {"value": e.coords.altitudeAccuracy !== null ? Number(e.coords.altitudeAccuracy) : null, configurable: true, writable: true });
                }
                OLD.apply(this, arguments);
                };
                return getCurrentPosition.apply(this, arguments);
            }
            });
            document.documentElement.dataset.geolocscriptallow = true;
        }
        }
    }
};

window.addEventListener('message', (event) => {
    console.log("[GPS Faker][message]", event)
    if (event.source !== window) return
    if (!event.data || event.data.type !== 'gps.set') return
  
    const fake = event.data.fake
    console.log('[GPS Faker] Received gps.set via postMessage', fake)
    // overrideGeolocation(fake)
    inject(fake)

    // setTimeout( () => window.location.reload(), 200 )
})

console.log('[GPS Faker] inject.js loaded in MAIN world')