// ============================================================
// VERILAY PATCH v2 — Save as verilay_patch.js in Verilay folder
// Add <script src="verilay_patch.js"></script> before </body>
// ============================================================

(function() {
    function waitForAPI(cb) {
        if (typeof API !== "undefined" && API.auth && API.helpers) cb();
        else setTimeout(() => waitForAPI(cb), 100);
    }

    waitForAPI(function() {
        const BASE = "https://verilay-backend.onrender.com/api";
        const H = () => {
            const h = { "Content-Type": "application/json" };
            const t = localStorage.getItem("verilay_token");
            if (t) h["Authorization"] = "Bearer " + t;
            return h;
        };
        const get = (path) => fetch(BASE + path, { headers: H() }).then(r => r.json());

        // ─── 1. DYNAMIC CARDS GRID ───
        async function loadCardsGrid() {
            const container = document.getElementById("pc");
            if (!container || !API.auth.isLoggedIn()) return;
            const user = API.auth.getUser();
            if (!user) return;

            container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Loading cards...</div>';
            try {
                const cards = await get("/users/" + user.username + "/truth-log");
                if (!cards || cards.length === 0) {
                    container.innerHTML = '<div class="cg"><div class="cmc"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg><p>Create New Card</p></div></div>';
                    return;
                }
                const grid = cards.map(c => {
                    const sc = c.status==="DENIED"?"rs-d":c.status==="ACCEPTED"?"rs-a":"rs-m";
                    const sl = c.status==="DENIED"?"Denied":c.status==="ACCEPTED"?"Accepted":"Modified";
                    const si = c.status==="DENIED"?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>':c.status==="ACCEPTED"?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>';
                    const tp = c.trust_percentage||0;
                    const tc = tp>=70?"var(--grn)":tp>=40?"var(--yel)":"var(--red)";
                    const shares = (c.vouch_count||0)+(c.counter_count||0);
                    return '<div class="cm2"><div class="cms '+sc+'">'+si+' '+sl+'</div><div class="cmt">"'+(c.news_headline||c.statement||"")+'"</div><div class="cmf"><span class="cmp" style="color:'+tc+'">'+tp+'%</span><span class="cmsh"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> '+shares+'</span></div></div>';
                }).join("") + '<div class="cmc"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg><p>Create New Card</p></div>';
                container.innerHTML = '<div class="cg">' + grid + '</div>';
            } catch(e) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Could not load cards</div>';
            }
        }

        // ─── 2. DYNAMIC ABOUT SECTION ───
        async function loadAboutSection() {
            const container = document.getElementById("pab");
            if (!container || !API.auth.isLoggedIn()) return;
            const user = API.auth.getUser();
            if (!user) return;

            try {
                const p = await get("/users/" + user.username);
                const joinDate = new Date(p.created_at||Date.now()).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
                container.innerHTML =
                    '<div class="asec"><div class="alab">Bio</div><div class="atxt">'+(p.bio||"No bio added yet.")+'</div></div>'+
                    '<div class="asec"><div class="alab">Verification</div>'+
                    '<div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>'+
                    '<span class="arowt">'+(p.is_verified?"Identity Verified":"Not Yet Verified")+'</span>'+
                    '<span class="arows">'+(p.is_verified?"Verified":"Pending")+'</span></div></div>'+
                    '<div class="asec"><div class="alab">Trust Stats</div>'+
                    '<div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg><span class="arowt">Member since '+joinDate+'</span></div>'+
                    '<div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg><span class="arowt">'+(p.claims_resolved||0)+' claims addressed</span></div>'+
                    '<div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg><span class="arowt">'+(p.vouch_rate||0)+'% average vouch rate</span></div></div>'+
                    '<div class="asec"><div class="alab">Links</div>'+
                    '<div class="arow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span class="arowt" style="color:var(--saff)">verilay.co.in/@'+(p.username||"")+'</span></div></div>';
            } catch(e) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Could not load profile info</div>';
            }
        }

        // ─── 3. HOOK INTO TAB SWITCHING ───
        const _origSpt = window.spt;
        window.spt = function(el, id) {
            _origSpt(el, id);
            if (id === "pc") loadCardsGrid();
            if (id === "pab") loadAboutSection();
        };

        const _origSw = window.sw;
        window.sw = function(tab, el) {
            _origSw(tab, el);
            if (tab === "p") {
                setTimeout(() => {
                    loadAboutSection();
                    const active = document.querySelector(".psti.on");
                    if (active) {
                        const txt = active.textContent.trim();
                        if (txt === "Cards") loadCardsGrid();
                    }
                }, 200);
            }
        };

        // ─── 4. FIX FEED: Reload feed after responding to a mention ───
        const _origRespond = API.radar.respond;
        API.radar.respond = async function(mentionId, action) {
            await _origRespond(mentionId, action);
            try { API.feed.load("following"); } catch(e) {}
        };

        // Load About on first Profile visit
        setTimeout(() => {
            const profileActive = document.querySelector("#tp.on");
            if (profileActive) loadAboutSection();
        }, 500);

        console.log("Verilay Patch v2 loaded — dynamic Profile + Feed fix");
    });
})();
