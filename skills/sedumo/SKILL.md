---
name: sedumo
description: Build software that prints labels and documents through Sedumo (sedumo.com): an ERP, WMS, MES, web shop or line app sending prints to label printers (Zebra ZPL, EPL, TSPL, SBPL, ESC/POS, DPL, IPL) and office printers through Sedumo's API and its workers. Use this skill whenever someone mentions Sedumo, api.sedumo.com, a `sedumo_mt_` token, a Sedumo worker or its local API (port 7647), printing labels from their system "through Sedumo", Oracle WMS label XML going to Sedumo, or wants code that prints, previews or follows a Sedumo print — even if they only say "print our pallet labels from the ERP" in a project that already uses Sedumo.
---

# Building on Sedumo

Sedumo prints labels from other software. An app sends one request: **a document, a printer and data**. Sedumo
queues it, and a **Sedumo worker** (a small program on a PC next to the printers) fills in the label and prints it.
The same requests also work against the worker itself, on the plant network, when the internet is down.

The full guide, with every option, is at https://developers.sedumo.com/guides/api; live examples of every way to
print, each with its request, are at https://developers.sedumo.com/examples. `references/api.md` (next to this file)
has the request and answer shapes, the error codes and the limits: read it when you write the calls.

## What to get right

These are the things an integration most often gets wrong. Each one costs a reprint, a lost label or a leaked token.

1. **The token stays on a server.** A Sedumo API token (`sedumo_mt_…`) can print for the whole account. Keep it in an
   environment variable or secret store on the server and call Sedumo from there; Sedumo's cloud refuses calls from
   browsers anyway. Never put it in front-end code, a mobile app, a log line or a repository. (The one exception, a web
   page printing through a worker on the plant network, uses a token valid on workers only; see the reference.)
2. **Name every print with an `Idempotency-Key`.** A print whose answer didn't arrive (a timeout, a dropped
   connection) may already be queued. Send each print with a key of your own that's the same for every attempt at that
   print (the order line's id, the pallet's SSCC), then retrying is safe: Sedumo answers again with the first answer
   and prints nothing more. Without it, a retry prints twice.
3. **"Queued" isn't "printed".** `POST /print` answers `201` as soon as the print is queued. Follow it with
   `GET /print-jobs/{jobId}` (about once a second, not faster) until `completed` or `failed`, and show `error` to a
   person when it fails. A print can also wait in `processing` with `waiting` (the printer's head is open, it's out of
   paper): show that, don't treat it as a failure.
4. **Let Sedumo check the values, and show its reason.** Labels designed in Sedumo know their required fields, choices,
   dates and numbers. A print that can't work is refused at once with `400`, a `message` meant for a person and often a
   `code` (`value_required`, `value_not_a_choice`, `value_not_a_date`, …) with the field and the record. Show the
   message; don't duplicate Sedumo's rules in your app.
5. **Values are text.** Every value in `data` is a string: `"48"`, not `48`; dates as `2026-12-10` (or the label's input
   format), numbers as `12345.67` (or its input format).
6. **Batch a run into one print.** Many labels go in one request (`records`, or `common` and `changes`), not one
   request per label: fewer calls (they count against the plan's limit), and the labels print together, in order.
7. **Respect `429` and `503`.** Past the plan's calls a minute or a day, Sedumo answers `429` with `Retry-After`
   (seconds): queue the print and send it after that, not at once. Planned maintenance answers `503` with `code:
   "maintenance"`, `Retry-After` and `until`: keep the work and send it again later, with its Idempotency-Key.
8. **Keep the `X-Request-Id`.** Every answer carries one (or yours, if you send `X-Request-Id`). Log it beside the
   call, without the `Authorization` header; it's how a failed call is found in Sedumo's logs.
9. **Offline is the same API on another address.** For a line that must keep printing without the internet, send the
   same request to the worker (`http://127.0.0.1:7647`, or its address on the plant network) when the cloud can't be
   reached. The token must be made valid on workers too, and the worker prints only labels it already has.

## The print request

```http
POST https://api.sedumo.com/print
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: order-4711-line-2

{
  "document": { "path": "Dispatch/Pallet label.template" },
  "printerId": "<printer id>",
  "data": { "values": { "product": "Milk 1 l", "lot": "L2026-10" }, "copies": 2 },
  "onBehalfOf": { "id": "u-17", "name": "Ana Novak" }
}
```

- **document:** `{ "path": "Folder/Name.template" }` (by name, what people see in Sedumo), `{ "id": … }`, or
  `{ "sha256": … }` to pin an exact version. A file made by your system goes in the request:
  `{ "content": "^XA…^XZ", "kind": "stream" }` for ZPL, `{ "content": "<base64>", "kind": "stream", "encoding":
  "base64" }` for a PDF (to a printer set up for PDFs). An Oracle WMS label XML is `{ "content": "<?xml…",
  "kind": "oracle_xml" }` without `printerId` and `data`, or the XML itself as the body with
  `Content-Type: application/xml`.
- **printerId:** from `GET /printers`. Check its `status` (`ready`, `error` with `statusReason` such as `head_open`,
  `offline`, `unknown`) and `worker.status` before printing if a person is waiting, and leave out printers whose
  `language` is `null`.
- **data**, one of three shapes:
  - one record: `{ "values": {…}, "copies": 2 }`
  - many, each in full: `{ "records": [ {…, "copies": 2 }, {…} ] }`
  - what all share, then only what changes: `{ "common": {…}, "changes": [ { "serial": "0001" }, { "serial": "0002" } ] }`
    (a value carries on until a later record changes it; `""` empties it)
  A file without `{{hooks}}` still takes `{ "values": {} }` with its copies. Sedumo has no counters: your app counts
  (pallet numbers, serials) and sends them as `changes`; equal labels in a row can be one record with `copies`.
- **onBehalfOf** (optional, required by some accounts): which of your app's users pressed Print; Sedumo's history shows
  "Ana Novak (through your-app)".
- **settings** (optional, ZPL and EPL): `{ "darkness": 25, "speedMmS": 51 }` for this print only.

To know a label's fields, read it once (`GET /designer/templates/{id}`): its `variables` list each name with
`caption`, `input` (`text`, `number`, `date`, `choice` with `choices`), `required` and `help`, enough to build a form.
`POST /print/preview` takes the same body and answers a PNG of the first label, one pixel per printer dot; ask for it
when typing pauses, not on every key.

## When writing the integration

- Ask which token permissions the app needs and say so: `print`, `printers:read`, `documents:read`, `jobs:read` cover
  most apps; `documents:write` only if it saves labels. A token can also be limited to some printers or labels by tags.
- Put the Sedumo calls in one small client module on the server (base URL from configuration, token from the
  environment), so the rest of the app never sees the token and the base URL can point at a worker.
- Map Sedumo's answers to what the app's user sees: printed, waiting (and why), failed (Sedumo's `error`), refused
  (Sedumo's `message`). Keep `jobId` and `X-Request-Id` with the order in your own data.
- Test against a real Sedumo account; https://developers.sedumo.com/examples prints on demo printers and shows each
  request, including the refusals.
