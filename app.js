/* Canine Haven Boutique Community (Affiliate-only)
   Static GitHub Pages app
   - Posts from Google Sheets published CSV
   - Comments from a separate Google Sheet CSV (optional)
   - Commenting via pre-filled Google Form (optional)
*/

const CFG = window.CHB_COMMUNITY || {};

/* ===== DOM ===== */
const menuToggle = document.getElementById("menuToggle");
const signinScreen = document.getElementById("signinScreen");
const appScreen = document.getElementById("appScreen");

const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");
const signinBtn = document.getElementById("signinBtn");

const refreshBtn = document.getElementById("refreshBtn");
const postBtn = document.getElementById("postBtn");
const signoutBtn = document.getElementById("signoutBtn");
const copyNameBtn = document.getElementById("copyNameBtn");
const shopBtn = document.getElementById("shopBtn");
const welcomeNote = document.getElementById("welcomeNote");

const filtersPanel = document.getElementById("filtersPanel");
const channelFilter = document.getElementById("channelFilter");
const searchInput = document.getElementById("searchInput");

const feedEl = document.getElementById("feed");
const featuredFeedEl = document.getElementById("featuredFeed");
const mediaFeedEl = document.getElementById("mediaFeed");
const peopleListEl = document.getElementById("peopleList");

const openEventsBtn = document.getElementById("openEventsBtn");
const openFilesBtn = document.getElementById("openFilesBtn");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  discussion: document.getElementById("view_discussion"),
  featured: document.getElementById("view_featured"),
  events: document.getElementById("view_events"),
  media: document.getElementById("view_media"),
  files: document.getElementById("view_files"),
  people: document.getElementById("view_people"),
};

let ALL_POSTS = [];
let ALL_COMMENTS = [];
let COMMENTS_BY_POST = new Map();

/* ===== Helpers ===== */
function showModal(html){
  if(!modal || !modalBody) return;
  modalBody.innerHTML = html;
  modal.classList.remove("hidden");
}
function hideModal(){ modal?.classList.add("hidden"); }

