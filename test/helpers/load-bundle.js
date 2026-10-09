/**
 * Load data.js + ai.js + scripts.js into one shared `node:vm` context.
 *
 * The browser scripts declare globals and are not modules, so they are
 * concatenated and run as a single script. Top-level function declarations
 * land on the sandbox (context global); lexically-scoped `const`/`let` state
 * is exposed through the appended epilogue as `sandbox.__test`.
 */

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createDom } = require("./dom-stub");
const { createAxiosMock } = require("./axios-mock");
const { createFetchMock } = require("./fetch-mock");

const ROOT = path.resolve(__dirname, "..", "..");

function readSource(fileName) {
  return fs.readFileSync(path.join(ROOT, fileName), "utf8");
}

const EPILOGUE = `
globalThis.__test = {
  getApiUrl: () => API_URL,
  getCategoryOptions: () => CATEGORY_OPTIONS,
  getEntriesState: () => entriesState,
  setEntriesState: (value) => { entriesState = value; },
  getActiveEntryId: () => activeEntryId,
  setActiveEntryId: (value) => { activeEntryId = value; },
  getSearchTerm: () => searchTerm,
  setSearchTerm: (value) => { searchTerm = value; },
  getCategoryFilterValue: () => categoryFilterValue,
  setCategoryFilterValue: (value) => { categoryFilterValue = value; },
  getSortOption: () => sortOption,
  setSortOption: (value) => { sortOption = value; },
  getThemePreference: () => themePreference,
  setThemePreference: (value) => { themePreference = value; },
};
`;

/**
 * Build a fresh, isolated app sandbox.
 * @param {Object} [overrides]
 * @param {boolean} [overrides.prefersDark]  OS dark preference for matchMedia.
 * @param {boolean} [overrides.mobile]       Mobile viewport for matchMedia.
 * @param {boolean} [overrides.secureContext]
 * @param {Object}  [overrides.axios]        Custom axios mock.
 * @param {Object}  [overrides.fetchMock]    Custom fetch mock.
 * @param {Object}  [overrides.bootstrap]    Bootstrap stub.
 * @param {Object}  [overrides.Swal]         SweetAlert2 stub.
 * @param {Object}  [overrides.marked]       marked stub.
 * @param {Object}  [overrides.DOMPurify]    DOMPurify stub.
 * @returns {Object} The vm context (app sandbox).
 */
function loadBundle(overrides = {}) {
  const dom = createDom({
    prefersDark: overrides.prefersDark,
    mobile: overrides.mobile,
    secureContext: overrides.secureContext,
  });

  const axiosMock = overrides.axios || createAxiosMock();
  const fetchMock = overrides.fetchMock || createFetchMock();

  const timers = [];
  const fakeSetTimeout = (handler, delay) => {
    const id = timers.length + 1;
    timers.push({ id, handler, delay, cancelled: false });
    return id;
  };
  const fakeClearTimeout = (id) => {
    const timer = timers.find((entry) => entry.id === id);
    if (timer) {
      timer.cancelled = true;
    }
  };

  dom.window.setTimeout = fakeSetTimeout;
  dom.window.clearTimeout = fakeClearTimeout;

  const sandbox = {
    console,
    document: dom.document,
    window: dom.window,
    navigator: dom.navigator,
    localStorage: dom.localStorage,
    axios: axiosMock,
    bootstrap: overrides.bootstrap || {
      Modal: { getOrCreateInstance: () => ({ show() {}, hide() {} }) },
    },
    Swal: overrides.Swal || { fire: () => {}, isVisible: () => false },
    marked: overrides.marked || { parse: (markdown) => markdown },
    DOMPurify: overrides.DOMPurify || { sanitize: (html) => html },
    fetch: fetchMock.fetch,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    URL: globalThis.URL,
    URLSearchParams: globalThis.URLSearchParams,
    Blob: globalThis.Blob,
    AbortController: globalThis.AbortController,
  };

  vm.createContext(sandbox);

  const source = [
    readSource("data.js"),
    readSource("ai.js"),
    readSource("scripts.js"),
    EPILOGUE,
  ].join("\n;\n");

  vm.runInContext(source, sandbox, { filename: "trace-diary-bundle.js" });

  sandbox.__axios = axiosMock;
  sandbox.__fetch = fetchMock;
  sandbox.__dom = dom;
  sandbox.__timers = timers;
  sandbox.__runTimers = () => {
    timers.filter((timer) => !timer.cancelled).forEach((timer) => timer.handler());
  };

  return sandbox;
}

module.exports = { loadBundle };
