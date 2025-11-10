/* script.js
   Client-side portfolio manager:
   - Projects stored in localStorage
   - Add / Edit / Delete / Star / View
   - Image upload -> base64
   - Search, tags, sort, favorites filter
   - Import / Export JSON
*/

const STORAGE_KEY = "meghan_portfolio_v2";
const THEME_KEY = "meghan_portfolio_theme";

const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

// DOM refs
const grid = qs("#grid");
const searchInput = qs("#search");
const sortBy = qs("#sortBy");
const tagList = qs("#tagList");
const noResults = qs("#noResults");
const addProjBtn = qs("#addProjBtn");
const projModal = qs("#projModal");
const projForm = qs("#projForm");
const modalTitle = qs("#modalTitle");
const projTitle = qs("#projTitle");
const projDesc = qs("#projDesc");
const projTags = qs("#projTags");
const projGithub = qs("#projGithub");
const projDemo = qs("#projDemo");
const projImage = qs("#projImage");
const imgPreview = qs("#imgPreview");
const saveProj = qs("#saveProj");
const cancelProj = qs("#cancelProj");
const closeModal = qs("#closeModal");
const deleteProj = qs("#deleteProj");
const viewModal = qs("#viewModal");
const viewContent = qs("#viewContent");
const closeView = qs("#closeView");
const exportBtn = qs("#exportBtn");
const importBtn = qs("#importBtn");
const fileInput = qs("#fileInput");
const showFav = qs("#showFav");
const resetSample = qs("#resetSample");
const themeToggle = qs("#themeToggle");
const yearEl = qs("#year");

yearEl.textContent = new Date().getFullYear();

// sample data
const sampleProjects = [
  {
    id: "p-rcm",
    title: "Healthcare RCM Pipeline",
    description: "Cloud ETL: Azure Data Factory + Databricks -> Azure SQL for reporting.",
    tags: ["azure", "etl", "databricks"],
    github: "",
    demo: "",
    img: null,
    createdAt: new Date().toISOString(),
    starred: false
  },
  {
    id: "p-nlp",
    title: "Safety Intelligence (NLP)",
    description: "NLP pipeline tagging injury causes from OSHA records; outputs to Power BI.",
    tags: ["nlp", "python", "powerbi"],
    github: "",
    demo: "",
    img: null,
    createdAt: new Date().toISOString(),
    starred: true
  }
];

// helper: storage
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleProjects));
      return sampleProjects.slice();
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleProjects));
    return sampleProjects.slice();
  }
}
function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// theme
function initTheme() {
  const t = localStorage.getItem(THEME_KEY) || "light";
  if (t === "dark") document.documentElement.classList.add("dark");
  themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
}
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
});
initTheme();

// UI state
let projects = load();
let editingId = null;
let showOnlyFavorites = false;

// Render functions
function allTags() {
  const s = new Set(projects.flatMap(p => p.tags || []));
  return ["all", ...Array.from(s)];
}

function renderTags() {
  tagList.innerHTML = "";
  allTags().forEach(t => {
    const b = document.createElement("button");
    b.className = "px-3 py-1 border rounded-full text-sm";
    b.textContent = t;
    b.onclick = () => {
      if (t === "all") searchInput.value = "";
      else searchInput.value = t;
      render();
    };
    tagList.appendChild(b);
  });
}

function filtered() {
  const q = (searchInput.value || "").toLowerCase();
  let list = projects.slice();
  if (q) {
    list = list.filter(p => (p.title + " " + p.description + " " + (p.tags||[]).join(" ")).toLowerCase().includes(q));
  }
  if (showOnlyFavorites) list = list.filter(p => p.starred);
  const s = sortBy.value;
  if (s === "newest") list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (s === "oldest") list.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (s === "az") list.sort((a,b) => a.title.localeCompare(b.title));
  if (s === "starred") list.sort((a,b) => (b.starred?1:0) - (a.starred?1:0));
  return list;
}

function render() {
  renderTags();
  const list = filtered();
  grid.innerHTML = "";
  if (list.length === 0) {
    noResults.classList.remove("hidden");
  } else {
    noResults.classList.add("hidden");
  }

  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "bg-white dark:bg-slate-800 rounded-2xl p-4 card-hover flex flex-col";
    card.innerHTML = `
      <div class="h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 mb-3 flex items-center justify-center">
        ${p.img ? `<img src="${p.img}" class="w-full h-full object-cover">` : `<div class="text-gray-400">No image</div>`}
      </div>
      <h3 class="font-semibold">${escapeHtml(p.title)}</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">${escapeHtml(p.description)}</p>
      <div class="mt-4 flex items-center justify-between">
        <div class="flex gap-2 flex-wrap">${(p.tags||[]).slice(0,4).map(t => `<span class="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-full">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="flex gap-2 items-center">
          <button data-id="${p.id}" class="view-btn px-2 py-1 border rounded text-sm">View</button>
          <button data-id="${p.id}" class="edit-btn px-2 py-1 border rounded text-sm">Edit</button>
          <button data-id="${p.id}" class="del-btn px-2 py-1 border rounded text-sm text-red-600">Delete</button>
          <button data-id="${p.id}" class="star-btn px-2 py-1 text-sm">${p.starred ? '★' : '☆'}</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // attach listeners
  qsa(".del-btn").forEach(b => b.onclick = (e) => {
    const id = e.currentTarget.dataset.id;
    if (!confirm("Delete this project?")) return;
    projects = projects.filter(x => x.id !== id);
    save(projects); render();
  });

  qsa(".edit-btn").forEach(b => b.onclick = (e) => {
    const id = e.currentTarget.dataset.id;
    startEdit(id);
  });

  qsa(".view-btn").forEach(b => b.onclick = (e) => {
    const id = e.currentTarget.dataset.id;
    openView(id);
  });

  qsa(".star-btn").forEach(b => b.onclick = (e) => {
    const id = e.currentTarget.dataset.id;
    projects = projects.map(p => p.id === id ? {...p, starred: !p.starred} : p);
    save(projects); render();
  });
}

