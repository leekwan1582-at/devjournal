# TraceDiary — Phase 8: ES Modules Migration Plan

**Status:** Proposed (not executed)
**Depends on:** all feature phases complete (P0–P5 tests green)
**Goal:** convert the three global browser scripts into real ES modules with a single
`main.js` entry, removing the implicit global coupling without regressing behavior or the test suite.

---

## 1. Objective

Migrate `data.js`, `ai.js`, and `scripts.js` from global-script wiring to native ES modules so
that `API_URL`, `CATEGORY_OPTIONS`, `entriesState`, and the shared helpers become explicit
imports/exports instead of globals.

## 2. Non-goals

- No bundler, transpiler, or framework.
- `ai-proxy.js` stays server-side (Node), independent of the browser modules.
- Keep the `data.js` and `scripts.js` **filenames** — `spec.md` / the assessment name them.

## 3. Current coupling

| Unit | Owns | Depends on |
|---|---|---|
| `data.js` | `API_URL`, `CATEGORY_OPTIONS`, `api` (axios instance), `entriesState`, `getEntries`, `findEntryIndexById`, `findEntryById`, `fetchEntries`, `createEntry`, `updateEntry`, `deleteEntry` | `document` (meta tag), `axios` |
| `ai.js` | AI review service (`requestAiReview` + helpers) | `API_URL` (data.js), `axios`, `marked`, `DOMPurify`, **`showToast`** (scripts.js) |
| `scripts.js` | UI state, DOM refs, helpers, theme, layout, console, rendering, filters, form, delete, events, `DOMContentLoaded` wiring | all of `data.js` + `ai.js` |

**Hidden cycle:** `ai.js` calls `showToast` (defined in `scripts.js`), and `scripts.js` calls
`requestAiReview` (defined in `ai.js`). This must be broken for clean imports.

## 4. Target module graph

```text
index.html  <script type="module" src="./main.js"></script>

main.js      entry: imports modules, registers DOMContentLoaded, wires listeners
  |- data.js     config + store + CRUD
  |- dialogs.js  showToast / showErrorDialog / confirmDelete   (breaks the ai <-> scripts cycle)
  |- ui.js       theme, layout, console, rendering, filters, form, events
  \- ai.js       requestAiReview (imports data.js + dialogs.js)
```

