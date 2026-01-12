/* CHB Affiliate Community (v3 no-module bundle) */

const CONFIG = {
  // Paste Apps Script Web App URL to go live:
  // https://script.google.com/macros/s/XXXXX/exec
  API_BASE: "https://script.google.com/macros/s/AKfycbxMzuMwaG8cBt0PSzyNNEd3yD8v15bQEUXoKYg-mi9kMXS_fePKRcTNKwaktQuvcTlBHg/exec" 
};

const DEMO_MODE = !CONFIG.API_BASE;

// ------- helpers -------
const $ = (sel)=> document.querySelector(sel);
const $$ = (sel)=> Array.from(document.querySelectorAll(sel));

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function fmtTime(iso){
  try{ return new Date(iso).toLocaleString(); }catch{ return iso; }
}
function toast(t){
  const el = document.createElement("div");
  el.textContent = t;
  el.style.position="fixed";
  el.style.left="50%";
  el.style.bottom="80px";
  el.style.transform="translateX(-50%)";
  el.style.padding="10px 12px";
  el.style.borderRadius="14px";
  el.style.border="1px solid rgba(255,255,255,0.12)";
  el.style.background="rgba(0,0,0,0.7)";
  el.style.backdropFilter="blur(10px)";
  el.style.zIndex="9999";
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1200);
}
function uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxxyxxxx".replace(/[xy]/g,c=>{
    const r=Math.random()*16|0, v=c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}

// ------- demo store -------
const K_USER="chb_session_user";
const K_POSTS="chb_demo_posts";
const K_COMMENTS="chb_demo_comments";

function seedDemo(){
  if(!localStorage.getItem(K_POSTS)){
    const now = new Date().toISOString();
    const posts=[{
      post_id:"p_demo1",
      author_id:"u_demo",
      author_name:"April",
      text:"Welcome to the CHB Affiliate Community 🐾\nPost wins, questions, and product pics here.",
      image_url:"",
      created_at:now,
      pinned:true,
      featured:false,
      status:"active"
    }];
    localStorage.setItem(K_POSTS, JSON.stringify(posts));
    localStorage.setItem(K_COMMENTS, JSON.stringify([]));
  }
}
seedDemo();

function getUser(){
  try{ return JSON.parse(localStorage.getItem(K_USER)); }catch{ return null; }
}
function setUser(u){ localStorage.setItem(K_USER, JSON.stringify(u)); }
function clearUser(){ localStorage.removeItem(K_USER); }

function demoLogin(email,pin){
  return { ok:true, user:{ user_id:"u_demo", name:"Demo Affiliate", email, role:"member" } };
}
function demoGetPosts(){
  const posts=JSON.parse(localStorage.getItem(K_POSTS)||"[]");
  posts.sort((a,b)=>{
    const ap=!!a.pinned, bp=!!b.pinned;
    if(ap!==bp) return (bp?1:0)-(ap?1:0);
    return new Date(b.created_at)-new Date(a.created_at);
  });
  return { ok:true, posts };
}
function demoCreatePost(p){
  const posts=JSON.parse(localStorage.getItem(K_POSTS)||"[]");
  posts.unshift(p);
  localStorage.setItem(K_POSTS, JSON.stringify(posts));
  return { ok:true, post_id:p.post_id };
}
function demoGetComments(post_id){
  const cs=JSON.parse(localStorage.getItem(K_COMMENTS)||"[]");
  return { ok:true, comments: cs.filter(c=>c.post_id===post_id) };
}
function demoCreateComment(c){
  const cs=JSON.parse(localStorage.getItem(K_COMMENTS)||"[]");
  cs.push(c);
  localStorage.setItem(K_COMMENTS, JSON.stringify(cs));
  return { ok:true, comment_id:c.comment_id };
}
function demoFeaturedMedia(){
  return { ok:true, items:[{ item_id:"m1", title:"Add your Featured Media in Google Sheets", type:"link", thumbnail_url:"", url:"#", description:"When you go live, fill FeaturedMedia sheet.", priority:100, created_at:new Date().toISOString(), status:"active"}] };
}
function demoFeaturedPeople(category){
  const people=[
    { person_id:"p1", category:"spotlight", name:"Spotlight Affiliate", headline:"Top Contributor", subtext:"Recognition row", photo_url:"", link_url:"#", priority:100, status:"active" },
    { person_id:"p2", category:"mentor", name:"Mentor Guide", headline:"Support", subtext:"Training + help", photo_url:"", link_url:"#", priority:100, status:"active" }
  ];
  return { ok:true, people: people.filter(p=>p.category===category) };
}
function demoHubLinks(section){
  return { ok:true, links:[{ link_id:"l1", section, title:`${section} Example`, description:"Replace with your real links in HubLinks.", type:"link", url:"#", thumbnail_url:"", priority:100, status:"active"}] };
}

