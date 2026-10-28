# Supervisor-assisted check-in — problem statement

**Author's context:** frontend / Cordova team. This describes an operational problem and
the mechanism we believe should solve it. It needs the backend/validation team to confirm
and finish. Line references point at the built client bundle `research/aep.js`.

---

## The operational problem

Workers ("Mitarbeiter") are supposed to check in at their assigned job site. The check-in
runs a location validation that proves they're physically on site.

In practice a lot of our workers **can't complete the check-in themselves** — they don't
understand the app, or they don't have the required hardware (a device that can run the
native app with its location/attestation stack).

The real-world workaround we rely on: a supervisor ("Vorarbeiter") **verifies the worker
by phone or video call** — confirms the worker really is at their assigned spot — and then
needs to log that check-in on the worker's behalf. This verification step is the part of
the workflow that isn't properly implemented in the app yet.

## How it's being done today (and why it's the wrong mechanism)

Today the supervisor uses the GPS Faker extension (this repo) with a list of saved site
locations, sets the worker's assigned coordinates, and submits the check-in so validation
passes.

The problem with this: it makes the backend record the check-in **as if the worker's own
device measured a genuine GPS position on site**. It didn't — the supervisor's phone/video
confirmation is being disguised as a technical GPS reading. That's also why we're blocked
on the attestation token (`X-AEP-W2GO-TOKEN`, see `docs/web-location-validation.md`): the
backend is specifically checking "did a real device measure this," and a supervisor acting
on someone else's behalf can't honestly answer yes.

So faking the position is the wrong tool for this job. What we actually need is an **honest
supervisor-override check-in** that is recorded *as* a supervisor confirmation, not as a
worker GPS reading.

## The good news: the app already has the override mechanism

There is an existing, sanctioned override path in the validation component — it just needs
to be enabled and finished:

- **Server flag `skip_geo_validation`** (per service). The client derives
  `skipGeoValidation` from it: `this.shift?.services?.some(e => e.skip_geo_validation)`
  (`aep.js:60067`). **This is server data — it is set on the backend, not patched into the
  client bundle.**
- When `skipGeoValidation` is true **and** the validation has failed more than once, the UI
  shows an **"execute anyway"** button (`aep.js:102433`).
- That button calls `ignoreValidation` (`aep.js:96336`), which sets `location.forced = true`
  and resubmits to `validate_location` (`aep.js:96338`).

So the app already knows how to say "this check-in was a deliberate override, not a GPS
measurement." That is exactly the shape of the supervisor-assisted check-in we need — and
using it means we **stop faking GPS and stop needing to forge the attestation token**,
because we're no longer pretending a device measured anything.

## What we need from the backend (open questions)

1. **Does the server honour `location.forced = true`?** When a submission comes in with
   `forced: true` (via the `skip_geo_validation` → "execute anyway" path), does the backend
   accept the check-in and record it as a forced/override entry?
2. **Does `forced` / `skip_geo_validation` waive the `X-AEP-W2GO-TOKEN` requirement?** If the
   token is still mandatory even for forced submissions, web/supervisor overrides remain
   blocked and the backend needs to allow this path without native attestation.
3. **Who can trigger it?** Ideally the override is gated to the supervisor role and the
   record captures *who* overrode, *for which worker*, *when*, and *how they verified*
   (phone/video). Right now it's only gated by `skip_geo_validation` + retry count, with no
   role check and no "on behalf of / verified by" fields. We'd want those added so the
   record is auditable.

## Suggested target behaviour

A supervisor-assisted check-in that is honest and auditable:

- Supervisor is authenticated as themselves (role-gated).
- They select the worker and the assigned site; the site's reference coordinates are sent
  **explicitly as a forced override**, not as a live device reading.
- Request carries something like `forced: true`, `checked_in_by: <supervisor_id>`,
  `on_behalf_of: <worker_id>`, `verification_method: "phone" | "video"`.
- Backend accepts it without native attestation (because it's openly an override) and
  stores the audit fields.

This is a small backend addition on top of the `skip_geo_validation` / `forced` mechanism
that already exists, and it removes the need for the GPS faker in this workflow entirely.

## Why this is blocked / why it's taken so long

- Validation and token logic live in a **separate backend repo** (and the AEP/client is a
  third repo). The frontend/Cordova team can't change the validation rules.
- The two teams' **repo and prod states have diverged**, so what's deployed doesn't match
  what's in the repo, which makes it hard to tell what the server currently enforces.
- The backend owner of this area has been **out sick**, documentation is thin, and we have
  no information yet on the token/validation-key check.

## Bottom line

The missing feature is a **supervisor override check-in**, and the app already has the
`skip_geo_validation` → `forced` mechanism to build it on. It needs the backend team to
(a) confirm `forced` is accepted and (b) decide whether that path waives the attestation
token for the relevant services, plus ideally add the role gate and audit fields. It should
**not** be forced through the GPS faker, because that records a supervisor confirmation as a
genuine device GPS reading — which is the thing the validation exists to prevent.
