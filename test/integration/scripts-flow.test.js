const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");
const { makeEntry } = require("../fixtures/entries");

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function setEntries(app, list) {
  app.__test.setEntriesState(list);
}

function clickEvent(map) {
  return { target: { closest: (selector) => (selector in map ? map[selector] : null) } };
}

function swalStub(isConfirmed) {
  return {
    calls: [],
    fire: async function fire(options) {
      this.calls.push(options);
      return { isConfirmed };
    },
    isVisible: () => false,
  };
}

function fillForm(app, values) {
  const full = {
    category: "MQL5",
    title: "Title",
    symptom: "symptom",
    tried: "tried",
    rootCause: "root cause",
    fix: "fix",
    lesson: "lesson",
    ...values,
  };
  Object.entries(full).forEach(([name, value]) => {
    app.document.getElementById(name).value = value;
  });
}

// ── DOMContentLoaded wiring ──────────────────────────────────────────────

test("DOMContentLoaded wires the form submit to handleEntryFormSubmit", async () => {
  const app = loadBundle({ Swal: swalStub(true) });
  app.__axios.on("get", { data: [] });
  app.__dom.document.dispatchEvent({ type: "DOMContentLoaded" });

  fillForm(app);
  app.__axios.reset();
  app.__axios.on("post", { data: makeEntry({ id: "new-1" }) });

  app.document.getElementById("logForm").dispatchEvent({ type: "submit", preventDefault() {} });
  await flush();

  assert.equal(app.__axios.calls.some((call) => call.method === "post"), true);
});

// ── refreshEntries ───────────────────────────────────────────────────────

test("refreshEntries renders fetched entries and re-enables the button", async () => {
  const app = loadBundle();
  app.__axios.on("get", { data: [makeEntry({ id: "a", title: "Alpha" })] });

  await app.refreshEntries();

  assert.equal(app.document.getElementById("entriesList").children.length, 1);
  assert.equal(app.document.getElementById("refreshBtn").disabled, false);
});

test("refreshEntries shows an error message when the request fails", async () => {
  const app = loadBundle();
  app.__axios.fail("get", { request: {} });

  await app.refreshEntries();

  assert.match(
    app.document.getElementById("entriesList").children[0].textContent,
    /Cannot reach the API/,
  );
  assert.equal(app.document.getElementById("refreshBtn").disabled, false);
});

// ── handleListClick ──────────────────────────────────────────────────────

test("handleListClick opens the detail view for a card click", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  const card = { dataset: { entryId: "a" } };

  app.handleListClick(clickEvent({ ".entry-card": card }));

  assert.equal(app.__test.getActiveEntryId(), "a");
});

test("handleListClick opens the edit form for an edit-button click", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  const modal = { showCalls: 0, show() { this.showCalls += 1; }, hide() {} };
  app.bootstrap.Modal.getOrCreateInstance = () => modal;
  const card = { dataset: { entryId: "a" } };

  app.handleListClick(clickEvent({ ".entry-card": card, ".card-edit-btn": {} }));

  assert.equal(app.document.getElementById("entryId").value, "a");
  assert.equal(modal.showCalls, 1);
});

test("handleListClick starts deletion for a delete-button click", async () => {
  const app = loadBundle({ Swal: swalStub(false) });
  setEntries(app, [makeEntry({ id: "a" })]);
  const card = { dataset: { entryId: "a" } };

  app.handleListClick(clickEvent({ ".entry-card": card, ".card-delete-btn": {} }));
  await flush();

  assert.equal(app.__axios.calls.length, 0); // cancelled
});

// ── handleListKeydown ────────────────────────────────────────────────────

test("handleListKeydown opens the detail view on Enter", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  const card = { dataset: { entryId: "a" } };
  let prevented = false;

  app.handleListKeydown({
    key: "Enter",
    target: { closest: (selector) => (selector === ".entry-card" ? card : null) },
    preventDefault: () => {
      prevented = true;
    },
  });

  assert.equal(app.__test.getActiveEntryId(), "a");
  assert.equal(prevented, true);
});

test("handleListKeydown ignores keys from the card actions", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  const card = { dataset: { entryId: "a" } };

  app.handleListKeydown({
    key: "Enter",
    target: {
      closest: (selector) => {
        if (selector === ".entry-card") return card;
        if (selector === ".card-actions") return {};
        return null;
      },
    },
  });

  assert.equal(app.__test.getActiveEntryId(), null);
});

// ── handleGlobalKeydown ──────────────────────────────────────────────────

test("handleGlobalKeydown resets the detail view on Escape", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  app.renderDetailContent(makeEntry({ id: "a" }));

  app.handleGlobalKeydown({ key: "Escape" });

  assert.equal(app.__test.getActiveEntryId(), null);
});

test("handleGlobalKeydown opens the create form on 'n'", () => {
  const app = loadBundle();

  app.handleGlobalKeydown({ key: "n", target: { closest: () => null } });

  assert.equal(
    app.document.getElementById("formModalTitle").textContent,
    "Create New Entry",
  );
});

test("handleGlobalKeydown ignores 'n' while typing", () => {
  const app = loadBundle();

  app.handleGlobalKeydown({ key: "n", target: { closest: () => ({ tagName: "INPUT" }) } });

  assert.notEqual(
    app.document.getElementById("formModalTitle").textContent,
    "Create New Entry",
  );
});

// ── handleEntryFormSubmit ────────────────────────────────────────────────

test("handleEntryFormSubmit creates an entry and adds it to the store", async () => {
  const app = loadBundle();
  fillForm(app);
  app.__axios.on("post", { data: makeEntry({ id: "new-1" }) });

  await app.handleEntryFormSubmit({ preventDefault() {} });

  assert.equal(app.__axios.calls[0].method, "post");
  assert.equal(app.getEntries().length, 1);
});

test("handleEntryFormSubmit warns and does not post when fields are missing", async () => {
  const swal = swalStub(true);
  const app = loadBundle({ Swal: swal });

  await app.handleEntryFormSubmit({ preventDefault() {} });

  assert.equal(app.__axios.calls.length, 0);
  assert.equal(swal.calls.length, 1);
  assert.match(swal.calls[0].title, /Missing fields/);
});

test("handleEntryFormSubmit updates an entry when an id is present", async () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  app.document.getElementById("entryId").value = "a";
  fillForm(app, { title: "New" });
  app.__axios.on("put", { data: makeEntry({ id: "a", title: "New" }) });

  await app.handleEntryFormSubmit({ preventDefault() {} });

  assert.equal(app.__axios.calls[0].method, "put");
  assert.equal(app.__axios.calls[0].url.endsWith("/a"), true);
});

// ── handleDeleteEntry ────────────────────────────────────────────────────

test("handleDeleteEntry cancels when the user declines", async () => {
  const app = loadBundle({ Swal: swalStub(false) });
  setEntries(app, [makeEntry({ id: "a" })]);

  await app.handleDeleteEntry(makeEntry({ id: "a", title: "T" }));

  assert.equal(app.__axios.calls.length, 0);
});

test("handleDeleteEntry deletes and resets the open detail pane", async () => {
  const app = loadBundle({ Swal: swalStub(true) });
  const entry = makeEntry({ id: "a" });
  setEntries(app, [entry]);
  app.renderDetailContent(entry);
  app.__axios.on("delete", { data: {} });

  await app.handleDeleteEntry(entry);

  assert.equal(app.__axios.calls[0].method, "delete");
  assert.equal(app.__test.getActiveEntryId(), null);
  assert.equal(app.getEntries().length, 0);
});
