### **Refined Step 04. Construct the Detailed View Pane & Action Group (`#detailView`)**

#### **Objectives:**

- Construct the main detail card shell (`#detailCard`) with programmatic focus management (`tabindex="-1"`).
- Include a mobile-only "Back to list" navigation button (`#backToListBtn`).
- Build a context-aware header action group (`#detailActionGroup`) containing triggers for AI Review, Edit, and Delete actions—hidden until an entry is selected.
- Establish the primary target container (`#detailContent`) with an informative initial placeholder state.

Place this code **inside** `<div id="detailView" class="col-12 col-md-7 d-none d-md-block">`:

```html
<!-- Main Detail Card Shell -->
<div class="card shadow-sm border-0" id="detailCard" tabindex="-1">
  <!-- 1. Card Header with Navigation & Actions -->
  <div
    class="card-header d-flex justify-content-between align-items-center py-2"
  >
    <!-- Mobile Navigation Button (Hidden on Desktop via d-md-none) -->
    <button
      class="btn btn-outline-secondary btn-sm d-md-none"
      id="backToListBtn"
      title="Back to list"
      aria-label="Back to list"
    >
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i> Back
    </button>

    <!-- Header Section Label -->
    <span class="fw-semibold text-body-secondary small" id="detailHeaderTitle">
      TraceDiary Entry
    </span>

    <!-- Entry Action Buttons (Hidden by default until a card is selected) -->
    <div id="detailActionGroup" class="d-none">
      <!-- AI Critique Review Button -->
      <button
        type="button"
        class="btn btn-outline-info btn-sm me-1"
        id="aiReviewBtn"
        title="AI review"
        aria-label="Review this entry with AI"
      >
        <i class="bi bi-robot" aria-hidden="true"></i>
      </button>

      <!-- Edit Entry Button -->
      <button
        type="button"
        class="btn btn-outline-primary btn-sm me-1"
        id="editEntryBtn"
        title="Edit Entry"
        aria-label="Edit Entry"
      >
        <i class="bi bi-pencil" aria-hidden="true"></i>
      </button>

      <!-- Delete Entry Button -->
      <button
        type="button"
        class="btn btn-outline-danger btn-sm"
        id="deleteEntryBtn"
        title="Delete Entry"
        aria-label="Delete Entry"
      >
        <i class="bi bi-trash3" aria-hidden="true"></i>
      </button>
    </div>
  </div>

  <!-- 2. Dynamic Detail Content Body Container -->
  <div class="card-body" id="detailContent">
    <p class="text-body-secondary text-center my-5">
      Select an entry from the list to view full details.
    </p>
  </div>
</div>
```

---

### **Detailed Technical Breakdown for Junior Developers**

#### **1. Desktop Sticky Card Shell (`#detailCard`)**

- **`card shadow-sm border-0`:** Applies Bootstrap card styles, removing default borders and adding a subtle elevation shadow for clean visual hierarchy.
- **Sticky Positioning via CSS:** While the HTML structure defines the card, `style.css` attaches `position: sticky; top: 1rem;` to `#detailCard`. As developers scroll down long entry lists on desktop, the detail pane remains pinned in the viewport without disappearing off-screen.
- **`tabindex="-1"`:** Allows JavaScript (`detailCard.focus()`) to shift browser focus to the detail pane when an entry is selected, ensuring screen readers announce the newly displayed log content immediately.

---

#### **2. Mobile Navigation Toggle (`#backToListBtn`)**

- **`d-md-none` Utility:** Hides the "Back" button on desktop screens (\\(\ge 768\text{px}\\)) because both panes are simultaneously visible on desktop.
- **Mobile Functionality:** On mobile touch screens, tapping an entry hides `#listView` and displays `#detailView`. The `#backToListBtn` button gives mobile users an explicit way to return to the search list by invoking `showListViewMobile()` in `scripts.js`.

---

#### **3. Context-Aware Action Group (`#detailActionGroup`)**

- **Why start with `d-none`?** When the application first loads, no log entry is selected yet. Hiding `#detailActionGroup` prevents users from accidentally triggering actions on non-existent records.
- **Dynamic Visibility:** When a user taps a log card, `renderDetailedView()` in `scripts.js` removes `d-none`, revealing the AI Review, Edit, and Delete action controls.
- **Action Button Design:**
  - **AI Review (`#aiReviewBtn`):** Uses an info style (`btn-outline-info`) with a robot icon (`bi-robot`) to invoke automated DeepSeek prompt evaluations.
  - **Edit (`#editEntryBtn`):** Uses a primary style (`btn-outline-primary`) with a pencil icon (`bi-pencil`) to open the editing modal pre-populated with current record data.
  - **Delete (`#deleteEntryBtn`):** Uses a danger style (`btn-outline-danger`) with a trash icon (`bi-trash3`) to prompt a delete confirmation dialog.

---

#### **4. Target Body & Placeholder State (`#detailContent`)**

- **Placeholder Messaging:** Before any entry card is clicked, `#detailContent` renders a centered, muted helper message ("Select an entry from the list to view full details.") so the right pane doesn't appear broken or empty.
- **Runtime Injection:** When an entry is selected, `scripts.js` replaces this placeholder HTML with the full structured record layout—rendering titles, category badges, timestamps, symptoms, tried fixes, root causes, and monospace code blocks.

---

💡 _Would you like to move on to refining **Step 05 (Live On-Screen Console Panel)** next?_
