Here is the complete step-by-step developer guide for **`ai.js`**—the browser-side AI review interface for **TraceDiary**.

This script handles browser-to-proxy communication, dynamic DOM creation for the AI review section, status reporting, secure Markdown rendering with XSS sanitization, and fallback clipboard/download action tools.

---

### **Step 01. Dynamic Endpoint Resolution & Section Constants**

**Objectives:** Resolve the AI proxy endpoint dynamically from `API_URL` defined in `data.js` (`/entries` \\(\rightarrow\\) `/api/ai-review`), and declare section element anchors.

```javascript
/**
 * @file ai.js - Browser-side AI review service.
 * Communicates with the local proxy endpoint exposed by ai-proxy.js
 * and renders the returned Markdown review inline in the detail pane.
 */

// Derive proxy endpoint from global API_URL so same origin/host is reused
const aiReviewEndpoint = API_URL.replace(/\/entries\/?$/, "/api/ai-review");

// DOM Section ID Anchor
const AI_REVIEW_SECTION_ID = "aiReviewSection";
```

- **Detailed Breakdown for Junior Developers:**
  - **Dynamic Endpoint Derivation:** Instead of hardcoding `http://localhost:3000/api/ai-review`, `API_URL.replace(/\/entries\/?$/, "/api/ai-review")` ensures that if your app runs in GitHub Codespaces or a custom host, `ai.js` automatically routes to the correct proxy host.

---

### **Step 02. UI Section Construction & Idempotent DOM Injection**

**Objectives:** Build helper functions to generate accessible action buttons (`createAiReviewActionButton`) and create an **idempotent** `<section>` inside `#detailContent` (`ensureAiReviewSection`).

```javascript
// ── UI Section Construction ───────────────────────────────────────────

/**
 * Creates an icon button for the AI review toolbar.
 * @param {string} action - Action identifier ("copy" | "download").
 * @param {string} iconClass - Bootstrap Icon class name.
 * @param {string} label - Accessible button label.
 * @returns {HTMLButtonElement}
 */
function createAiReviewActionButton(action, iconClass, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-outline-secondary btn-sm me-1";
  button.dataset.action = action;
  button.title = label;
  button.setAttribute("aria-label", label);

  const icon = document.createElement("i");
  icon.className = `bi ${iconClass}`;
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);

  return button;
}

/**
 * Ensures a single AI review section exists inside #detailContent.
 * Replaces any existing section to prevent repeated reviews from stacking up.
 * @returns {{ body: HTMLElement, actions: HTMLElement }}
 */
function ensureAiReviewSection() {
  const detailContent = document.getElementById("detailContent");

  // Remove existing review section if present (Idempotent cleanup)
  const existing = document.getElementById(AI_REVIEW_SECTION_ID);
  if (existing) {
    existing.remove();
  }

  const section = document.createElement("section");
  [suspicious link removed] = AI_REVIEW_SECTION_ID;
  section.className = "mt-4";

  // Section Header
  const header = document.createElement("div");
  header.className = "d-flex justify-content-between align-items-center mb-2";

  const heading = document.createElement("h3");
  heading.className = "h6 fw-bold mb-0";

  const icon = document.createElement("i");
  icon.className = "bi bi-robot me-2";
  icon.setAttribute("aria-hidden", "true");
  heading.appendChild(icon);
  heading.appendChild(document.createTextNode("AI Review"));
  header.appendChild(heading);

  // Hidden Actions Toolbar (revealed when review renders)
  const actions = document.createElement("div");
  actions.className = "ai-review-actions d-none";
  actions.appendChild(createAiReviewActionButton("copy", "bi-clipboard", "Copy review"));
  actions.appendChild(createAiReviewActionButton("download", "bi-download", "Download review"));
  header.appendChild(actions);

  section.appendChild(header);

  // Status & Content Body (Live region for screen readers)
  const body = document.createElement("div");
  body.setAttribute("role", "status");
  body.setAttribute("aria-live", "polite");
  section.appendChild(body);

  detailContent.appendChild(section);

  return { body, actions };
}
```

- **Detailed Breakdown for Junior Developers:**
  - **Idempotency:** Calling `ensureAiReviewSection()` checks for `AI_REVIEW_SECTION_ID` and removes it before creating a new one. This prevents duplicate review cards from stacking up when a developer clicks the review button multiple times on the same record.
  - **Accessibility:** Setting `role="status"` and `aria-live="polite"` ensures screen readers announce "Reviewing entry..." and the final evaluation automatically without interrupting speech.

---

### **Step 03. Status Rendering & Error Classifier (`describeAiReviewError`)**

