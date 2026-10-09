const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");

const app = loadBundle();

test("escapeHtml escapes HTML metacharacters", () => {
  assert.equal(app.escapeHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
});

test("escapeHtml coerces null and undefined to an empty string", () => {
  assert.equal(app.escapeHtml(null), "");
  assert.equal(app.escapeHtml(undefined), "");
});

test("escapeHtml coerces numbers to strings", () => {
  assert.equal(app.escapeHtml(42), "42");
});

test("formatDate formats a valid ISO timestamp", () => {
  const result = app.formatDate("2026-10-05T19:30:00Z");
  assert.notEqual(result, "Unknown date");
  assert.match(result, /2026/);
});

test("formatDate returns 'Unknown date' for an invalid value", () => {
  assert.equal(app.formatDate("not-a-date"), "Unknown date");
});

test("formatDate returns 'Unknown date' for an empty value", () => {
  assert.equal(app.formatDate(""), "Unknown date");
});

test("isTypingTarget is true when the element is inside a typing control", () => {
  assert.equal(app.isTypingTarget({ closest: () => ({ tagName: "INPUT" }) }), true);
});

test("isTypingTarget is false when there is no typing ancestor", () => {
  assert.equal(app.isTypingTarget({ closest: () => null }), false);
});

test("categoryBadgeHtml uses the category icon and includes the label", () => {
  const html = app.categoryBadgeHtml("MQL5");
  assert.match(html, /bi-cpu/);
  assert.match(html, /MQL5/);
});

test("categoryBadgeHtml falls back to the default icon for unknown categories", () => {
  assert.match(app.categoryBadgeHtml("Unknown"), /bi-journal-text/);
});

test("categoryBadgeHtml escapes untrusted category text", () => {
  const html = app.categoryBadgeHtml("<b>");
  assert.match(html, /&lt;b&gt;/);
  assert.doesNotMatch(html, /<b>/);
});

test("categoryBadgeHtml appends extra classes", () => {
  assert.match(app.categoryBadgeHtml("MQL5", "extra-class"), /extra-class/);
});
