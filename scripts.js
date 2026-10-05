const API_URL = "http://localhost:3000/entries";
let entriesState = [];
let activeEntry = null;

// Date Formatter Helper (as specified in Wireframe)
function formatDate(isoString) {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `[dd-${year}-${month}-${day}]`;
}

// Mobile View-State Toggle Helper
function showDetailViewMobile() {
  const listView = document.getElementById("listView");
  const detailView = document.getElementById("detailView");
  
  if (window.innerWidth < 768) {
    listView.classList.add("d-none");
    detailView.classList.remove("d-none");
  }
}

function showListViewMobile() {
  const listView = document.getElementById("listView");
  const detailView = document.getElementById("detailView");

  listView.classList.remove("d-none");
  detailView.classList.add("d-none");
}

// Fetch and Render Log Entries
async function fetchEntries() {
  try {
    const response = await axios.get(API_URL);
    entriesState = response.data;
    renderEntriesList(entriesState);
  } catch (err) {
    console.error("Failed to load entries:", err);
  }
}

function renderEntriesList(entries) {
  const listContainer = document.getElementById("entriesList");
  listContainer.innerHTML = "";

  entries.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card shadow-sm cursor-pointer border-start border-4 border-primary";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge bg-secondary">${item.category}</span>
          <span class="small text-muted">${formatDate(item.timestamp)}</span>
        </div>
        <h3 class="h6 card-title mb-1 fw-bold text-dark">${item.title}</h3>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <span class="small text-primary">Tap to view details</span>
          <i class="bi bi-chevron-right text-muted"></i>
        </div>
      </div>
    `;

    card.addEventListener("click", () => renderDetailedView(item));
    listContainer.appendChild(card);
  });
}

function renderDetailedView(entry) {
  activeEntry = entry;
  const detailContainer = document.getElementById("detailContent");
  const actionGroup = document.getElementById("detailActionGroup");

  actionGroup.classList.remove("d-none");
  detailContainer.innerHTML = `
    <div class="mb-3">
      <span class="text-muted small">Entry ID: ${entry.id}</span><br/>
      <span class="badge bg-primary me-2">${entry.category}</span>
      <span class="text-muted small">Timestamp: ${entry.timestamp}</span>
    </div>
    <h2 class="h4 fw-bold mb-3">${formatDate(entry.timestamp)} ${entry.title}</h2>
    
    <div class="mb-2"><strong>Symptom:</strong><p class="text-secondary mb-1">${entry.symptom}</p></div>
    <div class="mb-2"><strong>Tried:</strong><p class="text-secondary mb-1">${entry.tried}</p></div>
    <div class="mb-2"><strong>Root Cause:</strong><p class="text-secondary mb-1">${entry.rootCause}</p></div>
    <div class="mb-2"><strong>Fix:</strong><p class="text-secondary mb-1">${entry.fix}</p></div>
    <div class="mb-2"><strong>Lesson:</strong><p class="text-secondary mb-1">${entry.lesson}</p></div>
  `;

  showDetailViewMobile();
}

// DOM Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  fetchEntries();

  document.getElementById("backToListBtn").addEventListener("click", showListViewMobile);
  
  // Responsive window resize watch
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      document.getElementById("listView").classList.remove("d-none");
      document.getElementById("detailView").classList.remove("d-none");
    }
  });
});