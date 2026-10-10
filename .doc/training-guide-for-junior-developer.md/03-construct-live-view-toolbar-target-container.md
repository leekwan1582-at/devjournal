### **Refined Step 03. Construct the List View Toolbar & Target Container (`#listView`)**

#### **Objectives:**

- Add screen-reader-accessible hidden headings to establish proper document outline hierarchy.
- Build a search input bar equipped with Bootstrap input group utilities and accessibility labels (`aria-label`).
- Create a multi-control toolbar incorporating category filter dropdowns, sort select options, a refresh button, and a theme toggle button.
- Define an empty target container (`#entriesList`) where JavaScript will dynamically inject entry card nodes using `replaceChildren()`.

Place this code **inside** `<div id="listView" class="col-12 col-md-5 d-block" tabindex="-1">`:

```html
<!-- Accessibility Headings (Hidden visually, read by screen readers) -->
<h1 class="visually-hidden">TraceDiary</h1>
<h2 class="visually-hidden">Log entries</h2>

<!-- 1. Search Input Bar -->
<div class="input-group input-group-sm mb-2">
  <label class="input-group-text" for="searchInput">
    <i class="bi bi-search" aria-hidden="true"></i>
    <span class="visually-hidden">Search</span>
  </label>
  <input
    type="search"
    class="form-control"
    id="searchInput"
    placeholder="Search title, symptom, fix"
    aria-label="Search entries"
  />
</div>

<!-- 2. Controls Toolbar: Filter, Sort, Refresh, and Theme Toggle -->
<div class="d-flex gap-2 mb-3">
  <!-- Category Filter Dropdown -->
  <div class="input-group input-group-sm">
    <label class="input-group-text" for="categoryFilter">
      <i class="bi bi-funnel" aria-hidden="true"></i>
      <span class="visually-hidden">Filter by category</span>
    </label>
    <select class="form-select" id="categoryFilter">
      <!-- Dynamic <option> tags populated at runtime via data.js -->
    </select>
  </div>

  <!-- Sort Select Dropdown -->
  <div class="input-group input-group-sm">
    <label class="input-group-text" for="sortSelect">
      <i class="bi bi-sort-down" aria-hidden="true"></i>
      <span class="visually-hidden">Sort entries</span>
    </label>
    <select class="form-select" id="sortSelect">
      <option value="default" selected>Default order</option>
      <option value="date-desc">Newest</option>
      <option value="date-asc">Oldest</option>
      <option value="title-asc">Title A-Z</option>
      <option value="category-asc">Category A-Z</option>
    </select>
  </div>

  <!-- Refresh API Button -->
  <button
    type="button"
    class="btn btn-outline-secondary btn-sm"
    id="refreshBtn"
    title="Refresh"
    aria-label="Refresh"
  >
    <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
  </button>

  <!-- Theme Toggle Button -->
  <button
    type="button"
    class="btn btn-outline-secondary btn-sm"
    id="themeToggleBtn"
    title="Theme: system"
    aria-label="Theme: system. Switch theme."
  >
    <i class="bi bi-circle-half" aria-hidden="true"></i>
  </button>
</div>

<!-- 3. Dynamic Entry List Target Container -->
<div id="entriesList" class="d-flex flex-column gap-2">
  <!-- Dynamic entry cards constructed in scripts.js will be injected here -->
</div>
```

---

### **Detailed Technical Breakdown for Junior Developers**

#### **1. Accessible Hidden Headings (`visually-hidden`)**

- **Why use `<h1 class="visually-hidden">`?** Every web application should contain a logical heading hierarchy (`<h1>` followed by `<h2>`) for SEO and screen reader accessibility.
- **Bootstrap Utility `visually-hidden`:** Hides the headings off-screen visually so they don't break the UI design, while keeping them fully accessible to screen readers using assistive technology.

---

#### **2. Search Input Bar Anatomy (`#searchInput`)**

- **`input-group input-group-sm`:** Merges the visual search icon tag (`<i class="bi bi-search">`) directly with the text input field into a unified, compact control bar.
- **`type="search"`:** Informs mobile operating systems to show a "Search" button on virtual touch keyboards and renders a native clear ("X") button in supporting browsers.
- **`aria-label="Search entries"`:** Explicitly describes the purpose of the input field to assistive technology users.

---

#### **3. Controls Toolbar Mechanics (`.d-flex.gap-2.mb-3`)**

- **`d-flex gap-2`:** Uses Flexbox to align all four control elements horizontally in a single row, applying a consistent `0.5rem` (8px) gap between them.
- **Category Filter (`#categoryFilter`):** Left empty in HTML because categories are dynamic. `scripts.js` reads unique category tags from the dataset (`data.js`) and populates `<option>` tags at runtime.
- **Sort Dropdown (`#sortSelect`):** Hardcodes sorting modes (`date-desc`, `date-asc`, `title-asc`, `category-asc`). When selected, JavaScript triggers `sortEntries()` to reorder the array.
- **Action Buttons (`#refreshBtn`, `#themeToggleBtn`):** Compact outline buttons (`btn-outline-secondary btn-sm`) containing Bootstrap Icon fonts (`bi-arrow-clockwise`, `bi-circle-half`) for quick user actions.

---

#### **4. Target Container (`#entriesList`)**

- **`d-flex flex-column gap-2`:** Organizes entry cards vertically with an 8px vertical gap.
- **Why leave it empty in HTML?** This container acts as an anchor point for DOM manipulation. When data fetches from JSON Server, `scripts.js` passes card nodes into `entriesList.replaceChildren(...cards)`, rendering the list dynamically without full page reloads.

---

💡 _Would you like to move on to refining **Step 04 (Detailed View Pane & Action Group)** next?_