closeModal?.addEventListener("click", hideModal);
modal?.addEventListener("click", (e)=> { if(e.target === modal) hideModal(); });

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function parseCSV(text){
  const rows = [];
  let row = [], cur = "", inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(c === '"'){
      if(inQuotes && text[i+1] === '"'){ cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if(c === ',' && !inQuotes){
      row.push(cur); cur = "";
    } else if((c === '\n' || c === '\r') && !inQuotes){
      if(cur.length || row.length){ row.push(cur); rows.push(row); }
      row = []; cur = "";
      if(c === '\r' && text[i+1] === '\n') i++;
    } else {
      cur += c;
    }
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows;
}

function toObjects(rows){
  if(!rows.length) return [];
  const headers = rows[0].map(h => (h||"").trim());
  return rows.slice(1).map(r=>{
    const obj = {};
    headers.forEach((h, idx)=> obj[h] = (r[idx] ?? "").trim());
    return obj;
  }).filter(o => Object.values(o).some(v => String(v||"").trim() !== ""));
}

function normalizeBool(v){ return String(v||"").trim().toLowerCase() === "true"; }
function normalizeStatus(v){
  const s = String(v||"").trim().toUpperCase();
  return s || "APPROVED";
}
function getField(obj, key){
  const wanted = (CFG.FIELDS && CFG.FIELDS[key]) ? String(CFG.FIELDS[key]).trim() : "";
  if(!wanted) return "";

  // exact match first
  if(Object.prototype.hasOwnProperty.call(obj, wanted)) return obj[wanted] ?? "";

  // case-insensitive fallback (handles Display Name vs Display name, etc.)
  const lw = wanted.toLowerCase();
  for(const k in obj){
    if(String(k).trim().toLowerCase() === lw){
      return obj[k] ?? "";
    }
  }

  return "";
}

function getCommentField(obj, key){
  const col = (CFG.COMMENT_FIELDS || {})[key];
  return (col && obj[col] !== undefined) ? obj[col] : "";
}

function driveToDirect(raw){
  if(!raw) return "";

  const text = String(raw).trim();

  // Grab file id from either:
  // - https://drive.google.com/open?id=FILEID
  // - https://drive.google.com/file/d/FILEID/view
  const m =
    text.match(/\/file\/d\/([^/]+)/) ||
    text.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if(!m) return "";

  const fileId = m[1];

  // THUMBNAIL endpoint renders cleanly in <img> tags
  // sz = size hint (bigger = sharper)
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
}



function copyText(text){
  if(!text) return;
  navigator.clipboard?.writeText(text);
  showModal(`<div>Copied to clipboard ✅</div><div style="margin-top:8px"><b>${escapeHtml(text)}</b></div>`);
}

function setMenu(open){
  document.body.classList.toggle("menuOpen", !!open);
}

/* ===== Menu toggle (collapsible on mobile) ===== */
menuToggle?.addEventListener("click", ()=>{
  const isOpen = document.body.classList.contains("menuOpen");
  setMenu(!isOpen);
});

document.addEventListener("click", (e)=>{
  if(!document.body.classList.contains("menuOpen")) return;
  const side = document.querySelector(".sideMenu");
  const isClickInsideMenu = side && side.contains(e.target);
  const isToggle = menuToggle && menuToggle.contains(e.target);
  if(!isClickInsideMenu && !isToggle){
    setMenu(false);
  }
});

/* ===== Session ===== */
function getSession(){
  return {
    name: localStorage.getItem("chb_name") || "",
    code: localStorage.getItem("chb_code") || ""
  };
}
function setSession(name, code){
  localStorage.setItem("chb_name", name);
  localStorage.setItem("chb_code", code || "");
}
function clearSession(){
  localStorage.removeItem("chb_name");
  localStorage.removeItem("chb_code");
}

/* ===== Sign in/out ===== */
function showApp(){
  signinScreen?.classList.add("hidden");
  appScreen?.classList.remove("hidden");

  buildChannelOptions();

  const s = getSession();
  if(welcomeNote){
    welcomeNote.textContent = `Signed in as ${s.name}${s.code ? " · Code: " + s.code : ""} · Tap Refresh to see new posts.`;
  }

  if(shopBtn){
    shopBtn.href = (CFG.SHOP_URL && !String(CFG.SHOP_URL).includes("PASTE_")) ? CFG.SHOP_URL : "#";
  }

  loadAll();
}

function showSignin(){
  appScreen?.classList.add("hidden");
  signinScreen?.classList.remove("hidden");

  const s = getSession();
  if(nameInput) nameInput.value = s.name || "";
  if(codeInput) codeInput.value = s.code || "";
}

signinBtn?.addEventListener("click", ()=>{
  const name = (nameInput?.value || "").trim();
  const code = (codeInput?.value || "").trim();
  if(!name){
    showModal(`<div>Please enter your <b>Display Name</b> to continue.</div>`);
    return;
  }
  setSession(name, code);
  showApp();
});

signoutBtn?.addEventListener("click", ()=>{ clearSession(); showSignin(); });

/* ===== Tabs ===== */
function switchTab(tabName){
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
  Object.keys(views).forEach(k => views[k]?.classList.toggle("hidden", k !== tabName));
  const showFilters = (tabName === "discussion");
  filtersPanel?.classList.toggle("hidden", !showFilters);
  // close menu on mobile after navigating
  if(window.matchMedia && window.matchMedia('(max-width: 899px)').matches){
    setMenu(false);
  }
  // ensure we have data
  if(!ALL_POSTS.length) loadAll();
}
tabs.forEach(t => t.addEventListener("click", ()=> switchTab(t.dataset.tab)));

/* ===== Filters ===== */
function buildChannelOptions(){
  if(!channelFilter) return;
  const list = (CFG.CHANNELS || []).filter(Boolean);
  channelFilter.innerHTML =
    `<option value="ALL">All Channels</option>` +
    list.map(c=> `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

channelFilter?.addEventListener("change", ()=> renderAllViews());
searchInput?.addEventListener("input", ()=> renderAllViews());

/* ===== Rendering ===== */
function renderComments(postId){
  const comments = COMMENTS_BY_POST.get(postId) || [];
  if(!comments.length){
    return `<div class="commentWrap"><div class="note">No comments yet.</div></div>`;
  }
  const items = comments
    .sort((a,b)=> (getCommentField(b,"timestamp")||"").localeCompare(getCommentField(a,"timestamp")||""))
    .map(c=>{
      const n = escapeHtml(getCommentField(c,"name") || "Member");
      const ts = escapeHtml(getCommentField(c,"timestamp") || "");
      const text = escapeHtml(getCommentField(c,"comment") || "");
      return `
        <div class="comment">
          <div class="commentHead">
            <div><span class="commentName">${n}</span></div>
            <div>${ts}</div>
          </div>
          <div class="commentText">${text}</div>
        </div>
      `;
    }).join("");
  return `<div class="commentWrap"><div class="note"><b>Comments</b></div>${items}</div>`;
}

function renderFeed(targetEl, posts, opts = {}){
  if(!targetEl) return;

  const onlyPinned = !!opts.onlyPinned;
  const onlyWithMedia = !!opts.onlyWithMedia;

  const selected = channelFilter?.value || "ALL";
  const q = (searchInput?.value || "").trim().toLowerCase();

  const filtered = posts.filter(p=>{
    const status = normalizeStatus(getField(p,"status"));
    if(status === "HIDDEN") return false;
    if(onlyPinned && !normalizeBool(getField(p,"pinned"))) return false;

    const photoRaw = getField(p,"photo");
    if(onlyWithMedia && !String(photoRaw||"").trim()) return false;

    const ch = getField(p,"channel");
    if(opts.useFilters !== false){
      if(selected !== "ALL" && ch !== selected) return false;
      if(q){
        const hay = [getField(p,"name"), getField(p,"channel"), getField(p,"post")].join(" ").toLowerCase();
        if(!hay.includes(q)) return false;
      }
    }
    return true;
  });

  filtered.sort((a,b)=>{
    const ap = normalizeBool(getField(a,"pinned"));
    const bp = normalizeBool(getField(b,"pinned"));
    if(ap !== bp) return ap ? -1 : 1;
    const at = getField(a,"timestamp");
    const bt = getField(b,"timestamp");
    return bt.localeCompare(at);
  });

  targetEl.innerHTML = filtered.map((p)=>{
    const name = escapeHtml(getField(p,"name") || "Member");
    const ch = escapeHtml(getField(p,"channel") || "");
    const text = escapeHtml(getField(p,"post") || "");
    const ts = escapeHtml(getField(p,"timestamp") || "");
    const pinned = normalizeBool(getField(p,"pinned"));

    const photoRaw = getField(p,"photo");
    const photo = driveToDirect(photoRaw);
    const photoHtml = photo ? `
      <div class="photo">
        <img src="${escapeHtml(photo)}" alt="Community photo" loading="lazy" />
      </div>` : "";

    // Post ID defaults to Timestamp (works well with Google Forms)
    const postId = getField(p,"timestamp") || "";
    const postIdSafe = escapeHtml(postId);

    const commentsHtml = (CFG.COMMENTS_CSV_URL && !String(CFG.COMMENTS_CSV_URL).includes("PASTE_"))
      ? renderComments(postId)
      : `<div class="commentWrap"><div class="note">Comments are not connected yet. Paste your <b>COMMENTS_CSV_URL</b> in config.js.</div></div>`;

    return `
      <article class="card ${pinned ? "pinned":""}">
        <div class="meta">
          <div class="metaTop">
            <div><span class="name">${name}</span> <span class="tag">${ch}</span></div>
            <div class="actionsRow">
              <button class="btn tiny replyBtn" type="button" data-postid="${postIdSafe}">Reply</button>
              <button class="btn tiny copyPostId" type="button" data-postid="${postIdSafe}">Copy Post ID</button>
            </div>
          </div>
          <div>${ts}${pinned ? " · 📌 Pinned" : ""}</div>
        </div>
        <div class="text">${text}</div>
        ${photoHtml}
        ${commentsHtml}
      </article>
    `;
  }).join("") || `<div class="card">Nothing here yet.</div>`;
}

function renderPeople(posts){
  if(!peopleListEl) return;
  const names = new Map();
  posts.forEach(p=>{
    const status = normalizeStatus(getField(p,"status"));
    if(status === "HIDDEN") return;
    const n = (getField(p,"name") || "").trim();
    if(!n) return;
    names.set(n, (names.get(n) || 0) + 1);
  });

  const sorted = Array.from(names.entries()).sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]));
  peopleListEl.innerHTML = sorted.map(([name, count])=>`
    <div class="personCard">
      <div class="personName">${escapeHtml(name)}</div>
      <div class="personMeta">${count} post${count===1?"":"s"} shared</div>
    </div>
  `).join("") || `<div class="panel"><div class="note">No members yet. Once posts come in, names appear here.</div></div>`;
}

function renderAllViews(){
  renderFeed(feedEl, ALL_POSTS, { useFilters: true });
  renderFeed(featuredFeedEl, ALL_POSTS, { onlyPinned: true, useFilters: false });
  renderFeed(mediaFeedEl, ALL_POSTS, { onlyWithMedia: true, useFilters: false });
  renderPeople(ALL_POSTS);
}

/* ===== Data loading ===== */
async function fetchCsvObjects(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const csv = await res.text();
  const rows = parseCSV(csv);
  return toObjects(rows);
}

function buildCommentsIndex(){
  COMMENTS_BY_POST = new Map();
  ALL_COMMENTS.forEach(c=>{
    const pid = (getCommentField(c,"postId") || "").trim();
    if(!pid) return;
    if(!COMMENTS_BY_POST.has(pid)) COMMENTS_BY_POST.set(pid, []);
    COMMENTS_BY_POST.get(pid).push(c);
  });
}

async function loadAll(){
  // POSTS
  if(!CFG.FEED_CSV_URL || String(CFG.FEED_CSV_URL).includes("PASTE_")){
    showModal(`
      <div style="margin-bottom:10px"><b>One-time setup:</b></div>
      <div>1) Publish your Google Sheet responses tab to the web as <b>CSV</b>.</div>
      <div>2) Paste the CSV link into <b>config.js</b> → <b>FEED_CSV_URL</b>.</div>
      <div style="margin-top:10px">Then refresh.</div>
    `);
    feedEl && (feedEl.innerHTML = `<div class="card">Add your published Sheet CSV link in config.js to load posts.</div>`);
    return;
  }

  feedEl && (feedEl.innerHTML = `<div class="card">Loading posts…</div>`);
  try{
    ALL_POSTS = await fetchCsvObjects(CFG.FEED_CSV_URL);
  } catch(e){
    feedEl && (feedEl.innerHTML = `<div class="card">Couldn’t load the posts feed. Double-check your CSV link is public + ends in <b>output=csv</b>.</div>`);
    return;
  }

  // COMMENTS (optional)
  ALL_COMMENTS = [];
  COMMENTS_BY_POST = new Map();
  if(CFG.COMMENTS_CSV_URL && !String(CFG.COMMENTS_CSV_URL).includes("PASTE_")){
    try{
      ALL_COMMENTS = await fetchCsvObjects(CFG.COMMENTS_CSV_URL);
      buildCommentsIndex();
    } catch(e){
      // show posts anyway, but warn in modal
      showModal(`<div><b>Comments</b> could not load. Check <b>COMMENTS_CSV_URL</b> in config.js is a published CSV link.</div>`);
    }
  }

  renderAllViews();
}

/* ===== Actions ===== */
function openPostForm(){
  if(!CFG.POST_FORM_URL || String(CFG.POST_FORM_URL).includes("PASTE_")){
    showModal(`<div>Add your Google Form link in <b>config.js</b> → <b>POST_FORM_URL</b>.</div>`);
    return;
  }
  window.open(CFG.POST_FORM_URL, "_blank", "noopener,noreferrer");
}

function openCommentForm(postId){
  if(!CFG.COMMENT_FORM_URL || String(CFG.COMMENT_FORM_URL).includes("PASTE_")){
    showModal(`<div>Add your comment form link in <b>config.js</b> → <b>COMMENT_FORM_URL</b>.</div>`);
    return;
  }
  const f = CFG.COMMENT_FORM || {};
  if(!f.postIdEntry || !f.nameEntry){
    showModal(`<div>Add your comment form entry IDs in <b>config.js</b> → <b>COMMENT_FORM</b>.</div>`);
    return;
  }

  const displayName = getSession().name || "";
  const rulesPart = (f.rulesEntry && f.rulesValue)
    ? `&${f.rulesEntry}=${encodeURIComponent(f.rulesValue)}`
    : "";

  const url =
    `${CFG.COMMENT_FORM_URL}?usp=pp_url` +
    `&${f.postIdEntry}=${encodeURIComponent(postId)}` +
    `&${f.nameEntry}=${encodeURIComponent(displayName)}` +
    rulesPart;

  window.open(url, "_blank", "noopener,noreferrer");
}

/* Reply + Copy Post ID */
document.addEventListener("click", (e)=>{
  const copyBtn = e.target.closest?.(".copyPostId");
  if(copyBtn){
    const id = copyBtn.getAttribute("data-postid") || "";
    copyText(id);
    return;
  }
  const replyBtn = e.target.closest?.(".replyBtn");
  if(replyBtn){
    const id = replyBtn.getAttribute("data-postid") || "";
    if(id) openCommentForm(id);
    return;
  }
});

refreshBtn?.addEventListener("click", ()=> loadAll());
postBtn?.addEventListener("click", ()=> openPostForm());
copyNameBtn?.addEventListener("click", ()=> copyText(getSession().name));

shopBtn?.addEventListener("click", (e)=>{
  if(!CFG.SHOP_URL || String(CFG.SHOP_URL).includes("PASTE_")){
    e.preventDefault();
    showModal(`<div>Add your shop link in <b>config.js</b> → <b>SHOP_URL</b>.</div>`);
  }
});

openEventsBtn?.addEventListener("click", ()=>{
  if(!CFG.EVENTS_URL || String(CFG.EVENTS_URL).includes("PASTE_")){
    showModal(`<div>Add your events link in <b>config.js</b> → <b>EVENTS_URL</b>.</div>`);
    return;
  }
  window.open(CFG.EVENTS_URL, "_blank", "noopener,noreferrer");
});

openFilesBtn?.addEventListener("click", ()=>{
  if(!CFG.FILES_URL || String(CFG.FILES_URL).includes("PASTE_")){
    showModal(`<div>Add your files/resources link in <b>config.js</b> → <b>FILES_URL</b>.</div>`);
    return;
  }
  window.open(CFG.FILES_URL, "_blank", "noopener,noreferrer");
});

/* Affiliate Menu (1–5 wired to links) */
function openMenuLink(key, title){
  const urls = CFG.MENU_URLS || {};
  const u = urls[key];
  if(!u || String(u).includes("PASTE_")){
    showModal(`<div><b>${escapeHtml(title)}</b><br/>Paste your link in <b>config.js</b> → <b>MENU_URLS.${escapeHtml(key)}</b>.</div>`);
    return;
  }
  window.open(u, "_blank", "noopener,noreferrer");
  if(window.matchMedia && window.matchMedia('(max-width: 899px)').matches){
    setMenu(false);
  }
}

document.querySelectorAll('.menuItem').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const key = btn.dataset.menu;
    if(key === 'start') return openMenuLink('start', 'Start Here');
    if(key === 'training') return openMenuLink('training', 'Training');
    if(key === 'vault') return openMenuLink('vault', 'Content Vault');
    if(key === 'mediaAssets') return openMenuLink('mediaAssets', 'Media Assets');
    if(key === 'links') return openMenuLink('links', 'Important Links');
  });
});

/* Boot */
(function init(){
  const s = getSession();
  if(s.name) showApp();
  else showSignin();
})();
