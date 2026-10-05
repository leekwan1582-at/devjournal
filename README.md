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
    "mock-api": "json-server data/entries.json --host 0.0.0.0 --port 3000"
  }
}
```

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
```

Do not commit `node_modules/`.

Add this entry to `.gitignore`:

```gitignore
node_modules/
```

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
