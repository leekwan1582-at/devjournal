### **Refined Step 07. Add Footer & Floating Action Button (FAB)**

#### **Objectives:**
* Add a semantic HTML5 `<footer>` element outside `<main>` to contain project copyright and module assessment metadata.
* Position a fixed **Floating Action Button (FAB `#openFormBtn`)** in the lower-right corner to trigger the modal form pop-up from anywhere on the screen.
* Ensure icon-only controls satisfy accessibility requirements using `aria-label` and `title` attributes.

Place this code **below `</main>`** near the bottom of `<body>`:

```html
<!-- 1. Semantic Footer Section -->
<footer class="py-4 bg-black text-secondary text-center">
  <div class="container">
    <p class="mb-1">&copy; 2026 TRACE DIARY. All rights reserved.</p>
    <small class="d-block text-body-tertiary">
      Designed for BELLS Institute of Higher Learning Portfolio Project Assessment.
    </small>
    <small class="d-block text-body-tertiary">
      Agile Front End Development with JavaScript.
    </small>
  </div>
</footer>

<!-- 2. Floating Action Button (FAB) -->
<button
  type="button"
  class="btn btn-primary rounded-circle fab"
  id="openFormBtn"
  title="Create Entry"
  aria-label="Create Entry"
>
  <i class="bi bi-plus-lg" aria-hidden="true"></i>
</button>
```

---

### **Detailed Technical Breakdown for Junior Developers**

#### **1. Semantic HTML Placement (`<footer>` vs `<main>`)**
* **Why place `<footer>` outside `<main>`?** The `<main>` tag must only wrap primary content unique to the application page. Global site information, legal copyright notices, and institutional metadata belong inside a top-level `<footer>` element directly under `<body>`.
* **Bootstrap Formatting Utilities:**
  * `py-4`: Applies vertical padding (`padding-top: 1.5rem` and `padding-bottom: 1.5rem`).
  * `bg-black`: Sets a high-contrast dark background layer.
  * `text-secondary` & `text-body-tertiary`: Applies soft gray typography to distinguish metadata from core application content.

---

#### **2. Floating Action Button (FAB) Mechanics (`#openFormBtn`)**
* **`rounded-circle` Class:** Converts the rectangular Bootstrap button into a circular button when width and height are equalized in CSS.
* **CSS Fixed Positioning (`position: fixed`):**
  While the HTML defines the button, `style.css` styles the `.fab` class with fixed viewport positioning:
  ```css
  .fab {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 1030;
    width: 56px;
    height: 56px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
  ```
* **Why use fixed positioning?** As developers scroll down long entry lists on desktop or mobile, the FAB stays pinned in the bottom-right corner of the viewport, giving users one-touch access to create a new log entry at any time.

---

#### **3. Accessibility for Icon-Only Buttons**
* **The Problem:** The button content consists solely of an icon tag (`<i class="bi bi-plus-lg"></i>`). Screen readers cannot automatically read visual CSS icon fonts.
* **The Solution:** 
  * `aria-label="Create Entry"` instructs screen readers to announce *"Create Entry, button"* when a user navigates to the button via keyboard.
  * `title="Create Entry"` displays a native browser tooltip when a desktop user hovers their mouse over the button.
  * `aria-hidden="true"` on the `<i>` tag instructs screen readers to ignore the decorative icon font itself.

---

#### **4. JavaScript Trigger Coupling**
In `scripts.js`, an event listener is attached to `#openFormBtn`:
```javascript
openFormBtn.addEventListener("click", () => {
  openCreateForm();
});
```
When clicked, `openCreateForm()` resets the modal form fields, sets `#formModalTitle` to *"Create New Entry"*, clears the hidden `#entryId` value, and opens the `#entryModal` dialog via Bootstrap's Modal API.

---

💡 *Would you like to move on to refining **Step 08 (External Libraries & Script Load Sequence)** to complete the HTML guide?*