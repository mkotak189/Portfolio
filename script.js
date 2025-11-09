// script.js — small interactive project manager (localStorage)
const STORAGE_KEY = "meghan_projects_v1";

const defaultProjects = [
  {
    id: "p1",
    title: "Healthcare RCM Pipeline",
    description: "Cloud ETL using Azure Data Factory & Databricks feeding Azure SQL for reporting.",
    tags: ["azure","etl","databricks"]
  },
  {
    id: "p2",
    title: "Safety Intelligence (NLP)",
    description: "NLP pipeline tagging injury causes from OSHA narratives; dashboarded in Power BI.",
    tags: ["nlp","python","powerbi"]
  }
];

function loadProjects(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProjects)); return defaultProjects; }
    return JSON.parse(raw);
  } catch(e) { console.error(e); localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProjects)); return defaultProjects; }
}

function saveProjects(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

function render(){
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  const q = (document.getElementById("search").value || "").toLowerCase();
  const projects = loadProjects();
  const filtered = projects.filter(p => {
    return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.join(" ").toLowerCase().includes(q);
  });

  if(filtered.length === 0){
    document.getElementById("empty").classList.remove("hidden");
  } else {
    document.getElementById("empty").classList.add("hidden");
  }

  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "bg-white p-4 rounded-xl shadow flex flex-col h-full";
    card.innerHTML = `
      <div class="flex-1">
        <h3 class="font-semibold">${p.title}</h3>
        <p class="text-sm text-gray-600 line-clamp-3 mt-2">${p.description}</p>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <div class="flex gap-2 flex-wrap">${(p.tags||[]).map(t => `<span class="text-xs px-2 py-1 bg-gray-100 rounded-full">${t}</span>`).join('')}</div>
        <div class="flex gap-2">
          <button data-id="${p.id}" class="view-btn px-2 py-1 border rounded">View</button>
          <button data-id="${p.id}" class="del-btn px-2 py-1 border rounded text-red-600">Delete</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // tags
  const tagSet = new Set(loadProjects().flatMap(p => p.tags || []));
  const tagsDiv = document.getElementById("tags");
  tagsDiv.innerHTML = "";
  ["all",...Array.from(tagSet)].forEach(t => {
    const b = document.createElement("button");
    b.className = "px-3 py-1 border rounded-full text-sm";
    b.textContent = t;
    b.onclick = () => {
      if(t==="all"){ document.getElementById("search").value=""; render(); }
      else { document.getElementById("search").value = t; render(); }
    }
    tagsDiv.appendChild(b);
  });

  // listeners
  document.querySelectorAll(".del-btn").forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.dataset.id;
      const list = loadProjects().filter(x => x.id !== id);
      saveProjects(list);
      render();
    }
  });
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.onclick = (e) => {
      const id = e.currentTarget.dataset.id;
      const p = loadProjects().find(x => x.id === id);
      alert(`${p.title}\n\n${p.description}\n\nTags: ${(p.tags||[]).join(", ")}`);
    }
  });
}

document.getElementById("search").addEventListener("input", render);
document.getElementById("addSample").addEventListener("click", () => {
  const list = loadProjects();
  list.unshift({ id: Date.now().toString(), title: "Animated Landing Demo", description: "Micro-interaction demo and polished UI.", tags: ["ui","animation"]});
  saveProjects(list);
  render();
});
document.getElementById("export").addEventListener("click", () => {
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  const blob = new Blob([data], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "projects.json"; a.click();
  URL.revokeObjectURL(url);
});

render();
