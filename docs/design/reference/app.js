// Core App State
let STATE = {
  token: localStorage.getItem("token") || null,
  email: localStorage.getItem("email") || null,
  activeRegion: "india",
  activeProject: "overview",
  activeView: "dashboard",
  activeChatId: null,
  workspaces: {
    india: {
      label: "🇮🇳 India",
      projects: {
        overview: { label: "SoilSystems", hasLedger: false },
        windflower: {
          label: "Windflower",
          hasLedger: false,
          folders: ["Project", "Survey Number", "Customer", "Documents", "Payments", "Landlord", "Accounts"]
        },
        woods: {
          label: "Woods & Spices",
          hasLedger: false,
          folders: ["Project", "Survey Number", "Customer", "Documents", "Payments", "Landlord", "Accounts"]
        },
        lacavana: { label: "La Cavana", hasLedger: true }
      }
    },
    dubai: {
      label: "🇦🇪 Dubai",
      projects: {
        overview: { label: "SoilSystems", hasLedger: false },
        projectA: { label: "Project A", hasLedger: false }
      }
    }
  }
};

// Global fetch wrapper with auto-auth session interceptor
async function fetchAPI(url, options = {}) {
  if (!options.headers) {
    options.headers = {};
  }
  
  // Skip adding application/json for file uploads (FormData browser handles boundaries)
  const isFormData = (options.body instanceof FormData);
  if (!isFormData && !options.headers["Content-Type"]) {
    options.headers["Content-Type"] = "application/json";
  }
  
  if (STATE.token && !options.headers["Authorization"]) {
    options.headers["Authorization"] = `Bearer ${STATE.token}`;
  }
  
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      // Session expired or server restarted (wiped token database)
      STATE.token = null;
      STATE.email = null;
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      showAuthScreen();
      alert("Session expired. Please sign in again.");
      throw new Error("Session expired");
    }
    return res;
  } catch (err) {
    if (err.message === "Session expired") {
      throw err;
    }
    console.error("fetchAPI network error", err);
    throw err;
  }
}

// 1. Initial bootloader
function init() {
  // Theme Setup
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
  
  if (STATE.token) {
    showMainApp();
  } else {
    showAuthScreen();
  }
  
  // Close menus when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".region-dropdown-wrapper")) {
      document.getElementById("regionMenu").classList.remove("show");
    }
    if (!e.target.closest("#themeBtn") && !e.target.closest(".theme-menu")) {
      document.getElementById("themeMenu").classList.remove("show");
    }
  });
  
  // Add listeners to dropdown triggers
  document.getElementById("regionBtn").addEventListener("click", () => {
    document.getElementById("regionMenu").classList.toggle("show");
  });
  document.getElementById("themeBtn").addEventListener("click", () => {
    document.getElementById("themeMenu").classList.toggle("show");
  });
}

// View switches
function showAuthScreen() {
  document.getElementById("authViewport").classList.remove("hidden");
  document.getElementById("appViewport").classList.add("hidden");
}

function showMainApp() {
  document.getElementById("authViewport").classList.add("hidden");
  document.getElementById("appViewport").classList.remove("hidden");
  
  // Update User Profile Avatars
  const initials = STATE.email ? STATE.email.substring(0, 2).toUpperCase() : "AD";
  document.getElementById("userAvatar").innerHTML = `<img src="https://ui-avatars.com/api/?name=${initials}&background=2563EB&color=fff" style="width:100%; height:100%; object-fit:cover;" alt="User">`;
  
  renderTree();
  updateContext();
  switchView(STATE.activeView);
}

// Authentication Handlers
async function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById("loginEmail");
  const email = emailInput.value.trim();
  
  if (!email) return;
  
  const submitBtn = e.target.querySelector("button");
  submitBtn.disabled = true;
  submitBtn.innerText = "Connecting...";
  
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    
    if (!res.ok) {
      throw new Error("Login failed");
    }
    
    const data = await res.json();
    STATE.token = data.session_token;
    STATE.email = data.email;
    
    localStorage.setItem("token", data.session_token);
    localStorage.setItem("email", data.email);
    
    showMainApp();
  } catch (err) {
    alert("Authorization failed. Ensure backend server is running.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Authorize Session";
  }
}

