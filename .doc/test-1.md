# TraceDiary — Automated Testing Plan (`test-1`)

**Status:** Proposed
**Runtime:** Node.js v22 (`node:test` + `--experimental-test-coverage` available)
**Runner:** Node's built-in test runner (no new dependencies)
**Default run:** fully offline and mocked (never calls a live server or the real DeepSeek API)

---

## 1. Objective

Add fast, deterministic automated tests for TraceDiary's logic, make `npm test` meaningful
(it currently just exits 1), and guard the read path, CRUD, theming, and the AI review proxy
against regressions — without introducing a build step or new runtime dependencies.

## 2. Current state

- **No test runner.** `package.json` `test` script is `echo "Error: no test specified" && exit 1`.
- **No test directory** (`test/`, `tests/`, `__tests__/` do not exist) and no CI workflows.
- **Architecture:** no bundler/modules. `data.js`, `scripts.js`, and `ai.js` are plain global
  scripts loaded by `index.html`; `ai-proxy.js` is the only CommonJS module
  (`module.exports = (req, res, next) => …`).
- **Dependencies:** only `json-server` (dev) and `dotenv` (+ the stray `jason-server`). The app
  itself pulls Bootstrap, Bootstrap Icons, axios, SweetAlert2, marked, and DOMPurify from CDNs.
- **Browser globals used at load:** `document`, `window.matchMedia`, `navigator`, `localStorage`,
  `axios`, `bootstrap`, `Swal`, `marked`, `DOMPurify`, `fetch`.

These globals are why the plan centres on a small `node:vm` loader rather than importing files.

## 3. Strategy (test pyramid)

1. **Unit (majority):** pure and logic-heavy functions in `data.js`, `scripts.js`, `ai.js`,
   `ai-proxy.js`, exercised in a `node:vm` sandbox with stubbed globals.
2. **Integration (small):** the `ai-proxy.js` middleware with the global `fetch` mocked —
   request routing, status mapping, and the DeepSeek request shape.
3. **Out of scope (future):** live `json-server` CRUD tier and Playwright E2E. Listed under
   §11 so the boundary is explicit.

Every test must be deterministic and offline. Axios and `fetch` are always mocked.

## 4. Tooling

- **Runner:** `node:test` (`node --test`).
- **Assertions:** `node:assert/strict`.
- **Coverage:** `node --test --experimental-test-coverage`.
- **No** Jest/Mocha/jsdom required for the tiers in scope.

Rationale: matches the repo's "no bundler / minimal dependencies / edit files directly"
convention, and Node 22 already ships everything needed.

## 5. Test harness

Because `data.js` / `ai.js` / `scripts.js` are global scripts with no exports, add
`test/helpers/load-bundle.js`, which:

1. Reads the script sources in load order (`data.js` → `ai.js` → `scripts.js`).
2. Runs them in a **shared `node:vm` context** seeded with stubs:
   - `document` — element factory supporting `getElementById`, `createElement`,
     `createTextNode`, `body`, `addEventListener`, `querySelector`/`querySelectorAll`,
     `classList`, `dataset`, `style`, `replaceChildren`, `insertBefore`.
   - `window` — `matchMedia`, `addEventListener`, `isSecureContext`, `setTimeout`, `scrollTo`,
     `alert`, `confirm`.
   - `navigator` — `clipboard.writeText` (spy).
   - `localStorage` — in-memory Map.
   - `axios` — mock whose `create()` returns a configurable fake (`get`/`post`/`put`/`delete`).
   - `bootstrap`, `Swal`, `marked`, `DOMPurify` — minimal fakes.
   - `API_URL` / `CATEGORY_OPTIONS` — pre-seeded so `ai.js`/`scripts.js` load cleanly.
3. Appends a small **epilogue** to expose lexically-scoped state and internals that are `const`/
   `let` (and therefore not on the context global), e.g.:

   ```js
   globalThis.__test = {
     setEntriesState: (v) => { entriesState = v; },
     getActiveEntryId: () => activeEntryId,
     setActiveEntryId: (v) => { activeEntryId = v; },
   };
   ```

Function declarations (`function foo() {}`) already land on the context global and can be
called directly.

