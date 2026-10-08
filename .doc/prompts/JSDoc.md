# Instructions for a Gen AI: Generate JSDoc for a JavaScript File

Copy the block below verbatim into your prompt, replacing the two `<<…>>` placeholders. Everything after the block explains the reasoning and the gotchas, in case you want to tune it.

---

## Prompt to give the AI

```
You are adding JSDoc comments to an existing JavaScript file so it can be processed by npx jsdoc (JSDoc 4.x, catharsis type parser). Follow these instructions in order. Do not skip steps.

Ask the user for the target JavaScript file.

Inputs
Target file: <<path/to/scripts.js>>

Backup
Make a copy of the target file, and save with a "-annotated.js" suffix before making any changes

Related files whose symbols may be referenced in @see tags: <<path/to/data.js, path/to/other.js>> (list them, or write "none")

Step 1 — Scan the file (do not edit yet)
Before writing any JSDoc, produce a short report containing:

Structure map: every top-level declaration (constants, let/var, functions, async functions, the DOMContentLoaded handler), in file order, with line numbers.

Call graph sketch: for each function, which other functions in this file it calls, and which symbols it references that live in the related files (e.g. getEntries, createEntry).

Category classification per function:

Tier A — non-trivial, async, has side effects, is called from multiple places, or has non-obvious behavior. Gets a full JSDoc block.

Tier B — small helpers where one sentence + @param/@returns is enough. Gets a one-line JSDoc.

Tier C — trivial event-binding callbacks and one-liners. Gets no JSDoc; the code speaks for itself.

Existing JSDoc blocks: list any that are already present, so they are preserved (not duplicated or overwritten).

Data shapes that flow between functions (form payloads, filter state, API responses, error objects). These become @typedefs.

Potential blockers: any existing syntax that will trip the JSDoc CLI (see the constraints below), and any function whose parameter/return shape you cannot infer from the file alone.

Stop after the report and wait for confirmation before proceeding to Step 2.

Step 2 — Amend the file
Add JSDoc in place. Do not reorder, rename, refactor, or reformat existing code. Only insert comment blocks and, where necessary, @typedef declarations near the top of the file (after any file-level banner and before the first const).

Apply this annotation scheme:

File banner: a single @file (or @module) block at the top summarising the file's role and noting which related files hold state/API logic.

Typedefs: one @typedef {Object} block per data shape identified in Step 1. Place them together in a "Type Definitions" section.

Tier A functions: full JSDoc with @param, @returns, @see cross-references, and @example only if the call pattern is non-obvious.

Tier B functions: one prose sentence plus @param/@returns where non-void.

Tier C: leave untouched.

Prefer named types ({Entry}, {RequestError}) over inline shapes whenever the shape appears more than once.

Use @see to link functions that are paired (render ↔ reset, submit ↔ validate, fetch ↔ sync).

Hard constraints — the JSDoc parser will fail if you violate these
The CLI uses the catharsis type parser, which is a subset of TypeScript's. Two failure modes have already been observed on this file; do not reintroduce them:

No intersection types. Never write {A & B}. Catharsis only understands unions (|), so {Error & {code: string}} throws:
Invalid type expression … Expected "|" but "&" found.
Fix: declare a @typedef and reference it by name, or fall back to the base type.

No optional keys inside inline object types. Never write {{a: string, b?: number}}. Catharsis record types have no ? syntax, so it throws:
Invalid type expression … but "?" found.
Fix: promote the shape to a named @typedef and mark optional fields with brackets on the property name (@property {string} [b]), which is supported on typedef properties.

Additional rules that follow from the same parser:

Optional parameters use brackets on the name: @param {string} [label="x"], never @param {string=} label inside an inline object.

Nested object shapes must be their own @typedefs, not braces-inside-braces.

No TypeScript-only syntax: no generics with <T>, no keyof, no readonly, no as, no satisfies.

No @throws {never} — it isn't reliably rendered; put "never rejects; errors are handled internally" in the @returns description instead.

Step 3 — Verify before output
Before returning the amended file:

Re-read every @param and @property type expression. Confirm none contains &, ?, or <T>.

Confirm the file is syntactically complete — every opening {, (, and [ has a matching close, and the final line is a top-level statement (not mid-function).

Confirm the output preserves every existing line of code byte-for-byte except for inserted comments.

If you cannot verify (1) or (2) from the text alone, say so explicitly and stop rather than emitting a file you are unsure of.

Output format
Return, in this order:

The Step 1 scan report.

A short summary of the Step 2 changes (which functions got Tier A / B / C, which typedefs were added).

The complete amended file in a single fenced code block. Do not truncate. Do not write "…rest unchanged". Every line of the file must be present.

If the file is too large to emit in one message, say so and ask whether to split; do not silently cut the tail.

```