**Objectives:** Provide visual and screen reader status updates, and map proxy network exceptions (timeouts, HTTP 401, HTTP 402, HTTP 504) into clear user guidance.

```javascript
// ── Status & Error Reporting ──────────────────────────────────────────

/**
 * Renders a status or error message inside the AI review section.
 * @param {HTMLElement} body - Target body element.
 * @param {string} message - Message text.
 * @param {boolean} [isError=false] - If true, styles text with text-danger and role="alert".
 */
function renderAiReviewStatus(body, message, isError = false) {
  const paragraph = document.createElement("p");
  paragraph.className = `small mb-0 ${isError ? "text-danger" : "text-body-secondary"}`;
  if (isError) {
    paragraph.setAttribute("role", "alert");
  }
  paragraph.textContent = message;
  body.replaceChildren(paragraph);
}

/**
 * Translates proxy/Axios errors into human-readable messages.
 * @param {Object} error - Caught Axios error object.
 * @returns {string} Readable error explanation.
 */
function describeAiReviewError(error) {
  if (error && error.response) {
    const data = [suspicious link removed];
    if (data && typeof data.error === "string" && data.error !== "") {
      return data.error;
    }
    return `AI review failed (HTTP ${error.response.status}).`;
  }
  if (error && error.code === "ECONNABORTED") {
    return "The AI review timed out.";
  }
  return "Could not reach the AI review service. Is the mock API running?";
}
```

---

### **Step 04. Clipboard & File Download Utilities**

**Objectives:** Implement secure cross-browser text copying with a fallback for non-secure origins (`file://`), browser file downloading using object URLs, file naming helpers, and visual button feedback.

```javascript
// ── Export & Utility Helpers ──────────────────────────────────────────

/**
 * Copies text to clipboard, falling back to execCommand for non-HTTPS/file:// environments.
 * @param {string} text - Text to copy.
 * @returns {Promise<boolean>} True if copy succeeded.
 */
async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback to legacy path below
    }
  }

  // Legacy fallback using hidden textarea
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  [suspicious link removed].position = "fixed";
  [suspicious link removed] = "-1000px";
  [suspicious link removed].opacity = "0";
  document.body.appendChild(textarea);
  [suspicious link removed]();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (err) {
    copied = false;
  }
  textarea.remove();
  return copied;
}

/**
 * Triggers a browser file download for a text string.
 * @param {string} filename - Target file name.
 * @param {string} text - Text content to download.
 * @param {string} mimeType - MIME type string.
 */
function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  [suspicious link removed] = filename;
  document.body.appendChild(link);
  [suspicious link removed]();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Builds a safe filename for downloading an entry's AI review.
 * @param {Object} entry - Entry object.
 * @returns {string} Sanitized filename (e.g. "[suspicious link removed]").
 */
function aiReviewFilename(entry) {
  const rawId = entry && [suspicious link removed] != null ? String([suspicious link removed]) : "entry";
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+\$/g, "") || "entry";
  const date = new Date().toISOString().slice(0, 10);
  return `trace-diary-review-${safeId}-${date}.md`;
}

/**
 * Briefly swaps an action button icon to a checkmark for visual feedback.
 * @param {HTMLElement} button - Button element.
 */
function flashAiReviewActionCopied(button) {
  const icon = button.querySelector("i");
  if (!icon) return;
  const originalClassName = icon.className;
  icon.className = "bi bi-check2";
  window.setTimeout(() => {
    icon.className = originalClassName;
  }, 1500);
}

/**
 * Binds click events to the Copy and Download toolbar buttons.
 */
function bindAiReviewActions(actions, review, entry) {
  const copyBtn = actions.querySelector('[data-action="copy"]');
  const downloadBtn = actions.querySelector('[data-action="download"]');

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const copied = await copyTextToClipboard(review);
      if (copied) {
        flashAiReviewActionCopied(copyBtn);
        if (typeof showToast === "function") {
          showToast("Copied to clipboard");
        }
      } else if (typeof showToast === "function") {
        showToast("Copy failed", "error");
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadTextFile(
        aiReviewFilename(entry),
        review,
        "text/markdown;charset=utf-8"
      );
    });
  }
}
```

---

### **Step 05. Safe Markdown Parsing & Sanitization (`renderAiReviewContent`)**

**Objectives:** Parse the Markdown output returned by DeepSeek using `marked.parse()`, sanitize the generated HTML with `DOMPurify.sanitize()` to protect against XSS, and reveal the actions toolbar. Include a `<pre>` fallback if CDN libraries are unavailable.

