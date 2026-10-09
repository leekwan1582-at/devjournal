const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadProxy } = require("../helpers/load-proxy");
const { makeEntry } = require("../fixtures/entries");

// ── formatEntry ──────────────────────────────────────────────────────────

test("formatEntry wraps the entry in an <entry> block with fields in order", () => {
  const { formatEntry } = loadProxy();
  const output = formatEntry(makeEntry({ id: "e1", title: "T", symptom: "S" }));

  assert.match(output, /^<entry>\n/);
  assert.match(output, /\n<\/entry>$/);

  const names = output
    .split("\n")
    .slice(1, -1)
    .map((line) => line.split(":")[0]);
  assert.deepEqual(names, [
    "id",
    "timestamp",
    "category",
    "title",
    "symptom",
    "tried",
    "rootCause",
    "fix",
    "lesson",
  ]);
});

test("formatEntry renders missing fields as empty strings", () => {
  const { formatEntry } = loadProxy();
  assert.match(formatEntry({ id: "e1" }), /title: \n/);
});

// ── buildChatCompletionsUrl ──────────────────────────────────────────────

test("buildChatCompletionsUrl appends /chat/completions", () => {
  const { buildChatCompletionsUrl } = loadProxy();
  assert.equal(
    buildChatCompletionsUrl("https://api.deepseek.com"),
    "https://api.deepseek.com/chat/completions",
  );
});

test("buildChatCompletionsUrl handles a trailing slash", () => {
  const { buildChatCompletionsUrl } = loadProxy();
  assert.equal(
    buildChatCompletionsUrl("https://api.deepseek.com/"),
    "https://api.deepseek.com/chat/completions",
  );
});

test("buildChatCompletionsUrl preserves a /v1 base", () => {
  const { buildChatCompletionsUrl } = loadProxy();
  assert.equal(
    buildChatCompletionsUrl("https://api.deepseek.com/v1"),
    "https://api.deepseek.com/v1/chat/completions",
  );
});

// ── describeUpstreamStatus ───────────────────────────────────────────────

test("describeUpstreamStatus explains 401", () => {
  assert.match(loadProxy().describeUpstreamStatus(401), /API key/);
});

test("describeUpstreamStatus explains 402", () => {
  assert.match(loadProxy().describeUpstreamStatus(402), /insufficient balance/i);
});

test("describeUpstreamStatus explains 429", () => {
  assert.match(loadProxy().describeUpstreamStatus(429), /rate limit/i);
});

test("describeUpstreamStatus falls back to the status code", () => {
  assert.match(loadProxy().describeUpstreamStatus(503), /HTTP 503/);
});

// ── requestReview ────────────────────────────────────────────────────────

test("requestReview throws a 500 error when the API key is missing", async () => {
  const { requestReview } = loadProxy({ env: {} });
  await assert.rejects(
    () => requestReview(makeEntry()),
    (error) => {
      assert.equal(error.statusCode, 500);
      assert.match(error.message, /DEEPSEEK_API_KEY/);
      return true;
    },
  );
});

test("requestReview posts to the chat-completions endpoint with key, model, and messages", async () => {
  const proxy = loadProxy({
    env: {
      DEEPSEEK_API_KEY: "secret",
      DEEPSEEK_BASE_URL: "https://api.example.com",
      DEEPSEEK_MODEL: "model-x",
    },
  });
  proxy.fetchMock.enqueueJson({ choices: [{ message: { content: "REVIEW" } }] });

  const review = await proxy.requestReview(makeEntry({ id: "e1" }));

  assert.equal(review, "REVIEW");
  const call = proxy.fetchMock.calls[0];
  assert.equal(call.url, "https://api.example.com/chat/completions");
  assert.equal(call.method, "POST");
  assert.equal(call.headers.Authorization, "Bearer secret");
  assert.equal(call.body.model, "model-x");
  assert.equal(call.body.stream, false);
  assert.equal(call.body.messages.length, 2);
  assert.equal(call.body.messages[0].role, "system");
  assert.equal(call.body.messages[1].role, "user");
  assert.match(call.body.messages[1].content, /<entry>/);
});

test("requestReview maps an upstream HTTP error to a friendly message", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  proxy.fetchMock.enqueueText("insufficient", 402);

  await assert.rejects(
    () => proxy.requestReview(makeEntry()),
    (error) => {
      assert.equal(error.statusCode, 402);
      assert.match(error.message, /insufficient balance/i);
      return true;
    },
  );
});

test("requestReview treats an empty completion as a 502", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  proxy.fetchMock.enqueueJson({ choices: [{ message: { content: "" } }] });

  await assert.rejects(
    () => proxy.requestReview(makeEntry()),
    (error) => {
      assert.equal(error.statusCode, 502);
      return true;
    },
  );
});

test("requestReview propagates an AbortError", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  const abortError = new Error("aborted");
  abortError.name = "AbortError";
  proxy.fetchMock.enqueueError(abortError);

  await assert.rejects(
    () => proxy.requestReview(makeEntry()),
    (error) => {
      assert.equal(error.name, "AbortError");
      return true;
    },
  );
});
