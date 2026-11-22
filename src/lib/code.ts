// The request an example sends, as a program in each language a developer may use: the same JSON, the same headers,
// the token from the environment. A PDF sent with the request is read from a file (`document.pdf`) and sent as base64.
// `scripts/run-code.ts` runs every one that runs on its own and checks what each sends (in CI against a local
// server); ABAP, X++, AL and VBA run only inside their application, so they are written the same way but not run.
import { API_URL, curlFor, type PrintRequest } from './print-request.ts';

export const LANGUAGES = [
	{ id: 'curl', name: 'curl' },
	{ id: 'csharp', name: 'C#' },
	{ id: 'vbnet', name: 'VB.NET' },
	{ id: 'java', name: 'Java' },
	{ id: 'python', name: 'Python' },
	{ id: 'node', name: 'Node.js' },
	{ id: 'php', name: 'PHP' },
	{ id: 'go', name: 'Go' },
	{ id: 'ruby', name: 'Ruby' },
	{ id: 'powershell', name: 'PowerShell' },
	// Each runs only inside its application (`onlyIn`), so our checks can't run it.
	{ id: 'abap', name: 'ABAP', onlyIn: 'SAP' },
	{ id: 'xpp', name: 'X++', onlyIn: 'Dynamics 365 Finance and Operations' },
	{ id: 'al', name: 'AL', onlyIn: 'Dynamics 365 Business Central' },
	{ id: 'vba', name: 'Excel VBA', onlyIn: 'Microsoft Excel' }
] as const;

export type Language = (typeof LANGUAGES)[number]['id'];

/** The application a language runs in, when it runs only there (an ERP, Excel). */
export const onlyIn = (language: Language) => (LANGUAGES.find((l) => l.id === language) as { onlyIn?: string } | undefined)?.onlyIn;

export type CodeOptions = {
	path?: string;
	apiUrl?: string;
	headers?: Record<string, string>;
	// AL only: the PDF made by a Business Central report (the Business Central page); else your PDF goes in yourself.
	alReport?: boolean;
};

/** The file a program reads when the request sends a PDF (or any file as base64). */
export const PDF_FILE = 'document.pdf';
// Where the file's base64 goes in a request written out as JSON text (all but Python, Node.js, PHP and Ruby).
const PDF_MARK = `<${PDF_FILE} as base64>`;

/** The request as a program in `language`. */
export function codeFor(language: Language, request: PrintRequest, options: CodeOptions = {}): string {
	const { path = '/print', apiUrl = API_URL, headers = {}, alReport = false } = options;
	const url = `${apiUrl}${path}`;
	const pdf = 'content' in request.document && request.document.encoding === 'base64';
	if (language === 'curl') return curlFor(request, path, apiUrl, headers);
	const make = { csharp, vbnet, java, python, node, php, go, ruby, powershell, abap, xpp, al, vba }[language];
	return make({ request, url, headers, pdf, alReport });
}

type Parts = { request: PrintRequest; url: string; headers: Record<string, string>; pdf: boolean; alReport?: boolean };

