// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

const getLocation = function(){
  console.log("running get location")

  navigator.geolocation.getCurrentPosition(function(position) {
      console.log(position);
  });
}

const fake = {
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

const backup = navigator.geolocation.getCurrentPosition
console.log(backup)
const newPosition = function(success){
    console.log("odl override")
    success(fake)
}

navigator.geolocation.getCurrentPosition = newPosition

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
script_1.textContent = "(" + inject + ")(" + JSON.stringify(fake) + ")";
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

export default function attachContentHooks (/* bridge */) {
  // Hook into the bridge to listen for events sent from the client BEX.
  /*
  bridge.on('some.event', event => {
    if (event.data.yourProp) {
      // Access a DOM element from here.
      // Document in this instance is the underlying website the contentScript runs on
      const el = document.getElementById('some-id')
      if (el) {
        el.value = 'Quasar Rocks!'
      }
    }
  })
  */

  console.log("content hook here")

  getLocation()
}