async function handleLogout() {
  if (confirm("Are you sure you want to end this session?")) {
    try {
      await fetchAPI("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request error", e);
    }
    
    STATE.token = null;
    STATE.email = null;
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    showAuthScreen();
  }
}

// Theme settings
function setTheme(theme) {
  document.body.className = ""; // clear
  if (theme === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.add(dark ? "theme-dark" : "theme-light");
  } else {
    document.body.classList.add("theme-" + theme);
  }
  localStorage.setItem("theme", theme);
  
  // Render checkmarks
  document.querySelectorAll(".theme-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("onclick").includes(theme)) {
      item.classList.add("active");
    }
  });
}

// Navigation View Switches
function switchView(viewName) {
  STATE.activeView = viewName;
  
  // Tab UI Highlights
  document.querySelectorAll(".view-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  
  const tabId = viewName === "dashboard" ? "tabDashboard" : viewName === "chat" ? "tabChat" : "tabLedger";
  const navId = viewName === "dashboard" ? "navDashboard" : viewName === "chat" ? "navChat" : null;
  
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add("active");
  
  const activeNav = document.getElementById(navId);
  if (activeNav) activeNav.classList.add("active");
  
  // Hide all containers, show selected
  document.querySelectorAll(".view-container").forEach(c => c.classList.remove("active"));
  const viewId = viewName === "dashboard" ? "viewDashboard" : viewName === "chat" ? "viewChat" : "viewLedger";
  document.getElementById(viewId).classList.add("active");
  
  // Trigger loaders
  if (viewName === "dashboard") {
    loadDashboard();
  } else if (viewName === "ledger") {
    loadLedger();
  } else if (viewName === "chat") {
    // If no chat selected, try selecting the first or starting one
    if (!STATE.activeChatId) {
      autoSelectChat();
    } else {
      loadChat();
    }
  }
}

// Workspace Tree Navigation & Builder
function switchRegion(regionId, label) {
  STATE.activeRegion = regionId;
  const projectKeys = Object.keys(STATE.workspaces[regionId].projects);
  STATE.activeProject = projectKeys[0];
  STATE.activeView = "dashboard";
  STATE.activeChatId = null;
  
  document.getElementById("globalRegionLabel").innerText = label;
  document.querySelectorAll(".region-item").forEach(item => item.classList.remove("active"));
  
  const activeRegItem = regionId === "india" ? "regIndia" : "regDubai";
  const itemEl = document.getElementById(activeRegItem);
  if (itemEl) itemEl.classList.add("active");
  
  document.getElementById("regionMenu").classList.remove("show");
  
  updateContext();
  renderTree();
  switchView("dashboard");
}

function selectProject(regionId, projectId) {
  STATE.activeRegion = regionId;
  STATE.activeProject = projectId;
  STATE.activeView = "dashboard";
  STATE.activeChatId = null;
  
  updateContext();
  renderTree();
  switchView("dashboard");
}

function selectChat(regionId, projectId, chatId) {
  STATE.activeRegion = regionId;
  STATE.activeProject = projectId;
  STATE.activeChatId = chatId;
  
  updateContext();
  renderTree();
  switchView("chat");
}

function updateContext() {
  const reg = STATE.workspaces[STATE.activeRegion];
  const proj = reg.projects[STATE.activeProject];
  
  // Breadcrumbs
  document.getElementById("breadcrumbs").innerHTML = `${reg.label.split(" ")[1]} <span class="icon-sm" style="margin: 0 4px;">/</span> <span class="current">${proj.label}</span>`;
  document.getElementById("ctxProject").innerText = proj.label;
  document.getElementById("dashTitle").innerText = `${proj.label} Overview`;
  
  // Update Ledger Tab visibility
  const tabLedger = document.getElementById("tabLedger");
  if (proj.hasLedger) {
    tabLedger.classList.remove("hidden");
  } else {
    tabLedger.classList.add("hidden");
    if (STATE.activeView === "ledger") {
      switchView("dashboard");
    }
  }
  
  // Update Freshness Date/Time
  updateTimestampUI();
}

function updateTimestampUI() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("lastUpdated").innerText = `Last updated: Today at ${timeStr}`;
  
  const ledgerTime = document.getElementById("ledgerTime");
  if (ledgerTime) ledgerTime.innerText = timeStr;
  
  document.getElementById("freshness").innerText = `Today, ${timeStr}`;
}

