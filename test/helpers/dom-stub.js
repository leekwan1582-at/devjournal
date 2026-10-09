/**
 * Minimal DOM/browser stub for loading the global scripts under Node.
 *
 * Only the surface used by data.js / ai.js / scripts.js is implemented.
 * This is deliberately lightweight: tests exercise logic, not the real DOM.
 */

/**
 * Ids that the app looks up on load / during normal use. Only these are
 * auto-created by getElementById; any other id returns null when absent
 * (matching the real DOM, and letting tests assert that dynamic sections
 * like #aiReviewSection do not exist yet).
 */
const AUTO_IDS = new Set([
  "listView",
  "detailView",
  "detailCard",
  "detailHeaderTitle",
  "detailActionGroup",
  "detailContent",
  "entriesList",
  "searchInput",
  "categoryFilter",
  "sortSelect",
  "refreshBtn",
  "themeToggleBtn",
  "backToListBtn",
  "editEntryBtn",
  "deleteEntryBtn",
  "openFormBtn",
  "aiReviewBtn",
  "entryModal",
  "formModalTitle",
  "logForm",
  "entryId",
  "category",
  "submitFormBtn",
  "console-container",
  "console-output",
  "clearConsoleBtn",
  // Form fields read dynamically via FORM_FIELDS.
  "title",
  "symptom",
  "tried",
  "rootCause",
  "fix",
  "lesson",
]);

function matchesSelector(element, selector) {
  const sel = selector.trim();

  const dataAction = sel.match(/^\[data-action=["'](.+)["']\]$/);
  if (dataAction) {
    return element.dataset && element.dataset.action === dataAction[1];
  }

  if (sel.startsWith(".")) {
    return element.classList.contains(sel.slice(1));
  }
  if (sel.startsWith("#")) {
    return element.id === sel.slice(1);
  }
  if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(sel)) {
    return element.tagName.toLowerCase() === sel.toLowerCase();
  }
  return false;
}

function querySelector(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      return child;
    }
    const nested = querySelector(child, selector);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function querySelectorAll(root, selector) {
  const found = [];
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      found.push(child);
    }
    found.push(...querySelectorAll(child, selector));
  }
  return found;
}

/**
 * Depth-first search for a descendant whose `id` matches.
 * @param {Object} root
 * @param {string} id
 * @returns {Object|null}
 */
