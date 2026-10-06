# Phased Roadmap for `script.js`

Here's the checklist reorganized into logical build phases, ordered by dependency and impact. Each phase is self-contained and leaves the app in a working state.

---

## Phase 1: Mobile View Toggle (Fix what's already there)

**Goal:** Make the responsive behavior actually correct before adding anything new.

| Item | Status | Notes |
|---|---|---|
| Initial mobile state on load | ⚠️ Partial | Call `showListViewMobile()` on startup if `window.innerWidth < 768` |
| Desktop → mobile resize | ❌ Missing | Current resize handler only handles growing, not shrinking |
| Debounce resize handler | ❌ Missing | Prevent firing dozens of times per second |
| Cache DOM elements | ❌ Missing | Stop querying `listView`/`detailView` on every call |

**Why first:** It's the foundation of the layout. Every later phase adds UI that must respect the mobile/desktop split.

---

## Phase 2: Core Read Path Polish (Loading / Empty / Error)

**Goal:** Make the existing read-only flow feel robust.

| Item | Status | Notes |
|---|---|---|
| Loading state | ❌ Missing | Show "Loading…" in `#entriesList` while awaiting |
| Empty state | ❌ Missing | Show "No entries yet" when `entriesState.length === 0` |
| User-facing error state | ❌ Missing | Replace silent `console.error` with a visible message |
| Fix `formatDate` bug | 🐛 Bug | `[dd-${year}-${month}-${day}]` → remove literal `dd` |
| Invalid date guard | ❌ Missing | Return `""` when `isNaN(dateObj)` |
| Consistent timestamp display | ⚠️ Inconsistent | List uses `formatDate`, detail prints raw + formatted |
| Active card highlight | ❌ Missing | Visually mark the currently open entry |

**Why second:** You can't sensibly add create/edit/delete until the read path handles all its states gracefully.

---

## Phase 3: CRUD — Delete (Simplest Mutation)

**Goal:** Wire up the first write operation, which is already hinted at by `detailActionGroup`.

| Item | Status | Notes |
|---|---|---|
| `deleteEntry(id)` function | ❌ Missing | `DELETE ${API_URL}/${id}` |
| Wire delete button | ❌ Missing | Reads `activeEntry` to know target |
| Update `entriesState` after delete | ❌ Missing | Filter out the removed entry |
| Re-render + return to list | ❌ Missing | `renderEntriesList` + `showListViewMobile()` |
| Confirm dialog | ❌ Missing | `confirm()` before destructive action |
| Error handling | ❌ Missing | Restore UI if delete fails |

**Why third:** Delete is the smallest CRUD operation — one call, one state update. It validates the mutation + re-render pattern before you build edit/create on top of it.

---

## Phase 4: CRUD — Edit

**Goal:** Reuse the detail view as an editable form, or open a modal.

| Item | Status | Notes |
|---|---|---|
| Edit form / modal | ❌ Missing | Fields for category, title, symptom, tried, rootCause, fix, lesson |
| Populate form from `activeEntry` | ❌ Missing | Pre-fill inputs |
| `updateEntry(id, payload)` | ❌ Missing | `PUT ${API_URL}/${id}` |
| Reconcile `entriesState` | ❌ Missing | Replace the entry in place, or re-fetch |
| Re-render both list and detail | ❌ Missing | Show updated values immediately |
| Validation | ❌ Missing | Required fields, trim whitespace |
| Cancel / discard changes | ❌ Missing | Don't leave user stuck in edit mode |

**Why fourth:** Edit builds on the delete pattern (target = `activeEntry`, mutate, re-render) but adds form state — more complex than delete, simpler than create.

---

## Phase 5: CRUD — Create

**Goal:** Add the missing "New Entry" flow. This is the biggest gap in the current app.

