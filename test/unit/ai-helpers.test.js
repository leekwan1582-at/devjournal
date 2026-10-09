const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

// ── aiReviewFilename ─────────────────────────────────────────────────────

test("aiReviewFilename builds a dated .md filename from the entry id", () => {
  const app = loadBundle();
  assert.match(
    app.aiReviewFilename({ id: "entry-001" }),
    /^trace-diary-review-entry-001-\d{4}-\d{2}-\d{2}\.md$/,
  );
});

test("aiReviewFilename sanitizes unsafe characters", () => {
  const app = loadBundle();
  assert.match(
    app.aiReviewFilename({ id: "a/b c#1" }),
    /^trace-diary-review-a-b-c-1-\d{4}-\d{2}-\d{2}\.md$/,
  );
});

test("aiReviewFilename falls back to 'entry' when the id is missing", () => {
  const app = loadBundle();
  assert.match(app.aiReviewFilename({}), /^trace-diary-review-entry-\d{4}-\d{2}-\d{2}\.md$/);
});

// ── describeAiReviewError ────────────────────────────────────────────────

test("describeAiReviewError prefers the proxy error message", () => {
  const app = loadBundle();
  assert.equal(app.describeAiReviewError({ response: { data: { error: "Nope" } } }), "Nope");
});

test("describeAiReviewError falls back to the HTTP status", () => {
  const app = loadBundle();
  assert.equal(
    app.describeAiReviewError({ response: { status: 500, data: {} } }),
    "AI review failed (HTTP 500).",
  );
});

test("describeAiReviewError reports a timeout", () => {
  const app = loadBundle();
  assert.equal(app.describeAiReviewError({ code: "ECONNABORTED" }), "The AI review timed out.");
});

test("describeAiReviewError reports an unreachable service", () => {
  const app = loadBundle();
  assert.match(app.describeAiReviewError({}), /Could not reach the AI review service/);
});

// ── createAiReviewActionButton ───────────────────────────────────────────

test("createAiReviewActionButton builds an icon button with action data", () => {
  const app = loadBundle();
  const button = app.createAiReviewActionButton("copy", "bi-clipboard", "Copy review");

  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.type, "button");
  assert.equal(button.dataset.action, "copy");
  assert.equal(button.title, "Copy review");
  assert.equal(button.getAttribute("aria-label"), "Copy review");

  const icon = button.querySelector("i");
  assert.match(icon.className, /bi-clipboard/);
  assert.equal(icon.getAttribute("aria-hidden"), "true");
});

// ── ensureAiReviewSection ────────────────────────────────────────────────

test("ensureAiReviewSection creates a live body and a hidden actions toolbar", () => {
  const app = loadBundle();
  const { body, actions } = app.ensureAiReviewSection();

  assert.equal(body.getAttribute("role"), "status");
  assert.equal(body.getAttribute("aria-live"), "polite");
  assert.equal(actions.classList.contains("d-none"), true);
  assert.ok(actions.querySelector('[data-action="copy"]'));
  assert.ok(actions.querySelector('[data-action="download"]'));

  const section = app.document.getElementById("aiReviewSection");
  assert.ok(section);
  assert.equal(section.className, "mt-4");
});

test("ensureAiReviewSection replaces a previous section instead of stacking", () => {
  const app = loadBundle();
  app.ensureAiReviewSection();
  app.ensureAiReviewSection();

  const detailContent = app.document.getElementById("detailContent");
  const sections = detailContent.children.filter((child) => child.id === "aiReviewSection");
  assert.equal(sections.length, 1);
});

// ── renderAiReviewStatus ─────────────────────────────────────────────────

test("renderAiReviewStatus renders a normal status paragraph", () => {
  const app = loadBundle();
  const body = app.document.createElement("div");

  app.renderAiReviewStatus(body, "Loading…");

  const paragraph = body.children[0];
  assert.equal(paragraph.textContent, "Loading…");
  assert.match(paragraph.className, /text-body-secondary/);
  assert.equal(paragraph.getAttribute("role"), null);
});

test("renderAiReviewStatus renders an error with role=alert", () => {
  const app = loadBundle();
  const body = app.document.createElement("div");

  app.renderAiReviewStatus(body, "Boom", true);

  const paragraph = body.children[0];
  assert.match(paragraph.className, /text-danger/);
  assert.equal(paragraph.getAttribute("role"), "alert");
});

// ── copyTextToClipboard ──────────────────────────────────────────────────

test("copyTextToClipboard uses the async clipboard API when available", async () => {
  const app = loadBundle();
  const copied = await app.copyTextToClipboard("hello");

  assert.equal(copied, true);
  assert.deepEqual(app.navigator.clipboard.calls, ["hello"]);
});

test("copyTextToClipboard falls back to execCommand on a non-secure origin", async () => {
  let execCalled = false;
  const app = loadBundle({ secureContext: false });
  app.document.execCommand = () => {
    execCalled = true;
    return true;
  };

  const copied = await app.copyTextToClipboard("hi");

  assert.equal(copied, true);
  assert.equal(execCalled, true);
  assert.equal(app.navigator.clipboard.calls.length, 0);
});

