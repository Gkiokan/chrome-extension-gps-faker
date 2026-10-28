(() => {
  // src-bex/inject.js
  (function() {
    let activeFake = void 0;
    const pending = [];
    const PENDING_TIMEOUT = 2e3;
    const FLAG_KEYS = ["allow_mobile_web_gui?"];
    function forceFlags(obj, depth = 0) {
      if (!obj || typeof obj !== "object" || depth > 10) return obj;
      for (const key of FLAG_KEYS) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = true;
      }
      for (const k in obj) {
        if (obj[k] && typeof obj[k] === "object") forceFlags(obj[k], depth + 1);
      }
      return obj;
    }
    const hasFlag = (text) => typeof text === "string" && FLAG_KEYS.some((k) => text.includes(k));
    const originalParse = JSON.parse;
    JSON.parse = function(text, reviver) {
      const result = originalParse.apply(this, arguments);
      return hasFlag(text) ? forceFlags(result) : result;
    };
    if (window.Response && Response.prototype.json) {
      const originalJson = Response.prototype.json;
      Response.prototype.json = function() {
        return originalJson.apply(this, arguments).then(forceFlags);
      };
    }
    const forceNative = (cap) => {
      if (cap && typeof cap === "object") cap.isNativePlatform = () => true;
      return cap;
    };
    let capacitor = forceNative(window.Capacitor);
    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      enumerable: true,
      get: () => capacitor,
      set: (value) => {
        capacitor = forceNative(value);
      }
    });
    const isUsable = (fake) => fake && Number.isFinite(parseFloat(fake.coords.latitude)) && Number.isFinite(parseFloat(fake.coords.longitude));
    function createFakePosition(fake) {
      const values = {
        latitude: parseFloat(fake.coords.latitude),
        longitude: parseFloat(fake.coords.longitude),
        accuracy: fake.coords.accuracy || 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      };
      const timestamp = Date.now();
      const coords = Object.create(window.GeolocationCoordinates ? GeolocationCoordinates.prototype : Object.prototype);
      for (const [k, v] of Object.entries(values)) {
        Object.defineProperty(coords, k, { get: () => v, configurable: true });
      }
      Object.defineProperty(coords, "toJSON", { value: () => ({ ...values }), configurable: true });
      const position = Object.create(window.GeolocationPosition ? GeolocationPosition.prototype : Object.prototype);
      Object.defineProperty(position, "coords", { get: () => coords, configurable: true });
      Object.defineProperty(position, "timestamp", { get: () => timestamp, configurable: true });
      Object.defineProperty(position, "toJSON", { value: () => ({ coords: { ...values }, timestamp }), configurable: true });
      return position;
    }
    function setupHook() {
      if (!window.Geolocation || !Geolocation.prototype) {
        console.log("No Navigator geolocation found");
        return;
      }
      const proto = Geolocation.prototype;
      const originalGet = proto.getCurrentPosition;
      const originalWatch = proto.watchPosition;
      const originalClear = proto.clearWatch;
      const fakeWatches = /* @__PURE__ */ new Map();
      let nextWatchId = 1e6;
      proto.getCurrentPosition = function(success, error, options) {
        if (activeFake === void 0) {
          pending.push(() => proto.getCurrentPosition.call(this, success, error, options));
          return;
        }
        if (isUsable(activeFake)) {
          console.log("[GPS Faker] Intercepted getCurrentPosition");
          setTimeout(() => success(createFakePosition(activeFake)), 0);
          return;
        }
        return originalGet.apply(this, arguments);
      };
      proto.watchPosition = function(success, error, options) {
        if (activeFake === void 0 || isUsable(activeFake)) {
          console.log("[GPS Faker] Intercepted watchPosition");
          const id = nextWatchId++;
          const tick = () => isUsable(activeFake) && success(createFakePosition(activeFake));
          setTimeout(tick, 0);
          fakeWatches.set(id, setInterval(tick, 1e3));
          return id;
        }
        return originalWatch.apply(this, arguments);
      };
      proto.clearWatch = function(id) {
        if (fakeWatches.has(id)) {
          clearInterval(fakeWatches.get(id));
          fakeWatches.delete(id);
          return;
        }
        return originalClear.apply(this, arguments);
      };
      if (window.Permissions && Permissions.prototype.query) {
        const originalQuery = Permissions.prototype.query;
        Permissions.prototype.query = function(desc) {
          if (desc && desc.name === "geolocation" && isUsable(activeFake)) {
            const status = Object.create(window.PermissionStatus ? PermissionStatus.prototype : EventTarget.prototype);
            Object.defineProperty(status, "state", { get: () => "granted", configurable: true });
            Object.defineProperty(status, "name", { get: () => "geolocation", configurable: true });
            status.onchange = null;
            return Promise.resolve(status);
          }
          return originalQuery.apply(this, arguments);
        };
      }
      console.log("[GPS Faker] Hooks installed on navigator.geolocation");
    }
    function flushPending() {
      while (pending.length) pending.shift()();
    }
    setupHook();
    setTimeout(() => {
      if (activeFake === void 0) {
        activeFake = null;
        flushPending();
      }
    }, PENDING_TIMEOUT);
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === "gps.set") {
        activeFake = isUsable(event.data.fake) ? event.data.fake : null;
        console.log("[GPS Faker] Active location updated to:", activeFake ? [activeFake.coords.latitude, activeFake.coords.longitude] : "none (real GPS)");
        flushPending();
      }
    });
  })();
})();