Supporting helpers:
- `test/helpers/axios-mock.js` — records `{ method, url, body }`, returns canned responses,
  and can be told to reject with an axios-style error.
- `test/helpers/fetch-mock.js` — installs an in-process `global.fetch` spy for the proxy tests.

## 6. Directory layout

```
test/
  helpers/
    load-bundle.js
    dom-stub.js
    axios-mock.js
    fetch-mock.js
  fixtures/
    entries.js          # sample Entry objects (valid, duplicate id, invalid timestamp)
    review.md           # sample AI review Markdown (table, headings, fenced code)
  unit/
    format.test.js      # escapeHtml, formatDate, isTypingTarget, categoryBadgeHtml
    filters.test.js     # sortEntries, filterAndSortEntries
    errors.test.js      # describeRequestError, describeAiReviewError, describeUpstreamStatus
    theme.test.js       # getStoredTheme, applyTheme, cycleTheme
    data.test.js        # data.js CRUD via axios mock
    ai-helpers.test.js  # aiReviewFilename, copy fallback, downloadTextFile, formatEntry, buildChatCompletionsUrl
    ai-proxy.test.js    # ai-proxy.js unit (formatEntry/url/status + middleware)
  integration/
    ai-middleware.test.js  # middleware end-to-end with fetch mocked
```

## 7. Test matrix

### 7.1 `data.js` (axios mocked)

| Function | Cases |
|---|---|
| `getEntries` | returns the current store array |
| `findEntryIndexById` | string vs number id coercion; missing id → `-1` |
| `findEntryById` | found → entry; missing → `undefined` |
| `fetchEntries` | success replaces the store; non-array body throws an `Error` with `unexpectedShape = true`; store stays `[]` on shape error |
| `createEntry` | `POST /entries`; adds ISO `timestamp`; pushes `response.data` to the store |
| `updateEntry` | `PUT /entries/:id`; preserves stored `id` and `timestamp`; replaces the entry in place |
| `deleteEntry` | `DELETE /entries/:id`; splices the matching entry |

### 7.2 `scripts.js` (DOM stubbed)

| Function | Cases |
|---|---|
| `escapeHtml` | `<`, `>`, `&`, `"`, `'`; `null`/`undefined` → `""`; numbers coerced |
| `formatDate` | valid ISO; invalid → `"Unknown date"`; empty/`null` |
| `isTypingTarget` | input/textarea/select/contenteditable vs a plain element |
| `categoryBadgeHtml` | known category gets its icon; unknown falls back to default; extra classes |
| `sortEntries` | returns a copy (input not mutated); each key (`date-desc`, `date-asc`, `title-asc`, `category-asc`); unknown sort → input order |
| `filterAndSortEntries` | category match; case-insensitive search over `title`/`symptom`/`fix`; empty query returns all; no match → `[]`; `"default"` preserves order |
| `collectEntryFormPayload` | trims each field; missing element → `""` |
| `getMissingFields` | lists empty field names |
| `describeRequestError` | `unexpectedShape`; HTTP response; `ECONNABORTED`; `request` only; generic |
| `getStoredTheme` | unset → `"system"`; valid value; invalid value → `"system"`; storage throw |
| `applyTheme` | `"system"` + `matchMedia.matches`; explicit light/dark; updates toggle icon/label; sets `data-bs-theme` |
| `cycleTheme` | cycles system → light → dark → system and persists |

### 7.3 `ai.js` (DOM + navigator stubbed)

| Function | Cases |
|---|---|
| `aiReviewFilename` | `entry-001`; sanitizes `a/b c#1`; missing id; returns `.md` with a date |
| `describeAiReviewError` | `response.data.error`; status-only; `ECONNABORTED`; network |
| `copyTextToClipboard` | async Clipboard path (secure context); `execCommand` fallback; failure → `false` |
| `downloadTextFile` | creates and revokes an object URL; sets filename |
| `bindAiReviewActions` | copy click copies raw Markdown; download click triggers a `.md` download |

### 7.4 `ai-proxy.js`

