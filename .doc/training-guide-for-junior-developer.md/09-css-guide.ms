Here is a comprehensive, step-by-step developer guide to coding **`style.css`** for **TraceDiary**. This guide breaks down custom theme overrides, CSS variables, responsive split-pane rules, code block formatting, and interactive state styles.

---

### **Step 01. Configure Dynamic Category Color Hooks (`[data-category]`)**
**Objectives:** Establish CSS custom properties (variables) mapped to HTML `data-category` attributes. This enables dynamic color coding across badges, card left borders, and detail code blocks without writing redundant CSS rules.

```css
/* ── Category Colour Hooks ───────────────────────────────────────────── */

/* Default fallback color for unknown or unassigned categories */
:root {
  --cat-default: #6c757d; /* Muted gray */
}

/* Domain-specific color mappings */
[data-category="MQL5"]           { --category-color: #0d6efd; } /* Primary Blue */
[data-category="Data Pipeline"]  { --category-color: #146c43; } /* Forest Green */
[data-category="Backtesting"]    { --category-color: #6f42c1; } /* Deep Purple */
[data-category="Infrastructure"] { --category-color: #495057; } /* Slate Gray */
[data-category="JavaScript"]     { --category-color: #8a5a00; } /* Amber Gold */

/* Category Badge Rule: Inherits the color variable dynamically */
.badge-category {
  background-color: var(--category-color, var(--cat-default));
  color: #ffffff;
}
```

* **Detailed Breakdown for Junior Developers:**
  * **Attribute Selectors (`[data-category="..."]`):** When JavaScript renders elements with a `data-category="MQL5"` attribute (e.g., `<div class="card entry-card" data-category="MQL5">`), the browser automatically exposes `--category-color: #0d6efd` to that element and all its children.
  * **`var()` Fallback Syntax:** `var(--category-color, var(--cat-default))` tells the CSS engine: *"Use `--category-color` if defined; otherwise, fall back to `--cat-default`."*

---

### **Step 02. Layout Padding & Sticky Desktop Split-Pane (`#detailCard`)**
**Objectives:** Prevent the Floating Action Button from overlapping the page content, and configure sticky positioning for the detail pane on desktop viewports so it remains pinned as the user scrolls through long lists.

```css
/* ── Layout Rules ────────────────────────────────────────────────────── */

/* Bottom padding ensures page content clears the fixed floating button */
.app-main {
  padding-bottom: 6rem;
}

/* Desktop Split-Pane: Pin the detail card inside the viewport */
@media (min-width: 768px) {
  #detailCard {
    position: sticky;
    top: 4.5rem;
    max-height: calc(100vh - 5.5rem);
    overflow-y: auto;
  }
}
```

* **Detailed Breakdown for Junior Developers:**
  * **`position: sticky`:** On desktop screens (`min-width: 768px`), `#detailCard` scrolls normally until it reaches `4.5rem` from the top of the viewport, where it locks into place while the left entry list continues to scroll.
  * **`max-height: calc(100vh - 5.5rem)` & `overflow-y: auto`:** Ensures that if a selected entry has long text or extensive AI feedback, the card creates an internal scrollbar rather than pushing off the bottom of the screen.

---

### **Step 03. Entry Cards, Focus Rings & Accessibility Targets (`.entry-card`)**
**Objectives:** Style interactive entry cards with category accent borders, hover elevation, selection indicators, visible keyboard focus rings, and touch-friendly button targets.

