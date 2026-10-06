# Agent instructions

## Repo overview

TraceDiary: a no-build, vanilla-JS + Bootstrap 5 frontend backed by JSON Server.
There is no bundler, transpiler, test runner, linter, or typechecker. Ship by editing
files directly and opening `index.html`.

- `index.html` — markup; Bootstrap 5.3.3, Bootstrap Icons, and axios loaded from CDN.
  Early inline script sets `data-bs-theme` from `localStorage` to avoid theme flash.
- `scripts.js` — all app logic (fetch, list/detail render, mobile toggle, console panel).
  Loaded as a plain global script, not a module.
- `style.css` — custom overrides plus the console output panel styles.
- `data/entries.json` — the data store. JSON Server reads and writes this file.
- `.doc/spec.md` — requirements + JSON schema. `.doc/enhancemet-1.md` (note the typo in
  the filename) — phased roadmap of known gaps/bugs. `.doc/Gemini_Generated_wireframe.jpeg`.

## Commands

- `npm install`
- `npm run mock-api` — starts JSON Server at `http://localhost:3000`, collection `/entries`.
- `npm test` — placeholder that exits 1; there are no tests.
- Frontend: no dev-server script. Open `index.html` directly, or serve the folder statically.

## Data & API

- Entry fields: `id`, `timestamp` (ISO 8601 UTC), `category`, `title`, `symptom`,
  `tried`, `rootCause`, `fix`, `lesson`. All required. `id` is a string (e.g. `"entry-001"`).
- Categories enum: `MQL5`, `Data Pipeline`, `Backtesting`, `Infrastructure`. Defined in
  both `<select>`s in `index.html` and documented in `.doc/spec.md` — update all three.
- `scripts.js:2` hardcodes `API_URL = "http://localhost:3000/entries"`; there is no env
  loading. The README's `VITE_API_URL` advice is aspirational, not implemented.
- JSON Server 0.17.x persists POST/PUT/PATCH/DELETE back into `data/entries.json`. Review
  or restore with `git diff -- data/entries.json` after mutation testing.

## Gotchas

- The frontend script is `scripts.js` (plural). README and `.doc/spec.md` refer to
  `script.js` / `data.js`, which do not exist.
- The app is read-only despite the UI. `#openFormBtn`, `#editEntryBtn`, `#deleteEntryBtn`,
  and the `#entryModal` form exist in HTML but have no JS handlers; create/edit/delete are
  unimplemented.
- Known issues tracked in `.doc/enhancemet-1.md`: `formatDate` prints a literal `dd`,
  the resize handler only handles growing, unchecked `innerHTML` interpolation (XSS),
  and missing loading/empty/error states.
- `package.json` has an unused bogus dependency `jason-server` (typo). The real dependency
  is `json-server@0.17.4`. The README's `1.0.0-beta.15` instructions do not match the
  installed version — trust `package.json` and `node_modules`.
- Mobile layout switches list/detail with `d-none` below a 768px breakpoint
  (`showDetailViewMobile` / `showListViewMobile` in `scripts.js`).
- No CI, pre-commit hooks, or `opencode.json`.

# Agent instructions

## Simplicity first

- Prefer the smallest correct implementation.
- Make minimal, focused diffs.
- Follow the patterns already present in nearby code.
- Reuse existing utilities and dependencies before adding new ones.
- Do not introduce packages, frameworks, classes, design patterns, wrapper layers,
  helper modules, or configuration unless the task cannot be completed correctly without them.
- Do not refactor, rename, reformat, or reorganize unrelated code.
- Prefer direct, readable JavaScript over clever or overly generic solutions.
- Avoid premature abstraction: duplicate a few simple lines when that is clearer than
  creating a reusable abstraction.
- Keep the existing API stable unless the task explicitly requires an API change.
- Where this file conflicts with a rule below, simplicity first wins.

## Code conventions

- Semicolons always; never rely on ASI. Egyptian braces, explicit braces on every block.
- One `let`/`const` per line; no comma-separated multiline declarations.
- Use `async`/`await`; every promise chain has an error consumer. No nested callbacks.
- Verb-prefixed function names (`fetch...`, `render...`, `show...`, `format...`).
- Keep the code style already used in `scripts.js` / `index.html` (2-space indent,
  section banner comments).

## Naming

- Use UPPERCASE_WITH_UNDERSCORES only for hard-coded compile-time constants
  (e.g. `COLOR_RED = "#F00"`). Runtime-evaluated constants use camelCase.
