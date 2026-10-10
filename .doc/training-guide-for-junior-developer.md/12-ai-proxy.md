Here is a comprehensive, step-by-step developer guide to coding **`ai-proxy.js`**—the backend middleware proxy for **TraceDiary**.

This script acts as an Express-compatible middleware running inside **JSON Server**. It securely intercepts requests from the browser (`ai.js`), attaches secret API credentials from `.env`, formats structured log entries into an engineering evaluation prompt, and dispatches them to the **DeepSeek AI API** without ever exposing private tokens to the client browser.

---

### **Step 01. Middleware Setup, Environment Configuration & Dependencies**

**Objectives:** Load environment variables using `dotenv` with `override: true`, define configuration constants (`DEFAULT_BASE_URL`, `DEFAULT_MODEL`, `REQUEST_TIMEOUT_MS`), and declare the proxy endpoint route (`/api/ai-review`).

```javascript
/**
 * @file ai-proxy.js - JSON Server middleware proxying entry reviews to DeepSeek API.
 * Run via: json-server data/entries.json --middlewares ./ai-proxy.js
 */

// Force dotenv to override existing shell environment variables with .env values
require("dotenv").config({ override: true });

// Route and default configuration constants
const AI_REVIEW_PATH = "/api/ai-review";
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-flash";
const REQUEST_TIMEOUT_MS = 60000; // 60-second AbortController limit
```

- **Detailed Breakdown for Junior Developers:**
  - **`require("dotenv").config({ override: true })`:** Loads key-value pairs from a local `.env` file into Node's `process.env`. Setting `override: true` guarantees that project settings inside `.env` take priority over system environment variables.
  - **Security Principle:** Private keys like `DEEPSEEK_API_KEY` are stored strictly on the server in `.env` (which is listed in `.gitignore`) and are never sent down to the client browser.

---

### **Step 02. Define the Senior Engineer Evaluation Rubric (`RUBRIC_PROMPT`)**

**Objectives:** Construct a strict, objective system prompt that instructs DeepSeek to act as a senior software engineer evaluating debugging logs against a 7-point quality rubric and generating a standardized Markdown report.

```javascript
// ── System Prompt & Evaluation Rubric ─────────────────────────────────

const RUBRIC_PROMPT = `You are a senior engineer reviewing a debugging-log entry. Evaluate it against the rubric below. Be specific and critical; do not flatter. Only use information in the entry. If something is missing, say "missing" rather than guessing.

Rubric (score each 1-5, with a one-sentence justification):
1. Symptom clarity: exact error message, where and when it occurs, reproducible?
2. Environment context: Node/Mocha versions, OS, run command, config files.
3. Tried: are failed attempts listed with WHY each failed?
4. Root cause: is it a true root cause or just a restatement of the fix?
5. Fix: concrete, verifiable, minimal, with the exact change shown?
6. Lesson: specific and reusable, or generic?
7. Technical accuracy: any wrong or misleading claims?

Output format:
* Scores table (criterion | score | justification)
* Top 3 gaps, most important first
* A rewritten version of the weakest section
* Overall verdict: Keep as is / Revise / Rewrite`;
```

- **Detailed Breakdown for Junior Developers:**
  - **Zero Hallucination Guard:** The instruction _"Only use information in the entry. If something is missing, say 'missing' rather than guessing"_ forces the LLM to grade strictly on provided evidence.
  - **Structured Output Schema:** Enforcing a specific Markdown layout (Scores table, Top 3 gaps, Rewritten section, Overall verdict) ensures consistent rendering in the UI.

---

### **Step 03. Payload Formatting & Entry Serialization (`formatEntry`)**

**Objectives:** Build a serialization helper (`formatEntry`) to extract all 9 fields from a log entry object (`id`, `timestamp`, `category`, `title`, `symptom`, `tried`, `rootCause`, `fix`, `lesson`) and format them into an XML-style `<entry>` block.