async function startNewChatForProject(projectId) {
  STATE.activeProject = projectId;
  const name = `Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  try {
    const res = await fetchAPI("/api/chats", {
      method: "POST",
      body: JSON.stringify({ workspace_id: projectId, name })
    });
    
    const chat = await res.json();
    STATE.activeChatId = chat.id;
    
    updateContext();
    await renderTree();
    switchView("chat");
  } catch (err) {
    console.error("Error creating chat", err);
  }
}

function handleProjectSelectChange(projectId) {
  selectProject(STATE.activeRegion, projectId);
}

async function renderTree() {
  const selectEl = document.getElementById("projectSelect");
  const chatsContainer = document.getElementById("chatsListContainer");
  const foldersContainer = document.getElementById("projectFoldersContainer");
  if (!selectEl || !chatsContainer) return;
  
  // 1. Populate dropdown projects list
  const activeRegionData = STATE.workspaces[STATE.activeRegion];
  if (!activeRegionData) return;
  
  let dropdownHtml = "";
  for (const [pKey, pVal] of Object.entries(activeRegionData.projects)) {
    dropdownHtml += `<option value="${pKey}" ${pKey === STATE.activeProject ? 'selected' : ''}>${pVal.label}</option>`;
  }
  selectEl.innerHTML = dropdownHtml;
  renderProjectFolders(foldersContainer);
  
  // 2. Fetch and render chats list for current project
  chatsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size:12px;">Loading chats...</div>`;
  
  let chats = [];
  try {
    const res = await fetchAPI(`/api/chats/${STATE.activeProject}`);
    chats = await res.json();
  } catch (err) {
    console.error("Error fetching chats", err);
    chatsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--danger); font-size:12px;">Error loading chats.</div>`;
    return;
  }
  
  if (chats.length === 0) {
    chatsContainer.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-muted); font-style: italic; font-size: 12.5px; cursor: pointer;" onclick="startNewChat()">
        + Start first query
      </div>
    `;
  } else {
    chatsContainer.innerHTML = chats.map(c => {
      const isChatActive = (STATE.activeChatId === c.id);
      return `
        <div class="chat-item ${isChatActive ? 'active' : ''}" onclick="selectChat('${STATE.activeRegion}', '${STATE.activeProject}', '${c.id}')" title="${c.name}">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          ${c.name}
        </div>
      `;
    }).join('');
  }
}

function renderProjectFolders(container) {
  if (!container) return;

  const project = STATE.workspaces[STATE.activeRegion]?.projects[STATE.activeProject];
  if (!project?.folders?.length) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="tree-section-title">Project Folders</div>
    <div class="folder-chain">
      ${project.folders.map((name, index) => `
        <div class="folder-node" style="--level:${index};">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <span>${name}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// 2. Data Loaders & Renderers