Recommended granularity: **coarse first** — `data.js`, `ai.js`, `dialogs.js`, `ui.js`, `main.js`.
A later refinement can split `ui.js` into `theme.js`, `layout.js`, `console.js`, `render.js`,
`filters.js`, `form.js`, `events.js` (the roadmap's `ui` idea).

Constants currently at the top of `scripts.js` (`FORM_FIELDS`, `SEARCH_FIELDS`, `FIELD_LABELS`,
`CATEGORY_ICONS`, `DEFAULT_CATEGORY_ICON`, `DETAIL_FIELDS`, `SORTERS`, `THEME_CYCLE`,
`THEME_ICONS`, `MAX_CONSOLE_LINES`, `SEARCH_DEBOUNCE_MS`) move into the module that owns them
(or a small `constants.js`).

## 5. Runtime changes

- `index.html`: replace the three `<script src>` tags (currently lines 368–370) with a single
  `<script type="module" src="./main.js"></script>`. Keep the inline early-theme script
  (must stay classic/non-module so it runs pre-paint).
- **Serving becomes mandatory.** Native ESM does not load over `file://` (CORS). Recommended:
  have json-server serve the app too:
  ```
  json-server data/entries.json --static . --middlewares ./ai-proxy.js
  ```
  then open `http://localhost:3000/index.html`.
- Deferred modules run after parsing and before `DOMContentLoaded`; `main.js` can init on
  `DOMContentLoaded` or run directly.

## 6. Node / test interop

ESM app syntax cannot be loaded by Node while `package.json` is `"type": "commonjs"`.
Options:

| Option | How | Cost |
|---|---|---|
| **A. `type:"module"` (recommended)** | Set `"type":"module"`, rename `ai-proxy.js` -> `ai-proxy.cjs`, convert the 8 test files + 4 helpers to ESM, loader uses `await import()` | Clean/standard; touches `package.json`, the proxy rename, and every test file |
| B. `.mjs` app modules | Keep `"type":"commonjs"`; name modules `.mjs`; CJS tests use dynamic `import()` | Breaks the `data.js`/`scripts.js` names the spec expects |
| C. `vm.SourceTextModule` | Keep everything CJS; loader parses ESM via `--experimental-vm-modules` | No renames; experimental flag + custom linker; still experimental API |

Recommended: **A**.

## 7. Test-harness migration

- Replace `load-bundle.js` with an **async** `load-app.js` that installs the same stubs on
  `globalThis` and `await import()`s the modules (cache-bust with `?t=<n>` per call for isolation).
- To minimize churn, the loader returns a **single merged object** exposing the same property
  names tests use today (`app.escapeHtml`, `app.getEntries`, `app.applyFilters`, ...), so most
  assertions are unchanged; tests mostly just gain `await`.
- **State injection** is the tricky part: module-scoped `let` state can't be reassigned across
  module boundaries. Options:
  - Export the runtime state as an object that functions mutate, e.g.
    `export const store = { entries: [], activeEntryId: null, searchTerm: "", ... }`; or
  - Export small testing accessors (`export function __testing()`).
  Recommended: the exported `store` object — clean, testable, and a modest refactor.
- Run `node --test "test/**/*.test.js"` under `type:module`; the ~152 tests update mechanically
  (`loadBundle` -> `await loadApp`, namespace access preserved by the merged loader).

## 8. JSDoc

- The `@module data` / `@module scripts` tags become real modules.
- The duplicate `Entry` / `EntryPayload` / `HttpResponse` / `RequestError` typedefs can be
  deduplicated: define them once (e.g. in `data.js`, the data layer) and reference them via real
  module links, or move them to `types.js`. `FilterOptions` (UI filter state) stays with the UI.
- Update the JSDoc command to include the module entry so cross-module type links resolve.

## 9. Step-by-step sequence (each step keeps tests green)

1. Extract `dialogs.js` (`showToast`, `showErrorDialog`, `confirmDelete`); `scripts.js`/`ai.js`
   import it — removes the cycle while still global. Tests unchanged.
2. Convert `data.js` to ESM (exports + `store` object), add `main.js`; update the loader to
   import `data.js`; run P1 tests.
3. Convert `ai.js`, then the UI (`ui.js` first, then the optional finer split).
4. Switch `index.html` to `type="module"` + `main.js`; add `--static .` to `mock-api`; manual
   browser smoke test.
5. Set `package.json` `"type":"module"`, rename `ai-proxy.js` -> `ai-proxy.cjs`, update
   `mock-api`.
6. Convert test files/helpers to ESM, make the loader async, migrate state injection; run the
   full suite.
7. Update JSDoc (dedupe typedefs) and README (testing + serving).

## 10. Risks & mitigations

- **Test-suite churn (biggest):** use the merged loader so most changes are `await`-only; do it
  in one dedicated commit.
- **`file://` no longer works:** document serving via `npm run mock-api --static .`.
- **`ai-proxy.cjs` rename:** update the `mock-api` middleware path; verify the AI endpoint
  (P2 tests + a curl smoke test).
- **Node ESM cache across tests:** cache-bust imports per call.
- **Deferred execution order:** modules run before `DOMContentLoaded`; keep the same init order.
- **Assessment names:** keep `data.js` / `scripts.js` filenames so `spec.md` still matches.

## 11. Verification

- After each step: `npm test` green.
- At the end: browse `http://localhost:3000/index.html`; exercise create/edit/delete/filter/
  theme/AI review; `npx jsdoc` produces resolved cross-module links; `git diff` scoped to the
  migration.

## 12. Rollback

Perform the migration on a branch with one commit per step; revert commits (or the branch) if
needed. The pre-migration global-script version remains in history.

## 13. Recommended baseline (decisions)

| Decision | Recommended |
|---|---|
| Module granularity | Coarse: `data.js`, `ai.js`, `dialogs.js`, `ui.js`, `main.js` (split `ui.js` later) |
| Node interop | Option **A** (`type:"module"`, `ai-proxy.cjs` rename) |
| State testability | Exported `store` object |
| Serving | json-server `--static .` |
