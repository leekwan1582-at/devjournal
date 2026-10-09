const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadProxy } = require("../helpers/load-proxy");
const { makeEntry } = require("../fixtures/entries");

function makeRequest(overrides = {}) {
  return {
    method: "POST",
    path: "/api/ai-review",
    body: { entry: makeEntry() },
    ...overrides,
  };
}

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeNext() {
  const state = { called: false };
  return [() => {
    state.called = true;
  }, state];
}

test("middleware defers non-POST requests to next()", async () => {
  const { middleware } = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  const response = makeResponse();
  const [next, state] = makeNext();

  await middleware(makeRequest({ method: "GET" }), response, next);

  assert.equal(state.called, true);
  assert.equal(response.body, null);
});

test("middleware defers other paths to next()", async () => {
  const { middleware } = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  const response = makeResponse();
  const [next, state] = makeNext();

  await middleware(makeRequest({ path: "/entries" }), response, next);

  assert.equal(state.called, true);
  assert.equal(response.body, null);
});

test("middleware returns 400 when the entry is missing", async () => {
  const { middleware } = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  const response = makeResponse();

  await middleware(makeRequest({ body: {} }), response, () => {});

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /entry object/);
});

test("middleware returns 500 when the API key is missing", async () => {
  const { middleware } = loadProxy({ env: {} });
  const response = makeResponse();

  await middleware(makeRequest(), response, () => {});

  assert.equal(response.statusCode, 500);
  assert.match(response.body.error, /DEEPSEEK_API_KEY/);
});

test("middleware returns the review on success", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  proxy.fetchMock.enqueueJson({ choices: [{ message: { content: "REVIEW" } }] });
  const response = makeResponse();

  await proxy.middleware(makeRequest(), response, () => {});

  assert.equal(response.statusCode, null);
  assert.equal(response.body.review, "REVIEW");
});

test("middleware maps an upstream 401 to 401", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  proxy.fetchMock.enqueueText("nope", 401);
  const response = makeResponse();

  await proxy.middleware(makeRequest(), response, () => {});

  assert.equal(response.statusCode, 401);
  assert.match(response.body.error, /API key/);
});

test("middleware maps an upstream 500 to 502", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  proxy.fetchMock.enqueueText("boom", 500);
  const response = makeResponse();

  await proxy.middleware(makeRequest(), response, () => {});

  assert.equal(response.statusCode, 502);
});

test("middleware maps an AbortError to 504", async () => {
  const proxy = loadProxy({ env: { DEEPSEEK_API_KEY: "k" } });
  const abortError = new Error("aborted");
  abortError.name = "AbortError";
  proxy.fetchMock.enqueueError(abortError);
  const response = makeResponse();

  await proxy.middleware(makeRequest(), response, () => {});

  assert.equal(response.statusCode, 504);
  assert.match(response.body.error, /timed out/);
});