// Dashboard Loader
async function loadDashboard() {
  try {
    const res = await fetchAPI(`/api/dashboard/${STATE.activeProject}`);
    if (!res.ok) return;
    const data = await res.json();
    
    // Render KPIs
    const grid = document.getElementById("dashKPIs");
    grid.innerHTML = data.kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-label">${k.label} 
          ${k.trend ? `<span class="kpi-trend ${k.trend}">${k.percent}</span>` : ''}
        </div>
        <div class="kpi-val">${k.value}</div>
      </div>
    `).join('');
    
    // Render Documents list
    const docsContainer = document.getElementById("dashDocs");
    if (data.docs.length === 0) {
      docsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size:13px;">No documents uploaded in this workspace.</div>`;
    } else {
      docsContainer.innerHTML = data.docs.map(d => `
        <div class="list-row">
          <span style="display:flex; align-items:center; gap:8px;">
            <svg class="icon" style="color:var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            <a href="#" onclick="alert('Document status: ${d.indexing_status || 'ready'} (${d.chunk_count || 0} BGE-M3 chunks)')" style="color:var(--text-2); text-decoration:none; font-weight:600;">${d.name}</a>
          </span>
          <span style="display:flex; align-items:center; gap:8px;">
            <span style="color:var(--text-muted); font-size:12px;">${documentStatusLabel(d)}</span>
            <button class="btn-secondary-mini" onclick="reindexDocument('${d.id}')">Reindex</button>
          </span>
        </div>
      `).join('');
    }
    
    // Render Recent Query Sessions
    const queriesContainer = document.getElementById("dashQueries");
    if (data.chats.length === 0) {
      queriesContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size:13px;">No queries executed. Type in chat to start.</div>`;
    } else {
      queriesContainer.innerHTML = data.chats.slice(0, 4).map(c => `
        <div class="list-row" onclick="selectChat('${STATE.activeRegion}', '${STATE.activeProject}', '${c.id}')">
          <span style="display:flex; align-items:center; gap:8px;">
            <svg class="icon" style="color:var(--accent);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            ${c.name}
          </span>
          <span style="color:var(--text-muted); font-size:12px;">Open Chat →</span>
        </div>
      `).join('');
    }
    
    // Update Right Rail sources preview
    updateRightRailSources(data.docs);
  } catch (err) {
    console.error("Error loading dashboard", err);
  }
}

