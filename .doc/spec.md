## Project Definition: Target User & Scope

- **Project Name:** TraceDiary
- **Target User:** Quantitative developers and algorithmic traders.
- **Problem Statement:** Complex trading architectures involving MQL5 expert advisors, Python backtesting pipelines, and high-frequency tick data processing often generate obscure logic errors or execution anomalies. TraceDiary provides a streamlined, mobile-responsive interface to log these specific symptoms, track dead ends during troubleshooting, and create a searchable repository of root causes and fixes for future reference.

## Step 1: Repository & Folder Structure

You do need a project folder structure. Creating a GitHub repository first, cloning it to your WSL environment, and opening it in Visual Studio Code is the exact right workflow.

Set up project root (devjournal) with the standard file architecture recommended:

* `index.html`: The main structural entry point.
* `style.css`: For any custom CSS overrides not handled by Bootstrap.
* `script.js`: Your primary application logic (DOM manipulation, event listeners, API calls).
* `data.js`: The data layer handling your state management, mock data arrays, or API endpoint configurations.


* `README.md`: Essential for your final GitHub submission to explain the project to the assessor.


## Step 2: Bootstrap 5 Interface

Bootstrap 5 is an excellent choice for the web UI. It natively satisfies the project requirement to ensure the application is "mobile-responsive for at least one mobile device". Furthermore, using Bootstrap 5 for layout and styling aligns perfectly with the course's practical labs.

### 2.3 FORM

* **The Form:** Use Bootstrap form controls (`form-control`, `mb-3`) to build inputs for your six core fields: Tag/Title, Symptom, Tried, Root Cause, Fix, and Lesson. You can use a `<select>` dropdown for categories (e.g., "MQL5", "Python", "Data Pipeline") if you want to expand the Tag field.

### 2.4 DISPLAY

* **The Display:** Use Bootstrap Cards or a List Group (`list-group`) to render the saved debugging logs. Each card must include an "Edit" button and a "Delete" button to fulfill the application's required interaction design.


### 2.2 ICONS

Here are the recommended Bootstrap Icons (`bi`) tailored specifically for **TraceDiary** and its quantitative/algorithmic trading context:

### 2.3 MOBILE WIREFRAME
![alt text](Gemini_Generated_wireframe.jpeg)
---

### 1. Logo

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />

Since TraceDiary combines debugging logs with trading and data pipelines, these icons capture both software debugging and analytics:

- **`bi-bug-fill`** or **`bi-bug`** — Direct representation of debugging and bug tracking.
- **`bi-journal-code`** — Represents a technical execution diary or code log (_Top Recommendation_).
- **`bi-terminal-split`** or **`bi-terminal`** — Gives a high-frequency developer/CLI vibe.
- **`bi-graph-up-arrow`** — Highlights algorithmic trading performance and quantitative workflows.

**Usage:**

```html
<i class="bi bi-journal-code me-2"></i> TRACE DIARY
```

---

### 2. Account

- **`bi-person-circle`** — Clean, standard user profile header icon (_Top Recommendation_).
- **`bi-person-badge`** — Fits developer credentials / API key management settings.
- **`bi-person-gear`** — Great if account settings include developer configurations or broker API keys.

**Usage:**

```html
<i class="bi bi-person-circle"></i>
```

---

### 3. CRUD Operations

#### Create

- **`bi-plus-lg`** or **`bi-plus-circle-fill`** — For the Floating Action Button (FAB) or "New Entry" button.
- **`bi-journal-plus`** — Expresses adding a new diary log entry.

#### Read

- **`bi-eye`** or **`bi-book-half`** — Viewing entry details.
- **`bi-search`** — Searching/filtering log history in the header.

#### Update

- **`bi-pencil-square`** or **`bi-pencil`** — Standard edit icon for updating symptoms, root causes, or fixes.

#### Delete

- **`bi-trash`** or **`bi-trash3-fill`** — Removing redundant or duplicate entries.

**Usage Summary:**

```html
<!-- Create -->
<i class="bi bi-plus-lg"></i>
<!-- Read -->
<i class="bi bi-search"></i>
<!-- Update -->
<i class="bi bi-pencil-square"></i>
<!-- Delete -->
<i class="bi bi-trash3"></i>
```

---

### 4. Other Functional Icons (Categories, Status & Indicators)

#### Categories (MQL5 & Data Pipelines)

- **`bi-cpu`** — Great tag/badge icon for **MQL5** / Expert Advisor execution logs.
- **`bi-diagram-3`** or **`bi-database`** — Fits **Data Pipeline** / Polars / Pandas memory & ingestion issues.

#### Structured Fields (The 6 DD Capture Fields)

