const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadBundle } = require("../helpers/load-bundle");

const app = loadBundle();
const categories = Array.from(app.__test.getCategoryOptions());
const styleCss = fs.readFileSync(path.resolve(__dirname, "..", "..", "style.css"), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("CATEGORY_OPTIONS is not empty", () => {
  assert.ok(categories.length > 0);
});

for (const category of categories) {
  test(`category "${category}" maps to a dedicated icon`, () => {
    const html = app.categoryBadgeHtml(category);
    assert.doesNotMatch(
      html,
      /bi-journal-text/,
      `"${category}" fell back to the default icon — its CATEGORY_ICONS key likely drifted`,
    );
  });

  test(`category "${category}" has a colour rule in style.css`, () => {
    const rule = new RegExp(`\\[data-category="${escapeRegExp(category)}"\\]`);
    assert.match(
      styleCss,
      rule,
      `style.css has no [data-category="${category}"] rule — the colour will fall back to the default`,
    );
  });
}
