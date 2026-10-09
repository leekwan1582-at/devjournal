const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadBundle } = require("../helpers/load-bundle");

const app = loadBundle();

test("describeRequestError returns the message for a shape error", () => {
  assert.equal(
    app.describeRequestError({ unexpectedShape: true, message: "bad shape" }),
    "bad shape",
  );
});

test("describeRequestError reports an HTTP status", () => {
  assert.equal(
    app.describeRequestError({ response: { status: 500 } }),
    "Server responded with 500",
  );
});

test("describeRequestError includes statusText when present", () => {
  assert.equal(
    app.describeRequestError({ response: { status: 404, statusText: "Not Found" } }),
    "Server responded with 404 Not Found",
  );
});

test("describeRequestError reports a timeout", () => {
  assert.equal(
    app.describeRequestError({ code: "ECONNABORTED" }),
    "The request timed out. Check that JSON Server is running.",
  );
});

test("describeRequestError reports an unreachable API", () => {
  assert.match(app.describeRequestError({ request: {} }), /Cannot reach the API/);
});

test("describeRequestError falls back to Unknown error", () => {
  assert.equal(app.describeRequestError({}), "Unknown error");
});
