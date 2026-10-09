/**
 * In-process `fetch` stub for the ai-proxy middleware tests.
 *
 * Install it in the sandbox (or on globalThis) and configure a queue of
 * responses. The recorded `calls` array exposes the URL, method, headers,
 * and JSON body of each request.
 */

function createFetchMock() {
  const calls = [];
  const queue = [];

  const fetchMock = async (url, init = {}) => {
    calls.push({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
      signal: init.signal,
    });

    const next = queue.shift();
    if (!next) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {};
        },
        async text() {
          return "";
        },
      };
    }

    if (next.error) {
      throw next.error;
    }

    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() {
        return next.json ?? {};
      },
      async text() {
        return next.text ?? "";
      },
    };
  };

  return {
    fetch: fetchMock,
    calls,
    /** Queue a successful JSON response. */
    enqueueJson(json, status = 200) {
      queue.push({ status, json });
    },
    /** Queue a raw text response (used for upstream error bodies). */
    enqueueText(text, status = 200) {
      queue.push({ status, text });
    },
    /** Queue a thrown error (e.g. an AbortError). */
    enqueueError(error) {
      queue.push({ error });
    },
    reset() {
      calls.length = 0;
      queue.length = 0;
    },
  };
}

module.exports = { createFetchMock };