function findById(root, id) {
  for (const child of root.children || []) {
    if (child.id === id) {
      return child;
    }
    const found = findById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Create a bare element stub.
 * @param {string} [tagName="div"]
 * @returns {Object}
 */
function createElement(tagName = "div") {
  const listeners = {};

  const element = {
    tagName: String(tagName).toUpperCase(),
    nodeType: 1,
    id: "",
    children: [],
    parentElement: null,
    dataset: {},
    style: {},
    _attrs: {},
    _listeners: listeners,
    textContent: "",
    innerHTML: "",
    value: "",
    title: "",
    type: "",
    hidden: false,
    disabled: false,
    defaultSelected: false,
    tabIndex: 0,
    className: "",
    scrollTop: 0,
    scrollHeight: 0,
    firstElementChild: null,
  };

  element.classList = {
    add(...classes) {
      const set = new Set(element.className.split(/\s+/).filter(Boolean));
      classes.forEach((cls) => set.add(cls));
      element.className = [...set].join(" ");
    },
    remove(...classes) {
      const remove = new Set(classes);
      element.className = element.className
        .split(/\s+/)
        .filter((cls) => cls && !remove.has(cls))
        .join(" ");
    },
    toggle(cls, force) {
      const has = element.classList.contains(cls);
      const on = force === undefined ? !has : Boolean(force);
      if (on) {
        element.classList.add(cls);
      } else {
        element.classList.remove(cls);
      }
      return on;
    },
    contains(cls) {
      return element.className.split(/\s+/).includes(cls);
    },
  };

  element.appendChild = (child) => {
    if (child == null) {
      return child;
    }
    element.children.push(child);
    child.parentElement = element;
    element.firstElementChild = element.children[0];
    return child;
  };
  element.append = (...nodes) => {
    nodes.forEach((node) => element.appendChild(node));
  };
  element.insertBefore = (node, reference) => {
    const index = reference ? element.children.indexOf(reference) : -1;
    if (index === -1) {
      element.children.push(node);
    } else {
      element.children.splice(index, 0, node);
    }
    node.parentElement = element;
    element.firstElementChild = element.children[0] || null;
    return node;
  };
  element.replaceChildren = (...nodes) => {
    element.children = [];
    nodes.forEach((node) => {
      if (node != null) {
        element.children.push(node);
        node.parentElement = element;
      }
    });
    element.firstElementChild = element.children[0] || null;
  };
  element.removeChild = (child) => {
    const index = element.children.indexOf(child);
    if (index !== -1) {
      element.children.splice(index, 1);
    }
    element.firstElementChild = element.children[0] || null;
    return child;
  };
  element.remove = () => {
    if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
  };

  element.setAttribute = (name, value) => {
    element._attrs[name] = String(value);
  };
  element.getAttribute = (name) => (name in element._attrs ? element._attrs[name] : null);
  element.removeAttribute = (name) => {
    delete element._attrs[name];
  };

  element.addEventListener = (type, handler) => {
    (listeners[type] = listeners[type] || []).push(handler);
  };
  element.removeEventListener = (type, handler) => {
    if (listeners[type]) {
      listeners[type] = listeners[type].filter((fn) => fn !== handler);
    }
  };
  element.dispatchEvent = (event) => {
    (listeners[event.type] || []).forEach((handler) => handler(event));
  };
  element.click = () => {
    element.dispatchEvent({
      type: "click",
      target: element,
      preventDefault() {},
      stopPropagation() {},
    });
  };

  element.focus = () => {};
  element.blur = () => {};
  element.select = () => {};
  element.reset = () => {};
  element.closest = () => null;
  element.contains = (node) => {
    if (node === element) {
      return true;
    }
    return element.children.some((child) =>
      typeof child.contains === "function" ? child.contains(node) : child === node,
    );
  };
  element.querySelector = (selector) => querySelector(element, selector);
  element.querySelectorAll = (selector) => querySelectorAll(element, selector);

  return element;
}

/**
 * Create a sandbox of browser globals.
 * @param {Object} [options]
 * @param {boolean} [options.prefersDark=false]  `prefers-color-scheme: dark` result.
 * @param {boolean} [options.mobile=false]       `max-width: 767.98px` result.
 * @param {boolean} [options.secureContext=true] `window.isSecureContext`.
 * @returns {{document: Object, window: Object, navigator: Object, localStorage: Object, elements: Map}}
 */
function createDom(options = {}) {
  const elements = new Map();
  const documentListeners = {};

  const document = {
    documentElement: {
      _attrs: {},
      setAttribute(name, value) {
        this._attrs[name] = String(value);
      },
      getAttribute(name) {
        return name in this._attrs ? this._attrs[name] : null;
      },
    },
    body: createElement("body"),
    activeElement: null,
    getElementById(id) {
      if (elements.has(id)) {
        return elements.get(id);
      }
      for (const root of elements.values()) {
        const found = findById(root, id);
        if (found) {
          return found;
        }
      }
      if (!AUTO_IDS.has(id)) {
        return null;
      }
      const element = createElement("div");
      element.id = id;
      elements.set(id, element);
      return element;
    },
    createElement: (tagName) => createElement(tagName),
    createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
    execCommand: options.execCommand || (() => true),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, handler) {
      (documentListeners[type] = documentListeners[type] || []).push(handler);
    },
    removeEventListener(type, handler) {
      if (documentListeners[type]) {
        documentListeners[type] = documentListeners[type].filter((fn) => fn !== handler);
      }
    },
    dispatchEvent(event) {
      (documentListeners[event.type] || []).forEach((handler) => handler(event));
      return true;
    },
  };

  const storage = new Map();
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  const window = {
    innerWidth: 1200,
    isSecureContext: options.secureContext !== false,
    matchMedia(query) {
      const media = String(query);
      let matches = false;
      if (media.includes("prefers-color-scheme: dark")) {
        matches = Boolean(options.prefersDark);
      } else if (media.includes("max-width")) {
        matches = Boolean(options.mobile);
      }
      return {
        media,
        matches,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    alert: () => {},
    confirm: () => false,
    scrollTo: () => {},
  };

  const clipboardCalls = [];
  const navigator = {
    clipboard: {
      calls: clipboardCalls,
      writeText: async (text) => {
        clipboardCalls.push(text);
      },
    },
  };

  // The real theme toggle button contains an icon; applyTheme() dereferences it.
  const themeToggle = document.getElementById("themeToggleBtn");
  themeToggle.appendChild(document.createElement("i"));

  return { document, window, navigator, localStorage, elements };
}

module.exports = { createDom, createElement };
