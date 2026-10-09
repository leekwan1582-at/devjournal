const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");
const { makeEntry } = require("../fixtures/entries");

function setEntries(app, list) {
  app.__test.setEntriesState(list);
}

// ── Form helpers ─────────────────────────────────────────────────────────

test("populateCategoryOptions fills the filter and form selects from CATEGORY_OPTIONS", () => {
  const app = loadBundle();
  const categories = Array.from(app.__test.getCategoryOptions());
  app.populateCategoryOptions();

  const filter = app.document.getElementById("categoryFilter");
  const form = app.document.getElementById("category");

  assert.equal(filter.children[0].value, "ALL");
  assert.equal(filter.children.length, categories.length + 1);

  assert.equal(form.children[0].value, "");
  assert.equal(form.children[0].disabled, true);
  assert.equal(form.children[0].defaultSelected, true);
  assert.equal(form.children.length, categories.length + 1);
});

test("collectEntryFormPayload reads and trims each field", () => {
  const app = loadBundle();
  const values = {
    category: "MQL5",
    title: "  T  ",
    symptom: " S ",
    tried: " t ",
    rootCause: " r ",
    fix: " f ",
    lesson: " l ",
  };
  Object.entries(values).forEach(([name, value]) => {
    app.document.getElementById(name).value = value;
  });

  assert.deepEqual(
    { ...app.collectEntryFormPayload() },
    { category: "MQL5", title: "T", symptom: "S", tried: "t", rootCause: "r", fix: "f", lesson: "l" },
  );
});

test("getMissingFields lists empty field names", () => {
  const app = loadBundle();
  const payload = {
    category: "MQL5",
    title: "",
    symptom: "s",
    tried: "",
    rootCause: "r",
    fix: "f",
    lesson: "",
  };
  assert.deepEqual(Array.from(app.getMissingFields(payload)), ["title", "tried", "lesson"]);
});

test("populateEntryForm fills the hidden id and each field", () => {
  const app = loadBundle();
  app.populateEntryForm(makeEntry({ id: "e1", title: "T", symptom: "S" }));

  assert.equal(app.document.getElementById("entryId").value, "e1");
  assert.equal(app.document.getElementById("title").value, "T");
  assert.equal(app.document.getElementById("symptom").value, "S");
});

test("populateEntryForm throws without an entry", () => {
  const app = loadBundle();
  assert.throws(() => app.populateEntryForm(null), /requires an entry/);
});

test("resetEntryForm clears the hidden id", () => {
  const app = loadBundle();
  app.document.getElementById("entryId").value = "e1";
  app.resetEntryForm();
  assert.equal(app.document.getElementById("entryId").value, "");
});

// ── List rendering ───────────────────────────────────────────────────────

test("createEntryCard sets data, role, a11y, and record position", () => {
  const app = loadBundle();
  const card = app.createEntryCard(
    makeEntry({ id: "a", title: "Hello", category: "MQL5" }),
    2,
    5,
  );

  assert.match(card.className, /entry-card/);
  assert.equal(card.dataset.entryId, "a");
  assert.equal(card.dataset.category, "MQL5");
  assert.equal(card.getAttribute("role"), "button");
  assert.equal(card.getAttribute("tabindex"), "0");
  assert.match(card.getAttribute("aria-label"), /Hello/);
  assert.match(card.innerHTML, /Record 2\/5/);
});

test("createEntryCard escapes an untrusted title", () => {
  const app = loadBundle();
  const card = app.createEntryCard(makeEntry({ id: "a", title: "<b>x</b>" }), 1, 1);
  assert.match(card.innerHTML, /&lt;b&gt;/);
  assert.doesNotMatch(card.innerHTML, /<b>x<\/b>/);
});

test("createEntryCard marks the active entry", () => {
  const app = loadBundle();
  app.__test.setActiveEntryId("a");
  const card = app.createEntryCard(makeEntry({ id: "a" }), 1, 1);
  assert.equal(card.classList.contains("active-card"), true);
});

test("renderEntriesList computes positions against the full store", () => {
  const app = loadBundle();
  const all = [makeEntry({ id: "a" }), makeEntry({ id: "b" }), makeEntry({ id: "c" })];
  setEntries(app, all);

  app.renderEntriesList([all[2]]);

  const entriesList = app.document.getElementById("entriesList");
  assert.equal(entriesList.children.length, 1);
  assert.match(entriesList.children[0].innerHTML, /Record 3\/3/);
});

test("highlightActiveCard toggles the active class to match activeEntryId", () => {
  const app = loadBundle();
  const all = [makeEntry({ id: "a" }), makeEntry({ id: "b" })];
  setEntries(app, all);
  app.renderEntriesList(all);

  app.__test.setActiveEntryId("b");
  app.highlightActiveCard();

  const entriesList = app.document.getElementById("entriesList");
  assert.equal(entriesList.children[0].classList.contains("active-card"), false);
  assert.equal(entriesList.children[1].classList.contains("active-card"), true);
});

// ── applyFilters ─────────────────────────────────────────────────────────

