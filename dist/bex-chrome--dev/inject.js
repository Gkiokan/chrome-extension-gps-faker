(() => {
  // src-bex/inject.js
  window.__GPS_FAKER__ = {
    setFakePosition(fake) {
      console.log("[GPS Faker] Setting fake GPS location", fake);
      overrideGeolocation(fake);
    },
    inject
  };
  function overrideGeolocation(fake) {
    if (!fake || !fake.coords.latitude || !fake.coords.longitude) {
      console.warn("[GPS Faker] Invalid fake location:", fake);
      return;
    }
    console.log("[GPS Faker] Overriding navigator.geolocation...");
    navigator.geolocation.getCurrentPosition = function(success, error) {
      success({
        coords: {
          latitude: parseFloat(fake.coords.latitude),
          longitude: parseFloat(fake.coords.longitude),
          accuracy: 10
        },
        timestamp: Date.now()
      });
    };
    navigator.geolocation.watchPosition = navigator.geolocation.getCurrentPosition;
    console.log("[GPS Faker] Geolocation overridden to", fake.coords.latitude, fake.coords.longitude);
  }
  function inject(e) {
    if (navigator) {
      if (navigator.geolocation) {
        if (navigator.geolocation.__proto__) {
          const getCurrentPosition = navigator.geolocation.__proto__.getCurrentPosition;
          Object.defineProperty(navigator.geolocation.__proto__, "getCurrentPosition", {
            "value": function(success) {
              const OLD = success;
              success = function(position) {
                if ("coords" in position) {
                  Object.defineProperty(position.coords, "speed", { "value": e.coords.speed !== null ? Number(e.coords.speed) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "heading", { "value": e.coords.heading !== null ? Number(e.coords.heading) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "latitude", { "value": e.coords.latitude !== null ? Number(e.coords.latitude) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "accuracy", { "value": e.coords.accuracy !== null ? Number(e.coords.accuracy) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "altitude", { "value": e.coords.altitude !== null ? Number(e.coords.altitude) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "longitude", { "value": e.coords.longitude !== null ? Number(e.coords.longitude) : null, configurable: true, writable: true });
                  Object.defineProperty(position.coords, "altitudeAccuracy", { "value": e.coords.altitudeAccuracy !== null ? Number(e.coords.altitudeAccuracy) : null, configurable: true, writable: true });
                }
                OLD.apply(this, arguments);
              };
              return getCurrentPosition.apply(this, arguments);
            }
          });
          document.documentElement.dataset.geolocscriptallow = true;
          console.log("[GPS Faker] Geolocation overridden to", e.coords.latitude, e.coords.longitude);
        }
      }
    }
  }
  window.addEventListener("message", (event) => {
    console.log("[GPS Faker][message]", event);
    if (event.source !== window) return;
    if (!event.data || event.data.type !== "gps.set") return;
    const fake = event.data.fake;
    console.log("[GPS Faker] Received gps.set via postMessage", fake);
    inject(fake);
  });
  console.log("[GPS Faker] inject.js loaded in MAIN world");
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjLWJleC9pbmplY3QuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIGltcG9ydCB7IGNyZWF0ZUJyaWRnZSB9IGZyb20gJyNxLWFwcC9iZXgvY29udGVudCdcblxuLy8gQ3JlYXRlIGJyaWRnZSBhbmQgY29ubmVjdCB0byBiYWNrZ3JvdW5kXG4vLyBjb25zdCBicmlkZ2UgPSBjcmVhdGVCcmlkZ2UoeyBkZWJ1ZzogdHJ1ZSB9KVxuXG4vLyBicmlkZ2UuY29ubmVjdFRvQmFja2dyb3VuZCgpLnRoZW4oKCkgPT4ge1xuLy8gICBjb25zb2xlLmxvZygnW0dQUyBGYWtlcl0gQnJpZGdlIGNvbm5lY3RlZCB0byBiYWNrZ3JvdW5kJylcbi8vIH0pLmNhdGNoKGVyciA9PiB7XG4vLyAgIGNvbnNvbGUuZXJyb3IoJ1tHUFMgRmFrZXJdIEJyaWRnZSBjb25uZWN0aW9uIGZhaWxlZCcsIGVycilcbi8vIH0pXG5cbi8vIFdoZW4gYmFja2dyb3VuZCBzZW5kcyBsb2NhdGlvbiBkYXRhXG4vLyBicmlkZ2Uub24oJ2dwcy5zZXQnLCAoeyBwYXlsb2FkIH0pID0+IHtcbi8vICAgY29uc29sZS5sb2coJ1tHUFMgRmFrZXJdIFJlY2VpdmVkIGdwcy5zZXQnLCBwYXlsb2FkKVxuLy8gICBvdmVycmlkZUdlb2xvY2F0aW9uKHBheWxvYWQpXG4vLyB9KVxuXG5cbi8vIEV4cG9zZSBoZWxwZXIgZ2xvYmFsbHkgKGZvciBkZWJ1Z2dpbmcpXG53aW5kb3cuX19HUFNfRkFLRVJfXyA9IHtcbiAgc2V0RmFrZVBvc2l0aW9uKGZha2UpIHtcbiAgICBjb25zb2xlLmxvZygnW0dQUyBGYWtlcl0gU2V0dGluZyBmYWtlIEdQUyBsb2NhdGlvbicsIGZha2UpXG4gICAgb3ZlcnJpZGVHZW9sb2NhdGlvbihmYWtlKVxuICB9LFxuICBpbmplY3QsXG59XG5cbi8vIFV0aWxpdHkgZnVuY3Rpb25cbmZ1bmN0aW9uIG92ZXJyaWRlR2VvbG9jYXRpb24oZmFrZSkge1xuICBpZiAoIWZha2UgfHwgIWZha2UuY29vcmRzLmxhdGl0dWRlIHx8ICFmYWtlLmNvb3Jkcy5sb25naXR1ZGUpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tHUFMgRmFrZXJdIEludmFsaWQgZmFrZSBsb2NhdGlvbjonLCBmYWtlKVxuICAgIHJldHVyblxuICB9XG5cbiAgY29uc29sZS5sb2coJ1tHUFMgRmFrZXJdIE92ZXJyaWRpbmcgbmF2aWdhdG9yLmdlb2xvY2F0aW9uLi4uJylcblxuICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uID0gZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgc3VjY2Vzcyh7XG4gICAgICBjb29yZHM6IHtcbiAgICAgICAgbGF0aXR1ZGU6IHBhcnNlRmxvYXQoZmFrZS5jb29yZHMubGF0aXR1ZGUpLFxuICAgICAgICBsb25naXR1ZGU6IHBhcnNlRmxvYXQoZmFrZS5jb29yZHMubG9uZ2l0dWRlKSxcbiAgICAgICAgYWNjdXJhY3k6IDEwXG4gICAgICB9LFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgfSlcbiAgfVxuXG4gIG5hdmlnYXRvci5nZW9sb2NhdGlvbi53YXRjaFBvc2l0aW9uID0gbmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvblxuICBjb25zb2xlLmxvZygnW0dQUyBGYWtlcl0gR2VvbG9jYXRpb24gb3ZlcnJpZGRlbiB0bycsIGZha2UuY29vcmRzLmxhdGl0dWRlLCBmYWtlLmNvb3Jkcy5sb25naXR1ZGUpXG59XG5cbi8vIG9nIGZ1bmN0aW9uXG5mdW5jdGlvbiBpbmplY3QoZSkge1xuICAgIGlmIChuYXZpZ2F0b3IpIHtcbiAgICAgICAgaWYgKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuICAgICAgICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uLl9fcHJvdG9fXykge1xuICAgICAgICAgICAgY29uc3QgZ2V0Q3VycmVudFBvc2l0aW9uID0gbmF2aWdhdG9yLmdlb2xvY2F0aW9uLl9fcHJvdG9fXy5nZXRDdXJyZW50UG9zaXRpb247XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobmF2aWdhdG9yLmdlb2xvY2F0aW9uLl9fcHJvdG9fXywgXCJnZXRDdXJyZW50UG9zaXRpb25cIiwge1xuICAgICAgICAgICAgXCJ2YWx1ZVwiOiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IE9MRCA9IHN1Y2Nlc3M7XG4gICAgICAgICAgICAgICAgc3VjY2VzcyA9IGZ1bmN0aW9uIChwb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIGlmIChcInRpbWVzdGFtcFwiIGluIHBvc2l0aW9uKSBPYmplY3QuZGVmaW5lUHJvcGVydHkocG9zaXRpb24sICd0aW1lc3RhbXAnLCB7XCJ2YWx1ZVwiOiBlLnRpbWVzdGFtcCAhPT0gbnVsbCA/IE51bWJlcihlLnRpbWVzdGFtcCkgOiBudWxsfSk7XG4gICAgICAgICAgICAgICAgaWYgKFwiY29vcmRzXCIgaW4gcG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ3NwZWVkJywge1widmFsdWVcIjogZS5jb29yZHMuc3BlZWQgIT09IG51bGwgPyBOdW1iZXIoZS5jb29yZHMuc3BlZWQpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2hlYWRpbmcnLCB7XCJ2YWx1ZVwiOiBlLmNvb3Jkcy5oZWFkaW5nICE9PSBudWxsID8gTnVtYmVyKGUuY29vcmRzLmhlYWRpbmcpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2xhdGl0dWRlJywge1widmFsdWVcIjogZS5jb29yZHMubGF0aXR1ZGUgIT09IG51bGwgPyBOdW1iZXIoZS5jb29yZHMubGF0aXR1ZGUpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2FjY3VyYWN5Jywge1widmFsdWVcIjogZS5jb29yZHMuYWNjdXJhY3kgIT09IG51bGwgPyBOdW1iZXIoZS5jb29yZHMuYWNjdXJhY3kpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2FsdGl0dWRlJywge1widmFsdWVcIjogZS5jb29yZHMuYWx0aXR1ZGUgIT09IG51bGwgPyBOdW1iZXIoZS5jb29yZHMuYWx0aXR1ZGUpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2xvbmdpdHVkZScsIHtcInZhbHVlXCI6IGUuY29vcmRzLmxvbmdpdHVkZSAhPT0gbnVsbCA/IE51bWJlcihlLmNvb3Jkcy5sb25naXR1ZGUpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHBvc2l0aW9uLmNvb3JkcywgJ2FsdGl0dWRlQWNjdXJhY3knLCB7XCJ2YWx1ZVwiOiBlLmNvb3Jkcy5hbHRpdHVkZUFjY3VyYWN5ICE9PSBudWxsID8gTnVtYmVyKGUuY29vcmRzLmFsdGl0dWRlQWNjdXJhY3kpIDogbnVsbCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgT0xELmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q3VycmVudFBvc2l0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0Lmdlb2xvY3NjcmlwdGFsbG93ID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbR1BTIEZha2VyXSBHZW9sb2NhdGlvbiBvdmVycmlkZGVuIHRvJywgZS5jb29yZHMubGF0aXR1ZGUsIGUuY29vcmRzLmxvbmdpdHVkZSlcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcIltHUFMgRmFrZXJdW21lc3NhZ2VdXCIsIGV2ZW50KVxuICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdykgcmV0dXJuXG4gICAgaWYgKCFldmVudC5kYXRhIHx8IGV2ZW50LmRhdGEudHlwZSAhPT0gJ2dwcy5zZXQnKSByZXR1cm5cbiAgXG4gICAgY29uc3QgZmFrZSA9IGV2ZW50LmRhdGEuZmFrZVxuICAgIGNvbnNvbGUubG9nKCdbR1BTIEZha2VyXSBSZWNlaXZlZCBncHMuc2V0IHZpYSBwb3N0TWVzc2FnZScsIGZha2UpXG4gICAgLy8gb3ZlcnJpZGVHZW9sb2NhdGlvbihmYWtlKVxuICAgIGluamVjdChmYWtlKVxuXG4gICAgLy8gc2V0VGltZW91dCggKCkgPT4gd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpLCAyMDAgKVxufSlcblxuY29uc29sZS5sb2coJ1tHUFMgRmFrZXJdIGluamVjdC5qcyBsb2FkZWQgaW4gTUFJTiB3b3JsZCcpIl0sCiAgIm1hcHBpbmdzIjogIjs7QUFtQkEsU0FBTyxnQkFB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
