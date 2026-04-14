(() => {
  // src-bex/inject.js
  (function() {
    let activeFake = null;
    function setupHook() {
      if (!navigator.geolocation || !navigator.geolocation.__proto__) {
        console.log("No Navigator geolocation or __proto__ found");
        return;
      }
      const proto = navigator.geolocation.__proto__;
      const originalGet = proto.getCurrentPosition;
      const originalWatch = proto.watchPosition;
      const createFakePosition = (fake) => ({
        coords: {
          latitude: parseFloat(fake.coords.latitude),
          longitude: parseFloat(fake.coords.longitude),
          accuracy: fake.coords.accuracy || 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      });
      proto.getCurrentPosition = function(success, error, options) {
        if (activeFake) {
          console.log("[GPS Faker] Intercepted getCurrentPosition");
          return setTimeout(() => success(createFakePosition(activeFake)), 0);
        }
        return originalGet.apply(this, arguments);
      };
      proto.watchPosition = function(success, error, options) {
        if (activeFake) {
          console.log("[GPS Faker] Intercepted watchPosition");
          const intervalId = setInterval(() => success(createFakePosition(activeFake)), 1e3);
          return intervalId;
        }
        return originalWatch.apply(this, arguments);
      };
      console.log("[GPS Faker] Hooks installed on navigator.geolocation");
    }
    setupHook();
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === "gps.set") {
        activeFake = event.data.fake;
        console.log("[GPS Faker] Active location updated to:", activeFake.coords.latitude, activeFake.coords.longitude);
      }
    });
  })();
})();
