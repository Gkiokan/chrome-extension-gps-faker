# Web location validation — backend handoff

**Status:** blocked on backend. The GPS Faker extension (v4.1.0) can supply a browser
location to the app, but `POST /validate_location` is rejected for web clients because
the device-attestation header cannot be produced in a browser. This document is the
request to the backend team.

Line references point at the built app bundle `research/aep.js` (the client we have to
integrate against). They are for orientation — the fix is server-side.

---

## What we're trying to enable

For specific users we already have a server flag, `allow_mobile_web_gui?`, that is meant
to allow location capture from the **web** instead of a native mobile device. When it's
true the client falls back from the native `BackgroundGeolocation` plugin to the standard
browser API:

- `aep.js:96306` (`validateCoordinates`) — on native failure, if `allow_mobile_web_gui?`
  is set, calls `navigator.geolocation.getCurrentPosition(...)`.
- `aep.js:88821` (`getProofs`) — same fallback.

That fallback path works on web. The browser returns coordinates, and the client builds
the request body correctly. The wall is the **request header**, not the body.

## What actually gets sent to `/validate_location`

Request body (`_validateCurrentLocation`, `aep.js:96320`) — plain JSON, nothing special:

```json
{
  "ids": [/* target ids */],
  "order_id": 123,
  "shift_id": 456,
  "location": { "lat": 48.1, "long": 11.5, "accuracy": 10 },
  "proof": null,
  "reason": null
}
```

Posted by `validateLocation` to `/service_units/validate_location` and
`/services/validate_location` (`aep.js:19090`, `aep.js:19152`).

Both posts attach headers built by `v()` (`aep.js:15988`):

```js
const { data: publicKey } = await axios.get("/mobile_device_token_public_key");
return { "X-AEP-W2GO-TOKEN": (await Token.generate({ publicKey })).value };
```

## The blocker

`Token` is a Capacitor plugin. On a native device it produces a signed
device-attestation value. **On the web there is no native implementation** — the web stub
`generate()` returns `{ value: undefined }` (`aep.js:15976`). So from a browser every
`validate_location` request goes out with `X-AEP-W2GO-TOKEN: undefined`.

The backend validates that token (it hands out the public key from
`/mobile_device_token_public_key` precisely so the native device can produce a matching
signed token). A web client cannot generate a valid one — that's by design; the token
exists to prove the request came from a genuine, un-mocked device.

**This is the single thing blocking us.** We cannot and should not fabricate this token on
the client — doing so would mean forging the attestation the check exists to enforce. It
has to be the server that decides to accept the `allow_mobile_web_gui?` web path without
a native token.

## What we need from the backend

Pick one — whichever fits the security model:

1. **Exempt the web-GUI path from the token check.** When a request comes from a user with
   `allow_mobile_web_gui?` = true, skip `X-AEP-W2GO-TOKEN` validation on
   `/service_units/validate_location` and `/services/validate_location`. This matches the
   intent of the flag (location from web is explicitly allowed for these users).

2. **Issue a web-scoped token.** Give `/mobile_device_token_public_key` (or a new endpoint)
   a web path that returns a token the server will accept for flagged users, so the web
   client has a legitimate value to send.

Either way the decision and the implementation are server-side. The client already sends
the correct body and already attempts the header.

## Open questions for the backend dev

- Which middleware / controller validates `X-AEP-W2GO-TOKEN` on the two
  `validate_location` endpoints? That's where the exemption or web-token acceptance goes.
- Is `allow_mobile_web_gui?` meant to bypass attestation, or only to enable the web GUI?
  If attestation must stay mandatory even for these users, then web location validation is
  **not achievable from a browser** and that needs to be the answer to the boss.
- There is a separate client-side bug worth noting while you're in here: the native-device
  guard tests `Capacitor.isNativePlatform` without calling it (`aep.js:6858`,
  `aep.js:6684`), so a function reference is always truthy and the "not a native device"
  branch never fires on web. Not our blocker, but it means the intended `device.not_native`
  message never shows.

## What the extension side does today (for context)

The GPS Faker extension (`src-bex/inject.js`) only shapes the **browser** side so the web
fallback can be exercised: it overrides `navigator.geolocation` with the chosen
coordinates, reports the geolocation permission as granted, and forces the client's local
view of `allow_mobile_web_gui?` / `isNativePlatform` so the fallback path runs. None of
that can satisfy the server-side token check — that gap is what this document is about.

## Bottom line for the boss

The remaining work is a backend change (one of the two options above) that only the API
team can make. It cannot be completed from the extension, and it should not be forced
client-side by faking the attestation token. Until the backend exempts or web-enables the
token for `allow_mobile_web_gui?` users, web location validation stays blocked.