```javascript
// ── Entry Serialization Helper ────────────────────────────────────────

/**
 * Formats a log entry object into a structured text block for the AI model.
 * @param {Object} entry - Log entry record from data.js or API body.
 * @returns {string} Formatted XML-style entry block.
 */
function formatEntry(entry) {
  const fields = [
    "id",
    "timestamp",
    "category",
    "title",
    "symptom",
    "tried",
    "rootCause",
    "fix",
    "lesson",
  ];

  const lines = [suspicious link removed]((field) => `${field}: ${entry[field] ?? ""}`);
  return `<entry>\n${lines.join("\n")}\n</entry>`;
}
```

---

### **Step 04. Upstream URL Normalization & Status Mapping (`describeUpstreamStatus`)**

**Objectives:** Create utility functions to build clean API endpoints (`buildChatCompletionsUrl`) and translate raw HTTP status codes (401, 402, 429) into clear diagnostic error messages for debugging.

```javascript
// ── URL & Error Mapping Utilities ─────────────────────────────────────

/**
 * Normalizes the configured base URL and appends the chat/completions route.
 * @param {string} baseUrl - Base URL from process.env or default.
 * @returns {string} Full URL endpoint.
 */
function buildChatCompletionsUrl(baseUrl) {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("chat/completions", normalized).toString();
}

/**
 * Maps DeepSeek upstream HTTP error status codes to readable messages.
 * @param {number} status - Upstream HTTP status code.
 * @returns {string} Diagnostic error description.
 */
function describeUpstreamStatus(status) {
  if (status === 401) {
    return "DeepSeek rejected the API key (401). Check DEEPSEEK_API_KEY in .env.";
  }
  if (status === 402) {
    return "DeepSeek account has insufficient balance (402). Add credit or use a funded key.";
  }
  if (status === 429) {
    return "DeepSeek rate limit reached (429). Try again shortly.";
  }
  return `DeepSeek API error (HTTP ${status}).`;
}
```

---

### **Step 05. Asynchronous DeepSeek Dispatch Engine (`requestReview`)**

**Objectives:** Implement `requestReview(entry)` to dispatch server-to-server `fetch()` requests to DeepSeek. Configure `Authorization: Bearer ${apiKey}`, enforce a 60-second request timeout using `AbortController`, and handle upstream response parsing.

```javascript
// ── DeepSeek API Dispatch Engine ──────────────────────────────────────

/**
 * Sends one entry to DeepSeek and returns the generated review Markdown string.
 * @param {Object} entry - Log entry object.
 * @returns {Promise<string>} Generated Markdown review.
 */
async function requestReview(entry) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const missingKeyError = new Error("Server is missing DEEPSEEK_API_KEY in .env file.");
    missingKeyError.statusCode = 500;
    throw missingKeyError;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

  // Set up timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: RUBRIC_PROMPT },
          { role: "user", content: formatEntry(entry) },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("DeepSeek API error:", response.status, detail);
      const upstreamError = new Error(describeUpstreamStatus(response.status));
      upstreamError.statusCode = response.status >= 500 ? 502 : response.status;
      throw upstreamError;
    }

    const data = await response.json();
    const review = data?.choices?.?.message?.content;

    if (!review) {
      const emptyError = new Error("DeepSeek returned an empty review response.");
      emptyError.statusCode = 502;
      throw emptyError;
    }

    return review;
  } finally {
    clearTimeout(timeoutId); // Clean up timer
  }
}
```

---

### **Step 06. Express / JSON Server Middleware Interceptor (`aiReviewMiddleware`)**

**Objectives:** Export the main middleware function (`module.exports`). Intercept incoming `POST /api/ai-review` requests, validate payload structure, delegate execution to `requestReview()`, handle timeouts (`504 Gateway Timeout`), and pass unrelated requests to `next()`.

