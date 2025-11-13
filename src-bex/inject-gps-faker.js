// === inject.js ===
console.log('[GPS_FAKER] inject.js loaded into MAIN world');

(function () {
  const GPS = {
    active: false,
    lastFake: null,

    inject(fake) {
      try {
        if (!navigator?.geolocation || !navigator.geolocation.__proto__) {
          console.warn('[GPS_FAKER] navigator.geolocation not found');
          return;
        }

        const proto = navigator.geolocation.__proto__;
        const originalGet = proto.getCurrentPosition;
        const originalWatch = proto.watchPosition;

        const wrap = (fnName, originalFn) => {
          proto[fnName] = function (success, error, options) {
            const wrapped = (position) => {
              if (position?.coords && fake?.coords) {
                Object.assign(position.coords, fake.coords);
                position.timestamp = fake.timestamp ?? Date.now();
              }
              success?.(position);
            };
            return originalFn.call(this, wrapped, error, options);
          };
        };

        wrap('getCurrentPosition', originalGet);
        wrap('watchPosition', originalWatch);

        GPS.active = true;
        GPS.lastFake = fake;
        console.log('[GPS_FAKER] injected fake coords:', fake);
      } catch (err) {
        console.error('[GPS_FAKER] inject error:', err);
      }
    },

    reset() {
      // reload restores the native APIs
      location.reload();
    }
  };

  window.__GPS_FAKER__ = GPS;
  console.log('[GPS_FAKER] window.__GPS_FAKER__ ready');
})();
