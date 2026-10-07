# TraceDiary — Phase 0.0 Filing Document

**Project:** TraceDiary — Quant & Algo Log
**Phase:** 0.0 — Console Output Panel + Theme Early-Load Script
**Status:** ✅ Complete
**Date Completed:** 2026-10-06
**Next Phase:** Phase 1 — Mobile View Toggle

---

## 1. Phase Objective

Establish two foundational, low-risk improvements before functional work begins:

1. **Console Output Panel** — an in-app, user-visible log surface to observe fetch results, errors, and mutation events without relying on devtools.
2. **Theme Early-Load Script** — a 6-line `<head>` snippet that reads `localStorage` and sets `data-bs-theme` on `<html>` before first paint, preventing a future flash-of-wrong-theme when the full toggle ships in Phase 9.

Both are **orthogonal** to CRUD, mobile layout, and read-path polish. They add capability without touching functionality.

---

## 2. Rationale

### Why a console panel for this app
TraceDiary is a debugging/learning log for quant & algo work — visible system output is thematically on-brand. It surfaces:
- how many entries were retrieved
- fetch failures with error messages
- (future) mutation results from CRUD operations

### Why the early-load script now
Once a user picks a theme in Phase 9, that preference must persist across reloads **without a flash**. The mechanism that reads `localStorage` and writes the attribute must run **before paint** — i.e., in `<head>`. Adding it now costs nothing and prevents a two-script drift problem later.

### Why not the full theme toggle now
The full toggle requires sweeping every hardcoded color class (`bg-light`, `navbar-dark`, `text-light`, hex values in `style.css`, injected markup in `scripts.js`). That work is Phase 9, after all markup is final.

---

## 3. Deliverables

| # | Deliverable | File | Status |
|---|---|---|---|
| 1 | Console HTML section | `index.html` | ✅ |
| 2 | Console CSS (dark terminal look, color-coded lines) | `style.css` | ✅ |
| 3 | `logMessage(kind, text)` + `clearConsole()` + DOM refs | `scripts.js` | ✅ |
| 4 | Instrumented `fetchEntries` with array-shape guard | `scripts.js` | ✅ |
| 5 | Clear-console button wired in `DOMContentLoaded` | `scripts.js` | ✅ |
| 6 | Theme early-load IIFE in `<head>` | `index.html` | ✅ |
| 7 | `data-bs-theme="light"` default on `<html>` | `index.html` | ✅ |

---

## 4. File Changes

### 4.1 `index.html`

**Change A — `<html>` tag**
```html
<html lang="en" data-bs-theme="light">
```
Provides a safe default if the early-load script fails.

**Change B — Early-load theme script in `<head>`**
```html
<!-- Early-load theme script: sets data-bs-theme before paint to prevent flash -->
<script>
  (() => {
    const stored = localStorage.getItem('theme') || 'system';
    const resolved = stored === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : stored;
    document.documentElement.setAttribute('data-bs-theme', resolved);
  })();
</script>
```

**Change C — Console section in `<main>`, after `.row g-4`, before the modal**
```html
<!-- Console Output Panel -->
<section id="console-container" class="console-container" hidden>
  <div class="d-flex justify-content-between align-items-center mb-2">
    <h2 class="h6 mb-0 fw-semibold text-muted">
      <i class="bi bi-terminal me-1"></i>Console Output
    </h2>
    <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" id="clearConsoleBtn" title="Clear console">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
  <div
    id="console-output"
    class="console-output"
    role="status"
    aria-live="polite"
  ></div>
</section>
```

---

### 4.2 `style.css`

Appended at the bottom:

```css
/* ── Console Output Panel ───────────────────────────── */
.console-container {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.console-output {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas,
               "Liberation Mono", "Courier New", monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  max-height: 220px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #4a4a4a #1e1e1e;
}

.console-output::-webkit-scrollbar { width: 8px; }
.console-output::-webkit-scrollbar-track { background: #1e1e1e; }
.console-output::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 4px; }

.console-line { white-space: pre-wrap; word-break: break-word; }

.console-line--info    { color: #9cdcfe; }
.console-line--success { color: #6a9955; }
.console-line--warn    { color: #dcdcaa; }
.console-line--error   { color: #f48771; }
```

---

### 4.3 `scripts.js`

**Change A — DOM references (top of file)**
```js
const consoleContainer = document.getElementById("console-container");
const consoleOutput    = document.getElementById("console-output");
const clearConsoleBtn  = document.getElementById("clearConsoleBtn");
```

