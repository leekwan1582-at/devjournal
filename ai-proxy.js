/**
 * @file json-server middleware that proxies entry reviews to the DeepSeek API.
 *
 *       Run via:
 *         json-server data/entries.json --middlewares ./ai-proxy.js
 *
 *       Requires DEEPSEEK_API_KEY, and optionally DEEPSEEK_BASE_URL /
 *       DEEPSEEK_MODEL, in the environment or a local .env file. The API key
 *       stays server-side and is never sent to the browser.
 */

// override:true makes this project's .env authoritative even when the shell
// already exports DEEPSEEK_* (dotenv does not override by default).
require("dotenv").config({ override: true });

const AI_REVIEW_PATH = "/api/ai-review";
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-flash";
const REQUEST_TIMEOUT_MS = 60000;

const RUBRIC_PROMPT = `You are a senior engineer reviewing a debugging-log entry.
Evaluate it against the rubric below. Be specific and critical; do not
flatter. Only use information in the entry. If something is missing,
say "missing" rather than guessing.

Rubric (score each 1-5, with a one-sentence justification):
1. Symptom clarity: exact error message, where and when it occurs, reproducible?
2. Environment context: Node/Mocha versions, OS, run command, config files.
3. Tried: are failed attempts listed with WHY each failed?
4. Root cause: is it a true root cause or just a restatement of the fix?
5. Fix: concrete, verifiable, minimal, with the exact change shown?
6. Lesson: specific and reusable, or generic?
7. Technical accuracy: any wrong or misleading claims?

Output format:
- Scores table (criterion | score | justification)
- Top 3 gaps, most important first
- A rewritten version of the weakest section
- Overall verdict: Keep as is / Revise / Rewrite`;

/**
 * Format one entry as the <entry> block appended to the rubric prompt.
 * @param {Object} entry
 * @returns {string}
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
  const lines = fields.map((field) => `${field}: ${entry[field] ?? ""}`);
  return `<entry>\n${lines.join("\n")}\n</entry>`;
}

/**
 * Build the chat-completions URL from the configured base URL.
 * Works whether or not the base includes a trailing slash or a /v1 suffix.
 * @param {string} baseUrl
 * @returns {string}
 */
function buildChatCompletionsUrl(baseUrl) {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("chat/completions", normalized).toString();
}

/**
 * Map a DeepSeek HTTP status to a concise, user-facing message.
 * The raw upstream body is logged separately for debugging.
 * @param {number} status
 * @returns {string}
 */
function describeUpstreamStatus(status) {
  if (status === 401) {
    return "DeepSeek rejected the API key (401). Check DEEPSEEK_API_KEY.";
  }
  if (status === 402) {
    return "DeepSeek account has insufficient balance (402). Add credit or use a funded key.";
  }
  if (status === 429) {
    return "DeepSeek rate limit reached (429). Try again shortly.";
  }
  return `DeepSeek API error (HTTP ${status}).`;
}

/**
 * Send one entry to DeepSeek and return the assistant's review text.
 * @param {Object} entry
 * @returns {Promise<string>}
 */
async function requestReview(entry) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const missingKeyError = new Error("Server is missing DEEPSEEK_API_KEY.");
    missingKeyError.statusCode = 500;
    throw missingKeyError;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

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
    const review =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";

    if (!review) {
      const emptyError = new Error("DeepSeek returned an empty response.");
      emptyError.statusCode = 502;
      throw emptyError;
    }

    return review;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * json-server middleware: handle POST /api/ai-review, defer everything else.
 * @param {Object} req  Express request.
 * @param {Object} res  Express response.
 * @param {Function} next
 * @returns {Promise<void>}
 */
module.exports = async function aiReviewMiddleware(req, res, next) {
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
    const isTimeout = err.name === "AbortError";
    const status = isTimeout ? 504 : err.statusCode || 502;
    const message = isTimeout ? "The AI review timed out." : err.message;
    console.error("AI review failed:", message);
    res.status(status).json({ error: message });
  }
};