## Why the instructions are shaped this way

**Step 1 as a separate, blocking step.** The two errors you hit earlier both came from _writing_ before _understanding_. If the AI first maps every parameter shape and every return shape, it can decide "this is a `@typedef`" before it writes `@param`. Scanning first also surfaces the error shape from `data.js` (`RequestError` with `response`, `request`, `code`, `unexpectedShape`) as a _named_ thing rather than something to inline — which is exactly the fix that resolved the `&` failure.

**The two hard constraints are stated as _symptoms → fix_, not just "don't do X."** An LLM that only sees "no intersections" will still reach for `{Error & {code: string}}` if the code genuinely has that shape, because it looks correct to a TypeScript-trained model. Showing the exact error text and the prescribed workaround (`@typedef` + reference by name) gives it an escape hatch that satisfies both the parser and the intent.

**The "no nested braces" rule is the second-order version of the same problem.** You only discovered it because the `RequestError` typedef tried to inline `{status: number, statusText?: string}` inside the outer typedef. A model that fixes issue #1 but not #2 will produce a _different_ error on the next run. Mentioning both up front prevents the whack-a-mole.

**Step 3 forces self-verification.** LLMs are notoriously bad at counting braces and parentheses over long outputs, and they are prone to truncating long code blocks. Asking them to explicitly confirm "(1) no `&`/`?`/`<T>` in any type expression, (2) balanced delimiters, (3) byte-identical non-comment lines" turns three silent failure modes into three checkable claims. The "say so and stop" clause matters: a model that isn't sure should flag it, not guess.

**The "do not truncate" clause.** This is the fix for the `Unexpected token (1093:1)` error. That failure was a paste/output truncation, not a parser limitation. Naming it in the prompt ("Do not write '…rest unchanged'") makes the model responsible for completeness, and the fallback instruction ("ask whether to split") gives it a legitimate way out when the file is long.

**Tier classification is explicit.** Without it, models tend to either document everything (verbose, noisy) or document nothing trivial. Stating the tiers up front makes the output match what you actually want — full blocks for the interesting functions, one-liners for helpers, silence for event bindings.

## Tuning knobs

- **Doc tooling.** The block assumes JSDoc 4.x with the default catharsis parser. If you switch to TypeDoc (which uses the TypeScript compiler and _does_ support `&` and `?`), delete the two "hard constraints" and the follow-on rules — they become wrong.
- **Coverage enforcement.** If you also want "every Tier A function must have a `@param` for every argument," add a bullet under Step 3: "Confirm each Tier A function's `@param` count matches its declared parameter count (excluding `event` when used only for `preventDefault`)."
- **Cross-file `@see`.** The "Related files" input exists so the model knows which symbols it can legally reference. If you run JSDoc with just `scripts.js`, those `@see` links will render as plain text — mention that in the input line if you care.
- **Existing style.** If your project uses a specific tag order (`@param` before `@returns`, `@see` last, etc.), add it as a bullet under Step 2 so the output is consistent with the rest of the codebase.
