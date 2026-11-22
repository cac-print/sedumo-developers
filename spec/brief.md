# Brief

**Goal (2026-11-22):** one public place where a developer learns everything needed to build on Sedumo: read how it
works, try every way to print live on real Sedumo, copy the request in their own language, and later run it on their
own Sedumo account. Partners who build for their customers are the first readers. The code is public (MIT) so they can
copy any part of it.

## The site

| Section    | What is in it                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start      | What Sedumo is for a developer, a quick start (token, printer, print), and a path for each kind of app: an ERP or warehouse system, a line that keeps printing offline, a web app on the plant network, an AI assistant |
| Guides     | Sedumo's guides for developers and plant IT: the API guide, running workers (plant IT), worker setup, AI assistants, limits. Their text is Sedumo's manual, fetched when the site is built, never edited here               |
| Examples   | Every way to print, a page each, in three columns: the cases, the page that prints, and how it works (when to use it, the request as it is built, the code, the answer)                                                    |
| Reference  | Error codes, printer languages, how a worker's local API differs from the cloud's; every route is at https://api.sedumo.com/docs                                                                                              |
| Changes    | Later: what changed in the API, and how long old behaviour keeps working                                                                                                                                                       |

Guides and examples link both ways: each example has "Read in the guide", each guide section that has an example has
"Try it".

## Examples

- **Print from your system:** a label (by id, path or exact version; darkness and speed); many labels in one print
  (records, or only what changes); a series with counters.
- **Your own files:** your own ZPL; a file stored in Sedumo; a PDF your system made; a PDF form Sedumo fills.
- **Integrations:** an Oracle WMS XML.
- **Reliability:** a retry that never prints twice (`Idempotency-Key`); printing through the worker when the internet
  is down; a web page on the plant network printing to a worker.

Each shows the request it sends as it is built, the answer, and the print's status until it is printed or refused
with Sedumo's reason.

**The demo printers.** The examples print to Sedumo's demo account, on simulated printers: one per printer language
Sedumo supports, plus printers that show what goes wrong: a Zebra whose head is always open and an office printer
always out of paper (a print waits, as it would in a plant, and prints at night when the demo resets), and a printer
that is switched off. Don't enter real data: everyone uses the same demo printers.

**Code in fourteen languages:** curl, C#, VB.NET, Java, Python, Node, PHP, Go, Ruby, PowerShell, and for code that
runs inside an application ABAP (SAP), X++ (Dynamics 365 Finance and Operations), AL (Business Central) and Excel VBA,
made from the same request the page sends. All that run on their own are run in the checks.

**Your own account:** paste a token that lives a day and may only print and read; it is kept in the browser tab, sent
with each request to this site's server, used for that request and never stored or logged. Later: sign in with Sedumo
instead of pasting a token.

## Rules

- **The token stays on the server.** Sedumo's cloud takes calls from servers, not browsers; the examples call Sedumo
  only from this site's server (`src/lib/server/`), the way an app should.
- **Texts in the manual's style:** plain words, the names on Sedumo's screens exactly as they are, only public links.
- **Each example is its own route folder**, so a developer copies the one they need with the shared client.

## Later

What the printer received, byte for byte; sign in with Sedumo; the Changes section; a test printer in Sedumo that
needs no worker.
