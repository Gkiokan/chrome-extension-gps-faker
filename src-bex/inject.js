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
// window.__GPS_FAKER__ = {
//   setFakePosition(fake) {
//     console.log('[GPS Faker] Setting fake GPS location', fake)
//     overrideGeolocation(fake)
//   },
//   inject,
// }

// === inject.js ===
(function() {
  // This variable holds the "active" fake location
  let activeFake = null;

  function setupHook() {
    if (!navigator.geolocation || !navigator.geolocation.__proto__) {
      console.log("No Navigator geolocation or __proto__ found")
      return;
    }

    const proto = navigator.geolocation.__proto__;
    const originalGet = proto.getCurrentPosition;
    const originalWatch = proto.watchPosition;

    // A helper to create the fake response object
    const createFakePosition = (fake) => ({
      coords: {
        latitude: parseFloat(fake.coords.latitude),
        longitude: parseFloat(fake.coords.longitude),
        accuracy: fake.coords.accuracy || 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now()
    });

    // Override getCurrentPosition
    proto.getCurrentPosition = function(success, error, options) {
      if (activeFake) {
        console.log('[GPS Faker] Intercepted getCurrentPosition');
        // We use a timeout to make it feel "real" (async)
        return setTimeout(() => success(createFakePosition(activeFake)), 0);
      }
      return originalGet.apply(this, arguments);
    };

    // Override watchPosition
    proto.watchPosition = function(success, error, options) {
      if (activeFake) {
        console.log('[GPS Faker] Intercepted watchPosition');
        const intervalId = setInterval(() => success(createFakePosition(activeFake)), 1000);
        return intervalId; // Return an ID so clearWatch works
      }
      return originalWatch.apply(this, arguments);
    };

    console.log('[GPS Faker] Hooks installed on navigator.geolocation');
  }

  // Initialize hooks immediately
  setupHook();

  // Listen for messages from inject-hook.js
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'gps.set') {
      activeFake = event.data.fake;
      console.log('[GPS Faker] Active location updated to:', activeFake.coords.latitude, activeFake.coords.longitude);
    }
  });
})();