```css
/* ── Entry Cards & Interactive States ────────────────────────────────── */

.entry-card {
  cursor: pointer;
  border-left: 4px solid var(--category-color, var(--cat-default));
  box-shadow: var(--bs-box-shadow-sm);
  transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

/* Hover Elevation (Only applies on devices with fine pointer hover support) */
@media (hover: hover) {
  .entry-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--bs-box-shadow);
  }
}

/* Active Selected Card Indicator */
.entry-card.active-card {
  background-color: var(--bs-primary-bg-subtle);
  box-shadow: var(--bs-box-shadow-sm), inset 0 0 0 1px var(--bs-primary);
}

/* High-Contrast Focus Ring for Keyboard & Programmatic Focus */
.entry-card:focus-visible,
#detailCard:focus,
#listView:focus {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

/* Text Wrapping Guard */
.min-w-0 {
  min-width: 0;
}

.entry-card .card-title-text {
  overflow-wrap: anywhere;
}

/* Accessibility: Minimum Touch Target Size on Coarse Touch Devices */
@media (pointer: coarse) {
  .card-actions .btn {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
}

/* Accessibility: Honor User Motion Preferences */
@media (prefers-reduced-motion: reduce) {
  .entry-card,
  .entry-card:hover {
    transition: none;
    transform: none;
  }
}
```

* **Detailed Breakdown for Junior Developers:**
  * **`border-left: 4px solid var(...)`:** Uses the category color hook from Step 01 to color-code card borders dynamically.
  * **`@media (pointer: coarse)`:** Targets touchscreens (smartphones/tablets) and expands button tap areas to at least `2.75rem` (44px \\(\times\\) 44px) to satisfy WCAG touch target standards.
  * **`@media (prefers-reduced-motion: reduce)`:** Respects accessibility operating system settings by disabling hover motion for users prone to motion sickness.

---

### **Step 04. Detail Pane Formatting & Monospace Code Blocks (`.log-text-block`)**
**Objectives:** Preserve line breaks in user textareas and format technical fields (Symptom & Fix) with monospace fonts, distinct background fills, and category accent borders for stack traces and code snippets.

```css
/* ── Detail Pane Formatting ──────────────────────────────────────────── */

/* Preserves line breaks typed into multi-line form textareas */
.detail-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* Monospace Block for Code Snippets & Stack Traces (Symptom & Fix) */
.log-text-block {
  font-family: var(--bs-font-monospace);
  font-size: 0.875rem;
  background-color: var(--bs-tertiary-bg);
  padding: 0.5rem 0.75rem;
  border-radius: var(--bs-border-radius-sm);
  border-left: 3px solid var(--category-color, var(--cat-default));
}
```

* **Detailed Breakdown for Junior Developers:**
  * **`white-space: pre-wrap`:** Ensures raw carriage returns and spaces typed into form textareas render naturally in the detailed view without collapsing into single spaces.
  * **`font-family: var(--bs-font-monospace)`:** Utilizes Bootstrap's built-in monospace stack (`SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `Courier New`) to render code and error traces cleanly.

---

### **Step 05. Floating Action Button Positioning (`.fab`)**
**Objectives:** Position the circular "Create Entry" button in the bottom-right corner of the viewport with fixed layout layer precedence.

```css
/* ── Floating Action Button (Create Entry) ──────────────────────────── */

.fab {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1030;
  font-size: 1.5rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.25);
}
```

* **Detailed Breakdown for Junior Developers:**
  * **`position: fixed` & `z-index: 1030`:** Fixes the button relative to the viewport window and sets its layer index higher than cards and navigation panels, keeping it accessible during scrolling.
  * **`display: flex` + `align-items: center` + `justify-content: center`:** Centers the Bootstrap `bi-plus-lg` icon inside the circular button.

---

### **Step 06. Live Console Panel & Telemetry Colors (`.console-output`)**
**Objectives:** Style the on-screen terminal box with dark-mode syntax theme colors, custom scrollbars, and colored log levels (`info`, `success`, `warn`, `error`).

```css
/* ── Console Output Panel ───────────────────────────────────────────── */

.console-container {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bs-border-color);
}

.console-output {
  font-family: var(--bs-font-monospace);
  font-size: 0.8rem;
  line-height: 1.5;
  background-color: #1e1e1e; /* VS Code Dark Terminal Background */
  color: #d4d4d4;
  padding: 0.75rem 1rem;
  border-radius: var(--bs-border-radius);
  max-height: 220px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #4a4a4a #1e1e1e;
}

/* Custom Scrollbar for Webkit Browsers */
.console-output::-webkit-scrollbar {
  width: 8px;
}

.console-output::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.console-output::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 4px;
}

.console-line {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Log Level Color Tokens */
.console-line--info    { color: #9cdcfe; } /* Light Blue */
.console-line--success { color: #6a9955; } /* Muted Green */
.console-line--warn    { color: #dcdcaa; } /* Soft Yellow */
.console-line--error   { color: #f48771; } /* Soft Coral Red */
```

