// Hooks added here have a bridge allowing communication between the BEX Content Script and the Quasar Application.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/content-hooks

// import { fake, inject, doMagic } from './inject.js'


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
var doMagic = function(fake){
    let x = document.getElementById('script_1')
    if(x){
      x.parentNode.removeChild(x)
      console.log("Found old script_1, removed it")
    }

    var script_1 = document.createElement('script');
    script_1.setAttribute('id', 'script_1')
    script_1.textContent = "(" + inject + ")(" + JSON.stringify(fake) + ")";
    document.documentElement.appendChild(script_1);

    console.log("New magic injection added")
}

//
// if (document.documentElement.dataset.geolocscriptallow !== "true") {
//   var script_2 = document.createElement('script');
//   script_2.textContent = `{
//     const iframes = window.top.document.querySelectorAll("iframe[sandbox]");
//     for (var i = 0; i < iframes.length; i++) {
//       if (iframes[i].contentWindow) {
//         if (iframes[i].contentWindow.navigator) {
//           if (iframes[i].contentWindow.navigator.geolocation) {
//             if (navigator.geolocation.__proto__) {
//               let cp = iframes[i].contentWindow.navigator.geolocation.__proto__.getCurrentPosition;
//               if (cp !== navigator.geolocation.__proto__.getCurrentPosition) {
//                 iframes[i].contentWindow.navigator.geolocation.__proto__.getCurrentPosition = navigator.geolocation.__proto__.getCurrentPosition;
//               }
//             }
//           }
//         }
//       }
//     }
//   }`;
//   window.top.document.documentElement.appendChild(script_2);
// }


export default function attachContentHooks (bridge) {
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

  bridge.on('test', event => {
      let selected = event.data.data.selected
      fake.coords.latitude = selected.lat
      fake.coords.longitude = selected.lng

      console.log("Selected getLocation Fake Object", selected)
      console.log("New fake object", fake)
      console.log("Test Event recieved", event)

      doMagic(fake)

      // Not required but resolve our promise.
      bridge.send(event.responseKey)
  })

  console.log("Loaded GPS Faker")

  // getLocation()
}