| Item | Status | Notes |
|---|---|---|
| "New Entry" button | ❌ Missing | Placement in header / list view |
| Create form / modal | ❌ Missing | Same fields as edit, empty by default |
| `createEntry(payload)` | ❌ Missing | `POST ${API_URL}` |
| Server-assigned id/timestamp handling | ❌ Missing | Don't generate client-side ids |
| Prepend or re-fetch | ❌ Missing | Decide: optimistic insert vs full reload |
| Re-render list | ❌ Missing | Show new entry immediately |
| Validation | ❌ Missing | Same as edit |
| Form reset on cancel | ❌ Missing | Clear inputs |

**Why fifth:** Create requires all the form infrastructure from edit plus a new entry point in the UI. Doing it last means the form component is already battle-tested by edit.

---

## Phase 6: Data Robustness

**Goal:** Harden the app against bad inputs and edge cases.

| Item | Status | Notes |
|---|---|---|
| XSS safety | ⚠️ Risky | Replace `innerHTML` interpolation with `textContent` or escaping helper |
| Validate `response.data` is an array | ❌ Missing | Guard before `.forEach` |
| Axios error differentiation | ❌ Missing | Distinguish network vs 4xx vs 5xx for messages |
| `id` uniqueness assumption | ⚠️ Fragile | Filter by index or unique key, not just id |
| Config for prod URL | ❌ Missing | Replace hardcoded `localhost:3000` |

**Why sixth:** These don't change behavior in the happy path, so they're safe to defer — but they're what separate a demo from something shippable.

---

## Phase 7: UX Enhancements

**Goal:** Quality-of-life features users will expect once CRUD works.

| Item | Status | Notes |
|---|---|---|
| Search box | ❌ Missing | Filter by title / symptom / fix |
| Category filter | ❌ Missing | Dropdown of distinct categories |
| Sort options | ❌ Missing | By date, title, category |
| Refresh button | ❌ Missing | Manual re-fetch |
| Re-fetch after mutations | ❌ Missing | Sync with server instead of trusting local state |
| Toast notifications | ❌ Missing | Feedback on create/edit/delete success |
| Keyboard shortcuts | ❌ Missing | Esc closes detail, `n` for new entry |

**Why seventh:** These only make sense once the core loop (create → read → update → delete) is solid.

---

## Phase 8: Accessibility & Structure

**Goal:** Make it usable by everyone and maintainable long-term.

| Item | Status | Notes |
|---|---|---|
| `role="button"` + `tabindex` on cards | ❌ Missing | Make cards keyboard-focusable |
| Enter / Space to activate cards | ❌ Missing | Keydown handler |
| ARIA labels on icon buttons | ❌ Missing | `<i class="bi bi-chevron-right">` needs text alternative |
| Focus management on view switch | ❌ Missing | Focus the detail pane after click on mobile |
| Split into modules | ❌ Missing | `api.js`, `state.js`, `ui.js`, `main.js` |
| Comment banners per section | ⚠️ Partial | Some exist, standardize |

**Why last:** Refactoring and a11y are easier once features stop changing. Doing them earlier means redoing them.

---

## Phase Dependency Graph

```
Phase 1 (Mobile)
      │
      ▼
Phase 2 (Read polish)
      │
      ▼
Phase 3 (Delete) ──► Phase 4 (Edit) ──► Phase 5 (Create)
                                              │
                                              ▼
                                    Phase 6 (Robustness)
                                              │
                                              ▼
                                    Phase 7 (UX features)
                                              │
                                              ▼
                                    Phase 8 (A11y + structure)
```

---

## Suggested Sprint Grouping

If you want to ship in milestones:

- **Sprint A — "It works"**: Phases 1 + 2 → app loads, handles empty/error/loading, mobile correct.
- **Sprint B — "It mutates"**: Phases 3 + 4 + 5 → full CRUD.
- **Sprint C — "It's solid"**: Phases 6 + 7 → production-ready.
- **Sprint D — "It's polished"**: Phase 8 → a11y + refactor.

Each sprint ends with a working, demoable app — no half-finished features left dangling.

    <section id="console-container" class="console-container" hidden>
      <h2>Console Output</h2>
      <div
        id="console-output"
        class="console-output"
        role="status"
        aria-live="polite"
      ></div>
    </section>