* **Detailed Breakdown for Junior Developers:**
  * **VS Code Color Palette:** Employs industry-standard dark terminal background (`#1e1e1e`) and syntax color coding (`#9cdcfe`, `#6a9955`, `#dcdcaa`, `#f48771`) to present readable status messages.
  * **Custom Scrollbar Rules (`::-webkit-scrollbar`):** Replaces bulky default browser scrollbars with a thin dark scrollbar matching the console aesthetic.

---

### **Step 07. AI Review Markdown Formatting (`.ai-review-markdown`)**
**Objectives:** Style raw Markdown elements (tables, code blocks, blockquotes, headings) generated by the DeepSeek AI review middleware when rendered in the detailed pane.

```css
/* ── AI Review Markdown Formatting ──────────────────────────────────── */

.ai-review-markdown {
  font-size: 0.9rem;
}

.ai-review-markdown > :last-child {
  margin-bottom: 0;
}

.ai-review-markdown h1,
.ai-review-markdown h2,
.ai-review-markdown h3,
.ai-review-markdown h4 {
  font-size: 1rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem;
}

/* Table Formatting for AI Scores Rubric */
.ai-review-markdown table {
  width: 100%;
  margin-bottom: 1rem;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.ai-review-markdown th,
.ai-review-markdown td {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--bs-border-color);
  vertical-align: top;
}

.ai-review-markdown th {
  background-color: var(--bs-tertiary-bg);
  text-align: left;
}

/* Code Snippet & Blockquote Formatting */
.ai-review-markdown pre {
  background-color: var(--bs-tertiary-bg);
  padding: 0.5rem 0.75rem;
  border-radius: var(--bs-border-radius-sm);
  overflow-x: auto;
}

.ai-review-markdown code {
  font-family: var(--bs-font-monospace);
  font-size: 0.85em;
  background-color: var(--bs-tertiary-bg);
  padding: 0.1rem 0.3rem;
  border-radius: var(--bs-border-radius-sm);
}

.ai-review-markdown pre code {
  padding: 0;
  background-color: transparent;
}

.ai-review-markdown blockquote {
  border-left: 3px solid var(--bs-border-color);
  padding-left: 0.75rem;
  color: var(--bs-secondary-color);
}
```

---

### **Summary Sequence Checklist for `style.css`**

| Step | Focus Area | Key Selectors | Purpose |
| :--- | :--- | :--- | :--- |
| **01** | Category Color Variables | `[data-category]`, `.badge-category` | Dynamic domain color tagging (`MQL5`, `Pipeline`, `Backtesting`). |
| **02** | Layout & Sticky Desktop | `.app-main`, `#detailCard` | Clears FAB padding and pins desktop detail view. |
| **03** | Interactive Entry Cards | `.entry-card`, `:focus-visible`, `@media (pointer: coarse)` | Card hover effects, selected state, keyboard focus rings, touch targets. |
| **04** | Detail Monospace Text | `.detail-text`, `.log-text-block` | Preserves text formatting and styles stack traces/code snippets. |
| **05** | Floating Action Button | `.fab` | Viewport-fixed circular trigger for opening the entry modal. |
| **06** | Console Telemetry Panel | `.console-output`, `.console-line--[level]` | Dark terminal theme with log level syntax colors. |
| **07** | AI Review Markdown | `.ai-review-markdown` | Formats rendered AI evaluation tables, blockquotes, and pre/code tags. |

---

💡 *Would you like to move on to creating the step-by-step developer guide for **`data.js`** (the Axios data layer) or **`scripts.js`** (the DOM UI controller)?*