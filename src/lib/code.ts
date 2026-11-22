// The request an example sends, as a program in each language a developer may use: the same JSON, the same headers,
// the token from the environment. A PDF sent with the request is read from a file (`document.pdf`) and sent as base64.
// `scripts/run-code.ts` runs every one that runs outside an ERP and checks what each sends (in CI against a local
// server); ABAP, X++ and AL need their ERP, so they are written the same way but not run.
import { API_URL, curlFor, type PrintRequest } from './print-request.ts';

export const LANGUAGES = [
	{ id: 'curl', name: 'curl' },
	{ id: 'csharp', name: 'C#' },
	{ id: 'java', name: 'Java' },
	{ id: 'python', name: 'Python' },
	{ id: 'node', name: 'Node.js' },
	{ id: 'php', name: 'PHP' },
	{ id: 'go', name: 'Go' },
	// Each runs only inside its ERP (`erp`), so our checks can't run it.
	{ id: 'abap', name: 'ABAP', erp: 'SAP' },
	{ id: 'xpp', name: 'X++', erp: 'Dynamics 365 Finance and Operations' },
	{ id: 'al', name: 'AL', erp: 'Dynamics 365 Business Central' }
] as const;

export type Language = (typeof LANGUAGES)[number]['id'];

/** The ERP a language runs in, when it runs only there. */
export const erpOf = (language: Language) => (LANGUAGES.find((l) => l.id === language) as { erp?: string } | undefined)?.erp;

export type CodeOptions = { path?: string; apiUrl?: string; headers?: Record<string, string> };

/** The file a program reads when the request sends a PDF (or any file as base64). */
export const PDF_FILE = 'document.pdf';
// Where the file's base64 goes in a request written out as JSON text (C#, Java, Go, ABAP, X++, AL).
const PDF_MARK = `<${PDF_FILE} as base64>`;

/** The request as a program in `language`. */
export function codeFor(language: Language, request: PrintRequest, options: CodeOptions = {}): string {
	const { path = '/print', apiUrl = API_URL, headers = {} } = options;
	const url = `${apiUrl}${path}`;
	const pdf = 'content' in request.document && request.document.encoding === 'base64';
	if (language === 'curl') return curlFor(request, path, apiUrl, headers);
	const make = { csharp, java, python, node, php, go, abap, xpp, al }[language];
	return make({ request, url, headers, pdf });
}

type Parts = { request: PrintRequest; url: string; headers: Record<string, string>; pdf: boolean };

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
	const pieces = json.split('\n').flatMap((line) => {
		// By whole characters, so none is cut in two.
		const characters = Array.from(line);
		return Array.from({ length: Math.ceil(characters.length / 100) }, (_, i) => characters.slice(i * 100, i * 100 + 100).join(''));
	});
	return pieces.map((p) => `    ${abapText(p)}`).join(' &&\n');
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
	const { url, headers, pdf } = parts;
	const lines = jsonText(parts)
		.split('\n')
		.flatMap((line) => {
			const characters = Array.from(line);
			return Array.from({ length: Math.ceil(characters.length / 100) }, (_, i) => characters.slice(i * 100, i * 100 + 100).join(''));
		})
		.map((piece) => `            ${alText(piece)}`)
		.join(' +\n');
	const header = Object.entries(headers)
		.map(([k, v]) => `        Client.DefaultRequestHeaders.Add(${alText(k)}, ${alText(v)});\n`)
		.join('');
	const file = pdf
		? `        // The PDF from your report, e.g. Report.SaveAs(..., ReportFormat::Pdf, ...) into a Temp Blob.
        TempBlob.CreateInStream(PdfStream);
        Body := Body.Replace(${alText(PDF_MARK)}, Base64Convert.ToBase64(PdfStream));
`
		: '';
	const pdfVars = pdf ? `        Base64Convert: Codeunit "Base64 Convert";\n        TempBlob: Codeunit "Temp Blob";\n        PdfStream: InStream;\n` : '';
	return `// Dynamics 365 Business Central: a codeunit in your extension. The token kept in Isolated Storage
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