- **`bi-exclamation-triangle`** — **Symptom** (Failure observed)
- **`bi-tools`** or **`bi-lightbulb`** — **Tried** (Diagnostic steps & hypotheses)
- **`bi-tree`** or **`bi-diagram-2`** — **Root Cause** (Underlying core issue)
- **`bi-check2-circle`** or **`bi-wrench-adjustable`** — **Fix** (Code patch applied)
- **`bi-bookmark-star`** — **Lesson** (Key rule of thumb takeaway)

#### Navigation & Layout controls

- **`bi-funnel`** — Filter entries by category or tag.
- **`bi-sort-down`** — Sort entries chronologically (`YYYY-MM-DD`).
- **`bi-chevron-right`** — Indicating entry tap in mobile list view.
- **`bi-arrow-left`** — Back button from detailed view to list view on mobile.

## Step 3: data/entries.json
To document this JSON structure at design time without relying on actual runtime data, you should create a technical spec that maps the schema abstractly.
The best approach is to define a strict JSON Schema alongside a readable Field Specification Table. This provides clear blueprints for developers or automated data validation pipelines.
## 1. The Design-Time JSON Schema
Save this file as entries.schema.json. It maps the blueprint, array structures, and format requirements explicitly:
```json
{
  "$schema": "https://json-schema.org",
  "$id": "https://example.com",
  "title": "Log Entries Dataset",
  "description": "Schema configuration for recording technical development logs, errors, and lessons learned.",
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "description": "A collection of troubleshooting and engineering log records.",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the entry record."
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "The date and time the log was generated, strictly in ISO 8601 UTC format."
          },
          "category": {
            "type": "string",
            "description": "The technology stack, domain, or environment related to the issue.",
            "enum": ["MQL5", "Data Pipeline", "Backtesting", "Infrastructure"]
          },
          "title": {
            "type": "string",
            "description": "A brief synopsis summarizing the bug or milestone."
          },
          "symptom": {
            "type": "string",
            "description": "The visible error, logs, or system behavior noticed during the issue."
          },
          "tried": {
            "type": "string",
            "description": "Troubleshooting attempts and isolated experiments performed."
          },
          "rootCause": {
            "type": "string",
            "description": "The underlying technical explanation for why the bug occurred."
          },
          "fix": {
            "type": "string",
            "description": "The explicit programmatic code or system fix applied to resolve the problem."
          },
          "lesson": {
            "type": "string",
            "description": "Key structural takeaways or architectural notes to avoid recurring regressions."
          }
        },
        "required": ["id", "timestamp", "category", "title", "symptom", "tried", "rootCause", "fix", "lesson"],
        "additionalProperties": false
      }
    }
  },
  "required": ["entries"],
  "additionalProperties": false
}
```

## 2. Markdown Data Dictionary (Technical Documentation)
Include this structural breakdown directly inside your project's README.md or design wiki. It breaks down the data rules in a scannable format.
## Top-Level Structure

* entries (Array of Objects): A mandatory list of recorded system and development logs.

## Entry Item Properties

| Field Name | Type | Format / Constraints | Required | Description |
|---|---|---|---|---|
| id | String | Alphanumeric unique string | Yes | Unique identifier tracking the entry record. |
| timestamp | String | ISO 8601 UTC string (YYYY-MM-DDTHH:MM:SSZ) | Yes | Time when the event or record occurred. |
| category | String | Plain Text | Yes | The technical component domain (e.g., MQL5, Data Pipeline). |
| title | String | Plain Text | Yes | Clear title explaining the scope of the log. |
| symptom | String | Plain Text | Yes | Observable errors, console logs, or crashes. |
| tried | String | Plain Text | Yes | Actions taken prior to identifying the main cause. |
| rootCause | String | Plain Text | Yes | Core reason behind the application breakdown. |
| fix | String | Plain Text | Yes | Precise steps implemented to safely address the issue. |
| lesson | String | Plain Text | Yes | Best practice guidelines abstracted from the event. |


## Step 4: JavaScript Implementation (CRUD & APIs)

The core of the assessment grades your vanilla JavaScript proficiency. You must build the Create, Read, Update, and Delete (CRUD) functionality while hitting specific technical milestones:

1. **State Management (Arrays & Objects):** Define an array in `data.js` to store your diary entries, where each entry is a JavaScript object containing your six required fields.


2. **DOM Manipulation & Events:** Use `document.addEventListener("DOMContentLoaded", ...)` as your entry point. Attach an event listener to the form's `submit` event to capture the user's input. You must modify at least three properties across two DOM elements (e.g., changing text content, altering a class, or hiding/showing an element).


3. **Structured Logic:** Incorporate at least one loop (to render the diary entries), one conditional branch (to validate that required fields aren't empty), and custom functions where the return value of one is passed to another.


4. **Asynchronous Operations (AJAX):** Your application must communicate with an external service using asynchronous code. You can use Axios to fetch data from a JSON resource (like JSONBin). To meet the criteria, implement at least one `GET` request to retrieve your logs, and at least one `POST`, `PUT`, or `PATCH` request to save or update them.

