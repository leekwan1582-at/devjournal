/**
 * Load ai-proxy.js in isolation.
 *
 * The module calls `require("dotenv").config()` at load, so the sandbox
 * substitutes a no-op dotenv (the real `.env` is never read). `fetch`,
 * `process.env`, and timers are injectable, and the internal helpers are
 * re-exposed for unit testing.
 */

const fs = require("node:fs");
const path = require("node:path");
const { createFetchMock } = require("./fetch-mock");

const ROOT = path.resolve(__dirname, "..", "..");

/**
 * @param {Object} [options]
 * @param {Object} [options.fetchMock]  Custom fetch mock (defaults to a fresh one).
 * @param {Object} [options.env]        Initial `process.env` values.
 * @returns {Object} `{ middleware, requestReview, formatEntry, buildChatCompletionsUrl, describeUpstreamStatus, env, fetchMock, consoleCalls }`
 */
function loadProxy(options = {}) {
  const source = fs.readFileSync(path.join(ROOT, "ai-proxy.js"), "utf8");
  const fetchMock = options.fetchMock || createFetchMock();
  const env = { ...(options.env || {}) };
  const consoleCalls = [];

  const consoleStub = {
    log: (...args) => consoleCalls.push({ level: "log", args }),
    warn: (...args) => consoleCalls.push({ level: "warn", args }),
    error: (...args) => consoleCalls.push({ level: "error", args }),
  };

  const requireStub = (name) => {
    if (name === "dotenv") {
      return { config: () => ({ parsed: {} }) };
    }
    return require(name);
  };

  const factory = new Function(
    "module",
    "exports",
    "require",
    "process",
    "fetch",
    "AbortController",
    "setTimeout",
    "clearTimeout",
    "console",
    "URL",
    source +
      "\nmodule.exports.__internals = { formatEntry, buildChatCompletionsUrl, describeUpstreamStatus, requestReview };\n",
  );

  const moduleObject = { exports: {} };
  factory(
    moduleObject,
    moduleObject.exports,
    requireStub,
    { env },
    fetchMock.fetch,
    globalThis.AbortController,
    () => 0,
    () => {},
    consoleStub,
    globalThis.URL,
  );

  const middleware = moduleObject.exports;
  return {
    middleware,
    ...middleware.__internals,
    env,
    fetchMock,
    consoleCalls,
  };
}

module.exports = { loadProxy };
