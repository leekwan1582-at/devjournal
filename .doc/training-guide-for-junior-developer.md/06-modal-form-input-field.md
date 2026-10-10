### **Refined Step 06. Construct the Modal Form & Input Fields (`#entryModal`)**

#### **Objectives:**

- Construct a pop-up modal dialog (`#entryModal`) using Bootstrap 5 modal utilities (`modal fade`, `modal-dialog-centered`, `modal-lg`).
- Implement a **dual-purpose form pattern** utilizing a hidden input (`<input type="hidden" id="entryId">`) to handle both **Create** and **Update** operations seamlessly.
- Layout a 7-field form grid matching the TraceDiary technical data schema (`category`, `title`, `symptom`, `tried`, `rootCause`, `fix`, `lesson`).
- Enforce native browser validation (`required`) and modal dismissal shortcuts (`data-bs-dismiss="modal"`).

Place this code **inside** `<main class="container pt-3 app-main">`, directly below `<section id="console-container">`:

```html
<!-- Create / Update Entry Modal Form Pop-Up -->
<div
  class="modal fade"
  id="entryModal"
  tabindex="-1"
  aria-labelledby="formModalTitle"
  aria-hidden="true"
>
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content">
      <!-- 1. Modal Header -->
      <div class="modal-header">
        <h5 class="modal-title" id="formModalTitle">Create New Entry</h5>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="modal"
          title="Close"
          aria-label="Close"
        ></button>
      </div>

      <!-- 2. Modal Body containing the Form -->
      <div class="modal-body">
        <form id="logForm">
          <!-- Hidden Input: Stores entry ID during Edit Mode, empty during Create Mode -->
          <input type="hidden" id="entryId" />

          <!-- Form Fields Grid Layout -->
          <div class="row g-3">
            <!-- Category Select Dropdown -->
            <div class="col-md-4">
              <label for="category" class="form-label small fw-semibold"
                >Category</label
              >
              <select class="form-select" id="category" required>
                <!-- Dynamic <option> tags populated in scripts.js -->
              </select>
            </div>

            <!-- Title Input -->
            <div class="col-md-8">
              <label for="title" class="form-label small fw-semibold"
                >Title</label
              >
              <input
                type="text"
                class="form-control"
                id="title"
                placeholder="e.g., MQL5 Array out of range in OnTick"
                required
              />
            </div>

            <!-- Symptom Textarea -->
            <div class="col-12">
              <label for="symptom" class="form-label small fw-semibold"
                >Symptom</label
              >
              <textarea
                class="form-control"
                id="symptom"
                rows="2"
                placeholder="Observable errors, stack traces, or anomalous behavior"
                required
              ></textarea>
            </div>

            <!-- Tried Textarea -->
            <div class="col-12">
              <label for="tried" class="form-label small fw-semibold"
                >Tried</label
              >
              <textarea
                class="form-control"
                id="tried"
                rows="2"
                placeholder="Failed troubleshooting attempts and isolated experiments"
                required
              ></textarea>
            </div>

            <!-- Root Cause Textarea -->
            <div class="col-12">
              <label for="rootCause" class="form-label small fw-semibold"
                >Root Cause</label
              >
              <textarea
                class="form-control"
                id="rootCause"
                rows="2"
                placeholder="Underlying technical explanation of why the failure occurred"
                required
              ></textarea>
            </div>

            <!-- Fix Textarea -->
            <div class="col-12">
              <label for="fix" class="form-label small fw-semibold">Fix</label>
              <textarea
                class="form-control"
                id="fix"
                rows="2"
                placeholder="Exact code or environment change applied to solve the bug"
                required
              ></textarea>
            </div>

            <!-- Lesson Textarea -->
            <div class="col-12">
              <label for="lesson" class="form-label small fw-semibold"
                >Lesson</label
              >
              <textarea
                class="form-control"
                id="lesson"
                rows="2"
                placeholder="Architectural takeaway or best practice note to prevent recurrence"
                required
              ></textarea>
            </div>
          </div>

          <!-- 3. Form Action Buttons -->
          <div class="mt-4 text-end">
            <button
              type="button"
              class="btn btn-secondary btn-sm me-2"
              data-bs-dismiss="modal"
              title="Cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary btn-sm"
              id="submitFormBtn"
              title="Submit entry"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
```

---

### **Detailed Technical Breakdown for Junior Developers**

#### **1. Bootstrap Modal Anatomy & Accessibility (`modal fade`, `modal-dialog-centered`, `modal-lg`)**

- **`modal fade`:** Adds an animated fade-in backdrop when the modal triggers.
- **`modal-dialog-centered`:** Vertically aligns the modal pop-up in the middle of the screen instead of sticking to the top.
- **`modal-lg`:** Expands the dialog width to `800px` on desktop viewports. This gives multi-line textareas (Symptom, Tried, Root Cause, Fix, Lesson) ample room for typing stack traces and code snippets.
- **Accessibility Attributes:**
  - `aria-labelledby="formModalTitle"` links the modal container to the title header for screen reader context.
  - `aria-hidden="true"` ensures assistive technologies ignore off-screen modal contents until explicitly triggered.

---

#### **2. The Dual-Purpose Form Pattern (`<input type="hidden" id="entryId">`)**

Instead of building two duplicate HTML modal forms (one for creating entries and one for editing entries), TraceDiary uses a single `#logForm` with a hidden `#entryId` input field:

- **Create Mode (Triggered by FAB `#openFormBtn`):**
  1. `scripts.js` resets the form (`logForm.reset()`).
  2. Sets `#entryId.value = ""`.
  3. Updates `#formModalTitle.textContent = "Create New Entry"`.
  4. When submitted, `scripts.js` detects an empty `#entryId` and dispatches an HTTP **`POST`** request (`[suspicious link removed]`).
- **Update/Edit Mode (Triggered by `#editEntryBtn`):**
  1. `scripts.js` populates `#entryId.value = [suspicious link removed]` (e.g. `"entry-102"`).
  2. Fills all form input values with current record fields.
  3. Updates `#formModalTitle.textContent = "Edit Entry"`.
  4. When submitted, `scripts.js` detects an existing `#entryId` and dispatches an HTTP **`PUT`** request (`axios.put`).

---

#### **3. 7-Field Data Schema Alignment**

- The form fields map 1:1 with the JSON schema properties defined in `data/entries.json` and managed in `data.js`.
- **Grid Column Hierarchy:**
  - `category` (`col-md-4`) and `title` (`col-md-8`) share a single horizontal row on desktop to optimize vertical space.
  - `symptom`, `tried`, `rootCause`, `fix`, and `lesson` use `col-12` (full-width) with `rows="2"` textareas to facilitate multi-line technical input.

---

#### **4. Native Validation & Zero-JS Dismissal (`required`, `data-bs-dismiss`)**

- **`required` Attribute:** Enforces native browser form validation. If a developer attempts to submit the form with empty fields, the browser automatically blocks submission and highlights the missing field.
- **`data-bs-dismiss="modal"`:** Instructs Bootstrap's native JavaScript library to intercept click events on the "Cancel" and top-right "X" buttons to close the modal dialog automatically—requiring zero custom dismissal code in `scripts.js`.

---

💡 _Would you like to move on to refining **Step 07 (Footer & Floating Action Button)** next?_