test("applyFilters shows the empty-store message", () => {
  const app = loadBundle();
  setEntries(app, []);
  app.applyFilters();
  assert.match(app.document.getElementById("entriesList").children[0].textContent, /No entries yet/);
});

test("applyFilters shows the no-match message", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a", title: "Alpha" })]);
  app.__test.setSearchTerm("zzz");
  app.applyFilters();
  assert.match(
    app.document.getElementById("entriesList").children[0].textContent,
    /No entries match/,
  );
});

test("applyFilters renders matching entries as cards", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a", title: "Alpha" }), makeEntry({ id: "b", title: "Beta" })]);
  app.__test.setSearchTerm("alpha");
  app.applyFilters();

  const entriesList = app.document.getElementById("entriesList");
  assert.equal(entriesList.children.length, 1);
  assert.equal(entriesList.children[0].dataset.entryId, "a");
});

test("applyFilters resets the detail pane when the open entry is filtered out", () => {
  const app = loadBundle();
  const all = [makeEntry({ id: "a", category: "MQL5" }), makeEntry({ id: "b", category: "Backtesting" })];
  setEntries(app, all);
  app.renderDetailContent(all[1]);
  app.__test.setCategoryFilterValue("MQL5");

  app.applyFilters();

  assert.equal(app.__test.getActiveEntryId(), null);
  assert.match(
    app.document.getElementById("detailContent").innerHTML,
    /Select an entry from the list/,
  );
});

test("applyFilters keeps the detail pane when the open entry stays visible", () => {
  const app = loadBundle();
  const all = [makeEntry({ id: "a", category: "MQL5" })];
  setEntries(app, all);
  app.renderDetailContent(all[0]);
  app.__test.setCategoryFilterValue("MQL5");
  app.applyFilters();
  assert.equal(app.__test.getActiveEntryId(), "a");
});

// ── Detail rendering ─────────────────────────────────────────────────────

test("renderDetailContent fills the pane, sets the active id, and shows the actions", () => {
  const app = loadBundle();
  const entry = makeEntry({ id: "a", title: "Title", category: "MQL5", symptom: "S" });
  setEntries(app, [entry]);

  app.renderDetailContent(entry);

  const detailContent = app.document.getElementById("detailContent");
  assert.equal(app.__test.getActiveEntryId(), "a");
  assert.equal(detailContent.dataset.category, "MQL5");
  assert.match(detailContent.innerHTML, /Title/);
  assert.match(detailContent.innerHTML, /Symptom/);
  assert.equal(app.document.getElementById("detailHeaderTitle").textContent, "Entry a");
  assert.equal(
    app.document.getElementById("detailActionGroup").classList.contains("d-none"),
    false,
  );
});

test("renderDetailContent escapes untrusted entry text", () => {
  const app = loadBundle();
  const entry = makeEntry({ id: "a", title: "<b>x</b>", symptom: "<i>y</i>" });
  setEntries(app, [entry]);

  app.renderDetailContent(entry);

  const html = app.document.getElementById("detailContent").innerHTML;
  assert.match(html, /&lt;b&gt;/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test("resetDetailView clears the pane, actions, and selection", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a" })]);
  app.renderDetailContent(makeEntry({ id: "a" }));

  app.resetDetailView();

  const detailContent = app.document.getElementById("detailContent");
  assert.equal(app.__test.getActiveEntryId(), null);
  assert.match(detailContent.innerHTML, /Select an entry from the list/);
  assert.equal(detailContent.dataset.category, undefined);
  assert.equal(app.document.getElementById("detailHeaderTitle").textContent, "TraceDiary Entry");
  assert.equal(
    app.document.getElementById("detailActionGroup").classList.contains("d-none"),
    true,
  );
});

test("syncActiveEntry re-renders the open entry when it still exists", () => {
  const app = loadBundle();
  setEntries(app, [makeEntry({ id: "a", title: "Fresh" })]);
  app.__test.setActiveEntryId("a");

  app.syncActiveEntry();

  assert.match(app.document.getElementById("detailContent").innerHTML, /Fresh/);
});

test("syncActiveEntry resets the pane when the open entry is gone", () => {
  const app = loadBundle();
  setEntries(app, []);
  app.__test.setActiveEntryId("gone");

  app.syncActiveEntry();

  assert.equal(app.__test.getActiveEntryId(), null);
  assert.match(
    app.document.getElementById("detailContent").innerHTML,
    /Select an entry from the list/,
  );
});

// ── Modal focus (aria-hidden warning) ────────────────────────────────────

test("blurEntryModalFocus blurs a focused descendant of the modal", () => {
  const app = loadBundle();
  const modal = app.document.getElementById("entryModal");
  const button = app.document.createElement("button");
  modal.appendChild(button);
  let blurred = false;
  button.blur = () => {
    blurred = true;
  };
  app.document.activeElement = button;

  app.blurEntryModalFocus();

  assert.equal(blurred, true);
});

test("blurEntryModalFocus ignores focus outside the modal", () => {
  const app = loadBundle();
  const outside = app.document.createElement("button");
  let blurred = false;
  outside.blur = () => {
    blurred = true;
  };
  app.document.activeElement = outside;

  app.blurEntryModalFocus();

  assert.equal(blurred, false);
});