- Use meaningful, consistent domain names; avoid single letters, cryptic abbreviations,
  and generic names like `data` or `val` outside very short isolated scopes.
- One variable, one concept: never reassign a different data type or unrelated concept.
- Prefix functions with a verb matching their behavior: `get...` (retrieve value),
  `calc...` (compute and return), `create...` (instantiate), `check...` (boolean test),
  `show...`/`render...` (UI display).
- A function does only what its name implies; no undisclosed side effects.
- Prefix subclass-accessible internals with `_` by convention; use native `#field`
  private class fields only when strict encapsulation is required.

## Structure and functions

- Break complex operations into small, single-purpose helper functions whose outputs
  feed cleanly into downstream functions.
- Place main logic / public exports at the top of the module, helper declarations below
  (hoisting); readers should see what the code does before how.
- Design modules around data structures and standalone functions; do not wrap state in
  unnecessary object abstractions.
- Separate side-effect functions (DOM, logging, mutation) from pure functions that
  return new values; prefer composable, testable pure functions.
- Preserve `this` binding when passing methods as callbacks: arrow functions,
  `.bind(this)`, or arrow class fields.

## Async and errors

- Use async/await as the primary async mechanism; use clean `.then()` chaining only
  outside async functions or at module root. Never nested callbacks.
- Every Promise chain has an error consumer (`.catch()` or `try...catch`); in browsers,
  register a global `unhandledrejection` listener.
- Use `Promise.all` when all parallel operations must succeed; `Promise.allSettled`
  when individual outcomes must be monitored.
- No blanket catches: analyze caught exceptions and rethrow unexpected error types.
- Extend `Error` only when the task genuinely needs typed/domain error handling
  (e.g. a caller must distinguish failure modes). Base classes set
  `this.name = this.constructor.name`. Otherwise use plain `throw new Error(...)`.
- Wrap low-level exceptions (e.g. `SyntaxError` from `JSON.parse`) in a domain error
  when a boundary exists, retaining the original via the `cause` property.

## Documentation and comments

- Write self-descriptive code: names and structure should carry the intent; do not
  comment simple or obvious code (trivial assignments, standard loops, self-evident names).
- Add a docstring to every exported or public function, class, and module you create
  or substantially modify: parameters, return values, side effects, thrown errors,
  and non-obvious assumptions.
- Internal (non-exported) helpers do not require docstrings when self-descriptive;
  reserve inline comments for high-level architecture, interaction flows, complex
  algorithms, and non-obvious *why* explanations.
- Complexity annotations (`// Time: O(...), Space: O(...)`) are the sanctioned exception
  to the no-trivial-comments rule; keep them accurate and up to date.
- Match the existing docstring/comment style of the file and language.

## Workflow

- First inspect the relevant files and identify the smallest change.
- State the intended files to change before making edits.
- Ask for clarification if requirements conflict with existing project conventions.
- Run only the most relevant existing validation, test, or lint command after changes.
- Summarize changed files, behavior, and verification when finished.

## Performance and memory

### Time complexity
- Always compute and state the Big-O time and space complexity for proposed code.
- Prefer O(1), O(log n), O(n). Avoid O(n²) or worse unless the problem inherently requires it.
- Use appropriate data structures: Set/Map for O(1) lookups, arrays for iteration.
- Avoid nested loops over the same dataset; use a single pass with a hash map.
- Annotate complex functions with `// Time: O(...), Space: O(...)`.
- For critical paths, suggest a benchmark using `performance.now()`.

### Memory leaks
- Always provide cleanup for: event listeners, timers/intervals, fetch/AbortController, subscriptions, and observers.
- Use `WeakMap`/`WeakSet` for caches keyed by objects.
- Avoid global variables; use module scope.
- In React, return a cleanup function from `useEffect`.
- Avoid closures that capture large objects unnecessarily; null out references when done.
- Limit cache sizes; use LRU if unbounded growth is possible.

## Testing and tooling

- Follow "one test checks one thing": separate independent assertions into dedicated
  `it(...)` blocks so failures produce unambiguous diagnostics.
- Rely on ESLint (or the project's existing linter) for formatting and bug detection;
  run it as the default validation command when no test command is relevant.
- Do not add transpilers (Babel) or polyfills (core-js) unless the target environment
  demonstrably requires them.