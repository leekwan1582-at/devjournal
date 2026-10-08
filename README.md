# TraceDiary

# JSON Server Setup

This project uses [JSON Server](https://github.com/typicode/json-server) to provide a mock REST API from:

```text
data/entries.json
```

The API exposes the top-level `entries` collection at:

```text
/entries
```

## Requirements

- Node.js and npm
- This repository cloned locally or opened in GitHub Codespaces
- A valid `package.json`

Check the installed versions:

```bash
node --version
npm --version
```

## Project Structure

The relevant files are:

```text
.
├── data/
│   └── entries.json
├── package.json
└── package-lock.json
```

Example `data/entries.json`:

```json
{
  "entries": [
    {
      "id": 1,
      "title": "First entry",
      "content": "Example"
    }
  ]
}
```

## Install JSON Server

Install JSON Server as a local development dependency from the repository root:

```bash
npm install --save-dev json-server@1.0.0-beta.15
```

This creates or updates:

- `node_modules/`
- `package-lock.json`
- `devDependencies` in `package.json`

The dependency should appear similar to this:

```json
{
  "devDependencies": {
    "json-server": "1.0.0-beta.15"
  }
}
```

> JSON Server v1 is a beta release and may contain breaking changes. Pinning the exact version helps keep the development environment reproducible.

## Add the npm Script

Add the following script to the existing `scripts` object in `package.json`:

```json
{
  "scripts": {
    "mock-api": "json-server data/entries.json --host 0.0.0.0 --port 3000 --middlewares ./ai-proxy.js"
  }
}
```

The `--middlewares ./ai-proxy.js` flag also enables the AI entry review endpoint. If you only want the mock REST API, drop that flag.

Do not create a second top-level JSON object. For example, this is invalid:

```json
{
  "dependencies": {},
  {
    "scripts": {}
  }
}
```

The `scripts` property must be part of the same top-level object.

Validate the file before running npm:

```bash
python -m json.tool package.json
```

## Option 1: GitHub Codespaces

### Start the server

Open a terminal in the Codespace and run:

```bash
npm install
npm run mock-api
```

The server must remain running in the terminal.

The `--host 0.0.0.0` option allows GitHub Codespaces to reach the service through its forwarded port.

### Test inside the Codespace

Open a second terminal and run:

```bash
curl -i http://localhost:3000/entries
```

A successful response should include:

```text
HTTP/1.1 200 OK
```

followed by the JSON data.

### Forward port 3000

Open the **Ports** panel in VS Code.

If port `3000` is not listed:

1. Select **Add port**.
2. Enter `3000`.
3. Press Enter.
4. Open the forwarded port using **Open in Browser**.

GitHub Codespaces supports automatic and manual port forwarding. A forwarded port can be private, organization-visible, or public depending on the selected visibility. [GitHub Codespaces port forwarding](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)

The endpoint will have a URL similar to:

```text
https://<codespace-name>-3000.app.github.dev/entries
```

The exact URL may change when the Codespace or forwarded port changes. Do not hard-code it in application code; use an environment variable instead. [GitHub Codespaces troubleshooting](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-port-forwarding-for-github-codespaces)

### Test the forwarded endpoint

From the Codespace terminal:

```bash
curl -i \
  https://<codespace-name>-3000.app.github.dev/entries
```

From a browser, open:

```text
https://<codespace-name>-3000.app.github.dev/entries
```

### Troubleshoot HTTP 502

An HTTP `502 Bad Gateway` usually means that the Codespaces tunnel cannot reach a running service on port `3000`.

Check the following:

```bash
npm run mock-api
```

Then, from another terminal:

```bash
curl -i http://localhost:3000/entries
```

Check whether a process is listening:

```bash
ss -tlnp | grep ':3000'
```

If the local request fails, JSON Server is not running correctly.

If the local request succeeds but the forwarded URL returns `502`:

1. Confirm the forwarded port is `3000`.
2. Confirm JSON Server was started with `--host 0.0.0.0`.
3. Remove and re-add port `3000` in the **Ports** panel.
4. Confirm that the Codespace has not stopped.
5. Restart the server after restarting the Codespace.

### Optional `devcontainer.json` configuration

To request automatic forwarding for port `3000`, add this to `.devcontainer/devcontainer.json`:

```json
{
  "forwardPorts": [3000]
}
```

This does not start JSON Server automatically. It only configures the port for forwarding.

### Codespaces security

JSON Server supports write operations, including requests such as:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Use a public forwarded port only with non-sensitive test data. Prefer a private port unless external access is required.

## Option 2: Local Repository

### Install dependencies

From the repository root:

```bash
npm install
```

If JSON Server has not yet been installed:

```bash
npm install --save-dev json-server@1.0.0-beta.15
```

### Start the server

```bash
npm run mock-api
```

For a local computer, the server is available at:

```text
http://localhost:3000
```

The entries endpoint is:

```text
http://localhost:3000/entries
```

### Test the endpoint

Use a browser or run:

```bash
curl -i http://localhost:3000/entries
```

Expected response:

```json
[
  {
    "id": 1,
    "title": "First entry",
    "content": "Example"
  }
]
```

### Run JSON Server directly

You can also start the server without the npm script:

```bash
npx json-server data/entries.json --port 3000
```

The locally installed project version is used by `npx`.

## Frontend API Configuration

Do not hard-code the Codespaces URL throughout the application.

For a local frontend, use:

```env
API_URL=http://localhost:3000
```

For a frontend running outside the Codespace, use the forwarded URL:

```env
API_URL=https://<codespace-name>-3000.app.github.dev
```

Example JavaScript:

```javascript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function getEntries() {
  const response = await fetch(`${API_URL}/entries`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}
```

For Vite, the environment variable must use the `VITE_` prefix:

```env
VITE_API_URL=http://localhost:3000
```

Then access it with:

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

## AI Entry Review (DeepSeek)

TraceDiary can send a single log entry to [DeepSeek](https://api.deepseek.com) for an automated rubric review (symptom clarity, environment context, `tried`, root cause, fix, lesson, technical accuracy). The result appears inline in the detail pane under **AI Review**.

**The API key never reaches the browser.** The page calls a local endpoint, `POST /api/ai-review`, served by `ai-proxy.js` — a JSON Server middleware that holds the key and forwards the request to DeepSeek.

### How it works

```text
Browser (ai.js)
      │  POST /api/ai-review  { entry }
      ▼
JSON Server + ai-proxy.js middleware   ← reads .env, holds the API key
      │  POST /chat/completions  (Authorization: Bearer …)
      ▼
DeepSeek API
      │  { review }
      ▼
Browser renders the review inline
```

### Prerequisites

- Node.js 18 or newer (uses the global `fetch`; this project targets Node 22)
- A DeepSeek account and API key: <https://platform.deepseek.com/api_keys>

### Step-by-step setup

**1. Create the `.env` file** in the repository root (next to `package.json`):

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-flash
```

If a template is present, copy it instead:

```bash
cp .env.example .env
```

Then edit `.env` and paste your real key. Put no spaces around `=` and no quotes around the value.

The middleware loads `.env` with `override: true`, so these values take precedence over any `DEEPSEEK_*` variables already exported in your shell. Variables are read once at startup, so **restart `npm run mock-api` after any change to `.env`.**

**2. Confirm `.env` is ignored by Git**

`.env` is listed in `.gitignore`. Verify:

```bash
git check-ignore .env
```

If it prints nothing, the file is already tracked. Untrack it without deleting it:

```bash
git rm --cached .env
```

**3. Install dependencies**

```bash
npm install
```

**4. Start the mock API with the AI middleware**

`npm run mock-api` already includes the middleware:

```bash
npm run mock-api
```

Equivalent direct command:

```bash
npx json-server data/entries.json --host 0.0.0.0 --port 3000 --middlewares ./ai-proxy.js
```

You should see `Loading ./ai-proxy.js` in the output. The server must stay running.

**5. Use it in the app**

Open `index.html` in a browser (or serve the folder statically). Select an entry in the list, then click the robot icon in the detail pane header. The review appears below the entry, rendered from Markdown (via `marked`, loaded from cdnjs) and sanitized with `DOMPurify` before insertion. If those CDN scripts are unavailable, the raw text is shown instead. The button is disabled while the request is in flight. Once a review is shown, **Copy** and **Download** buttons appear in the AI Review header — both use the raw Markdown, and Download saves a `.md` file.

### Configuration reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | Yes | — | Bearer token for the DeepSeek API. |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | API base URL; a `/v1` suffix also works. |
| `DEEPSEEK_MODEL` | No | `deepseek-flash` | Model name passed to the API. |

### Test the endpoint without the UI

With the server running:

```bash
curl -X POST http://localhost:3000/api/ai-review \
  -H "Content-Type: application/json" \
  -d '{
    "entry": {
      "id": "entry-001",
      "timestamp": "2026-10-05T19:30:00Z",
      "category": "MQL5",
      "title": "Array out of range in OnTick",
      "symptom": "EA halts with error 4002.",
      "tried": "Printed the buffer size.",
      "rootCause": "Indicator handle re-initialized inside the event loop.",
      "fix": "Moved initialization to OnInit().",
      "lesson": "Separate handle allocation from tick logic."
    }
  }'
```

A successful response looks like:

```json
{ "review": "- Scores table …\n- Top 3 gaps …\n- Rewritten section …\n- Overall verdict: Revise" }
```

### Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Could not reach the AI review service.` | The mock API is not running, or the page cannot reach `http://localhost:3000`. Run `npm run mock-api`. |
| `Server is missing DEEPSEEK_API_KEY.` | `.env` is missing/empty or the key line is malformed. Use `DEEPSEEK_API_KEY=...` with no spaces around `=`. |
| `DeepSeek API error (HTTP 401).` | The key is invalid or revoked. Generate a new one at <https://platform.deepseek.com/api_keys>. |
| `DeepSeek API error (HTTP 402).` | The DeepSeek account has insufficient balance. Add credit or use another key. |
| Edited `.env` but the error is unchanged | The server reads `.env` only at startup (and now overrides the shell). Restart `npm run mock-api`. |
| `The AI review timed out.` | The request exceeded 60 seconds. Retry, or pick a faster model with `DEEPSEEK_MODEL`. |
| `Loading ./ai-proxy.js` never appears | `npm run mock-api` is out of date. Run the direct `npx json-server … --middlewares ./ai-proxy.js` command above. |

### Security notes

- The API key is read only by `ai-proxy.js` on the server and is never sent to the browser.
- Keep `.env` out of Git (`git check-ignore .env`). If a key was ever committed, rotate it.
- The request includes the full entry text; only send entries you are comfortable sharing with the DeepSeek API.

## Useful API Requests

Retrieve all entries:

```bash
curl http://localhost:3000/entries
```

Retrieve one entry:

```bash
curl http://localhost:3000/entries/1
```

Filter entries:

```bash
curl "http://localhost:3000/entries?title=First%20entry"
```

Create an entry:

```bash
curl -X POST http://localhost:3000/entries \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Second entry",
    "content": "Created through the API"
  }'
```

Update an entry:

```bash
curl -X PATCH http://localhost:3000/entries/1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated content"
  }'
```

Delete an entry:

```bash
curl -X DELETE http://localhost:3000/entries/1
```

The data file may be modified by write requests. Use Git to review or restore changes when testing:

```bash
git diff -- data/entries.json
```

## Stop the Server

Press:

```text
Ctrl+C
```

in the terminal where JSON Server is running.

## Git Files

Commit these files:

```text
package.json
package-lock.json
data/entries.json
ai.js
ai-proxy.js
.env.example
```

Do not commit `node_modules/` or `.env`.

Add this entry to `.gitignore`:

```gitignore
node_modules/
.env
```

`.env` holds the DeepSeek API key used by the AI review middleware and must never be committed. A committed API key is compromised — rotate it.

## Quick Start

### GitHub Codespaces

```bash
npm install
npm run mock-api
```

Then forward port `3000` and open:

```text
https://<codespace-name>-3000.app.github.dev/entries
```

### Local repository

```bash
npm install
npm run mock-api
```

Then open:

```text
http://localhost:3000/entries
```