// ── downloadTextFile ─────────────────────────────────────────────────────

test("downloadTextFile creates and revokes an object URL for the file", () => {
  const app = loadBundle();
  const created = [];
  const revoked = [];
  app.URL = {
    createObjectURL: (blob) => {
      created.push(blob);
      return "blob:test";
    },
    revokeObjectURL: (url) => revoked.push(url),
  };

  const anchors = [];
  const originalCreateElement = app.document.createElement;
  app.document.createElement = (tagName) => {
    const element = originalCreateElement(tagName);
    if (tagName === "a") {
      anchors.push(element);
    }
    return element;
  };

  app.downloadTextFile("file.md", "content", "text/markdown");

  assert.equal(created.length, 1);
  assert.deepEqual(revoked, ["blob:test"]);
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].download, "file.md");
  assert.equal(anchors[0].href, "blob:test");
});

// ── renderAiReviewContent ────────────────────────────────────────────────

test("renderAiReviewContent renders markdown HTML and reveals the actions", () => {
  const app = loadBundle({
    marked: { parse: () => "<h2>H</h2>" },
    DOMPurify: { sanitize: (html) => html },
  });
  const body = app.document.createElement("div");
  const actions = app.document.createElement("div");
  actions.className = "ai-review-actions d-none";

  app.renderAiReviewContent(body, actions, "## H", { id: "e1" });

  assert.equal(body.children[0].className, "ai-review-markdown");
  assert.equal(actions.classList.contains("d-none"), false);
});

test("renderAiReviewContent falls back to a <pre> when markdown libs are missing", () => {
  const app = loadBundle();
  delete app.marked;
  delete app.DOMPurify;

  const body = app.document.createElement("div");
  const actions = app.document.createElement("div");

  app.renderAiReviewContent(body, actions, "plain text", { id: "e1" });

  assert.equal(body.children[0].tagName, "PRE");
  assert.equal(body.children[0].textContent, "plain text");
});

// ── bindAiReviewActions ──────────────────────────────────────────────────

test("bindAiReviewActions copies the raw review on copy click", async () => {
  const app = loadBundle();
  const { actions } = app.ensureAiReviewSection();
  app.bindAiReviewActions(actions, "MARKDOWN", { id: "e1" });

  actions.querySelector('[data-action="copy"]').click();
  await flush();

  assert.deepEqual(app.navigator.clipboard.calls, ["MARKDOWN"]);
});

test("bindAiReviewActions downloads a .md file on download click", () => {
  const app = loadBundle();
  const { actions } = app.ensureAiReviewSection();
  app.bindAiReviewActions(actions, "MD", { id: "entry-001" });

  let created = 0;
  app.URL = {
    createObjectURL: () => {
      created += 1;
      return "blob:x";
    },
    revokeObjectURL: () => {},
  };

  actions.querySelector('[data-action="download"]').click();

  assert.equal(created, 1);
});

// ── requestAiReview ──────────────────────────────────────────────────────

test("requestAiReview posts to the proxy endpoint and renders the review", async () => {
  const app = loadBundle();
  app.__axios.on("post", { data: { review: "## Review" } });

  await app.requestAiReview({ id: "e1" });

  const expectedEndpoint = app.__test.getApiUrl().replace(/\/entries\/?$/, "/api/ai-review");
  assert.equal(app.__axios.calls[0].method, "post");
  assert.equal(app.__axios.calls[0].url, expectedEndpoint);

  const section = app.document.getElementById("aiReviewSection");
  const body = section.children.find((child) => child.getAttribute("role") === "status");
  assert.equal(body.children[0].className, "ai-review-markdown");
});

test("requestAiReview ignores a null entry", async () => {
  const app = loadBundle();

  await app.requestAiReview(null);

  assert.equal(app.document.getElementById("aiReviewSection"), null);
  assert.equal(app.__axios.calls.length, 0);
});

test("requestAiReview shows an error status when the review is empty", async () => {
  const app = loadBundle();
  app.__axios.on("post", { data: { review: "   " } });

  await app.requestAiReview({ id: "e1" });

  const section = app.document.getElementById("aiReviewSection");
  const body = section.children.find((child) => child.getAttribute("role") === "status");
  const paragraph = body.children[0];
  assert.match(paragraph.textContent, /empty review/i);
  assert.equal(paragraph.getAttribute("role"), "alert");
});

test("requestAiReview surfaces a proxy error message", async () => {
  const app = loadBundle();
  app.__axios.fail("post", { response: { status: 402, data: { error: "Insufficient balance" } } });

  await app.requestAiReview({ id: "e1" });

  const section = app.document.getElementById("aiReviewSection");
  const body = section.children.find((child) => child.getAttribute("role") === "status");
  assert.equal(body.children[0].textContent, "Insufficient balance");
});
