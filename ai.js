/**
 * @file Browser-side AI review service.
 *
 *       Sends the currently open entry to the local proxy endpoint exposed by
 *       ai-proxy.js (a json-server middleware) and renders the returned review
 *       inline in the detail pane. The DeepSeek API key stays server-side and
 *       never reaches the browser.
 */

// Derived from the configurable API base so the same origin is reused.
const aiReviewEndpoint = API_URL.replace(/\/entries\/?$/, "/api/ai-review");

const AI_REVIEW_SECTION_ID = "aiReviewSection";

/**
 * Create one small icon button for the AI review actions toolbar.
 * @param {string} action  Value stored in `data-action` (used for lookup).
 * @param {string} iconClass  Bootstrap Icons class.
 * @param {string} label
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
 * Create (or replace) the inline AI review section in the detail pane.
 * Replacing an existing section prevents repeated reviews from stacking.
 * @returns {{body: HTMLElement, actions: HTMLElement}} The body to fill and
 *          the hidden actions toolbar to reveal once a review is rendered.
 */
function ensureAiReviewSection() {
  const detailContent = document.getElementById("detailContent");

  const existing = document.getElementById(AI_REVIEW_SECTION_ID);
  if (existing) {
    existing.remove();
  }

  const section = document.createElement("section");
  section.id = AI_REVIEW_SECTION_ID;
  section.className = "mt-4";

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

  const actions = document.createElement("div");
  actions.className = "ai-review-actions d-none";
  actions.appendChild(createAiReviewActionButton("copy", "bi-clipboard", "Copy review"));
  actions.appendChild(createAiReviewActionButton("download", "bi-download", "Download review"));
  header.appendChild(actions);

  section.appendChild(header);

  const body = document.createElement("div");
  body.setAttribute("role", "status");
  body.setAttribute("aria-live", "polite");
  section.appendChild(body);

  detailContent.appendChild(section);
  return { body, actions };
}

/**
 * Replace the AI review body with a single status paragraph.
 * @param {HTMLElement} body
 * @param {string} message
 * @param {boolean} [isError=false]
 * @returns {void}
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
 * Turn an axios error from the AI proxy into a readable message.
 * @param {Object} error
 * @returns {string}
 */
function describeAiReviewError(error) {
  if (error && error.response) {
    const data = error.response.data;
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

/**
 * Copy text to the clipboard, preferring the async Clipboard API and
 * falling back to a hidden <textarea> + execCommand (for non-secure origins
 * such as file://).
 * @param {string} text
 * @returns {Promise<boolean>} True if the copy succeeded.
 */
async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // fall through to the legacy path
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

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
 * Trigger a browser download for some text content.
 * @param {string} filename
 * @param {string} text
 * @param {string} mimeType
 * @returns {void}
 */
function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Build a safe download filename for an entry's review.
 * @param {Entry} entry
 * @returns {string}
 */
function aiReviewFilename(entry) {
  const rawId = entry && entry.id != null ? String(entry.id) : "entry";
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "entry";
  const date = new Date().toISOString().slice(0, 10);
  return `trace-diary-review-${safeId}-${date}.md`;
}

/**
 * Briefly swap an action button's icon to a checkmark.
 * @param {HTMLElement} button
 * @returns {void}
 */
function flashAiReviewActionCopied(button) {
  const icon = button.querySelector("i");
  if (!icon) {
    return;
  }
  const originalClassName = icon.className;
  icon.className = "bi bi-check2";
  window.setTimeout(() => {
    icon.className = originalClassName;
  }, 1500);
}

/**
 * Wire the copy and download buttons to the raw Markdown review.
 * @param {HTMLElement} actions
 * @param {string} review  Raw Markdown.
 * @param {Entry} entry
 * @returns {void}
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
      downloadTextFile(aiReviewFilename(entry), review, "text/markdown;charset=utf-8");
    });
  }
}

/**
 * Render the review as formatted HTML, falling back to plain text, then
 * reveal and wire the copy/download actions.
 *
 * The review is Markdown, so it is parsed with `marked` and then sanitized
 * with `DOMPurify` before insertion (the text may echo user-authored HTML).
 * If either library is unavailable, the raw text is shown in a <pre>.
 *
 * @param {HTMLElement} body  The AI review body element.
 * @param {HTMLElement} actions  The hidden actions toolbar.
 * @param {string} review
 * @param {Entry} entry
 * @returns {void}
 */
function renderAiReviewContent(body, actions, review, entry) {
  const plainTextFallback = document.createElement("pre");
  plainTextFallback.className = "log-text-block mb-0";
  plainTextFallback.textContent = review;

  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    body.replaceChildren(plainTextFallback);
  } else {
    const container = document.createElement("div");
    container.className = "ai-review-markdown";
    container.innerHTML = DOMPurify.sanitize(marked.parse(review));
    body.replaceChildren(container);
  }

  if (actions) {
    actions.classList.remove("d-none");
    bindAiReviewActions(actions, review, entry);
  }
}

/**
 * Request an AI review for an entry and render it inline in the detail pane.
 *
 * Never rejects; failures are reported inside the section. If the pane is
 * re-rendered (entry change or deselect), the section is cleared with it.
 *
 * @param {Entry} entry
 * @returns {Promise<void>}
 */
async function requestAiReview(entry) {
  if (!entry) {
    return;
  }

  const { body, actions } = ensureAiReviewSection();
  renderAiReviewStatus(body, "Reviewing entry… this can take a few seconds.");

  try {
    const response = await axios.post(aiReviewEndpoint, { entry });
    const review = response.data && response.data.review;

    if (typeof review !== "string" || review.trim() === "") {
      renderAiReviewStatus(body, "The AI returned an empty review.", true);
      return;
    }

    renderAiReviewContent(body, actions, review, entry);
  } catch (err) {
    renderAiReviewStatus(body, describeAiReviewError(err), true);
  }
}