| Function | Cases |
|---|---|
| `formatEntry` | emits `<entry>` block with fields in the fixed order; missing fields → `""` |
| `buildChatCompletionsUrl` | trailing slash and none; `/v1` base; default base |
| `describeUpstreamStatus` | `401`, `402`, `429`, other 4xx, `5xx` |
| `requestReview` | missing `DEEPSEEK_API_KEY` → error with `statusCode 500`; correct URL, `Authorization: Bearer`, `model`, `stream:false`; non-OK upstream → mapped error; empty content → `502` |
| middleware | non-POST or wrong path → `next()` called; missing `entry` → `400`; success → `200 { review }`; upstream `401/402/429` propagate; `AbortError` → `504` |

## 8. Integration tests (`ai-proxy.js` middleware)

Use `test/helpers/fetch-mock.js` to stub `global.fetch`, then invoke the exported middleware
with fake `req`/`res` objects:

- `req = { method: "POST", path: "/api/ai-review", body: { entry } }`
- `res = { status(code){ return this }, json(payload){ this.body = payload } }`
- `next = () => { called = true }`

Assert status codes, JSON bodies, the outgoing DeepSeek request (URL/method/headers/body), and
the `next()` passthrough for unrelated routes. Set `process.env.DEEPSEEK_*` per test and restore
after (no `.env` reads, no network).

## 9. Coverage

- Script: `node --test --experimental-test-coverage "test/**/*.test.js"`.
- **Target:** ~80% of pure/logic code in `data.js`, `ai.js`, `ai-proxy.js`, and the logic
  helpers in `scripts.js`.
- **Implementation note:** `--experimental-test-coverage` only instruments modules loaded via
  `require`. The app scripts are executed inside `node:vm`, so their lines are **not** in the
  Node coverage report (it currently covers the helpers/fixtures/tests). Full app coverage would
  need `c8`/`nyc` or extracting logic into modules; that is out of scope for `test-1`.
- **Excluded (documented):** CDN-bound rendering (`marked`/`DOMPurify` internals), DOM event
  wiring that only exists at runtime, and `index.html`.

## 10. npm scripts and CI

`package.json`:

```json
{
  "scripts": {
    "test": "node --test \"test/**/*.test.js\"",
    "test:coverage": "node --test --experimental-test-coverage \"test/**/*.test.js\""
  }
}
```

`.github/workflows/test.yml` (Node 22):

```yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

## 11. Out of scope (future work)

- **Live `json-server` CRUD tier:** start JSON Server on an ephemeral port against a temp copy
  of `data/entries.json`, then exercise `GET/POST/PUT/DELETE`. Opt-in only (never in the default
  `npm test`).
- **Playwright E2E:** serve the app + mock API and drive the real UI (FAB, form, filters,
  detail actions, AI review with a stubbed network route).
- **Mutation testing / coverage thresholds** beyond the ~80% goal.

## 12. Risks and constraints

- **No exports:** tests depend on the `node:vm` loader + epilogue; adding new top-level `const`/
  `let` state requires updating the epilogue. Keep the loader in sync.
- **CDN globals:** `axios`, `bootstrap`, `Swal`, `marked`, `DOMPurify` are absent in Node and must
  be stubbed; only logic is tested, not the libraries.
- **Cost & determinism:** never call the real DeepSeek API in tests; always mock `fetch`.
- **`.env` handling:** tests set `process.env.DEEPSEEK_*` directly and restore it; they must not
  read or require `.env`.

## 13. Phased rollout

| Phase | Scope | Outcome |
|---|---|---|
| P0 ✅ | Harness (`load-bundle.js`, stubs) + pure helpers (`format`, `filters`, `errors`, `theme`) | `npm test` runs and covers scripts.js logic |
| P1 ✅ | `data.js` CRUD with the axios mock | read path + CRUD regression safety |
| P2 ✅ | `ai-proxy.js` unit + middleware integration with the fetch mock | AI review backend covered offline |
| P3 ✅ | `ai.js` helpers (filename, copy/download, action binding) with DOM stubs | AI review frontend logic covered |
| P4 ✅ | Coverage script + GitHub Actions workflow | enforced on push/PR |
| P5 ✅ | `scripts.js` DOM/event flows + category drift guard | app rendering/events and category consistency covered |
