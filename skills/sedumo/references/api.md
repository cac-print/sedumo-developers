# Sedumo API reference for integrations

The details behind SKILL.md. The full guide with examples is https://developers.sedumo.com/guides/api; every route
with its fields is at https://api.sedumo.com/docs.

**Contents:** Calls · The print answer · Following a print · Files · Oracle WMS XML · Offline: the worker's local API ·
A web page on the plant network · Errors · Limits

## Calls

Base URL `https://api.sedumo.com` (a worker: `http://127.0.0.1:7647`, see below). Every call:
`Authorization: Bearer <token>`. JSON in and out unless said.

| Call | Permission | What |
| --- | --- | --- |
| `GET /printers` | `printers:read` | Printers: `id`, `name`, `aliases`, `language` (`ZPL`, `EPL`, `TSPL`, `SBPL`, `ESC/POS`, `DPL`, `IPL`, `PDF`, or `null`), `dpi`, `status`, `statusReason`, `queueCount`, `worker` (`id`, `name`, `status`, `platform`) |
| `GET /workers` | `workers:read` | The PCs that print |
| `GET /documents?q=.template` | `documents:read` | Labels (names that contain the text: keep those ending in `.template`); `?tagId=` for a tag's. Each: `id`, `name`, `path`, `sha256` |
| `GET /designer/templates/{id}` | `documents:read` | A label: `template.size` (`widthMm`, `heightMm`) and `template.variables` (`name`, `example`, `caption`, `input`, `choices`, `required`, `startsWith`, `default`, `help`; each only when set) |
| `POST /print` | `print` | Print (SKILL.md, "The print request") |
| `POST /print/preview` | `print` or `documents:read` | The same body; a PNG of the first label. Headers `Sedumo-Preview-Mode` (`raster`: exactly this; `native`: a ZPL printer draws it, may differ a little) and `Sedumo-Labels` (how many the data makes). Cloud only |
| `GET /print-jobs/{jobId}` | `jobs:read` | A print the token made (never anyone else's) |
| `POST /blobs/upload-link` | `print` or `documents:write` | An upload link for a file over 14 MB (below) |
| `GET /designer/image?path=/Images/x.png` | `documents:read` | An image a label prints from your data, to show it in your app |

Things a token may not see are simply not there: lists leave them out, and asking by id answers `404`.

## The print answer

`201`, as soon as it's queued:

```json
{
  "jobId": "4b2d…",
  "printerId": "…",
  "workerId": "…",
  "status": "queued",
  "queuedAt": "2026-11-01T09:12:04.120Z",
  "document": { "sha256": "…", "kind": "template" },
  "labels": 2
}
```

`labels` is how many labels the data makes. With an `Idempotency-Key` (1 to 200 visible characters, remembered 24
hours, your token's own), the same request again gets this answer again with `Idempotent-Replayed: true`. The same key
with a different request: `422`, `code: "idempotency_key_reused"` (use a new key). The same key while the first is
still running: you usually just wait; otherwise `409`. A refused print (`400`) used no key.

## Following a print

`GET /print-jobs/{jobId}`:

```json
{
  "jobId": "4b2d…",
  "status": "completed",
  "error": null,
  "errorCode": null,
  "labelCount": 2,
  "waiting": null,
  "queuedAt": "…",
  "updatedAt": "…"
}
```

- `queued`: waiting for the worker (it picks prints up within a few seconds while online).
- `processing`: the worker has it. With `waiting` (`{ "reason": "head_open", "since": "…" }`) it waits for the
  printer (head open, out of paper, paused): it prints once that's fixed. Show the reason; it isn't a failure.
- `completed`: the printer took it (`labelCount` labels). Paper coming out isn't seen.
- `failed`: `error` in words for a person. `errorCode` names some: `deleted_in_queue`, `aborted_in_queue`,
  `printer_deleted`, `worker_removed`, `lost_while_printing` (may have printed; not sent again). Show `error` for a
  code you don't know.

## Files

- ZPL your system makes: `{ "content": "^XA…^XZ", "kind": "stream" }`. Write `{{name}}` where a value goes and send
  `data` as for a label; the worker fills them in, once per record. Values go in as they are, so `^` or `~` in a value
  changes the printer's commands. A ZPL file prints only on a ZPL printer.
- A PDF: base64 with `"encoding": "base64"`, to a printer whose `language` is `PDF`. A PDF with form fields that's
  stored in Sedumo takes `data` like a label: each field gets the value of its name.
- A file stored in Sedumo (uploaded by a person in Documents): by `path`, `id` or `sha256`, with `{ "values": {} }`.
- Up to 14 MB in the request (base64 grows a file by a third; a request may be 20 MB). Up to 50 MB: ask
  `POST /blobs/upload-link` with `{ "sha256": "<hex>", "sizeBytes": n }`; `{ "exists": true }` means Sedumo has it
  already, otherwise `PUT` the bytes to `uploadUrl` (2 hours, exactly that size), then print with
  `"document": { "sha256": … }`.

## Oracle WMS XML

`_FORMAT` names a Sedumo label (its name without `.template`), `_PRINTERNAME` a printer by its name or one of its
aliases, `_QUANTITY` the copies (a `<label>`'s own wins), each `<label>` one label's `<variable name="…">` values.
Send it as the whole body with `Content-Type: application/xml`, or in JSON as `{ "document": { "content": "<xml>",
"kind": "oracle_xml" } }` without `printerId` and `data`. Sedumo checks each label first (`record` in an error is the
label's place in the XML).

## Offline: the worker's local API

Every worker answers the same requests on its PC: `http://127.0.0.1:7647` (on the plant network only if the plant
sets the worker to listen there, `WORKER_LOCAL_API_BIND`; ask for its address).

- Routes: `POST /print`, `GET /print-jobs/{id}`, `GET /printers`, `GET /workers`, `GET /documents`, with the same
  answers. Only that worker's printers. No preview and no reading a label's variables: read those while online and
  keep them.
- The token must be made valid **on the workers** (or both). Offline the worker prints only labels whose file it
  already has (printed there before, or kept there in advance by tag); otherwise `409`.
- `Idempotency-Key` works the same; each worker keeps its own keys, apart from the cloud's.
- What it printed offline appears in Sedumo's history once it's online.
- No plan limit on calls. 10 wrong tokens in 15 minutes from one address lock that address for 15 minutes (`429`); a
  valid token keeps working.
- A common pattern: send to the cloud; on a network error (not a `4xx`), send the same request, with the same
  Idempotency-Key, to the worker.

## A web page on the plant network

A page on a PC without the worker prints through a worker over HTTPS, offline too: the account's admin turns on
**Print from other PCs** on the worker and adds the page's origin under **Browser apps**. The worker's address is
`https://<name>.lan.sedumo.com:7648` (shown on its Edit dialog), with a certificate browsers trust. The page calls the
same routes with a token **valid on workers only**: that's the one token that may live in a browser. Chrome asks once
whether the page may reach the local network. Some routers block such names ("DNS rebinding protection"); the plant
adds an exception for `lan.sedumo.com`.

## Errors

JSON with `message` for a person (`"No ZPL 300 dpi stream in Pallet label"`), sometimes `code`. A body that doesn't
match: `{ "message": "Validation failed", "errors": [ { "path": "data.values.lot", "message": … } ] }`.

| Status | Means |
| --- | --- |
| `400` | Can't work: a missing field, no version of the label for the printer's language, a bad value. Codes: `value_required`, `value_not_a_choice`, `value_not_a_date`, `value_not_a_number`, `value_does_not_fit`, with `variable` and `record` (from 1) |
| `401` | No token, a wrong, expired or revoked one, or one not valid here (cloud or workers) |
| `403` | The token lacks the permission; or (saving) the plan's storage is full |
| `404` | No such printer, label or print, or the token may not see it |
| `409` | Worker offline: it doesn't have the label's file. Cloud: the same Idempotency-Key still running |
| `422` | `idempotency_key_reused`; or (preview) a label Sedumo can't draw as a picture yet |
| `429` | Past the plan's calls a minute or a day: wait `Retry-After` seconds (`retryAfterSeconds` in the body) |
| `503` | Planned maintenance: `{ "code": "maintenance", "until": …, "status": "https://status.sedumo.com" }` with `Retry-After` |
| `5xx` | Sedumo's fault: try again a little later; give Sedumo the `X-Request-Id` if it lasts |

Every answer has `X-Request-Id` (send your own, up to 64 of letters, digits and `. _ : -`, to have it used).

## Limits

- 100,000 labels in one print; send bigger runs as several.
- A file: 14 MB in the request, 50 MB through an upload link.
- `onBehalfOf`: `id` and `name`, 200 characters each.
- Calls a minute and a day by the plan, all of the account's tokens together, prints included; a worker's local API
  has none. Poll a print at most once a second; preview when typing pauses.
- Every limit: https://developers.sedumo.com/guides/limits