// The request with the file's base64 left out: each language puts it in from `document.pdf`.
const withMark = (request: PrintRequest): PrintRequest => ({ ...request, document: { ...request.document, content: PDF_MARK } as PrintRequest['document'] });
// Characters JSON leaves as they are but some compilers take as a line break or refuse (Go a byte-order mark), as
// \u escapes: the same value once the JSON is read.
const unseen = (json: string) => json.replace(/[\u0085\u2028\u2029\ufeff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const jsonText = ({ request, pdf }: Parts) => unseen(JSON.stringify(pdf ? withMark(request) : request, null, 2));

// A string in C#, Java, Go, Python and JavaScript: JSON's escapes are theirs too.
const quoted = (s: string) => unseen(JSON.stringify(s));

// A value written in a language's own literals; `file` stands for the PDF's base64.
type Literals = {
	string: (s: string) => string;
	key: (k: string) => string;
	object: [string, string];
	array: [string, string];
	pair: string;
	empty: string;
	true: string;
	false: string;
	null: string;
	file: string;
	indent: string;
	// PHP: an array whose keys are all numbers would go as a list.
	numericKeys?: (text: string) => string;
};

function literal(value: unknown, l: Literals, depth = 0, pdf = false): string {
	if (pdf && value === PDF_MARK) return l.file;
	if (value === null || value === undefined) return l.null;
	if (typeof value === 'boolean') return value ? l.true : l.false;
	if (typeof value === 'number') return String(value);
	if (typeof value === 'string') return l.string(value);
	const inner = l.indent.repeat(depth + 1);
	const close = l.indent.repeat(depth);
	if (Array.isArray(value)) {
		if (!value.length) return `${l.array[0]}${l.array[1]}`;
		return `${l.array[0]}\n${value.map((v) => `${inner}${literal(v, l, depth + 1, pdf)},`).join('\n')}\n${close}${l.array[1]}`;
	}
	// Left out when not set, as JSON.stringify does.
	const entries = Object.entries(value as object).filter(([, v]) => v !== undefined);
	if (!entries.length) return l.empty;
	const text = `${l.object[0]}\n${entries.map(([k, v]) => `${inner}${l.key(k)}${l.pair}${literal(v, l, depth + 1, pdf)},`).join('\n')}\n${close}${l.object[1]}`;
	return l.numericKeys && entries.every(([k]) => /^\d+$/.test(k)) ? l.numericKeys(text) : text;
}

function python({ request, url, headers, pdf }: Parts): string {
	const l: Literals = {
		string: quoted,
		key: quoted,
		object: ['{', '}'],
		array: ['[', ']'],
		pair: ': ',
		empty: '{}',
		true: 'True',
		false: 'False',
		null: 'None',
		file: `base64.b64encode(open(${quoted(PDF_FILE)}, "rb").read()).decode()`,
		indent: '    '
	};
	const header = Object.entries(headers).map(([k, v]) => `        ${quoted(k)}: ${quoted(v)},\n`).join('');
	return `# Python 3.8 or newer, nothing to install. The token in SEDUMO_TOKEN.
${pdf ? 'import base64\n' : ''}import json
import os
import urllib.error
import urllib.request

body = ${literal(pdf ? withMark(request) : request, l, 0, pdf)}

request = urllib.request.Request(
    ${quoted(url)},
    data=json.dumps(body).encode(),
    headers={
        "Authorization": "Bearer " + os.environ["SEDUMO_TOKEN"],
        "Content-Type": "application/json",
        # Name your app: some firewalls refuse Python's own name (Python-urllib).
        "User-Agent": "my-app/1.0",
${header}    },
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        print(response.status, json.load(response))
except urllib.error.HTTPError as error:
    # Refused: Sedumo says why in the answer.
    print(error.code, json.load(error))
`;
}

const identifier = /^[A-Za-z_$][\w$]*$/;
// JavaScript in single quotes: JSON's escapes, a " as it is, a ' escaped.
const jsString = (s: string) => `'${quoted(s).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`;

function node({ request, url, headers, pdf }: Parts): string {
	const l: Literals = {
		string: jsString,
		key: (k) => (identifier.test(k) ? k : jsString(k)),
		object: ['{', '}'],
		array: ['[', ']'],
		pair: ': ',
		empty: '{}',
		true: 'true',
		false: 'false',
		null: 'null',
		file: `readFileSync(${jsString(PDF_FILE)}).toString('base64')`,
		indent: '  '
	};
	const header = Object.entries(headers).map(([k, v]) => `    ${l.key(k)}: ${l.string(v)},\n`).join('');
	return `// Node.js 18 or newer, nothing to install: save as print.mjs, then node print.mjs. The token in SEDUMO_TOKEN.
${pdf ? "import { readFileSync } from 'node:fs';\n\n" : ''}const body = ${literal(pdf ? withMark(request) : request, l, 0, pdf)};

const response = await fetch(${l.string(url)}, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.SEDUMO_TOKEN}\`,
    'Content-Type': 'application/json',
${header}  },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30_000)
});
// 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
console.log(response.status, await response.json());
`;
}

// PHP: single quotes keep $ and \ as they are; text with line breaks or other control characters in double quotes.
function phpString(s: string): string {
	if (!/[\x00-\x1f\x7f]/.test(s)) return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	const escaped = s.replace(/[\\"$\x00-\x1f\x7f]/g, (c) => {
		const named: Record<string, string> = { '\\': '\\\\', '"': '\\"', $: '\\$', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
		return named[c] ?? `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`;
	});
	return `"${escaped}"`;
}

function php({ request, url, headers, pdf }: Parts): string {
	const l: Literals = {
		string: phpString,
		key: phpString,
		object: ['[', ']'],
		array: ['[', ']'],
		pair: ' => ',
		// An empty array would go as [], so an empty set of values is an object.
		empty: '(object) []',
		true: 'true',
		false: 'false',
		null: 'null',
		file: `base64_encode(file_get_contents(${phpString(PDF_FILE)}))`,
		indent: '    ',
		numericKeys: (text) => `(object) ${text}`
	};
	const header = Object.entries(headers).map(([k, v]) => `        ${phpString(`${k}: ${v}`)},\n`).join('');
	return `<?php
// PHP 7.4 or newer with the curl extension. The token in SEDUMO_TOKEN.
$body = ${literal(pdf ? withMark(request) : request, l, 0, pdf)};

$curl = curl_init(${phpString(url)});
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . getenv('SEDUMO_TOKEN'),
        'Content-Type: application/json',
${header}    ],
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);
$answer = curl_exec($curl);
if ($answer === false) {
    exit('No answer: ' . curl_error($curl) . "\\n");
}
// 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
echo curl_getinfo($curl, CURLINFO_RESPONSE_CODE), ' ', $answer, "\\n";
`;
}

function csharp(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// A raw string: the JSON exactly as it is. JSON never has three quotes in a row.
	const json = jsonText(parts);
	const header = Object.entries(headers).map(([k, v]) => `message.Headers.Add(${quoted(k)}, ${quoted(v)});\n`).join('');
	const body = pdf ? `request.Replace(${quoted(PDF_MARK)}, Convert.ToBase64String(File.ReadAllBytes(${quoted(PDF_FILE)})))` : 'request';
	return `// .NET 8 or newer: dotnet new console, then this as Program.cs. The token in SEDUMO_TOKEN.
using System.Net.Http.Headers;
using System.Text;

var request = """
${json}
""";

using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
using var message = new HttpRequestMessage(HttpMethod.Post, ${quoted(url)})
{
    Content = new StringContent(${body}, Encoding.UTF8, "application/json"),
};
message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("SEDUMO_TOKEN"));
${header}using var response = await http.SendAsync(message);
// 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
Console.WriteLine($"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
`;
}

function java(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// A text block reads \ as the start of an escape, so each of JSON's is doubled.
	const json = jsonText(parts)
		.replace(/\\/g, '\\\\')
		.split('\n')
		.map((line) => `            ${line}`)
		.join('\n');
	const header = Object.entries(headers).map(([k, v]) => `\n            .header(${quoted(k)}, ${quoted(v)})`).join('');
	const body = pdf
		? `request.replace(${quoted(PDF_MARK)}, Base64.getEncoder().encodeToString(Files.readAllBytes(Path.of(${quoted(PDF_FILE)}))))`
		: 'request';
	return `// Java 17 or newer: save as Print.java, then java Print.java. The token in SEDUMO_TOKEN.
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
${pdf ? 'import java.nio.file.Files;\nimport java.nio.file.Path;\n' : ''}import java.time.Duration;
${pdf ? 'import java.util.Base64;\n' : ''}
public class Print {
    public static void main(String[] args) throws Exception {
        String request = """
${json}
            """;
        HttpRequest http = HttpRequest.newBuilder(URI.create(${quoted(url)}))
            .header("Authorization", "Bearer " + System.getenv("SEDUMO_TOKEN"))
            .header("Content-Type", "application/json")${header}
            .timeout(Duration.ofSeconds(30))
            .POST(HttpRequest.BodyPublishers.ofString(${body}))
            .build();
        HttpResponse<String> response = HttpClient.newHttpClient().send(http, HttpResponse.BodyHandlers.ofString());
        // 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
        System.out.println(response.statusCode() + " " + response.body());
    }
}
`;
}

function go(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// A raw string can't hold a backquote: one in the JSON is added from a quoted string.
	const json = jsonText(parts).replace(/`/g, '` + "`" + `');
	const header = Object.entries(headers).map(([k, v]) => `\trequest.Header.Set(${quoted(k)}, ${quoted(v)})\n`).join('');
	const file = pdf
		? `\tfile, err := os.ReadFile(${quoted(PDF_FILE)})
	if err != nil {
		panic(err)
	}
	body = strings.Replace(body, ${quoted(PDF_MARK)}, base64.StdEncoding.EncodeToString(file), 1)
`
		: '';
	const imports = [...(pdf ? ['encoding/base64'] : []), 'fmt', 'io', 'net/http', 'os', 'strings', 'time'];
	return `// Go 1.21 or newer: save as main.go, then go run main.go. The token in SEDUMO_TOKEN.
package main

import (
${imports.map((i) => `\t"${i}"`).join('\n')}
)

const requestJSON = \`${json}\`

func main() {
	body := requestJSON
${file}	request, err := http.NewRequest("POST", ${quoted(url)}, strings.NewReader(body))
	if err != nil {
		panic(err)
	}
	request.Header.Set("Authorization", "Bearer "+os.Getenv("SEDUMO_TOKEN"))
	request.Header.Set("Content-Type", "application/json")
${header}	response, err := (&http.Client{Timeout: 30 * time.Second}).Do(request)
	if err != nil {
		panic(err)
	}
	defer response.Body.Close()
	answer, _ := io.ReadAll(response.Body)
	// 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
	fmt.Println(response.StatusCode, string(answer))
}
`;
}

// ABAP: text in backquotes, a backquote doubled; a literal holds at most 255 characters, so long lines are split.
const abapText = (s: string) => `\`${s.replace(/`/g, '``')}\``;
function abapLines(json: string): string {
	// The JSON's line breaks are only for reading it: the lines are joined without them.
	return pieces(json).map((p) => `    ${abapText(p)}`).join(' &&\n');
}

function abap(parts: Parts): string {
	const { url, headers, pdf } = parts;
	const header = Object.entries(headers)
		.map(([k, v]) => `  client->request->set_header_field( name = ${abapText(k)} value = ${abapText(v)} ).\n`)
		.join('');
	const file = pdf
		? `
  " The PDF as an xstring, from your form or spool.
  DATA pdf TYPE xstring.
  body = replace( val = body sub = ${abapText(PDF_MARK)} with = cl_http_utility=>encode_x_base64( pdf ) ).
`
		: '';
	return `REPORT zsedumo_print.
" SAP NetWeaver 7.40 or newer. Add Sedumo's certificate chain to the SSL client in STRUST first.
" The token here only to try it: keep it in your own secure store (SSF, a protected table) for real use.
PARAMETERS p_token TYPE c LENGTH 200 LOWER CASE.

START-OF-SELECTION.
  DATA(body) =
${abapLines(jsonText(parts))}.
${file}
  cl_http_client=>create_by_url(
    EXPORTING url = ${abapText(url)}
    IMPORTING client = DATA(client)
    EXCEPTIONS OTHERS = 1 ).
  IF sy-subrc <> 0.
    WRITE / 'No HTTP client for this URL.'.
    RETURN.
  ENDIF.
  client->request->set_method( 'POST' ).
  client->request->set_header_field( name = 'Authorization' value = |Bearer { p_token }| ).
  client->request->set_content_type( 'application/json; charset=utf-8' ).
${header}  client->request->set_cdata( body ).
  client->send( EXCEPTIONS OTHERS = 1 ).
  IF sy-subrc = 0.
    client->receive( EXCEPTIONS OTHERS = 1 ).
  ENDIF.
  IF sy-subrc <> 0.
    client->get_last_error( IMPORTING message = DATA(error) ).
    WRITE / error.
    RETURN.
  ENDIF.
  client->response->get_status( IMPORTING code = DATA(status) ).
  " 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
  DATA(answer) = client->response->get_cdata( ).
  WRITE: / status, answer.
  client->close( ).
`;
}

// X++: a verbatim string holds the JSON; a ' in it is written as JSON's ', so the string needs no escapes.
function xpp(parts: Parts): string {
	const { url, headers, pdf } = parts;
	const json = jsonText(parts).replace(/'/g, '\\u0027');
	const xppText = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	const header = Object.entries(headers)
		.map(([k, v]) => `        message.Headers.Add(${xppText(k)}, ${xppText(v)});\n`)
		.join('');
	const file = pdf
		? `
        // The PDF's bytes: here from a file; in your solution, from your report or document.
        System.Byte[] pdf = System.IO.File::ReadAllBytes(@'C:\Temp\${PDF_FILE}');
        request = strReplace(request, ${xppText(PDF_MARK)}, System.Convert::ToBase64String(pdf));
`
		: '';
	return `// Dynamics 365 Finance and Operations: a runnable class in your model. Keep the token in Key Vault
// (System administration > Setup > Key Vault parameters), not in the code.
internal final class SedumoPrint
{
    public static void main(Args _args)
    {
        str token = 'your Sedumo API token';
        str request = @'${json}';
${file}
        // Not "client": a word X++ keeps for itself.
        System.Net.Http.HttpClient httpClient = new System.Net.Http.HttpClient();
        System.Net.Http.HttpRequestMessage message = new System.Net.Http.HttpRequestMessage(
            new System.Net.Http.HttpMethod('POST'), ${xppText(url)});
        message.Headers.Add('Authorization', 'Bearer ' + token);
${header}        message.Content = new System.Net.Http.StringContent(request, System.Text.Encoding::get_UTF8(), 'application/json');
        System.Net.Http.HttpResponseMessage response = httpClient.SendAsync(message).Result;
        str answer = response.Content.ReadAsStringAsync().Result;
        // The status as a number (201), not its .NET name (Created).
        int status = response.StatusCode;
        // 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
        info(strFmt('%1 %2', status, answer));
    }
}
`;
}

// AL: text in single quotes, a ' doubled; long lines split.
const alText = (s: string) => `'${s.replace(/'/g, "''")}'`;

function al(parts: Parts): string {
	const { url, headers, pdf, alReport } = parts;
	const lines = pieces(jsonText(parts))
		.map((piece) => `            ${alText(piece)}`)
		.join(' +\n');
	const header = Object.entries(headers)
		.map(([k, v]) => `        Client.DefaultRequestHeaders.Add(${alText(k)}, ${alText(v)});\n`)
		.join('');
	// A report's PDF for one document (the Business Central page), or your own PDF written into the Temp Blob.
	const makePdf = alReport
		? `        // One posted shipment from report 208, Business Central's Sales - Shipment: your report's number and
        // record instead. The RecordRef keeps the report to that one document.
        ShipmentNo := '102001';
        Shipment.SetRange("No.", ShipmentNo);
        RecRef.GetTable(Shipment);
        TempBlob.CreateOutStream(PdfOut);
        Report.SaveAs(208, '', ReportFormat::Pdf, PdfOut, RecRef);
`
		: `        // Your PDF into the Temp Blob first, e.g. Report.SaveAs(..., ReportFormat::Pdf, PdfOut, RecRef) with
        // TempBlob.CreateOutStream(PdfOut).
`;
	const file = pdf
		? `${makePdf}        TempBlob.CreateInStream(PdfStream);
        Body := Body.Replace(${alText(PDF_MARK)}, Base64Convert.ToBase64(PdfStream));
`
		: '';
	const pdfVars = pdf
		? `        Base64Convert: Codeunit "Base64 Convert";\n        TempBlob: Codeunit "Temp Blob";\n${
				alReport ? `        Shipment: Record "Sales Shipment Header";\n        RecRef: RecordRef;\n        ShipmentNo: Code[20];\n        PdfOut: OutStream;\n` : ''
			}        PdfStream: InStream;\n`
		: '';
	return `// Dynamics 365 Business Central: a codeunit in your extension. Its calls out are off until an admin turns on
// Allow HttpClient Requests for it (Extension Management > Configure). The token kept in Isolated Storage
// (IsolatedStorage.Set('SedumoToken', ..., DataScope::Company) once, from a setup page).
codeunit 50100 "Sedumo Print"
{
    trigger OnRun()
    var
        Client: HttpClient;
        Content: HttpContent;
        ContentHeaders: HttpHeaders;
        Response: HttpResponseMessage;
        Token: Text;
        Body: Text;
        Answer: Text;
${pdfVars}    begin
        IsolatedStorage.Get('SedumoToken', DataScope::Company, Token);
        Body :=
${lines};
${file}        Content.WriteFrom(Body);
        Content.GetHeaders(ContentHeaders);
        ContentHeaders.Remove('Content-Type');
        ContentHeaders.Add('Content-Type', 'application/json');
        Client.DefaultRequestHeaders.Add('Authorization', 'Bearer ' + Token);
${header}        Client.Post(${alText(url)}, Content, Response);
        Response.Content.ReadAs(Answer);
        // 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
        Message('%1 %2', Response.HttpStatusCode, Answer);
    end;
}
`;
}

// Long lines of JSON in pieces of whole characters, for languages whose lines or literals are limited.
const pieces = (json: string, size = 100) =>
	json.split('\n').flatMap((line) => {
		const characters = Array.from(line);
		return Array.from({ length: Math.ceil(characters.length / size) }, (_, i) => characters.slice(i * size, i * size + size).join(''));
	});

// VB.NET and VBA: text in double quotes, a " doubled.
const vbText = (s: string) => `"${s.replace(/"/g, '""')}"`;

function vbnet(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// VB.NET also takes “, ” and ＂ as quote marks: in the JSON they are written as \u escapes, the same value.
	const json = jsonText(parts).replace(/[\u201c\u201d\uff02]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
	const lines = pieces(json).map((p) => `            ${vbText(p)}`).join(' &\n');
	const header = Object.entries(headers)
		.map(([k, v]) => `            message.Headers.Add(${vbText(k)}, ${vbText(v)})\n`)
		.join('');
	const file = pdf ? `        request = request.Replace(${vbText(PDF_MARK)}, Convert.ToBase64String(IO.File.ReadAllBytes(${vbText(PDF_FILE)})))\n` : '';
	return `' .NET 8 or newer: dotnet new console -lang VB, then this as Program.vb. The token in SEDUMO_TOKEN.
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Text

Module Program
    Sub Main()
        Dim request As String =
${lines}
${file}
        Using http As New HttpClient() With {.Timeout = TimeSpan.FromSeconds(30)}
            Dim message As New HttpRequestMessage(HttpMethod.Post, ${vbText(url)})
            message.Content = New StringContent(request, Encoding.UTF8, "application/json")
            message.Headers.Authorization = New AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("SEDUMO_TOKEN"))
${header}            Dim response = http.SendAsync(message).GetAwaiter().GetResult()
            Dim answer = response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            ' 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
            Console.WriteLine($"{CInt(response.StatusCode)} {answer}")
        End Using
    End Sub
End Module
`;
}

// Ruby: a string in double quotes takes JSON's escapes; a # is escaped, so "#{" can't start code.
// Half of a character (a lone surrogate, as from text cut short) is one Ruby can't hold: it goes as U+FFFD (�).
const rubyString = (s: string) =>
	quoted(s)
		.replace(/(?<!\\)((?:\\\\)*)\\u[dD][89a-fA-F][0-9a-fA-F]{2}/g, '$1\\ufffd')
		.replace(/#/g, '\\#');

function ruby({ request, url, headers, pdf }: Parts): string {
	const l: Literals = {
		string: rubyString,
		key: rubyString,
		object: ['{', '}'],
		array: ['[', ']'],
		pair: ' => ',
		empty: '{}',
		true: 'true',
		false: 'false',
		null: 'nil',
		file: `[File.binread(${rubyString(PDF_FILE)})].pack("m0")`,
		indent: '  '
	};
	const header = Object.entries(headers).map(([k, v]) => `request[${rubyString(k)}] = ${rubyString(v)}\n`).join('');
	return `# Ruby 2.7 or newer, nothing to install. The token in SEDUMO_TOKEN.
require "json"
require "net/http"

body = ${literal(pdf ? withMark(request) : request, l, 0, pdf)}

uri = URI(${rubyString(url)})
request = Net::HTTP::Post.new(uri)
request["Authorization"] = "Bearer #{ENV.fetch("SEDUMO_TOKEN")}"
request["Content-Type"] = "application/json"
${header}request.body = JSON.generate(body)
response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 10, read_timeout: 30) do |http|
  http.request(request)
end
# 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
puts "#{response.code} #{response.body}"
`;
}

// PowerShell: text in single quotes, a ' doubled.
const psText = (s: string) => `'${s.replace(/'/g, "''")}'`;

function powershell(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// A here-string holds the JSON; it ends only at a line starting with '@, which JSON never has. In ASCII, letters
	// beyond it as JSON's \u escapes, since Windows PowerShell 5.1 reads a file without a BOM in the PC's code page.
	const json = ascii(jsonText(parts));
	const header = Object.entries(headers).map(([k, v]) => `    ${psText(k)} = ${psText(v)}\n`).join('');
	const file = pdf
		? `$body = $body.Replace(${psText(PDF_MARK)}, [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path ${psText(PDF_FILE)}))))\n`
		: '';
	return `# PowerShell 7, or Windows PowerShell 5.1. The token in SEDUMO_TOKEN.
# Windows PowerShell 5.1 on an older Windows: TLS 1.2 first.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$body = @'
${json}
'@
${file}$headers = @{
    'Authorization' = "Bearer $env:SEDUMO_TOKEN"
${header}}
try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri ${psText(url)} -Headers $headers \`
        -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30
    # 201: queued, with its jobId.
    "$($response.StatusCode) $($response.Content)"
} catch {
    if ($_.Exception.Response) {
        # Refused: Sedumo says why in the answer.
        "$([int]$_.Exception.Response.StatusCode) $($_.ErrorDetails.Message)"
    } else {
        # No answer: the network, the name or the time ran out.
        "No answer: $($_.Exception.Message)"
    }
}
`;
}

// VBA: Excel's editor keeps text in the PC's code page, so the JSON is ASCII, every other character as JSON's \\u
// escape (the same value once read); a statement takes at most 24 line continuations, so the body is built line by line.
const ascii = (json: string) => json.replace(/[^\x20-\x7e\n]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

function vba(parts: Parts): string {
	const { url, headers, pdf } = parts;
	// The body in functions of at most 200 lines each, so a long file never makes a procedure too large for VBA.
	const lines = pieces(ascii(jsonText(parts))).map((p) => `    s = s & ${vbText(p)}`);
	const parts200 = Array.from({ length: Math.ceil(lines.length / 200) }, (_, i) => lines.slice(i * 200, i * 200 + 200));
	const bodyFunctions =
		parts200.length === 1
			? `Private Function RequestBody() As String
    Dim s As String
${parts200[0].join('\n')}
    RequestBody = s
End Function
`
			: `Private Function RequestBody() As String
    RequestBody = ${parts200.map((_, i) => `RequestBody${i + 1}()`).join(' & ')}
End Function
${parts200
	.map(
		(part, i) => `
Private Function RequestBody${i + 1}() As String
    Dim s As String
${part.join('\n')}
    RequestBody${i + 1} = s
End Function
`
	)
	.join('')}`;
	// Header values as they are: only the JSON is written in ASCII.
	const header = Object.entries(headers)
		.map(([k, v]) => `    http.setRequestHeader ${vbText(k)}, ${vbText(v)}\n`)
		.join('');
	const file = pdf
		? `    ' The PDF from ${PDF_FILE} in the workbook's folder: a folder on this PC, not OneDrive or SharePoint.
    If ThisWorkbook.Path = "" Or InStr(ThisWorkbook.Path, "://") > 0 Then
        MsgBox "Save the workbook in a folder on this PC, with ${PDF_FILE} next to it."
        Exit Sub
    End If
    body = Replace(body, ${vbText(PDF_MARK)}, FileBase64(ThisWorkbook.Path & "\\${PDF_FILE}"))
`
		: '';
	const readFile = pdf
		? `
' A file as base64, with what Windows has: ADODB reads it, MSXML encodes it.
Private Function FileBase64(path As String) As String
    Dim stream As Object, node As Object
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 1
    stream.Open
    stream.LoadFromFile path
    Set node = CreateObject("MSXML2.DOMDocument.6.0").createElement("b64")
    node.DataType = "bin.base64"
    node.nodeTypedValue = stream.Read
    stream.Close
    FileBase64 = Replace(Replace(node.Text, vbLf, ""), vbCr, "")
End Function
`
		: '';
	return `' Excel VBA on Windows: a module in your workbook (Alt+F11, Insert > Module), then run SedumoPrint.
' The token from the user's environment (SEDUMO_TOKEN), so it is never saved in the workbook.
Sub SedumoPrint()
    Dim body As String
    body = RequestBody()
${file}
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 10000, 10000, 30000, 30000
    http.Open "POST", ${vbText(url)}, False
    http.setRequestHeader "Authorization", "Bearer " & Environ("SEDUMO_TOKEN")
    http.setRequestHeader "Content-Type", "application/json"
${header}    http.send body
    ' 201: queued, with its jobId. Otherwise Sedumo says why in the answer.
    Debug.Print http.Status & " " & http.responseText
End Sub

' The request, as the page sends it. Excel's editor keeps text in the PC's code page, so letters beyond ASCII are
' written as JSON's \\u escapes: the same value once Sedumo reads it.
${bodyFunctions}${readFile}`;
}
