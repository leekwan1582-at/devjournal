const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");

test("getStoredTheme defaults to 'system' when unset", () => {
  const app = loadBundle();
  assert.equal(app.getStoredTheme(), "system");
});

test("getStoredTheme returns a stored valid preference", () => {
  const app = loadBundle();
  app.localStorage.setItem("theme", "dark");
  assert.equal(app.getStoredTheme(), "dark");
});

test("getStoredTheme ignores an invalid stored value", () => {
  const app = loadBundle();
  app.localStorage.setItem("theme", "blue");
  assert.equal(app.getStoredTheme(), "system");
});

test("applyTheme sets the document theme attribute", () => {
  const app = loadBundle();
  app.applyTheme("dark");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "dark");
});

test("applyTheme resolves 'system' to light when the OS is light", () => {
  const app = loadBundle({ prefersDark: false });
  app.applyTheme("system");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "light");
});

test("applyTheme resolves 'system' to dark when the OS is dark", () => {
  const app = loadBundle({ prefersDark: true });
  app.applyTheme("system");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "dark");
});

test("applyTheme updates the toggle button icon and label", () => {
  const app = loadBundle();
  app.applyTheme("dark");
  const button = app.document.getElementById("themeToggleBtn");
  assert.equal(button.title, "Theme: dark");
  assert.match(button.querySelector("i").className, /bi-moon-stars-fill/);
});

test("cycleTheme advances system -> light -> dark -> system and persists", () => {
  const app = loadBundle({ prefersDark: false });
  assert.equal(app.__test.getThemePreference(), "system");

  app.cycleTheme();
  assert.equal(app.__test.getThemePreference(), "light");
  assert.equal(app.localStorage.getItem("theme"), "light");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "light");

  app.cycleTheme();
  assert.equal(app.__test.getThemePreference(), "dark");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "dark");

  app.cycleTheme();
  assert.equal(app.__test.getThemePreference(), "system");
  assert.equal(app.document.documentElement.getAttribute("data-bs-theme"), "light");
});