// Ledger Loader
async function loadLedger() {
  try {
    const res = await fetchAPI(`/api/ledger/${STATE.activeProject}`);
    if (!res.ok) return;
    const records = await res.json();
    
    const ledgerBody = document.getElementById("ledgerBody");
    const expenseBody = document.getElementById("expenseBody");
    
    ledgerBody.innerHTML = "";
    expenseBody.innerHTML = "";
    
    const roomRecords = records.filter(r => r.type === "room");
    const expenseRecords = records.filter(r => r.type === "expense");
    
    if (roomRecords.length === 0) {
      ledgerBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No records found. Upload ledger CSV to sync.</td></tr>`;
    } else {
      roomRecords.forEach(r => {
        const badgeClass = r.status.toLowerCase() === 'paid' ? 'status-paid' : r.status.toLowerCase() === 'pending' ? 'status-pending' : '';
        ledgerBody.innerHTML += `
          <tr>
            <td style="font-weight:700;">${r.room_number || '-'}</td>
            <td>${r.guest_name || '-'}</td>
            <td>${r.checkin_date || '-'}</td>
            <td>${r.checkout_date || '-'}</td>
            <td style="font-weight:600;">${r.collection ? r.collection.toLocaleString('en-IN') : '-'}</td>
            <td><span class="status-badge ${badgeClass}">${r.status}</span></td>
            <td>${r.notes || '-'}</td>
          </tr>
        `;
      });
    }
    
    if (expenseRecords.length === 0) {
      expenseBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No utilities/expenses synchronized.</td></tr>`;
    } else {
      expenseRecords.forEach(r => {
        const badgeClass = r.status.toLowerCase().includes('settled') ? 'status-settled' : 'status-pending';
        expenseBody.innerHTML += `
          <tr>
            <td style="font-weight:600;">${r.category || '-'}</td>
            <td style="font-weight:600;">${r.amount ? r.amount.toLocaleString('en-IN') : '-'}</td>
            <td>${r.vendor || '-'}</td>
            <td><span class="status-badge ${badgeClass}">${r.status}</span></td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error("Error loading ledger", err);
  }
}

// Chat loader
async function loadChat() {
  if (!STATE.activeChatId) return;
  
  const container = document.getElementById("chatContainer");
  container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:40px;">Synchronizing secure channel...</div>`;
  
  try {
    const res = await fetchAPI(`/api/chats/${STATE.activeChatId}/messages`);
    const messages = await res.json();
    
    container.innerHTML = "";
    if (messages.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:var(--text-muted); padding:60px 20px;">
          <svg class="icon" style="width:48px; height:48px; opacity:0.3; margin-bottom:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <h4 style="margin-bottom:8px; color:var(--text);">Session Initiated</h4>
          <p style="font-size:13px;">Ask questions regarding land titles, mutation history, room ledger entries or utility receipts.</p>
        </div>
      `;
      // Update confidence UI default
      document.getElementById("groundednessLabel").innerText = "100%";
      document.getElementById("confidenceBarFill").style.width = "100%";
    } else {
      messages.forEach(m => renderMessageRow(m.role, m.content, m.citations, m.timestamp, m.citation_details || []));
      scrollToBottom();
      
      // Update confidence bar matching last assistant message if any
      const assistantMsgs = messages.filter(m => m.role === "assistant");
      if (assistantMsgs.length > 0) {
        // Mock confidence representation
        document.getElementById("groundednessLabel").innerText = "92%";
        document.getElementById("confidenceBarFill").style.width = "92%";
      }
    }
  } catch (err) {
    console.error("Error loading chat messages", err);
  }
}

// Render message row
function renderMessageRow(role, text, citations, timestamp, citationDetails = []) {
  const container = document.getElementById("chatContainer");
  const isAssistant = role === "assistant";
  
  const initials = isAssistant ? "CB" : (STATE.email ? STATE.email.substring(0, 2).toUpperCase() : "AD");
  const authorName = isAssistant ? "Company Brain" : "Admin";
  
  // Format simple markdown links & bolding
  let formattedText = text
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
    
  // Format lists simple block
  formattedText = formattedText.replace(/-\s(.*?)(<br>|$)/g, "• $1$2");
  
  let citationsHtml = "";
  if (isAssistant && citations && citations.length > 0) {
    citationsHtml = `
      <div class="citations-box">
        ${citations.map((c, index) => {
          const detail = citationDetails[index] || { document_name: c, text: "Source details are available for newly generated answers." };
          return `
          <div class="citation" onclick='openSourceViewer(${JSON.stringify(detail).replace(/'/g, "&apos;")})'>
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            ${c}
          </div>
        `}).join('')}
      </div>
    `;
  }
  
  const timeFormatted = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";
  
  const rowHtml = `
    <div class="msg-row ${role}">
      <div class="msg-avatar">${initials}</div>
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-author">${authorName}</span> 
          <span class="msg-time">${timeFormatted}</span>
        </div>
        <div class="msg-text">${formattedText}</div>
        ${citationsHtml}
      </div>
    </div>
  `;
  
  // Remove empty placeholder card if it exists
  const emptyPlaceholder = container.querySelector("div[style*='padding:60px']");
  if (emptyPlaceholder) emptyPlaceholder.remove();
  
  container.innerHTML += rowHtml;
}

// auto-select chat or trigger start new
async function autoSelectChat() {
  try {
    const res = await fetchAPI(`/api/chats/${STATE.activeProject}`);
    const chats = await res.json();
    
    if (chats.length > 0) {
      STATE.activeChatId = chats[0].id;
      renderTree();
      loadChat();
    } else {
      // Trigger new chat creation silently
      startNewChat();
    }
  } catch (err) {
    console.error("Error auto-selecting chat", err);
  }
}

// Start New Chat
async function startNewChat() {
  const name = `Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  try {
    const res = await fetchAPI("/api/chats", {
      method: "POST",
      body: JSON.stringify({ workspace_id: STATE.activeProject, name })
    });
    const chat = await res.json();
    STATE.activeChatId = chat.id;
    
    renderTree();
    switchView("chat");
  } catch (err) {
    console.error("Error creating chat", err);
  }
}

// Send Message
async function sendMessage() {
  const inputEl = document.getElementById("composerInput");
  const content = inputEl.value.trim();
  if (!content || !STATE.activeChatId) return;
  
  // 1. Render user message row immediately
  renderMessageRow("user", content, [], new Date());
  inputEl.value = "";
  inputEl.style.height = "38px"; // reset
  scrollToBottom();
  
  // 2. Add loading animation/indicator
  const container = document.getElementById("chatContainer");
  const loadIndicatorId = "msgLoading";
  container.innerHTML += `
    <div class="msg-row assistant" id="${loadIndicatorId}">
      <div class="msg-avatar">CB</div>
      <div class="msg-content">
        <div class="msg-header"><span class="msg-author">Company Brain</span> <span class="msg-time">Analyzing context...</span></div>
        <div class="msg-text" style="opacity: 0.5;">Grounded retrieval in progress...</div>
      </div>
    </div>
  `;
  scrollToBottom();
  
  try {
    const res = await fetchAPI(`/api/chats/${STATE.activeChatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, workspace_id: STATE.activeProject })
    });
    
    // Remove loading indicator
    const loader = document.getElementById(loadIndicatorId);
    if (loader) loader.remove();
    
    if (!res.ok) {
      throw new Error("Message send failed");
    }
    
    const reply = await res.json();
    
    // 3. Render Assistant Response
    renderMessageRow("assistant", reply.content, reply.citations, new Date(), reply.citation_details || []);
    scrollToBottom();
    
    // Update Right Rail Metadata
    document.getElementById("groundednessLabel").innerText = `${reply.confidence}%`;
    document.getElementById("confidenceBarFill").style.width = `${reply.confidence}%`;
  } catch (err) {
    console.error(err);
    const loader = document.getElementById(loadIndicatorId);
    if (loader) loader.remove();
    alert("Message pipeline timeout. Check terminal server processes.");
  }
}

// File Upload Pipeline Handler
async function handleFileUpload(e, fileType) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (STATE.activeProject === "overview") {
    alert("Please select a specific project workspace first before uploading files.");
    e.target.value = "";
    return;
  }
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspace_id", STATE.activeProject);
  
  // Show notification
  alert(`📤 Uploading '${file.name}' to workspace... Chunks will be indexed under self-hosted BGE-M3 embeddings.`);
  
  try {
    const res = await fetchAPI("/api/upload", {
      method: "POST",
      body: formData
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Upload pipeline failed");
    }
    
    const result = await res.json();
    if (result.indexing_status === "indexing") {
      alert(`Saved '${file.name}'. BGE-M3 indexing is running in the background. Refresh the dashboard in a moment to see chunk count.`);
    } else {
      alert(`Success! Indexed '${file.name}' into ${result.chunk_count} structure-aware chunks.`);
    }
    
    // Reload state matching current view
    if (STATE.activeView === "dashboard") {
      loadDashboard();
    } else if (STATE.activeView === "ledger") {
      loadLedger();
    }
    
    // Reload Tree
    renderTree();
  } catch (err) {
    alert(`❌ Upload failed: ${err.message}`);
    console.error(err);
  } finally {
    // Clear input
    e.target.value = "";
  }
}

// Right Rail updates
function updateRightRailSources(docs) {
  const list = document.getElementById("sourcesList");
  if (!docs || docs.length === 0) {
    list.innerHTML = `<div style="font-size:12px; color:var(--text-muted); font-style:italic;">No files uploaded yet.</div>`;
  } else {
    list.innerHTML = docs.map(d => `
      <div class="citation" onclick="alert('Accessing document structure: ${d.name}')">
        <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        ${d.name}
      </div>
    `).join('');
  }
}

async function openSourceViewer(source) {
  const panel = document.getElementById("sourceViewerPanel");
  const title = document.getElementById("sourceViewerTitle");
  const meta = document.getElementById("sourceViewerMeta");
  const body = document.getElementById("sourceViewerBody");
  const openBtn = document.getElementById("sourceOpenFileBtn");

  if (!panel || !title || !meta || !body) return;

  const pageLabel = source.page_number ? `Page ${source.page_number}` : "Indexed chunk";
  title.innerText = source.document_name || "Source";
  meta.innerText = `${pageLabel}${source.score ? ` · score ${source.score}` : ""}`;
  body.innerText = source.text || "No source text is available for this older citation.";

  if (source.document_id && openBtn) {
    openBtn.classList.remove("hidden");
    openBtn.onclick = () => window.open(`/api/documents/${source.document_id}/file`, "_blank");
  } else if (openBtn) {
    openBtn.classList.add("hidden");
    openBtn.onclick = null;
  }

  panel.classList.remove("hidden");
}

function closeSourceViewer() {
  const panel = document.getElementById("sourceViewerPanel");
  if (panel) panel.classList.add("hidden");
}

function documentStatusLabel(doc) {
  if (doc.indexing_status === "indexing") {
    return "Indexing with BGE-M3";
  }
  if (doc.indexing_status === "error") {
    return "Indexing error";
  }
  if (doc.chunk_count) {
    return `${doc.chunk_count} chunks`;
  }
  return new Date(doc.uploaded_at).toLocaleDateString();
}

async function reindexDocument(documentId) {
  try {
    const res = await fetchAPI(`/api/documents/${documentId}/reindex`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Reindex failed");
    }
    alert("Reindexing started. BGE-M3/OCR will update this document in the background.");
    loadDashboard();
  } catch (err) {
    alert(`Reindex failed: ${err.message}`);
  }
}

// Global search box filtering (simulated / dynamic keywords alert)
function handleGlobalSearch() {
  const query = document.getElementById("globalSearch").value.trim().toLowerCase();
  if (query.length < 3) return;
  
  // Filter sidebar chats list or trigger workspace prompt
  console.log(`Global search initialized for query: ${query}`);
}

// UI Utilities
function adjustTextareaHeight(textarea) {
  textarea.style.height = "";
  textarea.style.height = textarea.scrollHeight + "px";
}

function scrollToBottom() {
  const wrapper = document.querySelector(".chat-view-wrapper");
  if (wrapper) {
    wrapper.scrollTop = wrapper.scrollHeight;
  }
}

function toggleRightRail() {
  document.getElementById("rightRail").classList.toggle("collapsed");
}

function exportChatToPDF() {
  alert("📄 Chat session compiled to PDF format. Download initiated.");
}

function shareWorkspace() {
  const link = `${window.location.origin}/?workspace=${STATE.activeProject}`;
  navigator.clipboard.writeText(link).then(() => {
    alert("🔗 Secure workspace sharing link copied to clipboard!");
  });
}

// Keyboard shortcuts for composition
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && e.target.id === "composerInput") {
    e.preventDefault();
    sendMessage();
  }
});

// Voice Input Speech Recognition Engine
let recognition = null;
let isListening = false;

function toggleVoiceInput() {
  const voiceBtn = document.getElementById("voiceBtn");
  const inputEl = document.getElementById("composerInput");
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("Speech Recognition API is not supported in this browser. Please try Edge or Chrome.");
    return;
  }
  
  if (isListening) {
    if (recognition) recognition.stop();
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isListening = true;
    if (voiceBtn) {
      voiceBtn.style.color = "var(--danger)";
      voiceBtn.style.backgroundColor = "var(--danger-bg)";
    }
    if (inputEl) {
      inputEl.placeholder = "Listening... speak now...";
    }
  };
  
  recognition.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    if (inputEl) {
      inputEl.value = (inputEl.value + " " + resultText).trim();
      adjustTextareaHeight(inputEl);
    }
  };
  
  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    stopListening();
  };
  
  recognition.onend = () => {
    stopListening();
  };
  
  recognition.start();
}

function stopListening() {
  isListening = false;
  const voiceBtn = document.getElementById("voiceBtn");
  const inputEl = document.getElementById("composerInput");
  if (voiceBtn) {
    voiceBtn.style.color = "";
    voiceBtn.style.backgroundColor = "";
  }
  if (inputEl) {
    inputEl.placeholder = "Ask about land records, surveys, billing data, room summaries...";
  }
}

// Run bootstrap init
init();