**Change B — Console module**
```js
const CONSOLE_MAX_LINES = 100;

function logMessage(kind, text) {
  if (!consoleOutput) return;

  const line = document.createElement("div");
  line.className = `console-line console-line--${kind}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  consoleOutput.appendChild(line);

  while (consoleOutput.childElementCount > CONSOLE_MAX_LINES) {
    consoleOutput.firstElementChild.remove();
  }

  consoleContainer.hidden = false;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  if (!consoleOutput) return;
  consoleOutput.innerHTML = "";
  consoleContainer.hidden = true;
}
```

**Change C — Instrumented `fetchEntries`**
```js
async function fetchEntries() {
  logMessage("info", `Fetching entries from ${API_URL}`);
  try {
    const response = await axios.get(API_URL);

    if (!Array.isArray(response.data)) {
      logMessage("warn", `Unexpected response shape (expected array, got ${typeof response.data})`);
      entriesState = [];
    } else {
      entriesState = response.data;
      const n = entriesState.length;
      logMessage("success", `Loaded ${n} ${n === 1 ? "entry" : "entries"}`);
    }

    renderEntriesList(entriesState);
  } catch (err) {
    logMessage("error", `Failed to load entries: ${err.message}`);
    console.error("Failed to load entries:", err);
  }
}
```

**Change D — `DOMContentLoaded` handler**
```js
document.addEventListener("DOMContentLoaded", () => {
  fetchEntries();

  document.getElementById("backToListBtn").addEventListener("click", showListViewMobile);
  clearConsoleBtn.addEventListener("click", clearConsole);

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      document.getElementById("listView").classList.remove("d-none");
      document.getElementById("detailView").classList.remove("d-none");
    }
  });
});
```

---

## 5. Behavior Specification

### Console Panel

| Event | Behavior |
|---|---|
| Page load, server up | Two lines: `info` "Fetching entries from …" then `success` "Loaded N entries" |
| Page load, server down | `info` line then `error` line with message |
| Non-array response | `warn` line; `entriesState` set to `[]`; list renders empty |
| Panel visible at start | Hidden — unhides on first `logMessage` |
| Clear button click | Empties `#console-output`, hides panel |
| Line count > 100 | Oldest line removed (FIFO) |
| New line added | Auto-scrolls to bottom |

### Theme Early-Load

| Scenario | Resolved `data-bs-theme` |
|---|---|
| No `localStorage.theme` + OS light | `light` |
| No `localStorage.theme` + OS dark | `dark` |
| `localStorage.theme = "light"` | `light` (regardless of OS) |
| `localStorage.theme = "dark"` | `dark` (regardless of OS) |
| `localStorage.theme = "system"` | Follows OS preference |

**Important:** As of Phase 0.0, the attribute flips but **the visible UI does not** — `bg-light`, `navbar-dark bg-dark`, and hardcoded hex colors in `style.css` override Bootstrap's variables. Full theme response is deferred to Phase 9.

---

## 6. Verification Checklist

- [x] Console panel appears below the split-pane row, full width
- [x] Panel hidden on initial load until first `logMessage`
- [x] "Fetching…" line appears immediately on page load
- [x] "Loaded N entries" line appears once data returns
- [x] Killing server and reloading produces a red error line
- [x] Clear button empties panel and re-hides it
- [x] No `null`-reference errors in devtools
- [x] Lines cap at 100 (verified via temporary `CONSOLE_MAX_LINES = 5`)
- [x] Screen-reader announcement via `role="status" aria-live="polite"`
- [x] `<html>` element carries `data-bs-theme` attribute on load
- [x] `localStorage.setItem('theme','dark')` + reload flips the attribute
- [x] No visible theme change (expected — deferred to Phase 9)

---

## 7. Known Limitations (Intentionally Deferred)

| Limitation | Deferred To |
|---|---|
| No logging inside `renderEntriesList` (would flood on every filter change) | Never — log at event sites, not render sites |
| No user-facing error state in list view | Phase 2 |
| No collapse/expand toggle for console | Phase 7 (if noisy) |
| No theme dropdown UI | Phase 9 |
| No OS-preference-change listener while app is open | Phase 9 |
| Hardcoded light classes still override theme | Phase 9 |
| Console panel keeps dark terminal look in both themes | Phase 9 (decide: fixed-dark or theme-aware) |
| `formatDate` literal `dd` bug | Phase 2 |
| Mobile view toggle issues (initial state, shrink, debounce) | Phase 1 |

---

## 8. Interaction With Future Phases

- **Phase 1 (Mobile):** No conflict. Console panel sits below the split view and remains visible in both mobile states.
- **Phase 2 (Read Polish):** Error state for empty list will route through `logMessage` — one consistent error mechanism instead of two.
- **Phases 3–5 (CRUD):** Each mutation will emit a `logMessage("success"|"error", …)` at the call site.
- **Phase 9 (Theming):** The early-load script is already in place; Phase 9 only adds the dropdown UI, the OS-change listener, and the class-name sweep.

---

## 9. Acceptance Criteria — Met

- [x] Console panel visible on demand
- [x] Errors surfaced in-app, not only in devtools
- [x] Line count bounded
- [x] Accessible to screen readers
- [x] No regressions to existing fetch/render behavior
- [x] `data-bs-theme` set before first paint
- [x] Default `<html data-bs-theme="light">` prevents failure-mode flash

---

## 10. Sign-Off

**Phase 0.0:** ✅ Complete
**Regression check:** ✅ Passed
**Proceed to Phase 1:** ✅ Authorized

**Phase 1 scope (next):**
- Fix initial mobile state on load (`showListViewMobile()` if `window.innerWidth < 768`)
- Handle desktop → mobile resize (currently only grows, never shrinks)
- Debounce resize handler
- Cache `listView` / `detailView` DOM references
- Add `#listView` scroll container (prerequisite for the sticky header behavior discussed)

---

*End of Phase 0.0 filing document.*