```javascript
// ── Express / JSON Server Middleware Export ───────────────────────────

/**
 * Middleware function intercepting POST /api/ai-review requests.
 * Defer non-matching requests to JSON Server via next().
 */
module.exports = async function aiReviewMiddleware(req, res, next) {
  // Pass through any request that is not POST /api/ai-review
  if (req.method !== "POST" || req.path !== AI_REVIEW_PATH) {
    return next();
  }

  const entry = req.body && req.body.entry;
  if (!entry || typeof entry !== "object") {
    res.status(400).json({ error: "Request body must include an entry object." });
    return;
  }

  try {
    const review = await requestReview(entry);
    res.json({ review });
  } catch (err) {
    const isTimeout = [suspicious link removed] === "AbortError";
    const status = isTimeout ? 504 : err.statusCode || 502;
    const message = isTimeout ? "The AI review timed out." : err.message;

    console.error("AI review proxy failed:", message);
    res.status(status).json({ error: message });
  }
};
```

---

### **Step 07. Local Execution & Testing Checklist**

To execute and test the middleware locally:

1. **Create the `.env` file** in the repository root:
   ```env
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
   DEEPSEEK_MODEL=deepseek-flash
   ```
2. **Start JSON Server with the middleware flag:**
   ```bash
   npm run mock-api
   ```
   _Equivalent CLI command:_
   ```bash
   npx json-server data/entries.json --host 0.0.0.0 --port 3000 --middlewares ./ai-proxy.js
   ```
3. **Verify Proxy via `curl` terminal command:**
   ```bash
   curl -X POST http://localhost:3000/api/ai-review \
     -H "Content-Type: application/json" \
     -d '{
       "entry": {
         "id": "entry-001",
         "category": "MQL5",
         "title": "Array out of range in OnTick",
         "symptom": "EA halts with error 4002.",
         "tried": "Printed buffer size.",
         "rootCause": "Indicator handle re-initialized inside event loop.",
         "fix": "Moved handle initialization to OnInit().",
         "lesson": "Separate handle allocation from tick logic."
       }
     }'
   ```

---

### **Summary Checklist for `ai-proxy.js`**

| Step   | Focus Area          | Key Functions / Constructs                              | Purpose                                                                         |
| :----- | :------------------ | :------------------------------------------------------ | :------------------------------------------------------------------------------ |
| **01** | Configuration       | `dotenv.config({ override: true })`                     | Loads `.env` and sets server constants (`60s` timeout).                         |
| **02** | Senior Rubric       | `RUBRIC_PROMPT`                                         | Prompt enforcing 7 grading criteria and Markdown output.                        |
| **03** | Serialization       | `formatEntry()`                                         | Serializes log fields into `<entry>` text block.                                |
| **04** | Error & URL Helpers | `buildChatCompletionsUrl()`, `describeUpstreamStatus()` | Normalizes endpoints and maps HTTP 401, 402, 429 error messages.                |
| **05** | API Dispatch        | `requestReview()`                                       | Dispatches `fetch()` with Bearer key and timeout signal.                        |
| **06** | Express Middleware  | `module.exports = async function`                       | Intercepts `POST /api/ai-review` and delegates non-matching routes to `next()`. |
| **07** | Server Execution    | `npm run mock-api`                                      | Runs JSON Server with `--middlewares ./ai-proxy.js`.                            |

---

### **🎉 All 5 Core Developer Walkthrough Guides are Complete!**

Your TraceDiary developer guide series now includes complete documentation for:

1. **`index.html`** (HTML5 Layout Shell & Accessibility Structure)
2. **`style.css`** (Category Color Hooks, Responsive Split-Pane & Monospace Formatting)
3. **`scripts.js`** (DOM Controller, Event Delegation, Filters & Debouncing)
4. **`data.js`** (Axios CRUD Persistence Layer & Global State Store)
5. **`ai-proxy.js`** (Express Middleware Proxy & DeepSeek API Integration)

💡 _Let me know if you would like me to generate a practice quiz, flashcard set, or presentation outline based on these architecture guides!_