```javascript
// ── Markdown Parsing & Content Rendering ──────────────────────────────

/**
 * Renders Markdown review as sanitized HTML, with fallback to plain text.
 * @param {HTMLElement} body - Section body container.
 * @param {HTMLElement} actions - Toolbar container.
 * @param {string} review - Raw Markdown string returned by AI proxy.
 * @param {Object} entry - Active log entry object.
 */
function renderAiReviewContent(body, actions, review, entry) {
  const plainTextFallback = document.createElement("pre");
  plainTextFallback.className = "log-text-block mb-0";
  plainTextFallback.textContent = review;

  // Fall back to plain text if CDN libraries (marked or DOMPurify) are missing
  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    body.replaceChildren(plainTextFallback);
  } else {
    const container = document.createElement("div");
    container.className = "ai-review-markdown";
    // Parse Markdown then sanitize HTML against XSS before inserting into DOM
    container.innerHTML = DOMPurify.sanitize(marked.parse(review));
    body.replaceChildren(container);
  }

  // Reveal actions toolbar and wire Copy & Download buttons
  if (actions) {
    actions.classList.remove("d-none");
    bindAiReviewActions(actions, review, entry);
  }
}
```

- **Detailed Breakdown for Junior Developers:**
  - **Double-Layered Security:** `marked.parse()` converts Markdown syntax (tables, code blocks) to raw HTML. Passing the result through `DOMPurify.sanitize(...)` strips any embedded `<script>` or malicious tags before inserting into the DOM.

---

### **Step 06. Main Dispatcher Logic (`requestAiReview`)**

**Objectives:** Build the main asynchronous entry point (`requestAiReview`) called when a user clicks `#aiReviewBtn` in `scripts.js`.

```javascript
// ── Main Review Dispatcher ────────────────────────────────────────────

/**
 * Requests an AI evaluation for a log entry and renders the result inline.
 * Never rejects; surfaces errors gracefully within the review section.
 * @param {Object} entry - Log entry object to evaluate.
 * @returns {Promise<void>}
 */
async function requestAiReview(entry) {
  if (!entry) return;

  const { body, actions } = ensureAiReviewSection();
  renderAiReviewStatus(body, "Reviewing entry… this can take a few seconds.");

  try {
    const response = await [suspicious link removed](aiReviewEndpoint, { entry });
    const review = [suspicious link removed] && [suspicious link removed];

    if (typeof review !== "string" || review.trim() === "") {
      renderAiReviewStatus(body, "The AI returned an empty review.", true);
      return;
    }

    renderAiReviewContent(body, actions, review, entry);
  } catch (err) {
    renderAiReviewStatus(body, describeAiReviewError(err), true);
  }
}
```

---

### **Summary Sequence Checklist for `ai.js`**

| Step   | Focus Area              | Key Functions                                                       | Purpose                                                                 |
| :----- | :---------------------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------- |
| **01** | Endpoint Resolution     | `aiReviewEndpoint`                                                  | Derives `/api/ai-review` dynamically from `API_URL`.                    |
| **02** | UI Section Setup        | `ensureAiReviewSection()`                                           | Idempotently creates `#aiReviewSection` and header actions.             |
| **03** | Status & Error Handling | `renderAiReviewStatus()`, `describeAiReviewError()`                 | Displays loading/error status with accessible `role="alert"`.           |
| **04** | Utilities               | `copyTextToClipboard()`, `downloadTextFile()`, `aiReviewFilename()` | Cross-browser clipboard copy, `.md` file download, and button feedback. |
| **05** | Safe Rendering          | `renderAiReviewContent()`                                           | `marked.parse()` + `DOMPurify.sanitize()` with `<pre>` fallback.        |
| **06** | Main Dispatcher         | `requestAiReview()`                                                 | Executes `[suspicious link removed]` to proxy and delegates rendering.  |

---

### **🎉 Complete TraceDiary Project Guide Series Finished!**

Your complete developer walkthrough suite is fully documented across all 5 core application files:

1. **`index.html`** (HTML5 Boilerplate, Layout Grid & Components)
2. **`style.css`** (Category Color Hooks, Responsive Split-Pane & Monospace Formatting)
3. **`scripts.js`** (DOM Controller, Event Delegation, Filtering & Debouncing)
4. **`data.js`** (Axios Async CRUD & Global In-Memory State Store)
5. **`ai-proxy.js`** (Express Middleware Proxy & DeepSeek API Integration)
6. **`ai.js`** (Client-Side AI Service, Safe Markdown Rendering & Export Utilities)

💡 _Let me know if you would like me to help you prepare an oral defense script, flashcard revision deck, or summary presentation for your portfolio assessment!_