// ------- API wrappers -------
async function apiGet(action, params={}){
  if(DEMO_MODE){
    if(action==="posts") return demoGetPosts();
    if(action==="comments") return demoGetComments(params.post_id);
    if(action==="featuredMedia") return demoFeaturedMedia();
    if(action==="featuredPeople") return demoFeaturedPeople(params.category);
    if(action==="hubLinks") return demoHubLinks(params.section);
    return { ok:false, error:"Unknown demo action" };
  }
  return jsonpRequest(action, params);
}
async function apiPost(action, body={}){
  if(DEMO_MODE){
    if(action==="login") return demoLogin(body.email, body.pin);
    if(action==="createPost") return demoCreatePost(body._demo_payload);
    if(action==="createComment") return demoCreateComment(body._demo_payload);
    return { ok:false, error:"Unknown demo action" };
  }
  // Apps Script does not return CORS headers, so cross-domain fetch will fail on GitHub Pages.
  // We use JSONP (script tag) so the browser will allow the response.
  // NOTE: This means we can only send small payloads (no base64 images).
  return jsonpRequest(action, body);
}

// ------- JSONP helper (works from GitHub Pages) -------
function jsonpRequest(action, params={}){
  return new Promise((resolve, reject) => {
    if(!CONFIG.API_BASE){
      reject(new Error("Missing CONFIG.API_BASE"));
      return;
    }
    const cb = `__chb_cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
    const url = new URL(CONFIG.API_BASE);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", cb);
    Object.entries(params||{}).forEach(([k,v])=>{
      if(v===undefined || v===null) return;
      url.searchParams.set(k, String(v));
    });

    const script = document.createElement("script");
    const timeout = setTimeout(()=>{
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 15000);

    function cleanup(){
      clearTimeout(timeout);
      try{ delete window[cb]; }catch(e){ window[cb]=undefined; }
      script.remove();
    }

    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error("JSONP load error")); };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

// ------- routing / views -------
const authScreen = $("#screenAuth");
const appScreen  = $("#screenApp");
const view = $("#view");
const logoutBtn = $("#logoutBtn");
const authMsg = $("#authMsg");

function setAppVisible(on){
  authScreen.classList.toggle("hidden", on);
  appScreen.classList.toggle("hidden", !on);
  logoutBtn.classList.toggle("hidden", !on);
}

function setActiveTab(tab){
  $$(".tabBtn").forEach(b=> b.classList.toggle("active", b.dataset.tab===tab));
}

async function renderFeed(){
  setActiveTab("feed");
  view.innerHTML = `
    <div class="card postComposer">
      <div class="h1">Community Feed</div>
      <textarea id="postText" placeholder="Share wins, questions, product pics..."></textarea>
      <div class="small" style="margin-top:10px">Optional photo (paste a shareable Google Drive image link)</div>
      <input id="postImageUrl" type="url" placeholder="https://drive.google.com/uc?id=..." />
      <div class="actions">
        <button id="refreshBtn" class="btn">Refresh</button>
        <button id="postBtn" class="btn primary">Post</button>
      </div>
      <div id="postMsg" class="msg"></div>
    </div>
    <div id="feedList" class="feedList"></div>
  `;
  $("#refreshBtn").onclick = ()=> loadFeed();
  $("#postBtn").onclick = ()=> submitPost();
  await loadFeed();
}

async function loadFeed(){
  const list = $("#feedList");
  list.innerHTML = `<div class="msg">Loading...</div>`;
  const data = await apiGet("posts");
  if(!data.ok){
    list.innerHTML = `<div class="msg error">${data.error||"Failed"}</div>`;
    return;
  }
  list.innerHTML = "";
  (data.posts||[]).forEach(p=>{
    const card = document.createElement("div");
    card.className="card postCard";
    const pinned = (String(p.pinned).toLowerCase()==="true" || p.pinned===true) ? " <span class='pill'>Pinned</span>" : "";
    card.innerHTML = `
      <div class="postMeta">
        <div>${escapeHtml(p.author_name)}${pinned}</div>
        <div>${fmtTime(p.created_at)}</div>
      </div>
      ${p.text ? `<div class="postText">${escapeHtml(p.text)}</div>` : ""}
      ${p.image_url ? `<img class="postImg" src="${p.image_url}" alt="">` : ""}
      <div class="postBtns">
        <button data-open="${p.post_id}">Comments</button>
        <button data-share="${p.post_id}">Copy Link</button>
      </div>
    `;
    card.querySelector("[data-open]").onclick = ()=> navigate("post", { post_id:p.post_id });
    card.querySelector("[data-share]").onclick = async ()=>{
      const url = location.href.split("#")[0] + "#post=" + encodeURIComponent(p.post_id);
      try{ await navigator.clipboard.writeText(url); toast("Copied"); }
      catch{ toast(url); }
    };
    list.appendChild(card);
  });
  if((data.posts||[]).length===0){
    list.innerHTML = `<div class="msg">No posts yet.</div>`;
  }
}

async function submitPost(){
  const u=getUser();
  const text=$("#postText").value.trim();
  const image_url=$("#postImageUrl").value.trim();
  const msg=$("#postMsg");
  msg.textContent=""; msg.className="msg";

  if(!text && !image_url){
    msg.textContent="Add text or a photo.";
    msg.className="msg error";
    return;
  }

  if(DEMO_MODE){
    const payload = {
      post_id:"p_"+uuid(),
      author_id:u.user_id,
      author_name:u.name,
      text,
      image_url:image_url||"",
      created_at:new Date().toISOString(),
      pinned:false,
      featured:false,
      status:"active"
    };
    const res = await apiPost("createPost",{ _demo_payload: payload });
    if(!res.ok){ msg.textContent=res.error||"Failed"; msg.className="msg error"; return; }
  } else {
    const res = await apiPost("createPost",{
      author_id:u.user_id,
      author_name:u.name,
      text,
      image_url
    });
    if(!res.ok){ msg.textContent=res.error||"Failed"; msg.className="msg error"; return; }
  }

  $("#postText").value="";
  $("#postImageUrl").value="";
  await loadFeed();
}

async function renderPost(ctx){
  const post_id=ctx && ctx.post_id;
  view.innerHTML = `<div class="msg">Loading...</div>`;

  const postsRes = await apiGet("posts");
  const post = (postsRes.posts||[]).find(p=>String(p.post_id)===String(post_id));
  if(!post){
    view.innerHTML = `<div class="card listCard"><div class="h1">Post not found</div><button class="btn" id="backBtn">Back</button></div>`;
    $("#backBtn").onclick = ()=> navigate("feed");
    return;
  }

  view.innerHTML = `
    <div class="card postCard">
      <div class="postMeta">
        <div>${escapeHtml(post.author_name)}</div>
        <div>${fmtTime(post.created_at)}</div>
      </div>
      ${post.text ? `<div class="postText">${escapeHtml(post.text)}</div>` : ""}
      ${post.image_url ? `<img class="postImg" src="${post.image_url}" alt="">` : ""}
      <div class="postBtns">
        <button id="backBtn">Back</button>
        <button id="refreshBtn">Refresh</button>
      </div>
    </div>

    <div class="card listCard" style="margin-top:12px">
      <div class="h1">Comments</div>
      <div id="commentsList" class="feedList"></div>
      <textarea id="commentText" placeholder="Write a comment..." style="width:100%;min-height:70px;resize:vertical;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#fff;outline:none;margin-top:12px"></textarea>
      <div class="actions">
        <button id="addCommentBtn" class="btn primary">Comment</button>
      </div>
      <div id="commentMsg" class="msg"></div>
    </div>
  `;
  $("#backBtn").onclick = ()=> navigate("feed");
  $("#refreshBtn").onclick = ()=> loadComments(post_id);
  $("#addCommentBtn").onclick = ()=> addComment(post_id);
  await loadComments(post_id);
}

async function loadComments(post_id){
  const list=$("#commentsList");
  list.innerHTML = `<div class="msg">Loading...</div>`;
  const res = await apiGet("comments",{ post_id });
  if(!res.ok){ list.innerHTML=`<div class="msg error">${res.error||"Failed"}</div>`; return; }
  list.innerHTML="";
  (res.comments||[]).forEach(c=>{
    const card=document.createElement("div");
    card.className="card postCard";
    card.innerHTML = `
      <div class="postMeta">
        <div>${escapeHtml(c.author_name)}</div>
        <div>${fmtTime(c.created_at)}</div>
      </div>
      <div class="postText">${escapeHtml(c.text)}</div>
    `;
    list.appendChild(card);
  });
  if((res.comments||[]).length===0){
    list.innerHTML = `<div class="msg">No comments yet.</div>`;
  }
}

async function addComment(post_id){
  const u=getUser();
  const text=$("#commentText").value.trim();
  const msg=$("#commentMsg");
  msg.textContent=""; msg.className="msg";
  if(!text){ msg.textContent="Write a comment first."; msg.className="msg error"; return; }

  if(DEMO_MODE){
    const payload={
      comment_id:"c_"+uuid(),
      post_id,
      parent_comment_id:"",
      author_id:u.user_id,
      author_name:u.name,
      text,
      created_at:new Date().toISOString(),
      status:"active"
    };
    const res=await apiPost("createComment",{ _demo_payload: payload });
    if(!res.ok){ msg.textContent=res.error||"Failed"; msg.className="msg error"; return; }
  } else {
    const res=await apiPost("createComment",{ post_id, parent_comment_id:"", author_id:u.user_id, author_name:u.name, text });
    if(!res.ok){ msg.textContent=res.error||"Failed"; msg.className="msg error"; return; }
  }
  $("#commentText").value="";
  await loadComments(post_id);
}

async function renderFeatured(){
  setActiveTab("featured");
  view.innerHTML = `
    <div class="card listCard">
      <div class="h1">Featured</div>
      <div class="small">Media + people highlights for the CHB affiliate community.</div>
    </div>

    <div class="card listCard" style="margin-top:12px">
      <div class="h1">Featured Media</div>
      <div id="mediaRow" class="hscroll"></div>
    </div>

    <div class="card listCard" style="margin-top:12px">
      <div class="h1">Community Spotlights</div>
      <div id="spotRow" class="hscroll"></div>
    </div>

    <div class="card listCard" style="margin-top:12px">
      <div class="h1">Guides & Mentors</div>
      <div id="mentorRow" class="hscroll"></div>
    </div>
  `;

  const media = await apiGet("featuredMedia");
  const mediaRow = $("#mediaRow");
  mediaRow.innerHTML="";
  (media.items||[]).forEach(i=>{
    const card=document.createElement("div");
    card.className="hcard";
    card.innerHTML = `
      ${i.thumbnail_url ? `<img class="thumb" src="${i.thumbnail_url}" alt="">` : `<div class="thumb"></div>`}
      <div style="margin-top:10px;font-weight:900">${escapeHtml(i.title)}</div>
      <div class="small" style="margin-top:4px"><span class="pill">${escapeHtml(i.type||"link")}</span></div>
      <div class="small" style="margin-top:8px">${escapeHtml(i.description||"")}</div>
    `;
    card.onclick=()=>{ if(i.url && i.url!=="#") window.open(i.url,"_blank","noopener"); };
    mediaRow.appendChild(card);
  });

  const spot = await apiGet("featuredPeople",{ category:"spotlight" });
  renderPeopleRow("spotRow", spot.people||[]);

  const mentor = await apiGet("featuredPeople",{ category:"mentor" });
  renderPeopleRow("mentorRow", mentor.people||[]);
}

function renderPeopleRow(id, people){
  const row=$("#"+id);
  row.innerHTML="";
  people.forEach(p=>{
    const card=document.createElement("div");
    card.className="hcard";
    card.innerHTML = `
      <div class="avatarRow">
        ${p.photo_url ? `<img class="avatar" src="${p.photo_url}" alt="">` : `<div class="avatar"></div>`}
        <div>
          <div style="font-weight:900">${escapeHtml(p.name)}</div>
          <div class="small">${escapeHtml(p.headline||"")}</div>
        </div>
      </div>
      <div class="small" style="margin-top:10px">${escapeHtml(p.subtext||"")}</div>
    `;
    card.onclick=()=>{ if(p.link_url && p.link_url!=="#") window.open(p.link_url,"_blank","noopener"); };
    row.appendChild(card);
  });
  if(people.length===0){
    row.innerHTML = `<div class="msg">Nothing featured yet.</div>`;
  }
}

const HUB_SECTIONS=[
  { key:"Start Here", desc:"The 5-minute setup and what to do first." },
  { key:"Training", desc:"All trainings and how-to resources." },
  { key:"Content Vault", desc:"Captions, prompts, swipe copy." },
  { key:"Media Assets", desc:"Logos, photos, product graphics." },
  { key:"Important Links", desc:"Order links, support, forms." }
];

async function renderHub(){
  setActiveTab("hub");
  view.innerHTML = `
    <div class="card listCard">
      <div class="h1">Affiliate Hub</div>
      <div class="small">Everything affiliates need in one place.</div>
    </div>
    <div style="height:10px"></div>
    <div class="grid" id="hubGrid"></div>
  `;
  const grid=$("#hubGrid");
  HUB_SECTIONS.forEach(s=>{
    const tile=document.createElement("div");
    tile.className="tile";
    tile.innerHTML=`<div class="t">${s.key}</div><div class="d">${s.desc}</div>`;
    tile.onclick=()=> navigate("hubSection",{ section:s.key });
    grid.appendChild(tile);
  });
}

async function renderHubSection(ctx){
  const section=ctx && ctx.section ? ctx.section : "Training";
  view.innerHTML = `
    <div class="card listCard">
      <div class="h1">${section}</div>
      <div class="small">Managed from your HubLinks sheet.</div>
      <div class="actions" style="margin-top:12px">
        <button class="btn" id="backBtn">Back</button>
        <button class="btn" id="refreshBtn">Refresh</button>
      </div>
      <div id="hubMsg" class="msg"></div>
    </div>

    <div class="card listCard" style="margin-top:12px">
      <div id="hubList"></div>
    </div>
  `;
  $("#backBtn").onclick=()=> navigate("hub");
  $("#refreshBtn").onclick=()=> loadHubLinks(section);
  await loadHubLinks(section);
}

async function loadHubLinks(section){
  const list=$("#hubList");
  const msg=$("#hubMsg");
  msg.textContent=""; msg.className="msg";
  list.innerHTML=`<div class="msg">Loading...</div>`;
  const res=await apiGet("hubLinks",{ section });
  if(!res.ok){
    list.innerHTML="";
    msg.textContent=res.error||"Failed";
    msg.className="msg error";
    return;
  }
  list.innerHTML="";
  (res.links||[]).forEach(l=>{
    const row=document.createElement("div");
    row.className="itemRow";
    row.innerHTML = `
      <div class="t">${escapeHtml(l.title)}</div>
      <div class="d">${escapeHtml(l.description||"")}</div>
      <div style="margin-top:10px"><span class="pill">${escapeHtml(l.type||"link")}</span></div>
    `;
    row.onclick=()=>{ if(l.url && l.url!=="#") window.open(l.url,"_blank","noopener"); };
    list.appendChild(row);
  });
  if((res.links||[]).length===0){
    list.innerHTML = `<div class="msg">No links added yet for this section.</div>`;
  }
}

async function renderProfile(){
  setActiveTab("profile");
  const u=getUser();
  view.innerHTML = `
    <div class="card listCard">
      <div class="h1">Profile</div>
      <div class="itemRow">
        <div class="t">${escapeHtml(u.name)}</div>
        <div class="d">${escapeHtml(u.email)}</div>
        <div style="margin-top:10px"><span class="pill">${escapeHtml(u.role||"member")}</span></div>
      </div>
      <div class="small" style="margin-top:12px">Mode: ${DEMO_MODE ? "Demo" : "Live"}</div>
    </div>
  `;
}

// ------- navigation -------
async function navigate(route, ctx=null){
  // main tab highlight handled inside render functions except for subroutes
  if(route==="feed") return renderFeed();
  if(route==="featured") return renderFeatured();
  if(route==="hub") return renderHub();
  if(route==="profile") return renderProfile();
  if(route==="hubSection") return renderHubSection(ctx);
  if(route==="post") return renderPost(ctx);
  return renderFeed();
}

// ------- events -------
$("#loginBtn").onclick = async ()=>{
  authMsg.textContent=""; authMsg.className="msg";
  const email=$("#emailInput").value.trim();
  const pin=$("#pinInput").value.trim();
  const res = await apiPost("login",{ email, pin });
  if(!res.ok){
    authMsg.textContent = res.error || "Login failed";
    authMsg.className = "msg error";
    return;
  }
  setUser(res.user);
  setAppVisible(true);
  navigate("feed");
};

logoutBtn.onclick = ()=>{
  clearUser();
  setAppVisible(false);
};

$$(".tabBtn").forEach(b=>{
  b.onclick = ()=> navigate(b.dataset.tab);
});

$("#homeBtn").onclick = ()=>{ if(getUser()) navigate("feed"); };

// deep link
function handleHash(){
  const h=location.hash||"";
  const m=h.match(/post=([^&]+)/);
  if(m && getUser()){
    navigate("post",{ post_id: decodeURIComponent(m[1]) });
  }
}
window.addEventListener("hashchange", handleHash);

// init
const u=getUser();
if(u){
  setAppVisible(true);
  navigate("feed");
  handleHash();
} else {
  setAppVisible(false);
}
