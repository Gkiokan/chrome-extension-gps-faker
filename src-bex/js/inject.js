var inject = function (e) {
  if (navigator) {
    if (navigator.geolocation) {
      if (navigator.geolocation.__proto__) {
        const getCurrentPosition = navigator.geolocation.__proto__.getCurrentPosition;
        Object.defineProperty(navigator.geolocation.__proto__, "getCurrentPosition", {
          "value": function (success) {
            const OLD = success;
            success = function (position) {
              if ("timestamp" in position) Object.defineProperty(position, 'timestamp', {"value": e.timestamp !== null ? Number(e.timestamp) : null});
              if ("coords" in position) {
                Object.defineProperty(position.coords, 'speed', {"value": e.coords.speed !== null ? Number(e.coords.speed) : null});
                Object.defineProperty(position.coords, 'heading', {"value": e.coords.heading !== null ? Number(e.coords.heading) : null});
                Object.defineProperty(position.coords, 'latitude', {"value": e.coords.latitude !== null ? Number(e.coords.latitude) : null});
                Object.defineProperty(position.coords, 'accuracy', {"value": e.coords.accuracy !== null ? Number(e.coords.accuracy) : null});
                Object.defineProperty(position.coords, 'altitude', {"value": e.coords.altitude !== null ? Number(e.coords.altitude) : null});
                Object.defineProperty(position.coords, 'longitude', {"value": e.coords.longitude !== null ? Number(e.coords.longitude) : null});
                Object.defineProperty(position.coords, 'altitudeAccuracy', {"value": e.coords.altitudeAccuracy !== null ? Number(e.coords.altitudeAccuracy) : null});
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

var script_1 = document.createElement('script');
script_1.textContent = "(" + inject + ")(" + JSON.stringify(options) + ")";
document.documentElement.appendChild(script_1);

if (document.documentElement.dataset.geolocscriptallow !== "true") {
  var script_2 = document.createElement('script');
  script_2.textContent = `{
    const iframes = window.top.document.querySelectorAll("iframe[sandbox]");
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow) {
        if (iframes[i].contentWindow.navigator) {
          if (iframes[i].contentWindow.navigator.geolocation) {
            if (navigator.geolocation.__proto__) {
              let cp = iframes[i].contentWindow.navigator.geolocation.__proto__.getCurrentPosition;
              if (cp !== navigator.geolocation.__proto__.getCurrentPosition) {
                iframes[i].contentWindow.navigator.geolocation.__proto__.getCurrentPosition = navigator.geolocation.__proto__.getCurrentPosition;
              }
            }
          }
        }
      }
    }
  }`;
  window.top.document.documentElement.appendChild(script_2);
}