// security: escape text for HTML insertion
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[s]));
}

// Add / Edit flow
addProjBtn.onclick = () => openAdd();

function openAdd() {
  editingId = null;
  modalTitle.textContent = "Add project";
  projForm.reset();
  imgPreview.innerHTML = "";
  deleteProj.classList.add("hidden");
  projModal.classList.remove("hidden");
}

function startEdit(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  modalTitle.textContent = "Edit project";
  projTitle.value = p.title;
  projDesc.value = p.description;
  projTags.value = (p.tags||[]).join(", ");
  projGithub.value = p.github || "";
  projDemo.value = p.demo || "";
  imgPreview.innerHTML = p.img ? `<img src="${p.img}" class="w-full h-full object-cover">` : "";
  deleteProj.classList.remove("hidden");
  projModal.classList.remove("hidden");
}

cancelProj.onclick = () => { projModal.classList.add("hidden"); editingId = null; };
closeModal.onclick = () => { projModal.classList.add("hidden"); editingId = null; };

deleteProj.onclick = () => {
  if (!editingId) return;
  if (!confirm("Delete this project?")) return;
  projects = projects.filter(p => p.id !== editingId);
  save(projects);
  projModal.classList.add("hidden");
  editingId = null;
  render();
};

// image preview reader
projImage.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    imgPreview.innerHTML = `<img src="${reader.result}" class="w-full h-full object-cover">`;
    projImage.dataset.preview = reader.result;
  };
  reader.readAsDataURL(f);
};

// save form
projForm.onsubmit = (ev) => {
  ev.preventDefault();
  const title = projTitle.value.trim();
  const desc = projDesc.value.trim();
  const tags = projTags.value.split(",").map(t => t.trim()).filter(Boolean);
  const github = projGithub.value.trim();
  const demo = projDemo.value.trim();
  const img = projImage.dataset.preview || (imgPreview.querySelector("img") ? imgPreview.querySelector("img").src : null);

  if (!title || !desc) { alert("Title and description required."); return; }

  if (editingId) {
    projects = projects.map(p => p.id === editingId ? {...p, title, description: desc, tags, github, demo, img, updatedAt: new Date().toISOString()} : p);
  } else {
    const newP = { id: Date.now().toString(), title, description: desc, tags, github, demo, img, createdAt: new Date().toISOString(), starred: false };
    projects.unshift(newP);
  }
  save(projects);
  projModal.classList.add("hidden");
  editingId = null;
  projForm.reset();
  projImage.dataset.preview = "";
  imgPreview.innerHTML = "";
  render();
};

// View modal
function openView(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  viewContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        ${p.img ? `<img src="${p.img}" class="w-full h-64 object-cover rounded-md">` : `<div class="w-full h-64 bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center">No image</div>`}
      </div>
      <div>
        <h3 class="text-xl font-bold">${escapeHtml(p.title)}</h3>
        <p class="mt-3 text-gray-700 dark:text-gray-300">${escapeHtml(p.description)}</p>
        <div class="mt-3 flex gap-2 flex-wrap">${(p.tags||[]).map(t=>`<span class="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="mt-4 flex gap-2">
          ${p.github ? `<a href="${p.github}" target="_blank" class="px-3 py-2 border rounded-md">Code</a>` : ""}
          ${p.demo ? `<a href="${p.demo}" target="_blank" class="px-3 py-2 border rounded-md">Live</a>` : ""}
          <button id="viewEdit" class="px-3 py-2 border rounded-md">Edit</button>
        </div>
      </div>
    </div>
  `;
  qs("#viewEdit").onclick = () => {
    viewModal.classList.add("hidden");
    startEdit(id);
  };
  viewModal.classList.remove("hidden");
}
closeView.onclick = () => viewModal.classList.add("hidden");

// import / export
exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(projects, null, 2)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "projects.json";
  a.click();
  URL.revokeObjectURL(a.href);
};

importBtn.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const arr = JSON.parse(r.result);
      if (!Array.isArray(arr)) throw new Error("Invalid JSON");
      // merge with existing
      projects = [...arr, ...projects];
      save(projects); render();
      alert("Imported " + arr.length + " projects.");
    } catch (err) {
      alert("Failed to import JSON");
      console.error(err);
    }
  };
  r.readAsText(f);
};

// search / sort / favorites
searchInput.addEventListener("input", render);
sortBy.addEventListener("change", render);
showFav.addEventListener("click", () => { showOnlyFavorites = !showOnlyFavorites; showFav.classList.toggle("bg-yellow-100"); showOnlyFavorites = showFav.classList.contains("bg-yellow-100"); render(); });

// reset to sample
resetSample.addEventListener("click", () => {
  if (!confirm("Reset data to sample projects? This will overwrite your current projects.")) return;
  projects = sampleProjects.slice();
  save(projects);
  render();
});

// featured actions
qs("#openFeatured").addEventListener("click", () => {
  // open first project if exists
  if (projects.length) openView(projects[0].id);
});
qs("#demoFeatured").addEventListener("click", () => {
  alert("No live demo available — add a demo URL in the project details to link here.");
});

// initialize
projects = load();
render();
